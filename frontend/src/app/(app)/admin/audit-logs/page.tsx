"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";
import { PageHeader } from "@/components/layout/app-shell";
import { RoleTag } from "@/components/ui/badges";
import { Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { errorMessage } from "@/lib/api";
import { cn, dateTime, humanize } from "@/lib/format";
import { useAuditLogs } from "@/lib/queries";

const ENTITIES = ["WorkOrder", "Payment", "Invoice", "User", "ServiceCategory"];
const ACTIONS = [
	"WORK_ORDER_CREATED",
	"WORK_ORDER_STATUS_CHANGED",
	"WORK_ORDER_ASSIGNED",
	"SERVICE_REPORT_SUBMITTED",
	"INVOICE_ISSUED",
	"PAYMENT_INITIATED",
	"PAYMENT_SUCCEEDED",
	"PAYMENT_FAILED",
	"USER_REGISTERED",
	"USER_ROLE_CHANGED",
	"USER_STATUS_CHANGED",
	"TECHNICIAN_CREATED",
	"CATEGORY_CREATED",
	"CATEGORY_UPDATED",
	"CATEGORY_DELETED",
	"FEEDBACK_SUBMITTED",
];

function Diff({ before, after }: { before: unknown; after: unknown }) {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			{[
				["Before", before],
				["After", after],
			].map(([label, value]) => (
				<div key={String(label)}>
					<p className="mb-1 text-xs font-semibold text-ink-faint">{String(label)}</p>
					<pre className="overflow-x-auto rounded-lg bg-ink p-3 font-mono text-xs leading-relaxed text-paper">
						{value ? JSON.stringify(value, null, 2) : "—"}
					</pre>
				</div>
			))}
		</div>
	);
}

export default function AuditLogsPage() {
	const [entity, setEntity] = useState("");
	const [action, setAction] = useState("");
	const [page, setPage] = useState(1);
	const [expanded, setExpanded] = useState<string | null>(null);
	const logs = useAuditLogs({ entity, action, page, limit: 20 });

	return (
		<>
			<PageHeader eyebrow="Compliance" title="Audit log" description="Who changed what, and when. Written in the same transaction as every critical change." />

			<div className="mb-5 flex flex-col gap-2 sm:flex-row">
				<Select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} className="sm:w-56" aria-label="Entity">
					<option value="">All entities</option>
					{ENTITIES.map((e) => (
						<option key={e} value={e}>
							{e}
						</option>
					))}
				</Select>
				<Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="sm:w-72" aria-label="Action">
					<option value="">All actions</option>
					{ACTIONS.map((a) => (
						<option key={a} value={a}>
							{humanize(a)}
						</option>
					))}
				</Select>
			</div>

			{logs.isLoading ? (
				<Skeleton className="h-96" />
			) : logs.error ? (
				<ErrorState message={errorMessage(logs.error)} onRetry={() => logs.refetch()} />
			) : logs.data?.data.length === 0 ? (
				<EmptyState title="No entries" description="Try a different filter." />
			) : (
				<div className="ticket overflow-x-auto">
					<table className="w-full min-w-[720px] text-sm">
						<thead>
							<tr className="border-b border-line text-left text-xs text-ink-faint">
								<th className="px-5 py-3 font-medium">When</th>
								<th className="px-5 py-3 font-medium">Actor</th>
								<th className="px-5 py-3 font-medium">Action</th>
								<th className="px-5 py-3 font-medium">Entity</th>
								<th className="w-10 px-5 py-3" />
							</tr>
						</thead>
						<tbody>
							{logs.data?.data.map((log) => {
								const open = expanded === log.id;
								return (
									<Fragment key={log.id}>
										<tr
											className="cursor-pointer border-b border-line/60 hover:bg-paper/60"
											onClick={() => setExpanded(open ? null : log.id)}
											aria-expanded={open}
										>
											<td className="px-5 py-3 whitespace-nowrap text-ink-soft">{dateTime(log.createdAt)}</td>
											<td className="px-5 py-3">
												{log.actor ? (
													<span className="flex items-center gap-2">
														{log.actor.name} <RoleTag role={log.actor.role} />
													</span>
												) : (
													<span className="font-mono text-xs text-ink-faint">SYSTEM</span>
												)}
											</td>
											<td className="px-5 py-3 font-medium">{humanize(log.action)}</td>
											<td className="px-5 py-3">
												{log.entity === "WorkOrder" ? (
													<Link href={`/orders/${log.entityId}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs hover:text-signal-strong">
														WorkOrder · {log.entityId.slice(0, 8)}
													</Link>
												) : (
													<span className="font-mono text-xs">
														{log.entity} · {log.entityId.slice(0, 8)}
													</span>
												)}
											</td>
											<td className="px-5 py-3">
												<ChevronDown className={cn("size-4 text-ink-faint transition-transform", open && "rotate-180")} />
											</td>
										</tr>
										{open && (
											<tr className="border-b border-line/60 bg-paper/50">
												<td colSpan={5} className="px-5 py-4">
													<Diff before={log.before} after={log.after} />
												</td>
											</tr>
										)}
									</Fragment>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
			<div className="mt-4">
				<Pagination meta={logs.data?.meta} onPage={setPage} />
			</div>
		</>
	);
}
