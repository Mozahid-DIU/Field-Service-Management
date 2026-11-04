"use client";

import { CalendarClock, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badges";
import { StatusRail } from "@/components/work-order/status-rail";
import { LIFECYCLE, STATUS_META } from "@/lib/status";

const STEP_MS = 1900;

/** Hero moment: a ticket that walks itself through the whole lifecycle. */
export function LiveTicket() {
	const [index, setIndex] = useState(3);

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const timer = setInterval(() => setIndex((i) => (i + 1) % LIFECYCLE.length), STEP_MS);
		return () => clearInterval(timer);
	}, []);

	const status = LIFECYCLE[index].status;
	return (
		<div className="relative">
			{/* stacked tickets behind for depth */}
			<div className="absolute inset-x-6 -bottom-3 h-full rotate-[2.5deg] rounded-[14px] border border-line bg-card/70" aria-hidden />
			<div className="absolute inset-x-3 -bottom-1.5 h-full -rotate-[1.5deg] rounded-[14px] border border-line bg-card/85" aria-hidden />

			<article className="ticket relative overflow-hidden shadow-lift" aria-label="Example work order">
				<div className="flex items-center justify-between border-b border-dashed border-line-strong bg-paper/70 px-6 py-3">
					<span className="font-mono text-xs font-semibold text-ink-soft">WO-20261104-3FA9C2</span>
					<span className="font-mono text-xs text-ink-faint">AC Repair</span>
				</div>
				<div className="flex flex-col gap-5 px-6 py-6">
					<div className="flex items-start justify-between gap-3">
						<h3 className="font-display text-2xl leading-tight font-semibold">AC blowing warm air</h3>
						<span key={status} className="animate-fade">
							<StatusPill status={status} />
						</span>
					</div>
					<div className="flex flex-col gap-2 text-sm text-ink-soft">
						<span className="flex items-center gap-2">
							<MapPin className="size-4 text-signal" aria-hidden /> House 12, Road 5, Mirpur 10
						</span>
						<span className="flex items-center gap-2">
							<CalendarClock className="size-4 text-signal" aria-hidden /> Today · 3:00 PM – 5:00 PM
						</span>
					</div>
					<StatusRail status={status} />
					<p key={`hint-${status}`} className="min-h-10 text-sm text-ink-soft animate-fade" aria-live="polite">
						{STATUS_META[status].customerHint}
					</p>
				</div>
				<div className="perforation" aria-hidden />
				<div className="flex items-center justify-between px-6 py-4">
					<span className="flex items-center gap-3">
						<Avatar name="Karim Hossain" size={36} />
						<span>
							<span className="block text-sm font-semibold">Karim Hossain</span>
							<span className="block text-xs text-ink-faint">★ 4.9 · 212 jobs</span>
						</span>
					</span>
					<span className="font-mono text-lg font-semibold">৳2,450</span>
				</div>
			</article>
		</div>
	);
}
