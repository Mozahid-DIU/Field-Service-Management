import type { Prisma } from "@prisma/client";
import { ACTIVE_SCHEDULE_STATUSES } from "./workOrder.stateMachine";

type Db = Prisma.TransactionClient;

export interface TimeWindow {
	start: Date;
	end: Date;
}

/**
 * Two windows overlap when existing.start < new.end AND existing.end > new.start.
 * Back-to-back visits (one ends at 3:00, next starts at 3:00) do NOT overlap.
 */
export function overlapsWindow({
	start,
	end,
}: TimeWindow): Prisma.WorkOrderWhereInput {
	return {
		scheduledStart: { lt: end },
		scheduledEnd: { gt: start },
	};
}

export async function findScheduleConflict(
	db: Db,
	technicianId: string,
	window: TimeWindow,
	excludeOrderId?: string,
) {
	return db.workOrder.findFirst({
		where: {
			technicianId,
			deletedAt: null,
			status: { in: ACTIVE_SCHEDULE_STATUSES },
			...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
			...overlapsWindow(window),
		},
		select: { code: true, scheduledStart: true, scheduledEnd: true },
		orderBy: { scheduledStart: "asc" },
	});
}

/** Technician ids that already have an active job overlapping the window. */
export async function findBusyTechnicianIds(
	db: Db,
	window: TimeWindow,
	excludeOrderId?: string,
): Promise<Set<string>> {
	const busy = await db.workOrder.findMany({
		where: {
			deletedAt: null,
			technicianId: { not: null },
			...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
			status: { in: ACTIVE_SCHEDULE_STATUSES },
			...overlapsWindow(window),
		},
		select: { technicianId: true },
		distinct: ["technicianId"],
	});
	return new Set(busy.map((row) => row.technicianId as string));
}

/**
 * Row locks serialize concurrent assignments: two admins assigning the same
 * technician at the same moment queue on the technician row, so the second
 * transaction sees the first one's booking and gets a 409 instead of a double booking.
 */
export async function lockWorkOrder(
	db: Db,
	workOrderId: string,
): Promise<void> {
	await db.$queryRaw`SELECT id FROM "WorkOrder" WHERE id = ${workOrderId} FOR UPDATE`;
}

export async function lockTechnician(
	db: Db,
	technicianUserId: string,
): Promise<void> {
	await db.$queryRaw`SELECT id FROM "TechnicianProfile" WHERE "userId" = ${technicianUserId} FOR UPDATE`;
}
