import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { uuidSchema } from "../../utils/validators";

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
	})
	.refine((data) => Boolean(data.from) === Boolean(data.to), {
		message: "Provide both from and to to check availability in a time window",
		path: ["to"],
	})
	.refine((data) => !data.from || !data.to || data.to > data.from, {
		message: "to must be after from",
		path: ["to"],
	});

export const myJobsQuerySchema = paginationQuerySchema.extend({
	status: z
		.enum([
			"ASSIGNED",
			"EN_ROUTE",
			"IN_PROGRESS",
			"COMPLETED",
			"PAID",
			"CANCELLED",
		])
		.optional(),
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
		.optional(),
});

export const technicianFeedbackQuerySchema = paginationQuerySchema;

export const technicianIdParamSchema = z.object({ id: uuidSchema });

export type ListTechniciansQuery = z.infer<typeof listTechniciansQuerySchema>;
export type MyJobsQuery = z.infer<typeof myJobsQuerySchema>;
