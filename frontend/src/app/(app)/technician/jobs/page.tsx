"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/layout/app-shell";
import { OrderList } from "@/components/work-order/order-list";

const TABS = [
	{ key: "upcoming", label: "Upcoming", statuses: "ASSIGNED,EN_ROUTE,IN_PROGRESS" },
	{ key: "done", label: "Completed", statuses: "COMPLETED,PAID" },
	{ key: "all", label: "All", statuses: "" },
];

export default function TechnicianJobsPage() {
	return (
		<>
			<PageHeader eyebrow="My jobs" title="All assigned jobs" description="Everything dispatch has booked for you." />
			<Suspense>
				<OrderList viewer="TECHNICIAN" tabs={TABS} />
			</Suspense>
		</>
	);
}
