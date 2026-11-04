"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input } from "@/components/ui/field";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { authStore, homeFor } from "@/lib/auth-store";
import { cn } from "@/lib/format";
import type { ApiSuccess, AuthPayload } from "@/lib/types";

const schema = z.object({
	name: z.string().trim().min(2, "Enter your full name"),
	email: z.string().trim().email("Enter a valid email"),
	phone: z
		.string()
		.trim()
		.regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Use a Bangladeshi number, e.g. 01712345678")
		.or(z.literal("")),
	password: z
		.string()
		.min(8, "At least 8 characters")
		.regex(/[A-Za-z]/, "Add a letter")
		.regex(/\d/, "Add a number"),
});
type Values = z.infer<typeof schema>;

const RULES = [
	{ test: (v: string) => v.length >= 8, label: "8+ characters" },
	{ test: (v: string) => /[A-Za-z]/.test(v), label: "a letter" },
	{ test: (v: string) => /\d/.test(v), label: "a number" },
];

export default function RegisterPage() {
	const router = useRouter();
	const {
		register,
		handleSubmit,
		control,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { phone: "" } });
	const password = useWatch({ control, name: "password" }) ?? "";

	const finish = (payload: AuthPayload) => {
		authStore.signIn(payload.user, payload.accessToken);
		toast.success("Welcome to FixFlow!");
		router.replace(homeFor(payload.user.role));
	};

	const onSubmit = handleSubmit(async ({ phone, ...values }) => {
		try {
			const res = await api.post<ApiSuccess<AuthPayload>>("/auth/register", {
				...values,
				...(phone ? { phone } : {}),
			});
			finish(res.data.data);
		} catch (error) {
			const serverErrors = fieldErrors(error);
			for (const e of serverErrors) {
				if (e.path in schema.shape) setError(e.path as keyof Values, { message: e.message });
			}
			toast.error(errorMessage(error, "Could not create your account"));
		}
	});

	return (
		<>
			<h1 className="text-[28px] font-bold tracking-tight">Create your account</h1>
			<p className="mt-1 text-ink-soft">It only takes a minute.</p>

			<div className="mt-8">
				<GoogleButton onSuccess={finish} />
				<form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
					<Field label="Full name" htmlFor="name" error={errors.name?.message}>
						<Input autoComplete="name" placeholder="Rahim Uddin" {...describedBy("name", errors.name?.message)} {...register("name")} />
					</Field>
					<Field label="Email" htmlFor="email" error={errors.email?.message}>
						<Input type="email" autoComplete="email" placeholder="you@example.com" {...describedBy("email", errors.email?.message)} {...register("email")} />
					</Field>
					<Field label="Phone" htmlFor="phone" optional error={errors.phone?.message} hint="So your technician can call you.">
						<Input type="tel" autoComplete="tel" inputMode="tel" placeholder="01712345678" {...describedBy("phone", errors.phone?.message)} {...register("phone")} />
					</Field>
					<Field label="Password" htmlFor="password" error={errors.password?.message}>
						<Input type="password" autoComplete="new-password" {...describedBy("password", errors.password?.message)} {...register("password")} />
					</Field>
					<ul className="-mt-1 flex flex-wrap gap-x-4 gap-y-1" aria-label="Password requirements">
						{RULES.map((rule) => {
							const ok = rule.test(password);
							return (
								<li key={rule.label} className={cn("flex items-center gap-1 text-xs transition-colors", ok ? "text-[var(--st-completed)]" : "text-ink-faint")}>
									<Check className={cn("size-3.5", !ok && "opacity-30")} aria-hidden />
									{rule.label}
								</li>
							);
						})}
					</ul>
					<Button type="submit" size="lg" loading={isSubmitting} className="mt-2">
						Create account <ArrowRight className="size-4" />
					</Button>
				</form>
			</div>

			<p className="mt-8 text-center text-sm text-ink-soft">
				Already have an account?{" "}
				<Link href="/login" className="font-semibold text-signal-strong hover:underline">
					Sign in
				</Link>
			</p>
		</>
	);
}
