"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { Logo } from "@/components/brand";
import { StatusPill } from "@/components/ui/badges";
import { homeFor, useAuth } from "@/lib/auth-store";

const BOARD = [
	{ code: "WO-1104-3FA9", title: "AC not cooling", who: "Karim · 10:00", status: "EN_ROUTE" as const },
	{ code: "WO-1104-81C2", title: "Kitchen sink leak", who: "Rafiq · 12:30", status: "ASSIGNED" as const },
	{ code: "WO-1103-7D10", title: "Main breaker tripping", who: "Sumon · paid ৳1,650", status: "PAID" as const },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
	const { status, user } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (status === "authenticated" && user) router.replace(homeFor(user.role));
	}, [status, user, router]);

	return (
		<div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
			<div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
				<Logo />
				<div className="flex flex-1 items-center py-10">
					<div className="mx-auto w-full max-w-md animate-rise">{children}</div>
				</div>
				<p className="text-xs text-ink-faint">© {new Date().getFullYear()} FixFlow · Payments secured by bKash</p>
			</div>

			{/* Visual side: a live dispatch board, the product in one glance */}
			<aside className="relative hidden overflow-hidden bg-ink p-12 text-paper lg:flex lg:flex-col lg:justify-between">
				<div
					className="pointer-events-none absolute inset-0 opacity-[0.07]"
					style={{
						backgroundImage:
							"linear-gradient(var(--paper) 1px, transparent 1px), linear-gradient(90deg, var(--paper) 1px, transparent 1px)",
						backgroundSize: "44px 44px",
					}}
					aria-hidden
				/>
				<div className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-signal/25 blur-[120px]" aria-hidden />

				<div className="relative">
					<p className="font-mono text-xs tracking-[0.2em] text-signal uppercase">Dispatch board · live</p>
					<h2 className="mt-4 max-w-md font-display text-5xl leading-[0.95] font-bold tracking-tight">
						Every repair,
						<br />
						<span className="text-signal">tracked</span> door to door.
					</h2>
				</div>

				<ul className="relative flex flex-col gap-3 stagger">
					{BOARD.map((item, index) => (
						<li
							key={item.code}
							className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur"
							style={{ marginLeft: index * 28 }}
						>
							<div>
								<p className="font-mono text-[11px] text-paper/50">{item.code}</p>
								<p className="font-display text-lg font-semibold">{item.title}</p>
								<p className="text-sm text-paper/60">{item.who}</p>
							</div>
							<StatusPill status={item.status} />
						</li>
					))}
				</ul>

				<dl className="relative grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
					{[
						["3 roles", "customer · tech · admin"],
						["0", "double bookings"],
						["bKash", "verified payments"],
					].map(([value, label]) => (
						<div key={label}>
							<dt className="font-display text-2xl font-bold">{value}</dt>
							<dd className="text-xs text-paper/50">{label}</dd>
						</div>
					))}
				</dl>
			</aside>
		</div>
	);
}
