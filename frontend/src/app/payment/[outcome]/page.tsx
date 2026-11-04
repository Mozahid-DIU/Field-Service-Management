"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, RefreshCw, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, use, useEffect } from "react";
import { Logo } from "@/components/brand";
import { MoneyStatus } from "@/components/ui/badges";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { dateTime, taka } from "@/lib/format";
import type { ApiSuccess, Payment } from "@/lib/types";

const OUTCOMES = {
	success: {
		icon: CheckCircle2,
		tone: "completed",
		title: "Payment received",
		body: "bKash confirmed your payment and the invoice is settled. Thank you!",
	},
	pending: {
		icon: Clock,
		tone: "pending",
		title: "Confirming with bKash…",
		body: "We couldn't confirm the payment yet. No need to pay again — check the status below.",
	},
	cancelled: {
		icon: XCircle,
		tone: "cancelled",
		title: "Payment cancelled",
		body: "No money was taken. You can try again from the work order.",
	},
	failed: {
		icon: XCircle,
		tone: "rejected",
		title: "Payment didn't go through",
		body: "bKash did not complete the payment. No money was taken — please try again.",
	},
} as const;

type Outcome = keyof typeof OUTCOMES;

function Result({ outcome }: { outcome: Outcome }) {
	const paymentId = useSearchParams().get("paymentId");
	const { status } = useAuth();
	const meta = OUTCOMES[outcome] ?? OUTCOMES.failed;

	const payment = useQuery({
		queryKey: ["payment", paymentId],
		queryFn: async () => (await api.get<ApiSuccess<Payment>>(`/payments/${paymentId}`)).data.data,
		enabled: Boolean(paymentId) && status === "authenticated",
	});
	const verify = useMutation({
		mutationFn: async () => (await api.post<ApiSuccess<{ outcome: Outcome; payment: Payment }>>(`/payments/${paymentId}/verify`)).data.data,
		onSuccess: () => payment.refetch(),
	});

	// Pending: re-check with bKash once automatically
	useEffect(() => {
		if (outcome === "pending" && status === "authenticated" && paymentId) verify.mutate();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [outcome, status, paymentId]);

	const p = verify.data?.payment ?? payment.data;
	const Icon = meta.icon;
	const orderHref = p ? `/orders/${p.invoice.workOrder.id}` : "/customer";

	return (
		<div className="ticket w-full max-w-md overflow-hidden animate-rise">
			<div className="flex flex-col items-center px-8 pt-10 pb-6 text-center">
				<span className="grid size-16 place-items-center rounded-full" style={{ background: `var(--st-${meta.tone}-bg)`, color: `var(--st-${meta.tone})` }}>
					<Icon className="size-8" aria-hidden />
				</span>
				<h1 className="mt-5 font-display text-3xl font-bold tracking-tight">{meta.title}</h1>
				<p className="mt-2 text-ink-soft">{meta.body}</p>
			</div>
			<div className="perforation" aria-hidden />
			<div className="px-8 py-6">
				{status === "loading" || (payment.isLoading && paymentId) ? (
					<Skeleton className="h-28" />
				) : p ? (
					<dl className="grid grid-cols-2 gap-y-2 text-sm">
						<dt className="text-ink-soft">Work order</dt>
						<dd className="text-right font-mono">{p.invoice.workOrder.code}</dd>
						<dt className="text-ink-soft">Amount</dt>
						<dd className="text-right font-mono font-semibold">{taka(p.amount)}</dd>
						{p.trxId && (
							<>
								<dt className="text-ink-soft">bKash trxID</dt>
								<dd className="text-right font-mono">{p.trxId}</dd>
							</>
						)}
						<dt className="text-ink-soft">Time</dt>
						<dd className="text-right">{dateTime(p.paidAt ?? p.createdAt)}</dd>
						<dt className="text-ink-soft">Status</dt>
						<dd className="text-right">
							<MoneyStatus status={p.status} />
						</dd>
					</dl>
				) : (
					<p className="text-center text-sm text-ink-faint">Sign in to see payment details.</p>
				)}
				{verify.error && <p className="mt-3 text-center text-sm text-[var(--st-rejected)]">{errorMessage(verify.error)}</p>}
				<div className="mt-6 flex flex-col gap-2">
					{outcome === "pending" && (
						<Button variant="outline" icon={<RefreshCw className="size-4" />} loading={verify.isPending} onClick={() => verify.mutate()}>
							Check again
						</Button>
					)}
					<ButtonLink href={orderHref} variant={outcome === "success" ? "primary" : "ink"}>
						{outcome === "success" ? "Back to my request" : "Return to work order"}
					</ButtonLink>
				</div>
			</div>
		</div>
	);
}

export default function PaymentResultPage({ params }: { params: Promise<{ outcome: string }> }) {
	const { outcome } = use(params);
	const safe = (outcome in OUTCOMES ? outcome : "failed") as Outcome;
	return (
		<div className="flex min-h-dvh flex-col items-center gap-10 px-4 py-10">
			<Logo />
			<Suspense>
				<Result outcome={safe} />
			</Suspense>
		</div>
	);
}
