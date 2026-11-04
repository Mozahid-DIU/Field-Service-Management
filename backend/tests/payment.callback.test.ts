import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
	payment: {
		findUnique: vi.fn(),
		findUniqueOrThrow: vi.fn(),
		updateMany: vi.fn(),
	},
	invoice: { updateMany: vi.fn() },
	workOrder: { updateMany: vi.fn() },
	auditLog: { create: vi.fn() },
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

beforeEach(() => {
	vi.clearAllMocks();
	prismaMock.$transaction.mockImplementation(
		(fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock),
	);
	prismaMock.auditLog.create.mockResolvedValue({});
	prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
	prismaMock.invoice.updateMany.mockResolvedValue({ count: 1 });
	prismaMock.workOrder.updateMany.mockResolvedValue({ count: 1 });
	bkashMock.isCompleted.mockImplementation(
		(r: { statusCode: string; transactionStatus?: string; trxID?: string }) =>
			r.statusCode === "0000" &&
			r.transactionStatus === "Completed" &&
			!!r.trxID,
	);
});

describe("bKash callback handling", () => {
	it("redirects to failed for an unknown paymentID without calling bKash", async () => {
		prismaMock.payment.findUnique.mockResolvedValue(null);

		const url = await paymentService.handleCallback({
			paymentID: "UNKNOWN",
			status: "success",
		});

		expect(url).toBe(`${FRONTEND}/payment/failed`);
		expect(bkashMock.executePayment).not.toHaveBeenCalled();
	});

	it("is idempotent: an already successful payment is not executed again", async () => {
		prismaMock.payment.findUnique.mockResolvedValue({
			id: "pay-1",
			status: "SUCCESS",
		});

		const url = await paymentService.handleCallback({
			paymentID: "TR001",
			status: "success",
		});

		expect(url).toBe(`${FRONTEND}/payment/success?paymentId=pay-1`);
		expect(bkashMock.executePayment).not.toHaveBeenCalled();
	});

	it("marks the payment CANCELLED when the customer cancels", async () => {
		prismaMock.payment.findUnique.mockResolvedValue({
			id: "pay-1",
			status: "INITIATED",
		});

		const url = await paymentService.handleCallback({
			paymentID: "TR001",
			status: "cancel",
		});

		expect(url).toBe(`${FRONTEND}/payment/cancelled?paymentId=pay-1`);
		expect(prismaMock.payment.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "pay-1", status: "INITIATED" },
				data: expect.objectContaining({ status: "CANCELLED" }),
			}),
		);
		expect(bkashMock.executePayment).not.toHaveBeenCalled();
	});

	it("does not trust status=success when bKash verification says not completed", async () => {
		prismaMock.payment.findUnique.mockResolvedValue({
			id: "pay-1",
			status: "INITIATED",
		});
		const notCompleted = {
			paymentID: "TR001",
			statusCode: "2056",
			statusMessage: "Invalid Payment State",
		};
		bkashMock.executePayment.mockResolvedValue(notCompleted);
		bkashMock.queryPayment.mockResolvedValue(notCompleted);

		const url = await paymentService.handleCallback({
			paymentID: "TR001",
			status: "success",
		});

		expect(url).toBe(`${FRONTEND}/payment/failed?paymentId=pay-1`);
		expect(prismaMock.invoice.updateMany).not.toHaveBeenCalled();
	});

	it("on verified success marks payment, invoice and work order PAID", async () => {
		prismaMock.payment.findUnique.mockResolvedValue({
			id: "pay-1",
			status: "INITIATED",
		});
		bkashMock.executePayment.mockResolvedValue({
			paymentID: "TR001",
			statusCode: "0000",
			statusMessage: "Successful",
			transactionStatus: "Completed",
			trxID: "TRX123",
			amount: "2500.00",
			customerMsisdn: "01770618575",
		});
		prismaMock.payment.findUniqueOrThrow.mockResolvedValue({
			id: "pay-1",
			invoiceId: "inv-1",
			amount: new Prisma.Decimal("2500.00"),
			invoice: { workOrder: { id: "wo-1", status: "COMPLETED" } },
		});

		const url = await paymentService.handleCallback({
			paymentID: "TR001",
			status: "success",
		});

		expect(url).toBe(`${FRONTEND}/payment/success?paymentId=pay-1`);
		expect(prismaMock.payment.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "pay-1", status: "INITIATED" },
				data: expect.objectContaining({ status: "SUCCESS", trxId: "TRX123" }),
			}),
		);
		expect(prismaMock.invoice.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "inv-1", status: "UNPAID" },
			}),
		);
		expect(prismaMock.workOrder.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "wo-1", status: "COMPLETED", deletedAt: null },
				data: { status: "PAID" },
			}),
		);
	});

	it("rejects a verified payment whose amount differs from the invoice", async () => {
		prismaMock.payment.findUnique.mockResolvedValue({
			id: "pay-1",
			status: "INITIATED",
		});
		bkashMock.executePayment.mockResolvedValue({
			paymentID: "TR001",
			statusCode: "0000",
			statusMessage: "Successful",
			transactionStatus: "Completed",
			trxID: "TRX123",
			amount: "1.00",
		});
		prismaMock.payment.findUniqueOrThrow.mockResolvedValue({
			id: "pay-1",
			invoiceId: "inv-1",
			amount: new Prisma.Decimal("2500.00"),
			invoice: { workOrder: { id: "wo-1", status: "COMPLETED" } },
		});

		const url = await paymentService.handleCallback({
			paymentID: "TR001",
			status: "success",
		});

		expect(url).toBe(`${FRONTEND}/payment/failed?paymentId=pay-1`);
		expect(prismaMock.invoice.updateMany).not.toHaveBeenCalled();
	});
});
