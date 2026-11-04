import { clsx, type ClassValue } from "clsx";
import { format, formatDistanceToNowStrict, isToday, isTomorrow } from "date-fns";
import { twMerge } from "tailwind-merge";
import type { Money } from "./types";

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

const takaFormatter = new Intl.NumberFormat("en-BD", {
	maximumFractionDigits: 2,
	minimumFractionDigits: 0,
});

export function taka(value: Money | null | undefined): string {
	const amount = Number(value ?? 0);
	return `৳${takaFormatter.format(Number.isFinite(amount) ? amount : 0)}`;
}

export function shortDate(value: string | Date | null | undefined): string {
	if (!value) return "—";
	return format(new Date(value), "d MMM yyyy");
}

export function dateTime(value: string | Date | null | undefined): string {
	if (!value) return "—";
	return format(new Date(value), "d MMM, h:mm a");
}

export function timeRange(start: string | null, end: string | null): string {
	if (!start || !end) return "Not scheduled";
	const s = new Date(start);
	const e = new Date(end);
	const day = isToday(s) ? "Today" : isTomorrow(s) ? "Tomorrow" : format(s, "EEE, d MMM");
	return `${day} · ${format(s, "h:mm a")} – ${format(e, "h:mm a")}`;
}

export function ago(value: string | Date): string {
	return `${formatDistanceToNowStrict(new Date(value))} ago`;
}

export function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}

/** datetime-local input value ⇄ ISO */
export function toLocalInput(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInput(value: string): string {
	return new Date(value).toISOString();
}

export function humanize(value: string): string {
	return value
		.toLowerCase()
		.split("_")
		.map((w) => w[0]?.toUpperCase() + w.slice(1))
		.join(" ");
}

/** "4.5" or "New" when nobody has rated yet — a 0.0 reads like a bad score. */
export function rating(avg: Money | null | undefined, count: number | null | undefined): string {
	return count ? Number(avg ?? 0).toFixed(1) : "New";
}
