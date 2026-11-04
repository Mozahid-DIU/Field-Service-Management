import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
	payment: {
		findUnique: vi.fn(),
		findUniqueOrThrow: vi.fn(),
		updateMany: vi.fn(),
		update: vi.fn(),
	},
	invoice: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
	workOrder: { updateMany: vi.fn() },
	auditLog: { create: vi.fn() },
	$queryRaw: vi.fn(),
	$transaction: vi.fn(),
}));

const bkashMock = vi.hoisted(() => ({
	createPayment: vi.fn(),
	executePayment: vi.fn(),
	queryPayment: vi.fn(),
	isCompleted: vi.fn(),
}));

vi.mock("../src/config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../src/modules/payment/bkash.client", () => ({
	bkashClient: bkashMock,
}));

import { Prisma } from "@prisma/client";
import { paymentService } from "../src/modules/payment/payment.service";

const FRONTEND = "http://localhost:3000";
const PAYMENT_ID = "pay-1";
const BKASH_ID = "TR001";

const completed = (overrides: Record<string, unknown> = {}) => ({
	paymentID: BKASH_ID,
	statusCode: "0000",
	statusMessage: "Successful",
	transactionStatus: "Completed",
	trxID: "TRX123",
	amount: "2500.00",
	customerMsisdn: "01770618575",
	...overrides,
});

const notCompleted = (transactionStatus = "Initiated") => ({
	paymentID: BKASH_ID,
	statusCode: "0000",
	statusMessage: "Successful",
	transactionStatus,
});

function givenPayment(status = "INITIATED") {
	prismaMock.payment.findUnique.mockResolvedValue({
		id: PAYMENT_ID,
		status,
		bkashPaymentId: BKASH_ID,
	});
	prismaMock.payment.findUniqueOrThrow.mockResolvedValue({
		id: PAYMENT_ID,
		invoiceId: "inv-1",
		bkashPaymentId: BKASH_ID,
		amount: new Prisma.Decimal("2500.00"),
	});
}

function givenInvoice(status: "UNPAID" | "PAID") {
	prismaMock.invoice.findUniqueOrThrow.mockResolvedValue({
		id: "inv-1",
		status,
		workOrder: { id: "wo-1", status: status === "PAID" ? "PAID" : "COMPLETED" },
	});
}

const callback = (status: "success" | "failure" | "cancel") =>
	paymentService.handleCallback({ paymentID: BKASH_ID, status });

beforeEach(() => {
	vi.clearAllMocks();
	prismaMock.$transaction.mockImplementation(
		(fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock),
	);
	prismaMock.$queryRaw.mockResolvedValue([]);
	prismaMock.auditLog.create.mockResolvedValue({});
	prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
	prismaMock.payment.update.mockResolvedValue({});
	prismaMock.invoice.update.mockResolvedValue({});
	prismaMock.workOrder.updateMany.mockResolvedValue({ count: 1 });
	bkashMock.isCompleted.mockImplementation(
		(r: { statusCode: string; transactionStatus?: string; trxID?: string }) =>
			r.statusCode === "0000" &&
			r.transactionStatus === "Completed" &&
			!!r.trxID,
	);
});

describe("bKash callback", () => {
	it("redirects to failed for an unknown paymentID without calling bKash", async () => {
		prismaMock.payment.findUnique.mockResolvedValue(null);

		expect(await callback("success")).toBe(`${FRONTEND}/payment/failed`);
		expect(bkashMock.executePayment).not.toHaveBeenCalled();
	});

	it("is idempotent: an already successful payment is not re-verified", async () => {
		givenPayment("SUCCESS");

		expect(await callback("success")).toBe(
			`${FRONTEND}/payment/success?paymentId=${PAYMENT_ID}`,
		);
		expect(bkashMock.executePayment).not.toHaveBeenCalled();
		expect(bkashMock.queryPayment).not.toHaveBeenCalled();
	});

	it("marks CANCELLED only after bKash confirms the payment did not complete", async () => {
		givenPayment();
		bkashMock.queryPayment.mockResolvedValue(notCompleted("Cancelled"));

		expect(await callback("cancel")).toBe(
			`${FRONTEND}/payment/cancelled?paymentId=${PAYMENT_ID}`,
		);
		expect(bkashMock.queryPayment).toHaveBeenCalledWith(BKASH_ID);
		expect(bkashMock.executePayment).not.toHaveBeenCalled();
		expect(prismaMock.payment.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: PAYMENT_ID, status: "INITIATED" },
				data: expect.objectContaining({ status: "CANCELLED" }),
			}),
		);
	});

	it("a forged status=cancel cannot cancel a payment that bKash says is completed", async () => {
		givenPayment();
		givenInvoice("UNPAID");
		bkashMock.queryPayment.mockResolvedValue(completed());

		expect(await callback("cancel")).toBe(
			`${FRONTEND}/payment/success?paymentId=${PAYMENT_ID}`,
		);
	});

	it("does not trust status=success when bKash says not completed", async () => {
		givenPayment();
		bkashMock.executePayment.mockResolvedValue(notCompleted());
		bkashMock.queryPayment.mockResolvedValue(notCompleted());

		expect(await callback("success")).toBe(
			`${FRONTEND}/payment/failed?paymentId=${PAYMENT_ID}`,
		);
		expect(prismaMock.invoice.update).not.toHaveBeenCalled();
	});

	it("keeps the payment pending (not FAILED) when bKash is unreachable", async () => {
		givenPayment();
		bkashMock.executePayment.mockRejectedValue(new Error("timeout"));
		bkashMock.queryPayment.mockRejectedValue(new Error("timeout"));

		expect(await callback("success")).toBe(
			`${FRONTEND}/payment/pending?paymentId=${PAYMENT_ID}`,
		);
		expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
	});

	it("on verified success marks payment, invoice and work order PAID", async () => {
		givenPayment();
		givenInvoice("UNPAID");
		bkashMock.executePayment.mockResolvedValue(completed());

		expect(await callback("success")).toBe(
			`${FRONTEND}/payment/success?paymentId=${PAYMENT_ID}`,
		);
		expect(prismaMock.payment.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					id: PAYMENT_ID,
					status: { in: ["INITIATED", "FAILED", "CANCELLED"] },
				},
				data: expect.objectContaining({ status: "SUCCESS", trxId: "TRX123" }),
			}),
		);
		expect(prismaMock.invoice.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: "PAID" }),
			}),
		);
		expect(prismaMock.workOrder.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "wo-1", status: "COMPLETED", deletedAt: null },
				data: { status: "PAID" },
			}),
		);
	});

	it("records a second successful payment as a duplicate needing refund", async () => {
		givenPayment();
		givenInvoice("PAID");
		bkashMock.executePayment.mockResolvedValue(completed());

		expect(await callback("success")).toBe(
			`${FRONTEND}/payment/success?paymentId=${PAYMENT_ID}`,
		);
		expect(prismaMock.invoice.update).not.toHaveBeenCalled();
		expect(prismaMock.payment.update).toHaveBeenCalledWith({
			where: { id: PAYMENT_ID },
			data: { failureReason: expect.stringMatching(/refund required/) },
		});
	});

	it("leaves the payment pending for review when the bKash amount does not match", async () => {
		givenPayment();
		bkashMock.executePayment.mockResolvedValue(completed({ amount: "1.00" }));

		expect(await callback("success")).toBe(
			`${FRONTEND}/payment/pending?paymentId=${PAYMENT_ID}`,
		);
		expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
		expect(prismaMock.invoice.update).not.toHaveBeenCalled();
	});

	it("rejects a bKash response without an amount", async () => {
		givenPayment();
		bkashMock.executePayment.mockResolvedValue(
			completed({ amount: undefined }),
		);

		expect(await callback("success")).toBe(
			`${FRONTEND}/payment/pending?paymentId=${PAYMENT_ID}`,
		);
		expect(prismaMock.invoice.update).not.toHaveBeenCalled();
	});
});
