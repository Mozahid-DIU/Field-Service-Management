"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, ShieldCheck, User, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input } from "@/components/ui/field";
import { api, errorMessage } from "@/lib/api";
import { authStore, homeFor } from "@/lib/auth-store";
import type { ApiSuccess, AuthPayload } from "@/lib/types";

const schema = z.object({
	email: z.string().trim().email("Enter a valid email"),
	password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

const DEMO = [
	{ label: "Admin", email: "admin@fixflow.com", password: "Admin@12345", icon: ShieldCheck },
	{ label: "Customer", email: "rahim@example.com", password: "Password@123", icon: User },
	{ label: "Technician", email: "karim.tech@fixflow.com", password: "Password@123", icon: Wrench },
];

function LoginForm() {
	const router = useRouter();
	const next = useSearchParams().get("next");
	const [showPassword, setShowPassword] = useState(false);
	const {
		register,
		handleSubmit,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<Values>({ resolver: zodResolver(schema) });

	const finish = (payload: AuthPayload) => {
		authStore.signIn(payload.user, payload.accessToken);
		toast.success(`Welcome back, ${payload.user.name.split(" ")[0]}`);
		const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : null;
		router.replace(safeNext ?? homeFor(payload.user.role));
	};

	const onSubmit = handleSubmit(async (values) => {
		try {
			const res = await api.post<ApiSuccess<AuthPayload>>("/auth/login", values);
			finish(res.data.data);
		} catch (error) {
			toast.error(errorMessage(error, "Could not sign in"));
		}
	});

	return (
		<>
			<h1 className="text-[28px] font-bold tracking-tight">Welcome back</h1>
			<p className="mt-1 text-ink-soft">Sign in to your FixFlow account.</p>

			<div className="mt-8">
				<GoogleButton onSuccess={finish} />
				<form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
					<Field label="Email" htmlFor="email" error={errors.email?.message}>
						<Input
							type="email"
							autoComplete="email"
							placeholder="you@example.com"
							{...describedBy("email", errors.email?.message)}
							{...register("email")}
						/>
					</Field>
					<Field label="Password" htmlFor="password" error={errors.password?.message}>
						<div className="relative">
							<Input
								type={showPassword ? "text" : "password"}
								autoComplete="current-password"
								className="pr-11"
								{...describedBy("password", errors.password?.message)}
								{...register("password")}
							/>
							<button
								type="button"
								onClick={() => setShowPassword((v) => !v)}
								className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-ink-faint hover:text-ink"
								aria-label={showPassword ? "Hide password" : "Show password"}
							>
								{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
							</button>
						</div>
					</Field>
					<Button type="submit" size="lg" loading={isSubmitting} className="mt-2">
						Sign in <ArrowRight className="size-4" />
					</Button>
				</form>
			</div>

			<div className="mt-8 rounded-2xl bg-paper p-4">
				<p className="text-sm font-semibold text-ink-soft">Try a demo account</p>
				<div className="mt-3 grid grid-cols-3 gap-2">
					{DEMO.map((demo) => (
						<button
							key={demo.label}
							type="button"
							onClick={() => {
								setValue("email", demo.email, { shouldValidate: true });
								setValue("password", demo.password, { shouldValidate: true });
							}}
							className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-line bg-card px-2 py-3 text-sm font-medium transition hover:border-signal hover:text-signal-strong"
						>
							<demo.icon className="size-4 text-signal" aria-hidden />
							{demo.label}
						</button>
					))}
				</div>
			</div>

			<p className="mt-8 text-center text-sm text-ink-soft">
				New to FixFlow?{" "}
				<Link href="/register" className="font-semibold text-signal-strong hover:underline">
					Create an account
				</Link>
			</p>
		</>
	);
}

export default function LoginPage() {
	return (
		<Suspense>
			<LoginForm />
		</Suspense>
	);
}
