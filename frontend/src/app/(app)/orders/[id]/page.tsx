"use client";

import { ArrowLeft, CalendarClock, Clock, MapPin, Phone, Star } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { Avatar } from "@/components/ui/avatar";
import { MoneyStatus, PriorityTag, StatusPill } from "@/components/ui/badges";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { AssignTechnician, DeleteOrder, ReviewActions } from "@/components/work-order/admin-actions";
import { CancelRequest, FeedbackForm, PayWithBkash } from "@/components/work-order/customer-actions";
import { StatusRail } from "@/components/work-order/status-rail";
import { AdvanceStatus, ServiceReportForm } from "@/components/work-order/technician-actions";
import { Timeline } from "@/components/work-order/timeline";
import { errorMessage, statusOf } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth-store";
import { dateTime, shortDate, taka, timeRange } from "@/lib/format";
import { useWorkOrder } from "@/lib/queries";
import { CANCELLABLE, STATUS_META } from "@/lib/status";
import type { PersonRef, Role, WorkOrderDetail } from "@/lib/types";

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
	return (
		<section className="ticket p-5 sm:p-6">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-base font-semibold text-ink">{title}</h2>
				{aside}
			</div>
			{children}
		</section>
	);
}

function PersonCard({ label, person }: { label: string; person: PersonRef | null }) {
	return (
		<div className="flex items-center gap-3 rounded-xl bg-paper p-3">
			{person ? <Avatar name={person.name} size={40} /> : <span className="size-10 rounded-full border-2 border-dashed border-line-strong" />}
			<div className="min-w-0 flex-1">
				<p className="text-xs text-ink-faint">{label}</p>
				<p className="truncate font-semibold">{person?.name ?? "Not assigned yet"}</p>
			</div>
			{person?.phone && (
				<a href={`tel:${person.phone}`} className="grid size-9 place-items-center rounded-lg bg-card text-ink-soft hover:text-signal" aria-label={`Call ${person.name}`}>
					<Phone className="size-4" />
				</a>
			)}
		</div>
	);
}

function ActionPanel({ order, role, userId }: { order: WorkOrderDetail; role: Role; userId: string }) {
	const panels: React.ReactNode[] = [];
	if (role === "CUSTOMER") {
		if (order.status === "COMPLETED" && order.invoice?.status === "UNPAID") panels.push(<PayWithBkash key="pay" order={order} />);
		if (order.status === "PAID" && !order.feedback) panels.push(<FeedbackForm key="fb" order={order} />);
		if (CANCELLABLE.includes(order.status)) panels.push(<CancelRequest key="cancel" order={order} />);
	}
	if (role === "TECHNICIAN" && order.technician?.id === userId) {
		if (order.status === "ASSIGNED" || order.status === "EN_ROUTE") panels.push(<AdvanceStatus key="adv" order={order} />);
		if (order.status === "IN_PROGRESS") panels.push(<ServiceReportForm key="report" order={order} />);
	}
	if (role === "ADMIN") {
		if (order.status === "PENDING") panels.push(<ReviewActions key="review" order={order} />);
		if (order.status === "APPROVED" || order.status === "ASSIGNED") panels.push(<AssignTechnician key="assign" order={order} />);
		if (CANCELLABLE.includes(order.status)) panels.push(<CancelRequest key="cancel" order={order} />);
	}
	if (panels.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-line-strong p-5 text-sm text-ink-soft">
				{STATUS_META[order.status].customerHint}
			</div>
		);
	}
	return <div className="flex flex-col gap-4">{panels}</div>;
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params);
	const { user } = useAuth();
	const { data: order, isLoading, error, refetch } = useWorkOrder(id);

	if (!user) return null;
	const back = user.role === "ADMIN" ? "/admin/work-orders" : user.role === "TECHNICIAN" ? "/technician/jobs" : "/customer/requests";

	if (isLoading) {
		return (
			<div className="flex flex-col gap-4">
				<Skeleton className="h-10 w-2/3" />
				<Skeleton className="h-16" />
				<div className="grid gap-4 lg:grid-cols-[1fr_360px]">
					<Skeleton className="h-80" />
					<Skeleton className="h-48" />
				</div>
			</div>
		);
	}
	if (error || !order) {
		const code = statusOf(error);
		return (
			<ErrorState
				message={code === 403 ? "You don't have access to this work order." : code === 404 ? "This work order doesn't exist or was archived." : errorMessage(error)}
				onRetry={code && code < 500 ? undefined : () => refetch()}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="animate-rise">
				<Link href={back} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
					<ArrowLeft className="size-4" /> Back
				</Link>
				<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<p className="text-sm text-ink-faint">
							{order.category.name} · #{order.code.slice(-6)}
						</p>
						<h1 className="mt-1 text-2xl leading-tight font-bold tracking-tight sm:text-3xl">{order.title}</h1>
						<div className="mt-3 flex flex-wrap items-center gap-3">
							<StatusPill status={order.status} />
							<PriorityTag priority={order.priority} />
							<span className="text-xs text-ink-faint">Requested {dateTime(order.createdAt)}</span>
						</div>
					</div>
					{user.role === "ADMIN" && <DeleteOrder order={order} />}
				</div>
			</div>

			<div className="ticket px-4 py-5 sm:px-8">
				<StatusRail status={order.status} />
				{user.role === "CUSTOMER" && <p className="mt-4 text-center text-sm text-ink-soft">{STATUS_META[order.status].customerHint}</p>}
			</div>

			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
				<div className="flex flex-col gap-6">
					<Section title="Details">
						<p className="leading-relaxed whitespace-pre-line">{order.description}</p>
						<dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
							<div className="flex gap-2">
								<MapPin className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
								<div>
									<dt className="text-ink-faint">Address</dt>
									<dd className="font-medium">{order.address}</dd>
								</div>
							</div>
							<div className="flex gap-2">
								<CalendarClock className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
								<div>
									<dt className="text-ink-faint">Visit</dt>
									<dd className="font-medium">
										{order.scheduledStart ? timeRange(order.scheduledStart, order.scheduledEnd) : order.preferredDate ? `Preferred ${shortDate(order.preferredDate)}` : "To be scheduled"}
									</dd>
								</div>
							</div>
						</dl>
						{(order.adminNote || order.cancelReason) && (
							<p className="mt-5 rounded-xl bg-paper p-3 text-sm">
								<span className="font-semibold">{order.cancelReason ? "Reason for cancelling: " : "Note from FixFlow: "}</span>
								{order.cancelReason ?? order.adminNote}
							</p>
						)}
						{order.images.length > 0 && (
							<div className="mt-5 flex gap-2 overflow-x-auto">
								{order.images.map((src) => (
									<a key={src} href={src} target="_blank" rel="noreferrer" className="shrink-0">
										{/* biome-ignore lint/performance/noImgElement: user uploads from Cloudinary */}
										<img src={src} alt="Problem attachment" className="size-24 rounded-xl border border-line object-cover" />
									</a>
								))}
							</div>
						)}
					</Section>

					<Section title="People">
						<div className="grid gap-3 sm:grid-cols-2">
							<PersonCard label="Customer" person={order.customer} />
							<PersonCard label="Technician" person={order.technician} />
						</div>
					</Section>

					{order.report && (
						<Section title="Service report" aside={<span className="inline-flex items-center gap-1 text-xs text-ink-faint"><Clock className="size-3.5" /> {order.report.laborMinutes} min</span>}>
							<p className="leading-relaxed">{order.report.workDone}</p>
							{order.report.partsUsed.length > 0 && (
								<table className="mt-4 w-full text-sm">
									<thead>
										<tr className="border-b border-line text-left text-xs text-ink-faint">
											<th className="pb-2 font-medium">Part</th>
											<th className="pb-2 text-right font-medium">Qty</th>
											<th className="pb-2 text-right font-medium">Cost</th>
										</tr>
									</thead>
									<tbody className="font-mono">
										{order.report.partsUsed.map((part, i) => (
											<tr key={`${part.name}-${i}`} className="border-b border-line/60 last:border-0">
												<td className="py-2 font-sans">{part.name}</td>
												<td className="py-2 text-right">{part.qty}</td>
												<td className="py-2 text-right">{taka(part.qty * part.unitCost)}</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</Section>
					)}

					{order.invoice && (
						<Section title="Invoice" aside={<MoneyStatus status={order.invoice.status} />}>
														<dl className="grid grid-cols-2 gap-y-2 font-mono text-sm">
								<dt className="font-sans text-ink-soft">Invoice no.</dt>
								<dd className="text-right">{order.invoice.invoiceNo}</dd>
								<dt className="font-sans text-ink-soft">Service fee</dt>
								<dd className="text-right">{taka(order.invoice.serviceFee)}</dd>
								<dt className="font-sans text-ink-soft">Parts</dt>
								<dd className="text-right">{taka(order.invoice.partsCost)}</dd>
								<dt className="border-t border-line pt-2 font-sans font-semibold">Total</dt>
								<dd className="border-t border-line pt-2 text-right text-lg font-semibold">{taka(order.invoice.total)}</dd>
							</dl>
							{order.invoice.payments.length > 0 && (
								<ul className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
									{order.invoice.payments.map((p) => (
										<li key={p.id} className="flex items-center justify-between text-sm">
											<span className="text-ink-soft">
												bKash {p.trxId ? <span className="font-mono text-ink">{p.trxId}</span> : "attempt"} · {dateTime(p.paidAt ?? p.createdAt)}
											</span>
											<MoneyStatus status={p.status} />
										</li>
									))}
								</ul>
							)}
						</Section>
					)}

					{order.feedback && (
						<Section title="Customer feedback">
							<div className="flex gap-0.5" aria-label={`${order.feedback.rating} out of 5 stars`}>
								{[1, 2, 3, 4, 5].map((i) => (
									<Star key={i} className={i <= order.feedback!.rating ? "size-5 fill-signal text-signal" : "size-5 text-line-strong"} />
								))}
							</div>
							{order.feedback.comment && <p className="mt-2 text-ink-soft italic">“{order.feedback.comment}”</p>}
						</Section>
					)}

					<Section title="History">
						<Timeline orderId={order.id} />
					</Section>
				</div>

				{/* On phones the next action comes first — no scrolling past details in the field */}
				<aside className="order-first flex flex-col gap-4 lg:sticky lg:top-8 lg:order-none">
					<ActionPanel order={order} role={user.role} userId={user.id} />
					{user.role !== "CUSTOMER" && (
						<Link href={homeFor(user.role)} className="text-center text-xs text-ink-faint hover:text-ink">
							Back to dashboard
						</Link>
					)}
				</aside>
			</div>
		</div>
	);
}
