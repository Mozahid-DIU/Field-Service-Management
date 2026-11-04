"use client";

import { useMutation } from "@tanstack/react-query";
import { Ban, ShieldCheck, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { api, errorMessage } from "@/lib/api";
import { cn, taka } from "@/lib/format";
import type { ApiSuccess, WorkOrderDetail } from "@/lib/types";
import { useOrderAction } from "./use-order-action";

export function PayWithBkash({ order }: { order: WorkOrderDetail }) {
	const pay = useMutation({
		mutationFn: async () => {
			const res = await api.post<ApiSuccess<{ bkashURL: string }>>("/payments/bkash/initiate", {
				invoiceId: order.invoice?.id,
			});
			return res.data.data;
		},
		onSuccess: ({ bkashURL }) => {
			toast.success("Redirecting to bKash…");
			window.location.assign(bkashURL);
		},
		onError: (error) => toast.error(errorMessage(error, "Could not start the payment")),
	});

	if (!order.invoice) return null;
	return (
		<div className="ticket overflow-hidden">
			<div className="p-5">
				<p className="text-sm text-ink-soft">Amount to pay</p>
				<p className="mt-1 text-3xl font-bold">{taka(order.invoice.total)}</p>
				<p className="mt-1 text-sm text-ink-faint">Bill no. {order.invoice.invoiceNo}</p>
			</div>
			<div className="border-t border-line bg-paper/60 p-5">
				<Button
					size="lg"
					className="w-full bg-[#e2136e] hover:bg-[#c40f5f]"
					loading={pay.isPending || pay.isSuccess}
					onClick={() => pay.mutate()}
				>
					Pay with bKash
				</Button>
				<p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-faint">
					<ShieldCheck className="size-3.5" aria-hidden /> Secure payment with bKash
				</p>
			</div>
		</div>
	);
}

export function CancelRequest({ order }: { order: WorkOrderDetail }) {
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const cancel = useOrderAction(
		order.id,
		() => api.post(`/work-orders/${order.id}/cancel`, { reason }),
		"Request cancelled",
		() => setOpen(false),
	);
	return (
		<>
			<Button variant="danger" icon={<Ban className="size-4" />} onClick={() => setOpen(true)} className="w-full">
				Cancel request
			</Button>
			<Dialog
				open={open}
				onClose={() => setOpen(false)}
				title="Cancel this request?"
				description="The assigned technician (if any) will be released. This can't be undone."
				footer={
					<>
						<Button variant="ghost" onClick={() => setOpen(false)}>
							Keep request
						</Button>
						<Button variant="danger" loading={cancel.isPending} disabled={reason.trim().length < 3} onClick={() => cancel.mutate(undefined)}>
							Cancel request
						</Button>
					</>
				}
			>
				<Field label="Reason" htmlFor="cancel-reason" hint="Please tell us why (at least 3 characters).">
					<Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fixed it myself" autoFocus />
				</Field>
			</Dialog>
		</>
	);
}

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

export function FeedbackForm({ order }: { order: WorkOrderDetail }) {
	const [rating, setRating] = useState(0);
	const [hover, setHover] = useState(0);
	const [comment, setComment] = useState("");
	const submit = useOrderAction(
		order.id,
		() => api.post(`/work-orders/${order.id}/feedback`, { rating, ...(comment.trim() ? { comment } : {}) }),
		"Thanks for your feedback!",
	);
	const shown = hover || rating;

	return (
		<div className="ticket p-5">
			<p className="font-display text-lg font-semibold">How was {order.technician?.name.split(" ")[0] ?? "the service"}?</p>
			<p className="text-sm text-ink-soft">Your rating helps other customers and our technicians.</p>
			<div className="mt-4 flex items-center gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
				{[1, 2, 3, 4, 5].map((value) => (
					<button
						key={value}
						type="button"
						role="radio"
						aria-checked={rating === value}
						aria-label={`${value} star${value > 1 ? "s" : ""}`}
						onMouseEnter={() => setHover(value)}
						onClick={() => setRating(value)}
						className="cursor-pointer p-1 transition-transform hover:scale-110"
					>
						<Star className={cn("size-8", value <= shown ? "fill-signal text-signal" : "text-line-strong")} />
					</button>
				))}
				<span className="ml-2 text-sm font-semibold text-ink-soft">{RATING_LABELS[shown]}</span>
			</div>
			<Textarea className="mt-4 min-h-20" placeholder="Anything to add? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} aria-label="Comment" />
			<Button className="mt-3 w-full" disabled={!rating} loading={submit.isPending} onClick={() => submit.mutate(undefined)}>
				Submit rating
			</Button>
		</div>
	);
}
