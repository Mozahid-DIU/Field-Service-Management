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
	return (
		<span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", meta.className)}>
			<span className="size-1.5 rounded-full bg-current" aria-hidden />
			{meta.label} priority
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
			className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
			style={{ color: `var(--st-${tone})`, background: `var(--st-${tone}-bg)` }}
		>
			{status.charAt(0) + status.slice(1).toLowerCase()}
		</span>
	);
}

export function RoleTag({ role }: { role: "CUSTOMER" | "TECHNICIAN" | "ADMIN" }) {
	const styles = {
		ADMIN: "bg-ink/8 text-ink",
		TECHNICIAN: "bg-signal-wash text-signal-strong",
		CUSTOMER: "bg-paper-sunken text-ink-soft",
	}[role];
	return (
		<span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", styles)}>
			{role.charAt(0) + role.slice(1).toLowerCase()}
		</span>
	);
}
