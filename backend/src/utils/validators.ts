import { z } from "zod";

export const uuidSchema = z.string().uuid("Invalid id format");

export const idParamSchema = z.object({ id: uuidSchema });

export const moneySchema = z.coerce
	.number({ error: "Must be a number" })
	.nonnegative("Must not be negative")
	.max(1_000_000, "Amount is too large")
	.multipleOf(0.01, "At most 2 decimal places");

export type IdParam = z.infer<typeof idParamSchema>;
