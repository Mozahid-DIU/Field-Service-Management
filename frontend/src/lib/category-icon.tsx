import {
	Cctv,
	Droplets,
	Refrigerator,
	Snowflake,
	WashingMachine,
	Wrench,
	Zap,
	type LucideIcon,
} from "lucide-react";
import { cn } from "./format";

interface IconRule {
	pattern: RegExp;
	icon: LucideIcon;
	tone: string;
}

// Most specific first; whole words only, so "Repair" never matches "air"
const RULES: IconRule[] = [
	{ pattern: /\b(fridge|refrigerator)\b/i, icon: Refrigerator, tone: "bg-cyan-50 text-cyan-700" },
	{ pattern: /\b(appliance|washing|microwave|oven)\b/i, icon: WashingMachine, tone: "bg-rose-50 text-rose-600" },
	{ pattern: /\b(cctv|camera)\b/i, icon: Cctv, tone: "bg-violet-50 text-violet-600" },
	{ pattern: /\b(plumbing|plumber|pipe|water)\b/i, icon: Droplets, tone: "bg-blue-50 text-blue-600" },
	{ pattern: /\b(electrical|electric|wiring)\b/i, icon: Zap, tone: "bg-amber-50 text-amber-600" },
	{ pattern: /\b(ac|air[- ]?condition\w*)\b/i, icon: Snowflake, tone: "bg-sky-50 text-sky-600" },
];

const FALLBACK: IconRule = { pattern: /.*/, icon: Wrench, tone: "bg-signal-wash text-signal-strong" };

/** Friendly icon tile for a service category, picked from its name. */
export function CategoryIcon({
	name,
	size = "md",
	className,
}: {
	name: string;
	size?: "sm" | "md" | "lg";
	className?: string;
}) {
	const { icon: Icon, tone } = RULES.find((rule) => rule.pattern.test(name)) ?? FALLBACK;
	const box = { sm: "size-9 rounded-lg", md: "size-11 rounded-xl", lg: "size-14 rounded-2xl" }[size];
	const icon = { sm: "size-4", md: "size-5", lg: "size-7" }[size];
	return (
		<span className={cn("grid shrink-0 place-items-center", box, tone, className)} aria-hidden>
			<Icon className={icon} />
		</span>
	);
}

const SHORT_NAMES: [RegExp, string][] = [
	[/\b(fridge|refrigerator)\b/i, "Fridge"],
	[/\b(appliance|washing|microwave|oven)\b/i, "Appliance"],
	[/\b(cctv|camera)\b/i, "CCTV"],
	[/\b(plumbing|plumber|pipe|water)\b/i, "Plumbing"],
	[/\b(electrical|electric|wiring)\b/i, "Electrical"],
	[/\b(ac|air[- ]?condition\w*)\b/i, "AC"],
];

/** One-word label for tight spaces (icon grids). */
export function shortServiceName(name: string): string {
	return SHORT_NAMES.find(([pattern]) => pattern.test(name))?.[1] ?? name.split(" ")[0];
}
