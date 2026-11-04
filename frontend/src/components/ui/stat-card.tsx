import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export type StatTone = "emerald" | "amber" | "sky" | "rose" | "violet";

const TONES: Record<StatTone, { card: string; chip: string }> = {
	emerald: { card: "from-emerald-50 to-white border-emerald-100", chip: "bg-emerald-500 text-white" },
	amber: { card: "from-amber-50 to-white border-amber-100", chip: "bg-amber-500 text-white" },
	sky: { card: "from-sky-50 to-white border-sky-100", chip: "bg-sky-500 text-white" },
	rose: { card: "from-rose-50 to-white border-rose-100", chip: "bg-rose-500 text-white" },
	violet: { card: "from-violet-50 to-white border-violet-100", chip: "bg-violet-500 text-white" },
};

export function StatCard({
	label,
	value,
	sub,
	icon: Icon,
	tone,
}: {
	label: string;
	value: ReactNode;
	sub?: string;
	icon: LucideIcon;
	tone: StatTone;
}) {
	const t = TONES[tone];
	return (
		<div className={cn("rounded-2xl border bg-gradient-to-br p-5 shadow-ticket", t.card)}>
			<div className="flex items-start justify-between gap-3">
				<p className="text-sm font-medium text-ink-soft">{label}</p>
				<span className={cn("grid size-9 place-items-center rounded-xl shadow-sm", t.chip)}>
					<Icon className="size-[18px]" aria-hidden />
				</span>
			</div>
			<p className="mt-2 text-2xl font-bold">{value}</p>
			{sub && <p className="mt-1 text-xs text-ink-faint">{sub}</p>}
		</div>
	);
}

/** Colourful greeting banner used at the top of home screens. */
export function WelcomeBanner({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
	return (
		<section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white shadow-lift sm:p-8">
			<div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/10" aria-hidden />
			<div className="pointer-events-none absolute -bottom-20 right-24 size-40 rounded-full bg-amber-300/25" aria-hidden />
			<div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
					{description && <p className="mt-1 text-white/85">{description}</p>}
				</div>
				{action}
			</div>
		</section>
	);
}
