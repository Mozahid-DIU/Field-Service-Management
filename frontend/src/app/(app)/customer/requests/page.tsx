"use client";

import { Plus } from "lucide-react";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { OrderList } from "@/components/work-order/order-list";

const TABS = [
	{ key: "active", label: "Active", statuses: "PENDING,APPROVED,ASSIGNED,EN_ROUTE,IN_PROGRESS" },
	{ key: "due", label: "Payment due", statuses: "COMPLETED" },
	{ key: "done", label: "Completed", statuses: "PAID" },
	{ key: "closed", label: "Cancelled", statuses: "CANCELLED,REJECTED" },
	{ key: "all", label: "All", statuses: "" },
];

export default function MyRequestsPage() {
	return (
		<>
			<PageHeader
				eyebrow="My requests"
				title="Service history"
				description="Every request you've made, from first report to final payment."
				actions={
					<ButtonLink href="/customer/new" icon={<Plus className="size-4" />}>
						New request
					</ButtonLink>
				}
			/>
			<Suspense>
				<OrderList viewer="CUSTOMER" tabs={TABS} emptyAction={<ButtonLink href="/customer/new">Book a service</ButtonLink>} />
			</Suspense>
		</>
	);
}
