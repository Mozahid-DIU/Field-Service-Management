"use client";

import { ArrowRight, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { WelcomeBanner } from "@/components/ui/stat-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, TicketSkeleton } from "@/components/ui/states";
import { OrderTicket } from "@/components/work-order/order-ticket";
import { useAuth } from "@/lib/auth-store";
import { CategoryIcon } from "@/lib/category-icon";
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
			<WelcomeBanner
				title={
					<>
						{greeting()}, {user?.name.split(" ")[0]} 👋
					</>
				}
				description="What needs fixing today?"
				action={
					<ButtonLink href="/customer/new" size="lg" icon={<Plus className="size-5" />} className="bg-none bg-white text-bottle-700 shadow-none hover:bg-amber-50">
						Book a service
					</ButtonLink>
				}
			/>

			{dueOrders.length > 0 && (
				<Link
					href={`/orders/${dueOrders[0].id}`}
					className="group mb-8 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 sm:flex-row sm:items-center sm:justify-between"
				>
					<div className="flex items-center gap-4">
						<span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/25">
							<Wallet className="size-6" aria-hidden />
						</span>
						<div>
							<p className="font-display text-xl font-semibold">
								{dueOrders.length} bill{dueOrders.length > 1 ? "s" : ""} to pay
							</p>
							<p className="text-sm text-ink-soft">The work is done. Pay with bKash in a few taps.</p>
						</div>
					</div>
					<span className="flex items-center gap-2 text-xl font-bold text-orange-600">
						{taka(dueTotal)}
						<ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
					</span>
				</Link>
			)}

			<section className="mb-10">
				<div className="mb-4 flex items-baseline justify-between">
					<h2 className="text-lg font-bold">Ongoing requests</h2>
					<Link href="/customer/requests" className="text-sm font-semibold text-ink-soft hover:text-ink">
						View all →
					</Link>
				</div>
				{active.isLoading ? (
					<TicketSkeleton rows={2} />
				) : (active.data?.data.length ?? 0) === 0 ? (
					<EmptyState
						title="Nothing in progress"
						description="When something needs fixing, book a technician and we'll take care of the rest."
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
				<h2 className="mb-4 text-lg font-bold">Book a service</h2>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 stagger">
					{categories.data?.map((category) => (
						<Link
							key={category.id}
							href={`/customer/new?category=${category.id}`}
							className="ticket group flex flex-col justify-between gap-6 p-4 transition hover:-translate-y-0.5 hover:border-ink"
						>
							<span className="flex items-center gap-3"><CategoryIcon name={category.name} size="sm" /><span className="font-semibold leading-tight">{category.name}</span></span>
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
