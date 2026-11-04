import { z } from "zod";

export const emailSchema = z
	.string({ error: "Email is required" })
	.trim()
	.toLowerCase()
	.email("Invalid email format")
	.max(255);

export const passwordSchema = z
	.string({ error: "Password is required" })
	.min(8, "Password must be at least 8 characters")
	.max(64, "Password must be at most 64 characters")
	.regex(/[A-Za-z]/, "Password must contain at least one letter")
	.regex(/\d/, "Password must contain at least one number");

export const phoneSchema = z
	.string()
	.trim()
	.regex(
		/^(?:\+?88)?01[3-9]\d{8}$/,
		"Invalid Bangladeshi phone number (e.g. 01712345678)",
	);

export const nameSchema = z
	.string({ error: "Name is required" })
	.trim()
	.min(2, "Name must be at least 2 characters")
	.max(100);

export const registerSchema = z.object({
	name: nameSchema,
	email: emailSchema,
	password: passwordSchema,
	phone: phoneSchema.optional(),
});

export const loginSchema = z.object({
	email: emailSchema,
	password: z.string({ error: "Password is required" }).min(1),
});

export const googleLoginSchema = z.object({
	idToken: z.string({ error: "idToken is required" }).min(20),
});

export const refreshTokenSchema = z.object({
	refreshToken: z.string().min(20).optional(),
});

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Current password is required"),
		newPassword: passwordSchema,
	})
	.refine((data) => data.currentPassword !== data.newPassword, {
		message: "New password must be different from the current password",
		path: ["newPassword"],
	});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
