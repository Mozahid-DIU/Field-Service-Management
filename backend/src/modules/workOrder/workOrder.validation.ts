import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { moneySchema, uuidSchema } from "../../utils/validators";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const STATUSES = [
	"PENDING",
	"APPROVED",
	"REJECTED",
	"ASSIGNED",
	"EN_ROUTE",
	"IN_PROGRESS",
	"COMPLETED",
	"PAID",
	"CANCELLED",
] as const;
const SORT_FIELDS = [
	"createdAt",
	"updatedAt",
	"scheduledStart",
	"priority",
	"status",
] as const;

const MAX_IMAGES = 5;
const MAX_JOB_HOURS = 12;
const HOUR_MS = 60 * 60 * 1000;

const futureDate = (label: string) =>
	z.coerce
		.date({ error: `${label} must be a valid date` })
		.refine((date) => date.getTime() > Date.now(), {
			message: `${label} must be in the future`,
		});

export const createWorkOrderSchema = z
	.object({
		categoryId: uuidSchema,
		title: z.string().trim().min(5).max(150),
		description: z.string().trim().min(10).max(2000),
		address: z.string().trim().min(5).max(300),
		priority: z.enum(PRIORITIES).default("MEDIUM"),
		preferredDate: futureDate("Preferred date").optional(),
		images: z.array(z.string().url()).max(MAX_IMAGES).default([]),
	})
	.strict();

export const updateWorkOrderSchema = createWorkOrderSchema
	.omit({ images: true })
	.partial()
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: "Provide at least one field to update",
	});

/** Accepts ?status=PENDING or ?status=PENDING,APPROVED */
export const statusListSchema = z
	.string()
	.transform((value) => value.split(",").map((s) => s.trim().toUpperCase()))
	.pipe(z.array(z.enum(STATUSES)).min(1));

export const listWorkOrdersQuerySchema = paginationQuerySchema.extend({
	status: statusListSchema.optional(),
	priority: z.enum(PRIORITIES).optional(),
	categoryId: uuidSchema.optional(),
	technicianId: uuidSchema.optional(),
	customerId: uuidSchema.optional(),
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional(),
	sortBy: z.enum(SORT_FIELDS).default("createdAt"),
	q: z.string().trim().min(1).max(100).optional(),
});

export const searchWorkOrdersQuerySchema = listWorkOrdersQuerySchema.extend({
	q: z.string({ error: "Search term q is required" }).trim().min(1).max(100),
});

export const reviewWorkOrderSchema = z
	.object({
		decision: z.enum(["APPROVE", "REJECT"]),
		note: z.string().trim().max(500).optional(),
	})
	.strict()
	.refine((data) => data.decision === "APPROVE" || Boolean(data.note), {
		message: "A note explaining the rejection is required",
		path: ["note"],
	});

export const assignWorkOrderSchema = z
	.object({
		technicianId: uuidSchema,
		scheduledStart: futureDate("Scheduled start"),
		scheduledEnd: z.coerce.date({
			error: "Scheduled end must be a valid date",
		}),
	})
	.strict()
	.refine((data) => data.scheduledEnd > data.scheduledStart, {
		message: "Scheduled end must be after scheduled start",
		path: ["scheduledEnd"],
	})
	.refine(
		(data) =>
			data.scheduledEnd.getTime() - data.scheduledStart.getTime() <=
			MAX_JOB_HOURS * HOUR_MS,
		{
			message: `A visit cannot be longer than ${MAX_JOB_HOURS} hours`,
			path: ["scheduledEnd"],
		},
	);

export const updateStatusSchema = z
	.object({
		status: z.enum(["EN_ROUTE", "IN_PROGRESS"], {
			error:
				"status must be EN_ROUTE or IN_PROGRESS (use /report to complete, /cancel to cancel)",
		}),
		note: z.string().trim().max(500).optional(),
	})
	.strict();

export const cancelWorkOrderSchema = z
	.object({
		reason: z
			.string()
			.trim()
			.min(3, "Please give a cancellation reason")
			.max(500),
	})
	.strict();

const partSchema = z
	.object({
		name: z.string().trim().min(1).max(100),
		qty: z.coerce.number().int().min(1).max(1000),
		unitCost: moneySchema,
	})
	.strict();

export const serviceReportSchema = z
	.object({
		workDone: z.string().trim().min(10).max(2000),
		partsUsed: z.array(partSchema).max(50).default([]),
		laborMinutes: z.coerce
			.number()
			.int()
			.min(1)
			.max(24 * 60),
	})
	.strict();

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
export type ListWorkOrdersQuery = z.infer<typeof listWorkOrdersQuerySchema>;
export type ReviewWorkOrderInput = z.infer<typeof reviewWorkOrderSchema>;
export type AssignWorkOrderInput = z.infer<typeof assignWorkOrderSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ServiceReportInput = z.infer<typeof serviceReportSchema>;
