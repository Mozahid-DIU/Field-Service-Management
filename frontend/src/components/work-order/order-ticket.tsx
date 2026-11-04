import { CalendarClock, ChevronRight, MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import { PriorityTag, StatusPill } from "@/components/ui/badges";
import { cn, shortDate, taka, timeRange } from "@/lib/format";
import type { Role, WorkOrder } from "@/lib/types";
import { StatusRail } from "./status-rail";

/** A work order rendered as a service ticket: stub (code/category) + body. */
export function OrderTicket({ order, viewer }: { order: WorkOrder; viewer: Role }) {
	const person =
		viewer === "CUSTOMER"
			? order.technician
				? `Technician: ${order.technician.name}`
				: "Technician not assigned yet"
			: `Customer: ${order.customer.name}`;
	const amount = order.invoice?.total ?? order.category.basePrice;
	const needsPayment = viewer === "CUSTOMER" && order.status === "COMPLETED";

	return (
		<Link
			href={`/orders/${order.id}`}
			className={cn(
				"ticket group relative flex flex-col overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lift sm:flex-row",
				needsPayment && "ring-2 ring-signal/60",
			)}
		>
			{/* stub */}
			<div className="flex shrink-0 items-center justify-between gap-3 border-b border-dashed border-line-strong bg-paper/70 px-5 py-3 sm:w-44 sm:flex-col sm:items-start sm:justify-center sm:border-r sm:border-b-0">
				<span className="font-mono text-[11px] font-semibold tracking-wide text-ink-soft">{order.code}</span>
				<span className="text-xs font-semibold text-ink">{order.category.name}</span>
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-3 px-5 py-4">
				<div className="flex items-start justify-between gap-3">
					<h3 className="truncate font-display text-lg leading-tight font-semibold">{order.title}</h3>
					<StatusPill status={order.status} />
				</div>
				<div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-ink-soft">
					<span className="inline-flex min-w-0 items-center gap-1.5">
						<MapPin className="size-3.5 shrink-0" aria-hidden />
						<span className="truncate">{order.address}</span>
					</span>
					<span className="inline-flex items-center gap-1.5">
						<CalendarClock className="size-3.5" aria-hidden />
						{order.scheduledStart ? timeRange(order.scheduledStart, order.scheduledEnd) : `Requested ${shortDate(order.createdAt)}`}
					</span>
					<span className="inline-flex items-center gap-1.5">
						<UserRound className="size-3.5" aria-hidden />
						{person}
					</span>
				</div>
				<div className="flex items-center justify-between gap-4 border-t border-line pt-3">
					<div className="hidden flex-1 sm:block">
						<StatusRail status={order.status} compact />
					</div>
					<PriorityTag priority={order.priority} />
					<span className="flex items-center gap-1 font-mono text-sm font-semibold">
						{order.invoice ? "" : "from "}
						{taka(amount)}
						<ChevronRight className="size-4 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
					</span>
				</div>
			</div>
		</Link>
	);
}
