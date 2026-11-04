import { z } from "zod";
import { uuidSchema } from "../../utils/validators";
import { nameSchema, phoneSchema } from "../auth/auth.validation";

export const updateMeSchema = z
	.object({
		name: nameSchema.optional(),
		phone: phoneSchema.nullable().optional(),
		avatarUrl: z.string().url("Invalid avatar URL").nullable().optional(),
	})
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: "Provide at least one field to update",
	});

export const updateTechnicianProfileSchema = z
	.object({
		bio: z.string().trim().max(500).nullable().optional(),
		isAvailable: z.boolean().optional(),
		skillIds: z
			.array(uuidSchema)
			.min(1, "Select at least one skill")
			.max(10)
			.optional(),
	})
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: "Provide at least one field to update",
	});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type UpdateTechnicianProfileInput = z.infer<
	typeof updateTechnicianProfileSchema
>;
