"use client";

import { Search, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, TicketSkeleton } from "@/components/ui/states";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/format";
import { useWorkOrders } from "@/lib/queries";
import type { Role } from "@/lib/types";
import { useDebounced, useUrlState } from "@/lib/use-url-state";
import { OrderTicket } from "./order-ticket";

export interface OrderTab {
	key: string;
	label: string;
	/** comma-separated statuses; empty = all */
	statuses: string;
}

const DEFAULTS = { tab: "", q: "", page: "1", sort: "createdAt", priority: "" };
const PAGE_SIZE = 8;

export function OrderList({
	viewer,
	tabs,
	emptyAction,
	showPriority,
}: {
	viewer: Role;
	tabs: OrderTab[];
	emptyAction?: ReactNode;
	showPriority?: boolean;
}) {
	const [state, setState] = useUrlState({ ...DEFAULTS, tab: tabs[0].key });
	const [search, setSearch] = useState(state.q);
	const debouncedSearch = useDebounced(search);

	useEffect(() => {
		if (debouncedSearch !== state.q) setState({ q: debouncedSearch });
	}, [debouncedSearch, state.q, setState]);

	const tab = tabs.find((t) => t.key === state.tab) ?? tabs[0];
	const query = useWorkOrders({
		status: tab.statuses,
		q: state.q,
		page: state.page,
		limit: PAGE_SIZE,
		sortBy: state.sort,
		sortOrder: "desc",
		priority: state.priority,
	});

	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filter by status">
					{tabs.map((t) => (
						<button
							key={t.key}
							type="button"
							role="tab"
							aria-selected={t.key === tab.key}
							onClick={() => setState({ tab: t.key })}
							className={cn(
								"shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors",
								t.key === tab.key ? "bg-ink text-paper" : "bg-card text-ink-soft ring-1 ring-line hover:text-ink",
							)}
						>
							{t.label}
						</button>
					))}
				</div>
				<div className="flex gap-2">
					<div className="relative flex-1 lg:w-72">
						<Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search code, title, address…"
							aria-label="Search work orders"
							className="pr-9 pl-10"
						/>
						{search && (
							<button type="button" onClick={() => setSearch("")} className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-ink-faint hover:text-ink" aria-label="Clear search">
								<X className="size-4" />
							</button>
						)}
					</div>
					{showPriority && (
						<Select value={state.priority} onChange={(e) => setState({ priority: e.target.value })} aria-label="Priority" className="w-36">
							<option value="">Any priority</option>
							<option value="URGENT">Urgent</option>
							<option value="HIGH">High</option>
							<option value="MEDIUM">Medium</option>
							<option value="LOW">Low</option>
						</Select>
					)}
					<Select value={state.sort} onChange={(e) => setState({ sort: e.target.value })} aria-label="Sort by" className="w-40">
						<option value="createdAt">Newest</option>
						<option value="updatedAt">Recently updated</option>
						<option value="scheduledStart">Visit date</option>
						<option value="priority">Priority</option>
					</Select>
				</div>
			</div>

			<div className={cn("transition-opacity", query.isPlaceholderData && "opacity-60")}>
				{query.isLoading ? (
					<TicketSkeleton rows={4} />
				) : query.error ? (
					<ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
				) : query.data?.data.length === 0 ? (
					<EmptyState
						title={state.q ? `No results for “${state.q}”` : "No work orders here"}
						description={state.q ? "Try a different search or tab." : "Orders will appear here as they move through this stage."}
						action={state.q ? undefined : emptyAction}
					/>
				) : (
					<div className="flex flex-col gap-3 stagger" key={`${tab.key}-${state.page}-${state.q}`}>
						{query.data?.data.map((order) => (
							<OrderTicket key={order.id} order={order} viewer={viewer} />
						))}
					</div>
				)}
			</div>

			<Pagination meta={query.data?.meta} onPage={(page) => setState({ page: String(page) })} />
		</div>
	);
}
