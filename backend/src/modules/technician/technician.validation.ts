import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { uuidSchema } from "../../utils/validators";
import { statusListSchema } from "../workOrder/workOrder.validation";

const booleanQuery = z
	.enum(["true", "false"])
	.transform((value) => value === "true");

export const listTechniciansQuerySchema = paginationQuerySchema
	.extend({
		categoryId: uuidSchema.optional(),
		available: booleanQuery.optional(),
		q: z.string().trim().min(1).max(100).optional(),
		from: z.coerce.date().optional(),
		to: z.coerce.date().optional(),
		sortBy: z.enum(["avgRating", "totalJobs", "name"]).default("avgRating"),
		/** when rescheduling, that order's own slot must not mark its technician busy */
		excludeOrderId: uuidSchema.optional(),
	})
	.refine((data) => Boolean(data.from) === Boolean(data.to), {
		message: "Provide both from and to to check availability in a time window",
		path: ["to"],
	})
	.refine((data) => !data.from || !data.to || data.to > data.from, {
		message: "to must be after from",
		path: ["to"],
	});

/**
 * Day filter: prefer from/to (the client's local day as ISO instants) so a
 * Bangladesh technician's "today" is not shifted by the UTC offset; `date`
 * (UTC day) is kept for API clients like Postman.
 */
export const myJobsQuerySchema = paginationQuerySchema
	.extend({
		status: statusListSchema.optional(),
		date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
			.optional(),
		from: z.coerce.date().optional(),
		to: z.coerce.date().optional(),
	})
	.refine((q) => Boolean(q.from) === Boolean(q.to), {
		message: "Provide both from and to",
		path: ["to"],
	});

export const technicianFeedbackQuerySchema = paginationQuerySchema;

export const technicianIdParamSchema = z.object({ id: uuidSchema });

export type ListTechniciansQuery = z.infer<typeof listTechniciansQuerySchema>;
export type MyJobsQuery = z.infer<typeof myJobsQuerySchema>;
