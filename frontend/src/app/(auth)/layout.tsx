"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { Logo } from "@/components/brand";
import { homeFor, safeNext, useAuth } from "@/lib/auth-store";

export default function AuthLayout({ children }: { children: ReactNode }) {
	const { status, user } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (status !== "authenticated" || !user) return;
		// Respect ?next= so deep links and the landing booking form land where intended
		const next = safeNext(new URLSearchParams(window.location.search).get("next"));
		router.replace(next ?? homeFor(user.role));
	}, [status, user, router]);

	return (
		<div className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
			{/* soft colourful backdrop */}
			<div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-sky-50 to-amber-50" aria-hidden />
			<div className="pointer-events-none absolute -top-24 -left-24 -z-10 size-80 rounded-full bg-emerald-200/50 blur-3xl" aria-hidden />
			<div className="pointer-events-none absolute -right-24 -bottom-24 -z-10 size-80 rounded-full bg-amber-200/50 blur-3xl" aria-hidden />

			<Logo className="mb-6" />
			<div className="w-full max-w-md animate-rise rounded-3xl border border-white bg-card/95 p-6 shadow-[0_20px_50px_-20px_rgba(15,157,122,0.35)] backdrop-blur sm:p-8">
				{children}
			</div>
			<p className="mt-6 text-xs text-ink-faint">© {new Date().getFullYear()} FixFlow</p>
		</div>
	);
}
