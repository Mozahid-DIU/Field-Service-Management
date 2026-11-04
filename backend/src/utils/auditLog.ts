import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../config/prisma";

type Db = PrismaClient | Prisma.TransactionClient;

export const AuditAction = {
	USER_REGISTERED: "USER_REGISTERED",
	USER_ROLE_CHANGED: "USER_ROLE_CHANGED",
	USER_STATUS_CHANGED: "USER_STATUS_CHANGED",
	TECHNICIAN_CREATED: "TECHNICIAN_CREATED",
	PASSWORD_CHANGED: "PASSWORD_CHANGED",
	CATEGORY_CREATED: "CATEGORY_CREATED",
	CATEGORY_UPDATED: "CATEGORY_UPDATED",
	CATEGORY_DELETED: "CATEGORY_DELETED",
	WORK_ORDER_CREATED: "WORK_ORDER_CREATED",
	WORK_ORDER_UPDATED: "WORK_ORDER_UPDATED",
	WORK_ORDER_DELETED: "WORK_ORDER_DELETED",
	WORK_ORDER_STATUS_CHANGED: "WORK_ORDER_STATUS_CHANGED",
	WORK_ORDER_ASSIGNED: "WORK_ORDER_ASSIGNED",
	SERVICE_REPORT_SUBMITTED: "SERVICE_REPORT_SUBMITTED",
	INVOICE_ISSUED: "INVOICE_ISSUED",
	PAYMENT_INITIATED: "PAYMENT_INITIATED",
	PAYMENT_SUCCEEDED: "PAYMENT_SUCCEEDED",
	PAYMENT_FAILED: "PAYMENT_FAILED",
	FEEDBACK_SUBMITTED: "FEEDBACK_SUBMITTED",
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditEntry {
	actorId: string | null;
	action: AuditActionType;
	entity: string;
	entityId: string;
	before?: Prisma.InputJsonValue;
	after?: Prisma.InputJsonValue;
	ip?: string;
}

/** Pass the transaction client so the log is committed atomically with the change. */
export async function recordAudit(
	entry: AuditEntry,
	db: Db = prisma,
): Promise<void> {
	await db.auditLog.create({ data: entry });
}
