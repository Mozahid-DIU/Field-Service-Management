import type { Role, WorkOrderStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../utils/AppError";

/** SYSTEM = transitions triggered by the server itself (e.g. verified payment). */
export type Actor = Role | "SYSTEM";

type TransitionTable = Record<
	WorkOrderStatus,
	Partial<Record<WorkOrderStatus, readonly Actor[]>>
>;

/**
 * Single source of truth for the work-order lifecycle:
 * PENDING → APPROVED → ASSIGNED → EN_ROUTE → IN_PROGRESS → COMPLETED → PAID
 */
export const TRANSITIONS: TransitionTable = {
	PENDING: {
		APPROVED: ["ADMIN"],
		REJECTED: ["ADMIN"],
		CANCELLED: ["CUSTOMER", "ADMIN"],
	},
	APPROVED: {
		ASSIGNED: ["ADMIN"],
		CANCELLED: ["CUSTOMER", "ADMIN"],
	},
	ASSIGNED: {
		ASSIGNED: ["ADMIN"], // re-assignment / reschedule
		EN_ROUTE: ["TECHNICIAN", "ADMIN"],
		CANCELLED: ["CUSTOMER", "ADMIN"],
	},
	EN_ROUTE: {
		IN_PROGRESS: ["TECHNICIAN", "ADMIN"],
	},
	IN_PROGRESS: {
		COMPLETED: ["TECHNICIAN"],
	},
	COMPLETED: {
		PAID: ["SYSTEM"],
	},
	PAID: {},
	REJECTED: {},
	CANCELLED: {},
};

export function allowedNextStatuses(
	from: WorkOrderStatus,
	actor: Actor,
): WorkOrderStatus[] {
	return (
		Object.entries(TRANSITIONS[from]) as [WorkOrderStatus, readonly Actor[]][]
	)
		.filter(([, actors]) => actors.includes(actor))
		.map(([status]) => status);
}

/** Throws 409 for an impossible move, 403 when the move exists but not for this actor. */
export function assertTransition(
	from: WorkOrderStatus,
	to: WorkOrderStatus,
	actor: Actor,
): void {
	const actors = TRANSITIONS[from][to];
	if (!actors) {
		const next = Object.keys(TRANSITIONS[from]);
		throw new AppError(
			StatusCodes.CONFLICT,
			`Cannot change status from ${from} to ${to}`,
			[
				{
					path: "status",
					message: next.length
						? `Allowed next statuses: ${next.join(", ")}`
						: `${from} is a final status`,
				},
			],
		);
	}
	if (!actors.includes(actor)) {
		throw AppError.forbidden(
			`Only ${actors.join(" or ")} can change status from ${from} to ${to}`,
		);
	}
}

export const ACTIVE_SCHEDULE_STATUSES: WorkOrderStatus[] = [
	"ASSIGNED",
	"EN_ROUTE",
	"IN_PROGRESS",
];
