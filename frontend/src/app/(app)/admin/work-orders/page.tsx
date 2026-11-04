"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/layout/app-shell";
import { OrderList } from "@/components/work-order/order-list";

const TABS = [
	{ key: "review", label: "Needs review", statuses: "PENDING" },
	{ key: "schedule", label: "To schedule", statuses: "APPROVED" },
	{ key: "field", label: "In the field", statuses: "ASSIGNED,EN_ROUTE,IN_PROGRESS" },
	{ key: "billing", label: "Awaiting payment", statuses: "COMPLETED" },
	{ key: "paid", label: "Paid", statuses: "PAID" },
	{ key: "closed", label: "Closed", statuses: "REJECTED,CANCELLED" },
	{ key: "all", label: "All", statuses: "" },
];

export default function AdminWorkOrdersPage() {
	return (
		<>
			<PageHeader eyebrow="Work orders" title="Dispatch queue" description="Review, schedule and follow every job from request to payment." />
			<Suspense>
				<OrderList viewer="ADMIN" tabs={TABS} showPriority />
			</Suspense>
		</>
	);
}
