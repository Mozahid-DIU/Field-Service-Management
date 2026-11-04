import { z } from "zod";
import { moneySchema } from "../../utils/validators";

export const createCategorySchema = z
	.object({
		name: z.string().trim().min(2).max(100),
		description: z.string().trim().max(500).optional(),
		basePrice: moneySchema.refine((value) => value > 0, {
			message: "Base price must be greater than 0",
		}),
		isActive: z.boolean().default(true),
	})
	.strict();

export const updateCategorySchema = createCategorySchema
	.partial()
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: "Provide at least one field to update",
	});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
