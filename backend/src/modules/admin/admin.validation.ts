import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { uuidSchema } from "../../utils/validators";
import {
	emailSchema,
	nameSchema,
	passwordSchema,
	phoneSchema,
} from "../auth/auth.validation";

const ROLES = ["CUSTOMER", "TECHNICIAN", "ADMIN"] as const;

export const listUsersQuerySchema = paginationQuerySchema.extend({
	role: z.enum(ROLES).optional(),
	status: z.enum(["ACTIVE", "BLOCKED"]).optional(),
	q: z.string().trim().min(1).max(100).optional(),
	sortBy: z.enum(["createdAt", "name", "email"]).default("createdAt"),
	includeDeleted: z
		.enum(["true", "false"])
		.transform((value) => value === "true")
		.default(false),
});

export const createTechnicianSchema = z
	.object({
		name: nameSchema,
		email: emailSchema,
		password: passwordSchema,
		phone: phoneSchema.optional(),
		bio: z.string().trim().max(500).optional(),
		skillIds: z.array(uuidSchema).min(1, "Select at least one skill").max(10),
	})
	.strict();

export const changeRoleSchema = z.object({ role: z.enum(ROLES) }).strict();

export const changeStatusSchema = z
	.object({
		status: z.enum(["ACTIVE", "BLOCKED"]),
		reason: z.string().trim().max(300).optional(),
	})
	.strict();

export const auditLogQuerySchema = paginationQuerySchema.extend({
	entity: z.string().trim().max(40).optional(),
	entityId: z.string().trim().max(64).optional(),
	actorId: uuidSchema.optional(),
	action: z.string().trim().toUpperCase().max(60).optional(),
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateTechnicianInput = z.infer<typeof createTechnicianSchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
