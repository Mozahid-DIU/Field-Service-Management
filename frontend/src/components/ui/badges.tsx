import { cn } from "@/lib/format";
import { PRIORITY_META, STATUS_META } from "@/lib/status";
import type { InvoiceStatus, PaymentStatus, Priority, WorkOrderStatus } from "@/lib/types";

const LIVE: WorkOrderStatus[] = ["EN_ROUTE", "IN_PROGRESS"];

export function StatusPill({
	status,
	size = "md",
	className,
}: {
	status: WorkOrderStatus;
	size?: "sm" | "md";
	className?: string;
}) {
	const meta = STATUS_META[status];
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
				size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
				className,
			)}
			style={{ color: `var(--st-${meta.tone})`, background: `var(--st-${meta.tone}-bg)` }}
		>
			<span
				className={cn("size-1.5 rounded-full bg-current", LIVE.includes(status) && "live-dot")}
				aria-hidden
			/>
			{meta.label}
		</span>
	);
}

export function PriorityTag({ priority }: { priority: Priority }) {
	const meta = PRIORITY_META[priority];
	const bars = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 }[priority];
	return (
		<span className={cn("inline-flex items-center gap-1.5 text-xs", meta.className)} title={`${meta.label} priority`}>
			<span className="flex items-end gap-[2px]" aria-hidden>
				{[1, 2, 3, 4].map((i) => (
					<span
						key={i}
						className={cn("w-[3px] rounded-sm", i <= bars ? "bg-current" : "bg-line")}
						style={{ height: 4 + i * 2 }}
					/>
				))}
			</span>
			{meta.label}
		</span>
	);
}

const PAYMENT_TONE: Record<PaymentStatus | InvoiceStatus, string> = {
	SUCCESS: "paid",
	PAID: "paid",
	INITIATED: "pending",
	UNPAID: "pending",
	FAILED: "rejected",
	CANCELLED: "cancelled",
	VOID: "cancelled",
};

export function MoneyStatus({ status }: { status: PaymentStatus | InvoiceStatus }) {
	const tone = PAYMENT_TONE[status];
	return (
		<span
			className="inline-flex rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide"
			style={{ color: `var(--st-${tone})`, background: `var(--st-${tone}-bg)` }}
		>
			{status}
		</span>
	);
}

export function RoleTag({ role }: { role: "CUSTOMER" | "TECHNICIAN" | "ADMIN" }) {
	const styles = {
		ADMIN: "bg-ink text-paper",
		TECHNICIAN: "bg-signal-wash text-signal-strong",
		CUSTOMER: "bg-paper-sunken text-ink-soft",
	}[role];
	return (
		<span className={cn("rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider", styles)}>
			{role}
		</span>
	);
}
