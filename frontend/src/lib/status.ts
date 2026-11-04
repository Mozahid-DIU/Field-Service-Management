import type { Priority, WorkOrderStatus } from "./types";

interface StatusMeta {
	label: string;
	/** CSS variable stem, e.g. "pending" → --st-pending / --st-pending-bg */
	tone: string;
	customerHint: string;
}

export const STATUS_META: Record<WorkOrderStatus, StatusMeta> = {
	PENDING: {
		label: "Pending review",
		tone: "pending",
		customerHint: "We got your request and will review it soon.",
	},
	APPROVED: {
		label: "Approved",
		tone: "approved",
		customerHint: "Your request is approved. We're finding a technician for you.",
	},
	REJECTED: {
		label: "Rejected",
		tone: "rejected",
		customerHint: "This request could not be accepted.",
	},
	ASSIGNED: {
		label: "Scheduled",
		tone: "assigned",
		customerHint: "A technician is booked for your visit.",
	},
	EN_ROUTE: {
		label: "On the way",
		tone: "enroute",
		customerHint: "Your technician is on the way.",
	},
	IN_PROGRESS: {
		label: "In progress",
		tone: "progress",
		customerHint: "Work is underway at your address.",
	},
	COMPLETED: {
		label: "Payment due",
		tone: "completed",
		customerHint: "The work is done. Please check the bill and pay with bKash.",
	},
	PAID: {
		label: "Paid",
		tone: "paid",
		customerHint: "All done. Thank you for using FixFlow!",
	},
	CANCELLED: {
		label: "Cancelled",
		tone: "cancelled",
		customerHint: "This request was cancelled.",
	},
};

/** The happy path, used by the lifecycle rail. */
export const LIFECYCLE: { status: WorkOrderStatus; short: string }[] = [
	{ status: "PENDING", short: "Requested" },
	{ status: "APPROVED", short: "Approved" },
	{ status: "ASSIGNED", short: "Scheduled" },
	{ status: "EN_ROUTE", short: "On the way" },
	{ status: "IN_PROGRESS", short: "Working" },
	{ status: "COMPLETED", short: "Invoiced" },
	{ status: "PAID", short: "Paid" },
];

export const TERMINAL_FAILURE: WorkOrderStatus[] = ["REJECTED", "CANCELLED"];

export const ACTIVE_STATUSES: WorkOrderStatus[] = [
	"PENDING",
	"APPROVED",
	"ASSIGNED",
	"EN_ROUTE",
	"IN_PROGRESS",
	"COMPLETED",
];

export const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
	LOW: { label: "Low", className: "text-ink-faint" },
	MEDIUM: { label: "Normal", className: "text-ink-soft" },
	HIGH: { label: "High", className: "text-[var(--st-progress)]" },
	URGENT: { label: "Urgent", className: "text-[var(--st-rejected)]" },
};

export const CANCELLABLE: WorkOrderStatus[] = ["PENDING", "APPROVED", "ASSIGNED"];
