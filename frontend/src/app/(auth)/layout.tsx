"use client";

import { CheckCircle2, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { Logo } from "@/components/brand";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badges";
import { homeFor, useAuth } from "@/lib/auth-store";

const BENEFITS = [
	"Skilled technicians for AC, plumbing, electrical and more",
	"See when your technician is on the way",
	"Clear bill and easy payment with bKash",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
	const { status, user } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (status === "authenticated" && user) router.replace(homeFor(user.role));
	}, [status, user, router]);

	return (
		<div className="grid min-h-dvh bg-card lg:grid-cols-2">
			<div className="flex flex-col px-5 py-6 sm:px-10">
				<Logo />
				<div className="flex flex-1 items-center py-10">
					<div className="mx-auto w-full max-w-sm animate-rise">{children}</div>
				</div>
			</div>

			<aside className="hidden flex-col justify-center bg-signal-wash px-14 lg:flex">
				<div className="max-w-md">
					<h2 className="text-3xl leading-snug font-bold text-ink">Home repairs, without the hassle.</h2>
					<ul className="mt-6 flex flex-col gap-3">
						{BENEFITS.map((benefit) => (
							<li key={benefit} className="flex items-start gap-3 text-ink-soft">
								<CheckCircle2 className="mt-0.5 size-5 shrink-0 text-signal" aria-hidden />
								{benefit}
							</li>
						))}
					</ul>

					<div className="mt-10 rounded-2xl bg-card p-5 shadow-lift">
						<div className="flex items-center justify-between">
							<p className="font-semibold">AC not cooling</p>
							<StatusPill status="EN_ROUTE" size="sm" />
						</div>
						<p className="mt-1 text-sm text-ink-soft">Today, 3:00 PM - 5:00 PM</p>
						<div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
							<Avatar name="Karim Hossain" size={36} />
							<div className="flex-1">
								<p className="text-sm font-semibold">Karim Hossain</p>
								<p className="text-xs text-ink-faint">Your technician</p>
							</div>
							<span className="grid size-9 place-items-center rounded-full bg-signal-wash text-signal-strong" aria-hidden>
								<Phone className="size-4" />
							</span>
						</div>
					</div>
				</div>
			</aside>
		</div>
	);
}
