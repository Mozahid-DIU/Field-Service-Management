import { Check, X } from "lucide-react";
import { cn } from "@/lib/format";
import { LIFECYCLE, STATUS_META, TERMINAL_FAILURE } from "@/lib/status";
import type { WorkOrderStatus } from "@/lib/types";

/**
 * Signature element: the work order's journey as a rail of stops.
 * Done stops are filled ink, the current stop glows in its status colour.
 */
export function StatusRail({ status, compact }: { status: WorkOrderStatus; compact?: boolean }) {
	const failed = TERMINAL_FAILURE.includes(status);
	const currentIndex = failed ? -1 : LIFECYCLE.findIndex((step) => step.status === status);

	if (failed) {
		const meta = STATUS_META[status];
		return (
			<div
				className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold"
				style={{ color: `var(--st-${meta.tone})`, background: `var(--st-${meta.tone}-bg)` }}
			>
				<X className="size-4" aria-hidden /> This request was {meta.label.toLowerCase()}.
			</div>
		);
	}

	return (
		<ol className="flex w-full items-start" aria-label="Work order progress">
			{LIFECYCLE.map((step, index) => {
				const done = index < currentIndex;
				const current = index === currentIndex;
				const tone = STATUS_META[step.status].tone;
				return (
					<li
						key={step.status}
						className="relative flex flex-1 flex-col items-center"
						aria-current={current ? "step" : undefined}
					>
						{index > 0 && (
							<span
								className={cn(
									"absolute top-[11px] right-1/2 h-[3px] w-full -translate-y-1/2 rounded-full",
									index <= currentIndex ? "bg-signal" : "bg-line",
								)}
								aria-hidden
							/>
						)}
						<span
							className={cn(
								"relative z-10 grid size-[22px] place-items-center rounded-full border-2 transition-all",
								done && "border-signal bg-signal text-white",
								current && "scale-110 border-transparent text-white live-dot",
								!done && !current && "border-line-strong bg-card",
							)}
							style={current ? { background: `var(--st-${tone})`, color: "white" } : undefined}
						>
							{done ? <Check className="size-3" strokeWidth={3} aria-hidden /> : current ? <span className="size-1.5 rounded-full bg-white" /> : null}
						</span>
						{!compact && (
							<span
								className={cn(
									"mt-2 hidden text-center text-[11px] leading-tight font-semibold sm:block",
									current ? "text-ink" : done ? "text-ink-soft" : "text-ink-faint",
								)}
							>
								{step.short}
							</span>
						)}
						<span className="sr-only">
							{step.short}: {done ? "done" : current ? "current" : "upcoming"}
						</span>
					</li>
				);
			})}
		</ol>
	);
}
