import type { PaymentStatus, Prisma } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import type { AuthUser } from "../../types/express";
import { AppError } from "../../utils/AppError";
import { AuditAction, recordAudit } from "../../utils/auditLog";
import { CacheKeys, cache } from "../../utils/cache";
import { logger } from "../../utils/logger";
import { buildMeta, toSkipTake } from "../../utils/pagination";
import { applyTransition } from "../workOrder/workOrder.workflow";
import { type BkashExecuteResponse, bkashClient } from "./bkash.client";
import type { BkashCallbackQuery, MyPaymentsQuery } from "./payment.validation";

const paymentSelect = {
	id: true,
	amount: true,
	provider: true,
	status: true,
	bkashPaymentId: true,
	trxId: true,
	payerAccount: true,
	failureReason: true,
	paidAt: true,
	createdAt: true,
	invoice: {
		select: {
			id: true,
			invoiceNo: true,
			total: true,
			status: true,
			workOrder: { select: { id: true, code: true, title: true } },
		},
	},
} satisfies Prisma.PaymentSelect;

async function getInvoice(invoiceId: string, user: AuthUser) {
	const invoice = await prisma.invoice.findUnique({
		where: { id: invoiceId },
		include: {
			workOrder: {
				select: {
					id: true,
					code: true,
					title: true,
					status: true,
					customerId: true,
					technicianId: true,
					deletedAt: true,
					category: { select: { name: true } },
					report: true,
				},
			},
			payments: {
				select: {
					id: true,
					status: true,
					trxId: true,
					paidAt: true,
					createdAt: true,
				},
				orderBy: { createdAt: "desc" },
			},
		},
	});
	if (!invoice || invoice.workOrder.deletedAt)
		throw AppError.notFound("Invoice");

	const { customerId, technicianId } = invoice.workOrder;
	const canView =
		user.role === "ADMIN" ||
		(user.role === "CUSTOMER" && customerId === user.id) ||
		(user.role === "TECHNICIAN" && technicianId === user.id);
	if (!canView)
		throw AppError.forbidden("You do not have access to this invoice");
	return invoice;
}

async function initiate(invoiceId: string, customer: AuthUser) {
	const invoice = await getInvoice(invoiceId, customer);
	if (invoice.workOrder.customerId !== customer.id) {
		throw AppError.forbidden("You can only pay your own invoices");
	}
	if (invoice.status !== "UNPAID") {
		throw AppError.conflict(`Invoice is already ${invoice.status}`);
	}

	const payment = await prisma.payment.create({
		data: {
			invoiceId: invoice.id,
			userId: customer.id,
			amount: invoice.total,
		},
	});

	try {
		const created = await bkashClient.createPayment({
			amount: invoice.total.toFixed(2),
			merchantInvoiceNumber: `${invoice.invoiceNo}-${payment.id.slice(0, 8)}`,
			payerReference: invoice.workOrder.code,
		});

		await prisma.$transaction(async (tx) => {
			await tx.payment.update({
				where: { id: payment.id },
				data: {
					bkashPaymentId: created.paymentID,
					rawResponse: { create: { ...created } },
				},
			});
			await recordAudit(
				{
					actorId: customer.id,
					action: AuditAction.PAYMENT_INITIATED,
					entity: "Payment",
					entityId: payment.id,
					after: {
						invoiceNo: invoice.invoiceNo,
						amount: invoice.total.toString(),
						bkashPaymentId: created.paymentID,
					},
				},
				tx,
			);
		});

		return {
			paymentId: payment.id,
			bkashPaymentId: created.paymentID,
			bkashURL: created.bkashURL,
			amount: invoice.total,
			invoiceNo: invoice.invoiceNo,
		};
	} catch (error) {
		await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: "FAILED",
				failureReason:
					error instanceof Error
						? error.message.slice(0, 300)
						: "Unknown error",
			},
		});
		throw error;
	}
}

/** Execute, and if that fails (e.g. already executed) fall back to a status query. */
async function verifyWithBkash(
	paymentID: string,
): Promise<BkashExecuteResponse> {
	try {
		const executed = await bkashClient.executePayment(paymentID);
		if (bkashClient.isCompleted(executed)) return executed;
		logger.warn("bKash execute not completed, querying status", executed);
	} catch (error) {
		logger.warn("bKash execute failed, querying status", error);
	}
	return bkashClient.queryPayment(paymentID);
}

async function markUnsuccessful(
	paymentId: string,
	status: Extract<PaymentStatus, "FAILED" | "CANCELLED">,
	reason: string,
	raw?: unknown,
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		const updated = await tx.payment.updateMany({
			where: { id: paymentId, status: "INITIATED" },
			data: {
				status,
				failureReason: reason.slice(0, 300),
				...(raw
					? { rawResponse: { callback: raw as Prisma.InputJsonValue } }
					: {}),
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

/** Atomically: Payment SUCCESS → Invoice PAID → WorkOrder PAID (SYSTEM actor). */
async function markSucceeded(
	paymentId: string,
	result: BkashExecuteResponse,
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		const payment = await tx.payment.findUniqueOrThrow({
			where: { id: paymentId },
			include: { invoice: { include: { workOrder: true } } },
		});
		if (result.amount && !payment.amount.equals(result.amount)) {
			throw AppError.conflict(
				`Paid amount ${result.amount} does not match invoice total ${payment.amount}`,
			);
		}

		const claimed = await tx.payment.updateMany({
			where: { id: paymentId, status: "INITIATED" },
			data: {
				status: "SUCCESS",
				trxId: result.trxID,
				payerAccount: result.customerMsisdn ?? result.payerAccount,
				paidAt: new Date(),
				rawResponse: { execute: { ...result } },
			},
		});
		if (claimed.count === 0) return; // already processed — idempotent

		const now = new Date();
		await tx.invoice.updateMany({
			where: { id: payment.invoiceId, status: "UNPAID" },
			data: { status: "PAID", paidAt: now },
		});
		await applyTransition(tx, payment.invoice.workOrder, "PAID", "SYSTEM", {
			actorId: null,
			note: `bKash trxID ${result.trxID}`,
		});
		await recordAudit(
			{
				actorId: null,
				action: AuditAction.PAYMENT_SUCCEEDED,
				entity: "Payment",
				entityId: paymentId,
				after: {
					trxId: result.trxID ?? null,
					amount: payment.amount.toString(),
				},
			},
			tx,
		);
	});
	await cache.del(CacheKeys.dashboardStats);
}

/**
 * Handles the browser redirect from bKash. The `status` query param is never
 * trusted on its own: success is only recorded after server-side verification.
 * Returns the frontend URL to redirect the customer to.
 */
async function handleCallback(query: BkashCallbackQuery): Promise<string> {
	const resultUrl = (outcome: string, paymentId?: string) =>
		`${env.FRONTEND_URL}/payment/${outcome}${paymentId ? `?paymentId=${paymentId}` : ""}`;

	const payment = await prisma.payment.findUnique({
		where: { bkashPaymentId: query.paymentID },
		select: { id: true, status: true },
	});
	if (!payment) return resultUrl("failed");

	if (payment.status !== "INITIATED") {
		const outcome =
			payment.status === "SUCCESS"
				? "success"
				: payment.status === "CANCELLED"
					? "cancelled"
					: "failed";
		return resultUrl(outcome, payment.id);
	}

	if (query.status !== "success") {
		const status = query.status === "cancel" ? "CANCELLED" : "FAILED";
		await markUnsuccessful(
			payment.id,
			status,
			`bKash callback: ${query.status}`,
			query,
		);
		return resultUrl(
			status === "CANCELLED" ? "cancelled" : "failed",
			payment.id,
		);
	}

	try {
		const verified = await verifyWithBkash(query.paymentID);
		if (!bkashClient.isCompleted(verified)) {
			await markUnsuccessful(
				payment.id,
				"FAILED",
				verified.statusMessage ?? "Payment not completed",
				verified,
			);
			return resultUrl("failed", payment.id);
		}
		await markSucceeded(payment.id, verified);
		return resultUrl("success", payment.id);
	} catch (error) {
		logger.error("bKash callback processing failed", error);
		await markUnsuccessful(
			payment.id,
			"FAILED",
			error instanceof Error ? error.message : "Verification failed",
		);
		return resultUrl("failed", payment.id);
	}
}

async function getById(id: string, user: AuthUser) {
	const payment = await prisma.payment.findUnique({
		where: { id },
		select: { ...paymentSelect, userId: true },
	});
	if (!payment) throw AppError.notFound("Payment");
	if (user.role !== "ADMIN" && payment.userId !== user.id) {
		throw AppError.forbidden("You do not have access to this payment");
	}
	return payment;
}

async function listMine(userId: string, query: MyPaymentsQuery) {
	const where: Prisma.PaymentWhereInput = {
		userId,
		...(query.status ? { status: query.status } : {}),
	};
	const [data, total] = await prisma.$transaction([
		prisma.payment.findMany({
			where,
			select: paymentSelect,
			orderBy: { createdAt: query.sortOrder },
			...toSkipTake(query),
		}),
		prisma.payment.count({ where }),
	]);
	return { data, meta: buildMeta(query, total) };
}

export const paymentService = {
	getInvoice,
	initiate,
	handleCallback,
	getById,
	listMine,
};
