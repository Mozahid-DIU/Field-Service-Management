import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { Button } from "./button";

export function Skeleton({ className }: { className?: string }) {
	return <div className={cn("animate-pulse rounded-lg bg-paper-sunken", className)} aria-hidden />;
}

export function TicketSkeleton({ rows = 3 }: { rows?: number }) {
	return (
		<div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
			{Array.from({ length: rows }, (_, i) => (
				<div key={i} className="ticket flex flex-col gap-3 p-5">
					<div className="flex justify-between">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-5 w-20 rounded-full" />
					</div>
					<Skeleton className="h-5 w-2/3" />
					<Skeleton className="h-4 w-1/2" />
				</div>
			))}
		</div>
	);
}

export function EmptyState({
	title,
	description,
	action,
	icon,
	className,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
	icon?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line-strong bg-card/60 px-6 py-14 text-center",
				className,
			)}
		>
			<div className="grid size-12 place-items-center rounded-2xl bg-paper-sunken text-ink-soft">
				{icon ?? <Inbox className="size-6" aria-hidden />}
			</div>
			<div>
				<p className="font-display text-lg font-semibold">{title}</p>
				{description && <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>}
			</div>
			{action}
		</div>
	);
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
	return (
		<div
			role="alert"
			className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--st-rejected)]/25 bg-[var(--st-rejected-bg)]/60 px-6 py-10 text-center"
		>
			<AlertTriangle className="size-6 text-[var(--st-rejected)]" aria-hidden />
			<p className="text-sm font-medium text-ink">{message}</p>
			{onRetry && (
				<Button variant="outline" size="sm" onClick={onRetry}>
					Try again
				</Button>
			)}
		</div>
	);
}
