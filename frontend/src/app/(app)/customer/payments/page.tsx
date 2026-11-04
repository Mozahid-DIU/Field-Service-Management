"use client";

import { CreditCard } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/app-shell";
import { MoneyStatus } from "@/components/ui/badges";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { errorMessage } from "@/lib/api";
import { dateTime, taka } from "@/lib/format";
import { usePayments } from "@/lib/queries";

export default function PaymentsPage() {
	const [page, setPage] = useState(1);
	const { data, isLoading, error, refetch } = usePayments({ page, limit: 10 });
	const paid = data?.data.filter((p) => p.status === "SUCCESS").reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

	return (
		<>
			<PageHeader eyebrow="Payments" title="Payments" description="Your bKash payment history." />

			{isLoading ? (
				<Skeleton className="h-72" />
			) : error ? (
				<ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
			) : data?.data.length === 0 ? (
				<EmptyState icon={<CreditCard className="size-6" />} title="No payments yet" description="Invoices appear after a technician completes your job." />
			) : (
				<>
					{(data?.meta.totalPages ?? 1) <= 1 && (
						<p className="mb-3 text-sm text-ink-soft">
							Total paid: <span className="font-semibold text-ink">{taka(paid)}</span>
						</p>
					)}
					<div className="ticket overflow-x-auto">
						<table className="w-full min-w-[640px] text-sm">
							<thead>
								<tr className="border-b border-line text-left text-xs text-ink-faint">
									<th className="px-5 py-3 font-medium">Work order</th>
									<th className="px-5 py-3 font-medium">Invoice</th>
									<th className="px-5 py-3 font-medium">bKash trx</th>
									<th className="px-5 py-3 font-medium">Date</th>
									<th className="px-5 py-3 text-right font-medium">Amount</th>
									<th className="px-5 py-3 text-right font-medium">Status</th>
								</tr>
							</thead>
							<tbody>
								{data?.data.map((p) => (
									<tr key={p.id} className="border-b border-line/60 last:border-0 hover:bg-paper/60">
										<td className="px-5 py-3">
											<Link href={`/orders/${p.invoice.workOrder.id}`} className="font-medium hover:text-signal-strong">
												{p.invoice.workOrder.title}
											</Link>
											<p className="font-mono text-[11px] text-ink-faint">{p.invoice.workOrder.code}</p>
										</td>
										<td className="px-5 py-3 font-mono text-xs">{p.invoice.invoiceNo}</td>
										<td className="px-5 py-3 font-mono text-xs">{p.trxId ?? "—"}</td>
										<td className="px-5 py-3 text-ink-soft">{dateTime(p.paidAt ?? p.createdAt)}</td>
										<td className="px-5 py-3 text-right font-mono font-semibold">{taka(p.amount)}</td>
										<td className="px-5 py-3 text-right">
											<MoneyStatus status={p.status} />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="mt-4">
						<Pagination meta={data?.meta} onPage={setPage} />
					</div>
				</>
			)}
		</>
	);
}
