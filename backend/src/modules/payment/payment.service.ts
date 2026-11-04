import type { Prisma } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import type { AuthUser } from "../../types/express";
import { AppError } from "../../utils/AppError";
import { AuditAction, recordAudit } from "../../utils/auditLog";
import { buildMeta, toSkipTake } from "../../utils/pagination";
import { bkashClient } from "./bkash.client";
import { reconcile } from "./payment.settlement";
import type { BkashCallbackQuery, MyPaymentsQuery } from "./payment.validation";

/** A payment younger than this blocks a new attempt (double click / two tabs). */
const IN_FLIGHT_WINDOW_MS = 60 * 1000;

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
	if (!invoice || invoice.workOrder.deletedAt) {
		throw AppError.notFound("Invoice");
	}

	const { customerId, technicianId } = invoice.workOrder;
	const canView =
		user.role === "ADMIN" ||
		(user.role === "CUSTOMER" && customerId === user.id) ||
		(user.role === "TECHNICIAN" && technicianId === user.id);
	if (!canView) {
		throw AppError.forbidden("You do not have access to this invoice");
	}
	return invoice;
}

/**
 * Before a new attempt, settle earlier INITIATED attempts with bKash:
 * if one actually completed the invoice is paid; otherwise it is superseded.
 */
async function settlePreviousAttempts(invoiceId: string): Promise<void> {
	const previous = await prisma.payment.findMany({
		where: { invoiceId, status: "INITIATED" },
		select: { id: true, status: true, bkashPaymentId: true, createdAt: true },
	});
	for (const payment of previous) {
		if (Date.now() - payment.createdAt.getTime() < IN_FLIGHT_WINDOW_MS) {
			throw AppError.conflict(
				"A payment for this invoice is already in progress, please wait a minute",
			);
		}
		const outcome = await reconcile(payment, {
			execute: false,
			unsuccessfulStatus: "CANCELLED",
			reason: "Superseded by a new payment attempt",
		});
		if (outcome === "success") {
			throw AppError.conflict("This invoice has just been paid");
		}
		if (outcome === "pending") {
			throw AppError.conflict(
				"Could not confirm the previous payment with bKash, please try again shortly",
			);
		}
	}
}

async function initiate(invoiceId: string, customer: AuthUser) {
	const invoice = await getInvoice(invoiceId, customer);
	if (invoice.workOrder.customerId !== customer.id) {
		throw AppError.forbidden("You can only pay your own invoices");
	}
	if (invoice.status !== "UNPAID") {
		throw AppError.conflict(`Invoice is already ${invoice.status}`);
	}

	await settlePreviousAttempts(invoice.id);

	// Invoice row lock serializes concurrent initiates for the same invoice
	const payment = await prisma.$transaction(async (tx) => {
		await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoice.id} FOR UPDATE`;
		const [fresh, inFlight] = await Promise.all([
			tx.invoice.findUniqueOrThrow({
				where: { id: invoice.id },
				select: { status: true },
			}),
			tx.payment.count({
				where: { invoiceId: invoice.id, status: "INITIATED" },
			}),
		]);
		if (fresh.status !== "UNPAID") {
			throw AppError.conflict(`Invoice is already ${fresh.status}`);
		}
		if (inFlight > 0) {
			throw AppError.conflict(
				"A payment for this invoice is already in progress, please wait a minute",
			);
		}
		return tx.payment.create({
			data: {
				invoiceId: invoice.id,
				userId: customer.id,
				amount: invoice.total,
			},
		});
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
		// No bKash payment exists yet, so FAILED is safe here
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

/**
 * Browser redirect from bKash. The `status` param only decides whether we try
 * to execute; the recorded result always comes from bKash itself.
 * Returns the frontend URL to redirect the customer to.
 */
async function handleCallback(query: BkashCallbackQuery): Promise<string> {
	const payment = await prisma.payment.findUnique({
		where: { bkashPaymentId: query.paymentID },
		select: { id: true, status: true, bkashPaymentId: true },
	});
	if (!payment) return `${env.FRONTEND_URL}/payment/failed`;

	const outcome = await reconcile(payment, {
		execute: query.status === "success",
		unsuccessfulStatus: query.status === "cancel" ? "CANCELLED" : "FAILED",
		reason: `bKash callback: ${query.status}`,
	});
	return `${env.FRONTEND_URL}/payment/${outcome}?paymentId=${payment.id}`;
}

async function findOwnedPayment(id: string, user: AuthUser) {
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

/** Manual re-check with bKash (pending page, or an admin resolving a stuck payment). */
async function verify(id: string, user: AuthUser) {
	const payment = await findOwnedPayment(id, user);
	const outcome = await reconcile(payment, {
		execute: false,
		unsuccessfulStatus: "FAILED",
		reason: "Manual verification",
	});
	return { outcome, payment: await findOwnedPayment(id, user) };
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
	getById: findOwnedPayment,
	verify,
	listMine,
};
