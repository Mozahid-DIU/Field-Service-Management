"use client";

import { ArrowRight, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, TicketSkeleton } from "@/components/ui/states";
import { OrderTicket } from "@/components/work-order/order-ticket";
import { useAuth } from "@/lib/auth-store";
import { taka } from "@/lib/format";
import { useCategories, useWorkOrders } from "@/lib/queries";

function greeting(): string {
	const hour = new Date().getHours();
	return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default function CustomerHome() {
	const { user } = useAuth();
	const active = useWorkOrders({ status: "PENDING,APPROVED,ASSIGNED,EN_ROUTE,IN_PROGRESS", limit: 5, sortBy: "updatedAt" });
	const due = useWorkOrders({ status: "COMPLETED", limit: 5 });
	const categories = useCategories();

	const dueOrders = due.data?.data ?? [];
	const dueTotal = dueOrders.reduce((sum, o) => sum + Number(o.invoice?.total ?? 0), 0);

	return (
		<>
			<PageHeader
				eyebrow="Overview"
				title={
					<>
						{greeting()}, {user?.name.split(" ")[0]}.
					</>
				}
				description="Here's everything happening at your place."
				actions={
					<ButtonLink href="/customer/new" size="lg" icon={<Plus className="size-5" />}>
						Book a service
					</ButtonLink>
				}
			/>

			{dueOrders.length > 0 && (
				<Link
					href={`/orders/${dueOrders[0].id}`}
					className="group mb-8 flex flex-col gap-4 overflow-hidden rounded-2xl bg-ink p-6 text-paper shadow-lift animate-rise sm:flex-row sm:items-center sm:justify-between"
				>
					<div className="flex items-center gap-4">
						<span className="grid size-12 place-items-center rounded-xl bg-signal text-white">
							<Wallet className="size-6" aria-hidden />
						</span>
						<div>
							<p className="font-display text-xl font-semibold">
								{dueOrders.length} invoice{dueOrders.length > 1 ? "s" : ""} ready to pay
							</p>
							<p className="text-sm text-paper/60">Work is done. Settle securely with bKash in a few taps.</p>
						</div>
					</div>
					<span className="flex items-center gap-3 font-mono text-2xl font-semibold">
						{taka(dueTotal)}
						<ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
					</span>
				</Link>
			)}

			<section className="mb-10">
				<div className="mb-4 flex items-baseline justify-between">
					<h2 className="font-display text-2xl font-bold">Active requests</h2>
					<Link href="/customer/requests" className="text-sm font-semibold text-ink-soft hover:text-ink">
						View all →
					</Link>
				</div>
				{active.isLoading ? (
					<TicketSkeleton rows={2} />
				) : (active.data?.data.length ?? 0) === 0 ? (
					<EmptyState
						title="Nothing in progress"
						description="When something breaks, book a technician — we'll handle the rest."
						action={<ButtonLink href="/customer/new">Book a service</ButtonLink>}
					/>
				) : (
					<div className="flex flex-col gap-3 stagger">
						{active.data?.data.map((order) => (
							<OrderTicket key={order.id} order={order} viewer="CUSTOMER" />
						))}
					</div>
				)}
			</section>

			<section>
				<h2 className="mb-4 font-display text-2xl font-bold">Book again</h2>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 stagger">
					{categories.data?.map((category) => (
						<Link
							key={category.id}
							href={`/customer/new?category=${category.id}`}
							className="ticket group flex flex-col justify-between gap-6 p-4 transition hover:-translate-y-0.5 hover:border-ink"
						>
							<p className="font-display font-semibold leading-tight">{category.name}</p>
							<p className="flex items-center justify-between font-mono text-sm text-ink-soft">
								from {taka(category.basePrice)}
								<ArrowRight className="size-4 text-signal opacity-0 transition group-hover:opacity-100" />
							</p>
						</Link>
					))}
				</div>
			</section>
		</>
	);
}
