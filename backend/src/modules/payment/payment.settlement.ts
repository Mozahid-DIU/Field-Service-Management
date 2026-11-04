import type { Payment, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { AuditAction, recordAudit } from "../../utils/auditLog";
import { CacheKeys, cache } from "../../utils/cache";
import { logger } from "../../utils/logger";
import { applyTransition } from "../workOrder/workOrder.workflow";
import { type BkashExecuteResponse, bkashClient } from "./bkash.client";

export type PaymentOutcome = "success" | "failed" | "cancelled" | "pending";

const SETTLEABLE_STATUSES: PaymentStatus[] = [
	"INITIATED",
	"FAILED",
	"CANCELLED",
];
const DUPLICATE_NOTE =
	"Duplicate payment: invoice was already settled, refund required";

/**
 * Asks bKash for the truth. With execute=true (customer said success) we
 * execute first and fall back to a status query; otherwise we only query.
 * Network errors propagate so the caller can keep the payment pending.
 */
async function fetchBkashState(
	paymentID: string,
	execute: boolean,
): Promise<BkashExecuteResponse> {
	if (execute) {
		try {
			const executed = await bkashClient.executePayment(paymentID);
			if (bkashClient.isCompleted(executed)) return executed;
			logger.warn("bKash execute not completed, querying status", executed);
		} catch (error) {
			logger.warn("bKash execute failed, querying status", error);
		}
	}
	return bkashClient.queryPayment(paymentID);
}

/** Only moves INITIATED payments; bKash has already confirmed it is not completed. */
async function markUnsuccessful(
	paymentId: string,
	status: Extract<PaymentStatus, "FAILED" | "CANCELLED">,
	reason: string,
	raw: BkashExecuteResponse,
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		const updated = await tx.payment.updateMany({
			where: { id: paymentId, status: "INITIATED" },
			data: {
				status,
				failureReason: reason.slice(0, 300),
				rawResponse: { verification: { ...raw } },
			},
		});
		if (updated.count > 0) {
			await recordAudit(
				{
					actorId: null,
					action: AuditAction.PAYMENT_FAILED,
					entity: "Payment",
					entityId: paymentId,
					after: { status, reason },
				},
				tx,
			);
		}
	});
}

function assertMatchesPayment(
	payment: Payment,
	result: BkashExecuteResponse,
): void {
	if (result.paymentID !== payment.bkashPaymentId) {
		throw AppError.conflict("bKash paymentID does not match our record");
	}
	if (!result.amount || !payment.amount.equals(result.amount)) {
		throw AppError.conflict(
			`bKash amount ${result.amount ?? "missing"} does not match ${payment.amount.toString()}`,
		);
	}
}

/**
 * One transaction: Payment SUCCESS → Invoice PAID → WorkOrder PAID (SYSTEM).
 * A second successful payment for an already-paid invoice is still recorded
 * as SUCCESS (money was taken) but flagged for refund instead of failing.
 */
async function markSucceeded(
	paymentId: string,
	result: BkashExecuteResponse,
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		const payment = await tx.payment.findUniqueOrThrow({
			where: { id: paymentId },
		});
		assertMatchesPayment(payment, result);

		const claimed = await tx.payment.updateMany({
			where: { id: paymentId, status: { in: SETTLEABLE_STATUSES } },
			data: {
				status: "SUCCESS",
				trxId: result.trxID,
				payerAccount: result.customerMsisdn ?? result.payerAccount,
				paidAt: new Date(),
				failureReason: null,
				rawResponse: { verification: { ...result } },
			},
		});
		if (claimed.count === 0) return; // already SUCCESS — idempotent

		await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${payment.invoiceId} FOR UPDATE`;
		const invoice = await tx.invoice.findUniqueOrThrow({
			where: { id: payment.invoiceId },
			include: { workOrder: { select: { id: true, status: true } } },
		});

		if (invoice.status === "PAID") {
			await tx.payment.update({
				where: { id: paymentId },
				data: { failureReason: DUPLICATE_NOTE },
			});
		} else {
			await tx.invoice.update({
				where: { id: invoice.id },
				data: { status: "PAID", paidAt: new Date() },
			});
			await applyTransition(tx, invoice.workOrder, "PAID", "SYSTEM", {
				actorId: null,
				note: `bKash trxID ${result.trxID}`,
			});
		}

		await recordAudit(
			{
				actorId: null,
				action: AuditAction.PAYMENT_SUCCEEDED,
				entity: "Payment",
				entityId: paymentId,
				after: {
					trxId: result.trxID ?? null,
					amount: payment.amount.toString(),
					duplicate: invoice.status === "PAID",
				} satisfies Prisma.InputJsonValue,
			},
			tx,
		);
	});
	await cache.del(CacheKeys.dashboardStats);
}

const OUTCOME_BY_STATUS: Record<PaymentStatus, PaymentOutcome> = {
	SUCCESS: "success",
	FAILED: "failed",
	CANCELLED: "cancelled",
	INITIATED: "pending",
};

interface ReconcileOptions {
	/** true when the customer returned with status=success */
	execute: boolean;
	/** status to record if bKash confirms the payment did not complete */
	unsuccessfulStatus: Extract<PaymentStatus, "FAILED" | "CANCELLED">;
	reason: string;
}

/**
 * Brings our record in line with bKash. Never marks anything unsuccessful
 * unless bKash itself answered "not completed"; on network or processing
 * errors the payment stays as-is and the outcome is "pending".
 */
export async function reconcile(
	payment: Pick<Payment, "id" | "status" | "bkashPaymentId">,
	options: ReconcileOptions,
): Promise<PaymentOutcome> {
	if (payment.status === "SUCCESS") return "success";
	if (!payment.bkashPaymentId) return OUTCOME_BY_STATUS[payment.status];

	let state: BkashExecuteResponse;
	try {
		state = await fetchBkashState(payment.bkashPaymentId, options.execute);
	} catch (error) {
		logger.error("bKash verification unavailable, payment left pending", error);
		return OUTCOME_BY_STATUS[payment.status];
	}

	if (bkashClient.isCompleted(state)) {
		try {
			await markSucceeded(payment.id, state);
			return "success";
		} catch (error) {
			logger.error(
				`Payment ${payment.id} completed at bKash but could not be settled`,
				error,
			);
			return "pending";
		}
	}

	if (payment.status === "INITIATED") {
		await markUnsuccessful(
			payment.id,
			options.unsuccessfulStatus,
			`${options.reason} (${state.transactionStatus ?? state.statusMessage ?? "not completed"})`,
			state,
		);
		return OUTCOME_BY_STATUS[options.unsuccessfulStatus];
	}
	return OUTCOME_BY_STATUS[payment.status];
}
