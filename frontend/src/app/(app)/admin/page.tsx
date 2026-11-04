"use client";

import { ArrowUpRight, Star } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { PriorityTag } from "@/components/ui/badges";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { errorMessage } from "@/lib/api";
import { ago, rating, taka } from "@/lib/format";
import { useDashboardStats, useWorkOrders } from "@/lib/queries";
import { LIFECYCLE, STATUS_META } from "@/lib/status";
import type { WorkOrderStatus } from "@/lib/types";

const PIPELINE: WorkOrderStatus[] = [...LIFECYCLE.map((s) => s.status), "REJECTED", "CANCELLED"];

/** Which dispatch-queue tab shows a given status */
const TAB_FOR: Record<WorkOrderStatus, string> = {
	PENDING: "review",
	APPROVED: "schedule",
	ASSIGNED: "field",
	EN_ROUTE: "field",
	IN_PROGRESS: "field",
	COMPLETED: "billing",
	PAID: "paid",
	REJECTED: "closed",
	CANCELLED: "closed",
};

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
	return (
		<div className="ticket p-5">
			<p className="text-sm text-ink-soft">{label}</p>
			<p className={accent ? "mt-1 text-2xl font-bold text-signal-strong" : "mt-1 text-2xl font-bold"}>{value}</p>
			{sub && <p className="mt-1 text-xs text-ink-faint">{sub}</p>}
		</div>
	);
}

export default function AdminDashboard() {
	const stats = useDashboardStats();
	const queue = useWorkOrders({ status: "PENDING", limit: 5, sortBy: "createdAt", sortOrder: "asc" });
	const toSchedule = useWorkOrders({ status: "APPROVED", limit: 1 });

	if (stats.error) return <ErrorState message={errorMessage(stats.error)} onRetry={() => stats.refetch()} />;
	const s = stats.data;
	const byStatus = s?.workOrders.byStatus ?? {};
	const active = (["ASSIGNED", "EN_ROUTE", "IN_PROGRESS"] as const).reduce((n, k) => n + (byStatus[k] ?? 0), 0);
	const maxCategory = Math.max(1, ...(s?.workOrders.byCategory.map((c) => c.count) ?? [1]));

	return (
		<>
			<PageHeader
				eyebrow="Operations"
				title="Dashboard"
				description="Here's how things are going today."
				actions={<ButtonLink href="/admin/work-orders?tab=review">Review requests</ButtonLink>}
			/>

			<section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 stagger">
				{!s ? (
					[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)
				) : (
					<>
						<Kpi accent label="Payments received" value={taka(s.revenue.totalCollected)} sub={`${taka(s.revenue.last30Days)} in the last 30 days`} />
						<Kpi label="Outstanding" value={taka(s.revenue.outstanding)} sub={`${s.revenue.unpaidInvoices} unpaid invoice(s)`} />
						<Kpi label="Jobs in progress" value={String(active)} sub={`${byStatus.EN_ROUTE ?? 0} on the way · ${byStatus.IN_PROGRESS ?? 0} working`} />
						<Kpi label="Needs your action" value={String((byStatus.PENDING ?? 0) + (byStatus.APPROVED ?? 0))} sub={`${byStatus.PENDING ?? 0} to review · ${toSchedule.data?.meta.total ?? byStatus.APPROVED ?? 0} to schedule`} />
					</>
				)}
			</section>

			{/* Pipeline: one segmented bar = the whole operation at a glance */}
			<section className="ticket mb-8 p-5 sm:p-6">
				<div className="mb-4 flex items-baseline justify-between">
					<h2 className="text-lg font-bold">Work orders by status</h2>
					<span className="font-mono text-sm text-ink-soft">{s?.workOrders.total ?? "—"} total</span>
				</div>
				{s ? (
					<>
						<div className="flex h-4 w-full overflow-hidden rounded-full bg-paper-sunken" role="img" aria-label="Work orders by status">
							{PIPELINE.filter((k) => (byStatus[k] ?? 0) > 0).map((k) => (
								<span
									key={k}
									className="h-full transition-[width] duration-700"
									style={{ width: `${((byStatus[k] ?? 0) / Math.max(1, s.workOrders.total)) * 100}%`, background: `var(--st-${STATUS_META[k].tone})` }}
									title={`${STATUS_META[k].label}: ${byStatus[k]}`}
								/>
							))}
						</div>
						<ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
							{PIPELINE.map((k) => (
								<li key={k}>
									<Link href={`/admin/work-orders?tab=${TAB_FOR[k]}`} className="flex items-center justify-between gap-2 rounded-md text-sm hover:text-signal-strong">
										<span className="flex items-center gap-2">
											<span className="size-2.5 rounded-sm" style={{ background: `var(--st-${STATUS_META[k].tone})` }} />
											{STATUS_META[k].label}
										</span>
										<span className="font-mono font-semibold">{byStatus[k] ?? 0}</span>
									</Link>
								</li>
							))}
						</ul>
					</>
				) : (
					<Skeleton className="h-20" />
				)}
			</section>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
				<section className="ticket p-5 sm:p-6">
					<div className="mb-4 flex items-baseline justify-between">
						<h2 className="font-display text-xl font-bold">Needs review</h2>
						<Link href="/admin/work-orders?tab=review" className="text-sm font-semibold text-ink-soft hover:text-ink">
							All →
						</Link>
					</div>
					{queue.isLoading ? (
						<Skeleton className="h-48" />
					) : queue.data?.data.length === 0 ? (
						<EmptyState title="All caught up" description="No new requests to review." className="py-8" />
					) : (
						<ul className="divide-y divide-line">
							{queue.data?.data.map((o) => (
								<li key={o.id}>
									<Link href={`/orders/${o.id}`} className="group flex items-center gap-4 py-3">
										<div className="min-w-0 flex-1">
											<p className="truncate font-semibold group-hover:text-signal-strong">{o.title}</p>
											<p className="truncate text-xs text-ink-soft">
												#{o.code.slice(-6)} · {o.category.name} · {o.customer.name} · {ago(o.createdAt)}
											</p>
										</div>
										<PriorityTag priority={o.priority} />
										<ArrowUpRight className="size-4 text-ink-faint transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
									</Link>
								</li>
							))}
						</ul>
					)}
				</section>

				<div className="flex flex-col gap-6">
					<section className="ticket p-5 sm:p-6">
						<h2 className="mb-4 font-display text-xl font-bold">Demand by service</h2>
						{s ? (
							<ul className="flex flex-col gap-3">
								{s.workOrders.byCategory.map((c) => (
									<li key={c.category} className="text-sm">
										<div className="mb-1 flex justify-between">
											<span>{c.category}</span>
											<span className="font-mono font-semibold">{c.count}</span>
										</div>
										<div className="h-2 rounded-full bg-paper-sunken">
											<div className="h-full rounded-full bg-signal transition-[width] duration-700" style={{ width: `${(c.count / maxCategory) * 100}%` }} />
										</div>
									</li>
								))}
							</ul>
						) : (
							<Skeleton className="h-40" />
						)}
					</section>

					<section className="ticket p-5 sm:p-6">
						<h2 className="mb-4 font-display text-xl font-bold">Top technicians</h2>
						<ol className="flex flex-col gap-3">
							{s?.topTechnicians.map((t, i) => (
								<li key={t.id} className="flex items-center gap-3">
									<span className="w-4 font-mono text-xs text-ink-faint">{i + 1}</span>
									<Avatar name={t.name} size={32} />
									<span className="flex-1 truncate text-sm font-semibold">{t.name}</span>
									<span className="flex items-center gap-1 text-xs text-ink-soft">
										<Star className="size-3 fill-signal text-signal" /> {rating(t.avgRating, t.ratingCount)}
									</span>
									<span className="w-14 text-right font-mono text-xs">{t.totalJobs} jobs</span>
								</li>
							))}
						</ol>
					</section>
				</div>
			</div>
		</>
	);
}
