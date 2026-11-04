import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../config/prisma";
import type { AuthUser } from "../../types/express";
import { AppError } from "../../utils/AppError";
import { AuditAction, recordAudit } from "../../utils/auditLog";
import { generateWorkOrderCode } from "../../utils/codeGenerator";
import { buildMeta, toSkipTake } from "../../utils/pagination";
import {
	loadAccessibleOrder,
	scopeForUser,
	workOrderDetailInclude,
	workOrderListInclude,
} from "./workOrder.access";
import type {
	CreateWorkOrderInput,
	ListWorkOrdersQuery,
	UpdateWorkOrderInput,
} from "./workOrder.validation";

const CODE_RETRY_LIMIT = 3;
const UNIQUE_VIOLATION = "P2002";

async function assertActiveCategory(categoryId: string): Promise<void> {
	const category = await prisma.serviceCategory.findFirst({
		where: { id: categoryId, isActive: true, deletedAt: null },
		select: { id: true },
	});
	if (!category) {
		throw AppError.badRequest("Selected service category is not available", [
			{ path: "categoryId", message: "Unknown or inactive category" },
		]);
	}
}

async function create(input: CreateWorkOrderInput, customer: AuthUser) {
	await assertActiveCategory(input.categoryId);

	// Retry on the (very unlikely) random code collision
	for (let attempt = 1; attempt <= CODE_RETRY_LIMIT; attempt++) {
		try {
			return await prisma.$transaction(async (tx) => {
				const order = await tx.workOrder.create({
					data: {
						...input,
						code: generateWorkOrderCode(),
						customerId: customer.id,
					},
					include: workOrderListInclude,
				});
				await recordAudit(
					{
						actorId: customer.id,
						action: AuditAction.WORK_ORDER_CREATED,
						entity: "WorkOrder",
						entityId: order.id,
						after: { status: order.status, code: order.code },
					},
					tx,
				);
				return order;
			});
		} catch (error) {
			const isCodeClash =
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === UNIQUE_VIOLATION &&
				attempt < CODE_RETRY_LIMIT;
			if (!isCodeClash) throw error;
		}
	}
	throw new AppError(
		StatusCodes.INTERNAL_SERVER_ERROR,
		"Could not generate a work order code",
	);
}

function buildWhere(
	query: ListWorkOrdersQuery,
	user: AuthUser,
): Prisma.WorkOrderWhereInput {
	const isAdmin = user.role === "ADMIN";
	return {
		deletedAt: null,
		...scopeForUser(user),
		...(query.status ? { status: { in: query.status } } : {}),
		...(query.priority ? { priority: query.priority } : {}),
		...(query.categoryId ? { categoryId: query.categoryId } : {}),
		// Only admins may filter by arbitrary customer / technician
		...(isAdmin && query.technicianId
			? { technicianId: query.technicianId }
			: {}),
		...(isAdmin && query.customerId ? { customerId: query.customerId } : {}),
		...(query.from || query.to
			? {
					createdAt: {
						...(query.from ? { gte: query.from } : {}),
						...(query.to ? { lte: query.to } : {}),
					},
				}
			: {}),
		...(query.q
			? {
					OR: [
						{ code: { contains: query.q, mode: "insensitive" } },
						{ title: { contains: query.q, mode: "insensitive" } },
						{ description: { contains: query.q, mode: "insensitive" } },
						{ address: { contains: query.q, mode: "insensitive" } },
					],
				}
			: {}),
	};
}

async function list(query: ListWorkOrdersQuery, user: AuthUser) {
	const where = buildWhere(query, user);
	const [data, total] = await prisma.$transaction([
		prisma.workOrder.findMany({
			where,
			include: workOrderListInclude,
			orderBy: [{ [query.sortBy]: query.sortOrder }, { createdAt: "desc" }],
			...toSkipTake(query),
		}),
		prisma.workOrder.count({ where }),
	]);
	return { data, meta: buildMeta(query, total) };
}

async function getById(id: string, user: AuthUser) {
	await loadAccessibleOrder(id, user);
	return prisma.workOrder.findUniqueOrThrow({
		where: { id },
		include: workOrderDetailInclude,
	});
}

async function update(id: string, input: UpdateWorkOrderInput, user: AuthUser) {
	const order = await loadAccessibleOrder(id, user);
	if (order.customerId !== user.id) {
		throw AppError.forbidden("Only the customer who created it can edit it");
	}
	if (order.status !== "PENDING") {
		throw AppError.conflict(
			`Work order can only be edited while PENDING (current: ${order.status})`,
		);
	}
	if (input.categoryId) await assertActiveCategory(input.categoryId);

	return prisma.$transaction(async (tx) => {
		// Status guard in the WHERE clause: an admin approving at the same moment wins
		const guarded = await tx.workOrder.updateMany({
			where: { id, status: "PENDING", deletedAt: null },
			data: input,
		});
		if (guarded.count === 0) {
			throw AppError.conflict(
				"Work order is no longer PENDING and can't be edited",
			);
		}
		const updated = await tx.workOrder.findUniqueOrThrow({
			where: { id },
			include: workOrderListInclude,
		});
		await recordAudit(
			{
				actorId: user.id,
				action: AuditAction.WORK_ORDER_UPDATED,
				entity: "WorkOrder",
				entityId: id,
				before: {
					title: order.title,
					address: order.address,
					priority: order.priority,
				},
				after: { ...input } as Prisma.InputJsonValue,
			},
			tx,
		);
		return updated;
	});
}

async function softDelete(id: string, admin: AuthUser) {
	const order = await loadAccessibleOrder(id, admin);
	await prisma.$transaction(async (tx) => {
		await tx.workOrder.update({
			where: { id },
			data: { deletedAt: new Date() },
		});
		await recordAudit(
			{
				actorId: admin.id,
				action: AuditAction.WORK_ORDER_DELETED,
				entity: "WorkOrder",
				entityId: id,
				before: { status: order.status, code: order.code },
			},
			tx,
		);
	});
}

async function history(id: string, user: AuthUser) {
	await loadAccessibleOrder(id, user);
	return prisma.auditLog.findMany({
		where: { entity: "WorkOrder", entityId: id },
		select: {
			id: true,
			action: true,
			before: true,
			after: true,
			createdAt: true,
			actor: { select: { id: true, name: true, role: true } },
		},
		orderBy: { createdAt: "asc" },
	});
}

export const workOrderService = {
	create,
	list,
	getById,
	update,
	softDelete,
	history,
};
