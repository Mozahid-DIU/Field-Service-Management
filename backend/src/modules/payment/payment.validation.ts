import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { uuidSchema } from "../../utils/validators";

export const initiatePaymentSchema = z
	.object({ invoiceId: uuidSchema })
	.strict();

/** bKash redirects the browser here with these query params. */
export const bkashCallbackQuerySchema = z.object({
	paymentID: z.string().trim().min(1).max(100),
	status: z.enum(["success", "failure", "cancel"]),
	signature: z.string().optional(),
	apiVersion: z.string().optional(),
});

export const myPaymentsQuerySchema = paginationQuerySchema.extend({
	status: z.enum(["INITIATED", "SUCCESS", "FAILED", "CANCELLED"]).optional(),
});

export type BkashCallbackQuery = z.infer<typeof bkashCallbackQuerySchema>;
export type MyPaymentsQuery = z.infer<typeof myPaymentsQuerySchema>;
