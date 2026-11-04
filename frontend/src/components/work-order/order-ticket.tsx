import { CalendarClock, ChevronRight, MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/badges";
import { CategoryIcon } from "@/lib/category-icon";
import { cn, shortDate, taka, timeRange } from "@/lib/format";
import type { Role, WorkOrder } from "@/lib/types";

/** A work order in a list: icon, title, status, the essentials, price. */
export function OrderTicket({ order, viewer }: { order: WorkOrder; viewer: Role }) {
	const person =
		viewer === "CUSTOMER"
			? order.technician
				? order.technician.name
				: "Technician not assigned yet"
			: order.customer.name;
	const needsPayment = viewer === "CUSTOMER" && order.status === "COMPLETED";

	return (
		<Link
			href={`/orders/${order.id}`}
			className={cn(
				"ticket group flex gap-4 p-4 transition hover:border-line-strong hover:shadow-lift sm:p-5",
				needsPayment && "border-signal",
			)}
		>
			<CategoryIcon name={order.category.name} className="hidden sm:grid" />
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="truncate text-base font-semibold">{order.title}</p>
						<p className="text-sm text-ink-faint">
							{order.category.name} · #{order.code.slice(-6)}
						</p>
					</div>
					<StatusPill status={order.status} />
				</div>
				<div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
					<span className="inline-flex items-center gap-1.5">
						<CalendarClock className="size-4 text-ink-faint" aria-hidden />
						{order.scheduledStart ? timeRange(order.scheduledStart, order.scheduledEnd) : `Requested on ${shortDate(order.createdAt)}`}
					</span>
					<span className="inline-flex min-w-0 items-center gap-1.5">
						<MapPin className="size-4 shrink-0 text-ink-faint" aria-hidden />
						<span className="truncate">{order.address}</span>
					</span>
					<span className="inline-flex items-center gap-1.5">
						<UserRound className="size-4 text-ink-faint" aria-hidden />
						{person}
					</span>
				</div>
			</div>
			<div className="flex shrink-0 flex-col items-end justify-between">
				<span className="text-right">
					<span className="block font-bold">{taka(order.invoice?.total ?? order.category.basePrice)}</span>
					{needsPayment && <span className="text-xs font-semibold text-signal-strong">Pay now</span>}
				</span>
				<ChevronRight className="size-5 text-ink-faint transition group-hover:translate-x-0.5" aria-hidden />
			</div>
		</Link>
	);
}
