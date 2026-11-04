import type { Prisma, WorkOrder } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthUser } from "../../types/express";
import { AppError } from "../../utils/AppError";

export const workOrderListInclude = {
	category: { select: { id: true, name: true, basePrice: true } },
	customer: { select: { id: true, name: true, phone: true } },
	technician: { select: { id: true, name: true, phone: true } },
	invoice: { select: { id: true, invoiceNo: true, status: true, total: true } },
} satisfies Prisma.WorkOrderInclude;

export const workOrderDetailInclude = {
	...workOrderListInclude,
	customer: { select: { id: true, name: true, phone: true, email: true } },
	report: true,
	invoice: {
		include: {
			payments: {
				select: {
					id: true,
					status: true,
					amount: true,
					trxId: true,
					paidAt: true,
					createdAt: true,
				},
				orderBy: { createdAt: "desc" },
			},
		},
	},
	feedback: true,
} satisfies Prisma.WorkOrderInclude;

/** Row-level visibility: customers see their own, technicians their assigned, admins all. */
export function scopeForUser(user: AuthUser): Prisma.WorkOrderWhereInput {
	switch (user.role) {
		case "CUSTOMER":
			return { customerId: user.id };
		case "TECHNICIAN":
			return { technicianId: user.id };
		default:
			return {};
	}
}

export function assertCanView(
	order: Pick<WorkOrder, "customerId" | "technicianId">,
	user: AuthUser,
): void {
	const allowed =
		user.role === "ADMIN" ||
		(user.role === "CUSTOMER" && order.customerId === user.id) ||
		(user.role === "TECHNICIAN" && order.technicianId === user.id);
	if (!allowed) {
		throw AppError.forbidden("You do not have access to this work order");
	}
}

/** Loads a non-deleted work order and enforces row-level access. */
export async function loadAccessibleOrder(
	id: string,
	user: AuthUser,
	db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<WorkOrder> {
	const order = await db.workOrder.findFirst({
		where: { id, deletedAt: null },
	});
	if (!order) throw AppError.notFound("Work order");
	assertCanView(order, user);
	return order;
}
