"use client";

import { RoleTag } from "@/components/ui/badges";
import { Skeleton } from "@/components/ui/states";
import { dateTime, humanize } from "@/lib/format";
import { useHistory } from "@/lib/queries";
import { STATUS_META } from "@/lib/status";
import type { HistoryEntry, WorkOrderStatus } from "@/lib/types";

function describe(entry: HistoryEntry): { title: string; detail?: string; tone?: string } | null {
	const after = entry.after ?? {};
	switch (entry.action) {
		case "WORK_ORDER_CREATED":
			return { title: "Request created", tone: "pending" };
		case "WORK_ORDER_STATUS_CHANGED": {
			const status = after.status as WorkOrderStatus;
			// The WORK_ORDER_ASSIGNED entry already tells this story, with the time slot
			if (status === "ASSIGNED") return null;
			return {
				title: STATUS_META[status]?.label ?? humanize(String(status)),
				detail: typeof after.note === "string" ? after.note : undefined,
				tone: STATUS_META[status]?.tone,
			};
		}
		case "WORK_ORDER_ASSIGNED":
			return {
				title: "Visit scheduled",
				detail: after.scheduledStart ? `Starts ${dateTime(String(after.scheduledStart))}` : undefined,
				tone: "assigned",
			};
		case "WORK_ORDER_UPDATED":
			return { title: "Request details edited" };
		case "SERVICE_REPORT_SUBMITTED":
			return { title: "Service report submitted", detail: `${after.laborMinutes ?? "?"} min of labour`, tone: "completed" };
		case "FEEDBACK_SUBMITTED":
			return { title: `Rated ${after.rating}★`, tone: "paid" };
		default:
			return { title: humanize(entry.action) };
	}
}

export function Timeline({ orderId }: { orderId: string }) {
	const { data, isLoading } = useHistory(orderId);

	if (isLoading) {
		return (
			<div className="flex flex-col gap-4">
				{[0, 1, 2].map((i) => (
					<Skeleton key={i} className="h-10" />
				))}
			</div>
		);
	}

	const entries = [...(data ?? [])]
		.reverse()
		.map((entry) => ({ entry, view: describe(entry) }))
		.filter((item): item is { entry: HistoryEntry; view: NonNullable<ReturnType<typeof describe>> } => item.view !== null);
	return (
		<ol className="relative flex flex-col gap-5 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-line">
			{entries.map(({ entry, view }) => {
				const { title, detail, tone } = view;
				return (
					<li key={entry.id} className="relative pl-6">
						<span
							className="absolute top-1.5 left-0 size-[11px] rounded-full border-2 border-card"
							style={{ background: tone ? `var(--st-${tone})` : "var(--ink-faint)" }}
							aria-hidden
						/>
						<p className="text-sm font-semibold">{title}</p>
						{detail && <p className="text-sm text-ink-soft">{detail}</p>}
						<p className="mt-0.5 flex items-center gap-2 text-xs text-ink-faint">
							{dateTime(entry.createdAt)}
							{entry.actor ? (
								<>
									· {entry.actor.name} <RoleTag role={entry.actor.role} />
								</>
							) : (
								"· System"
							)}
						</p>
					</li>
				);
			})}
		</ol>
	);
}
