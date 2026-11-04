import { Prisma, type WorkOrder, type WorkOrderStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthUser } from "../../types/express";
import { AppError } from "../../utils/AppError";
import { AuditAction, recordAudit } from "../../utils/auditLog";
import { generateInvoiceNo } from "../../utils/codeGenerator";
import { assertCanView, workOrderDetailInclude } from "./workOrder.access";
import {
	findScheduleConflict,
	lockTechnician,
	lockWorkOrder,
} from "./workOrder.scheduling";
import { type Actor, assertTransition } from "./workOrder.stateMachine";
import type {
	AssignWorkOrderInput,
	ReviewWorkOrderInput,
	ServiceReportInput,
	UpdateStatusInput,
} from "./workOrder.validation";

type Tx = Prisma.TransactionClient;

/** Invoice columns are Decimal(10,2); keep headroom for the service fee. */
const MAX_PARTS_COST = 9_000_000;

interface TransitionOptions {
	data?: Prisma.WorkOrderUncheckedUpdateManyInput;
	actorId: string | null;
	note?: string;
}

/** Locks the row, re-reads it and enforces visibility — all inside the transaction. */
async function lockAndLoad(
	tx: Tx,
	id: string,
	user: AuthUser,
): Promise<WorkOrder> {
	await lockWorkOrder(tx, id);
	const order = await tx.workOrder.findFirst({
		where: { id, deletedAt: null },
	});
	if (!order) throw AppError.notFound("Work order");
	assertCanView(order, user);
	return order;
}

/**
 * Applies a validated status change with optimistic concurrency:
 * the UPDATE only matches if the status is still what we read.
 */
export async function applyTransition(
	tx: Tx,
	order: Pick<WorkOrder, "id" | "status">,
	to: WorkOrderStatus,
	actor: Actor,
	{ data = {}, actorId, note }: TransitionOptions,
): Promise<void> {
	assertTransition(order.status, to, actor);
	const result = await tx.workOrder.updateMany({
		where: { id: order.id, status: order.status, deletedAt: null },
		data: { ...data, status: to },
	});
	if (result.count === 0) {
		throw AppError.conflict(
			"Work order was changed by someone else, please reload and retry",
		);
	}
	await recordAudit(
		{
			actorId,
			action: AuditAction.WORK_ORDER_STATUS_CHANGED,
			entity: "WorkOrder",
			entityId: order.id,
			before: { status: order.status },
			after: { status: to, ...(note ? { note } : {}) },
		},
		tx,
	);
}

const loadDetail = (id: string) =>
	prisma.workOrder.findUniqueOrThrow({
		where: { id },
		include: workOrderDetailInclude,
	});

async function review(
	id: string,
	input: ReviewWorkOrderInput,
	admin: AuthUser,
) {
	await prisma.$transaction(async (tx) => {
		const order = await lockAndLoad(tx, id, admin);
		const to = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
		await applyTransition(tx, order, to, admin.role, {
			actorId: admin.id,
			note: input.note,
			data: { adminNote: input.note ?? null },
		});
	});
	return loadDetail(id);
}

async function assertAssignableTechnician(
	tx: Tx,
	technicianId: string,
	categoryId: string,
): Promise<void> {
	const technician = await tx.user.findFirst({
		where: {
			id: technicianId,
			role: "TECHNICIAN",
			status: "ACTIVE",
			deletedAt: null,
		},
		select: {
			name: true,
			technicianProfile: {
				select: {
					isAvailable: true,
					skills: { where: { id: categoryId }, select: { id: true } },
				},
			},
		},
	});
	if (!technician?.technicianProfile) {
		throw AppError.badRequest("Technician not found or inactive", [
			{ path: "technicianId", message: "Must be an active technician" },
		]);
	}
	if (!technician.technicianProfile.isAvailable) {
		throw AppError.conflict(
			`${technician.name} is currently marked unavailable`,
		);
	}
	if (technician.technicianProfile.skills.length === 0) {
		throw AppError.badRequest(
			`${technician.name} does not have the skill for this service category`,
			[{ path: "technicianId", message: "Skill mismatch" }],
		);
	}
}

async function assign(
	id: string,
	input: AssignWorkOrderInput,
	admin: AuthUser,
) {
	const window = { start: input.scheduledStart, end: input.scheduledEnd };

	await prisma.$transaction(async (tx) => {
		const order = await lockAndLoad(tx, id, admin);
		assertTransition(order.status, "ASSIGNED", admin.role);
		await assertAssignableTechnician(tx, input.technicianId, order.categoryId);

		await lockTechnician(tx, input.technicianId);
		const conflict = await findScheduleConflict(
			tx,
			input.technicianId,
			window,
			order.id,
		);
		if (conflict) {
			throw AppError.conflict(
				`Technician is already booked for ${conflict.code} from ` +
					`${conflict.scheduledStart?.toISOString()} to ${conflict.scheduledEnd?.toISOString()}`,
			);
		}

		await applyTransition(tx, order, "ASSIGNED", admin.role, {
			actorId: admin.id,
			data: {
				technicianId: input.technicianId,
				scheduledStart: input.scheduledStart,
				scheduledEnd: input.scheduledEnd,
			},
		});
		await recordAudit(
			{
				actorId: admin.id,
				action: AuditAction.WORK_ORDER_ASSIGNED,
				entity: "WorkOrder",
				entityId: order.id,
				before: {
					technicianId: order.technicianId,
					scheduledStart: order.scheduledStart?.toISOString() ?? null,
				},
				after: {
					technicianId: input.technicianId,
					scheduledStart: input.scheduledStart.toISOString(),
					scheduledEnd: input.scheduledEnd.toISOString(),
				},
			},
			tx,
		);
	});
	return loadDetail(id);
}

async function updateStatus(
	id: string,
	input: UpdateStatusInput,
	user: AuthUser,
) {
	await prisma.$transaction(async (tx) => {
		const order = await lockAndLoad(tx, id, user);
		await applyTransition(tx, order, input.status, user.role, {
			actorId: user.id,
			note: input.note,
		});
	});
	return loadDetail(id);
}

async function cancel(id: string, reason: string, user: AuthUser) {
	await prisma.$transaction(async (tx) => {
		const order = await lockAndLoad(tx, id, user);
		await applyTransition(tx, order, "CANCELLED", user.role, {
			actorId: user.id,
			note: reason,
			data: { cancelReason: reason },
		});
	});
	return loadDetail(id);
}

function sumPartsCost(parts: ServiceReportInput["partsUsed"]): Prisma.Decimal {
	return parts.reduce(
		(sum, part) => sum.plus(new Prisma.Decimal(part.unitCost).times(part.qty)),
		new Prisma.Decimal(0),
	);
}

/**
 * Technician completes the job: report + COMPLETED + invoice + job counter,
 * all-or-nothing in one transaction.
 */
async function submitReport(
	id: string,
	input: ServiceReportInput,
	technician: AuthUser,
) {
	const partsCost = sumPartsCost(input.partsUsed);
	if (partsCost.greaterThan(MAX_PARTS_COST)) {
		throw AppError.badRequest("Total parts cost is too large", [
			{ path: "partsUsed", message: `Must not exceed ${MAX_PARTS_COST}` },
		]);
	}

	await prisma.$transaction(async (tx) => {
		const order = await lockAndLoad(tx, id, technician);
		await applyTransition(tx, order, "COMPLETED", technician.role, {
			actorId: technician.id,
		});

		await tx.serviceReport.create({
			data: {
				workOrderId: id,
				workDone: input.workDone,
				partsUsed: input.partsUsed,
				partsCost,
				laborMinutes: input.laborMinutes,
			},
		});

		const { basePrice } = await tx.serviceCategory.findUniqueOrThrow({
			where: { id: order.categoryId },
			select: { basePrice: true },
		});
		const invoice = await tx.invoice.create({
			data: {
				invoiceNo: generateInvoiceNo(),
				workOrderId: id,
				serviceFee: basePrice,
				partsCost,
				total: basePrice.plus(partsCost),
			},
		});

		await tx.technicianProfile.update({
			where: { userId: technician.id },
			data: { totalJobs: { increment: 1 } },
		});

		await recordAudit(
			{
				actorId: technician.id,
				action: AuditAction.SERVICE_REPORT_SUBMITTED,
				entity: "WorkOrder",
				entityId: id,
				after: {
					partsCost: partsCost.toString(),
					laborMinutes: input.laborMinutes,
				},
			},
			tx,
		);
		await recordAudit(
			{
				actorId: null,
				action: AuditAction.INVOICE_ISSUED,
				entity: "Invoice",
				entityId: invoice.id,
				after: {
					invoiceNo: invoice.invoiceNo,
					total: invoice.total.toString(),
				},
			},
			tx,
		);
	});
	return loadDetail(id);
}

export const workOrderWorkflow = {
	review,
	assign,
	updateStatus,
	cancel,
	submitReport,
};
