"use client";

import { CalendarPlus, Check, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { cn, rating, timeRange, toLocalInput } from "@/lib/format";
import { useTechnicians } from "@/lib/queries";
import type { WorkOrderDetail } from "@/lib/types";
import { useOrderAction } from "./use-order-action";

export function ReviewActions({ order }: { order: WorkOrderDetail }) {
	const [rejecting, setRejecting] = useState(false);
	const [note, setNote] = useState("");
	const review = useOrderAction(
		order.id,
		(vars: { decision: "APPROVE" | "REJECT"; note?: string }) => api.patch(`/work-orders/${order.id}/review`, vars),
		(vars) => (vars.decision === "APPROVE" ? "Request approved" : "Request rejected"),
		() => setRejecting(false),
	);
	return (
		<div className="ticket flex flex-col gap-3 p-5">
			<p className="font-display text-lg font-semibold">Review request</p>
			<div className="grid grid-cols-2 gap-2">
				<Button variant="outline" icon={<X className="size-4" />} onClick={() => setRejecting(true)}>
					Reject
				</Button>
				<Button icon={<Check className="size-4" />} loading={review.isPending && !rejecting} onClick={() => review.mutate({ decision: "APPROVE" })}>
					Approve
				</Button>
			</div>
			<Dialog
				open={rejecting}
				onClose={() => setRejecting(false)}
				title="Reject request"
				description="The customer will see this note."
				footer={
					<>
						<Button variant="ghost" onClick={() => setRejecting(false)}>
							Back
						</Button>
						<Button variant="danger" disabled={note.trim().length < 3} loading={review.isPending} onClick={() => review.mutate({ decision: "REJECT", note })}>
							Reject request
						</Button>
					</>
				}
			>
				<Field label="Reason" htmlFor="reject-note">
					<Textarea id="reject-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Outside our service area" autoFocus />
				</Field>
			</Dialog>
		</div>
	);
}

const DURATIONS = [1, 2, 3, 4, 6];

function defaultStart(order: WorkOrderDetail): Date {
	if (order.scheduledStart) return new Date(order.scheduledStart);
	const base = order.preferredDate ? new Date(order.preferredDate) : new Date(Date.now() + 24 * 3600_000);
	const start = base.getTime() < Date.now() ? new Date(Date.now() + 2 * 3600_000) : base;
	start.setMinutes(0, 0, 0);
	return start;
}

export function AssignTechnician({ order }: { order: WorkOrderDetail }) {
	const [open, setOpen] = useState(false);
	const [start, setStart] = useState(() => toLocalInput(defaultStart(order)));
	const [hours, setHours] = useState(2);
	const [technicianId, setTechnicianId] = useState(order.technician?.id ?? "");

	const slot = useMemo(() => {
		const s = new Date(start);
		return { from: s.toISOString(), to: new Date(s.getTime() + hours * 3600_000).toISOString() };
	}, [start, hours]);
	const validWindow = new Date(slot.from).getTime() > Date.now();

	const techs = useTechnicians({ categoryId: order.category.id, from: slot.from, to: slot.to, limit: 50 }, open && validWindow);
	const assign = useOrderAction(
		order.id,
		() => api.post(`/work-orders/${order.id}/assign`, { technicianId, scheduledStart: slot.from, scheduledEnd: slot.to }),
		"Visit scheduled",
		() => setOpen(false),
	);

	const sorted = [...(techs.data?.data ?? [])].sort(
		(a, b) => Number(b.isFreeInWindow) - Number(a.isFreeInWindow) || Number(b.technicianProfile?.avgRating) - Number(a.technicianProfile?.avgRating),
	);

	return (
		<>
			<div className="ticket flex flex-col gap-3 p-5">
				<p className="font-display text-lg font-semibold">{order.technician ? "Reschedule / reassign" : "Assign a technician"}</p>
				{order.technician && <p className="text-sm text-ink-soft">{timeRange(order.scheduledStart, order.scheduledEnd)}</p>}
				<Button icon={<CalendarPlus className="size-4" />} onClick={() => setOpen(true)}>
					{order.technician ? "Change schedule" : "Schedule visit"}
				</Button>
			</div>
			<Dialog
				open={open}
				onClose={() => setOpen(false)}
				size="lg"
				title="Schedule visit"
				description={`Showing technicians skilled in ${order.category.name}. Busy ones already have a job in this window.`}
				footer={
					<>
						<Button variant="ghost" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button disabled={!technicianId || !validWindow} loading={assign.isPending} onClick={() => assign.mutate(undefined)}>
							Confirm booking
						</Button>
					</>
				}
			>
				<div className="grid gap-4 sm:grid-cols-[1fr_160px]">
					<Field label="Start" htmlFor="slot-start" error={validWindow ? undefined : "Pick a time in the future"}>
						<Input id="slot-start" type="datetime-local" value={start} min={toLocalInput(new Date())} onChange={(e) => setStart(e.target.value)} />
					</Field>
					<Field label="Duration" htmlFor="slot-hours">
						<Select id="slot-hours" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
							{DURATIONS.map((h) => (
								<option key={h} value={h}>
									{h} hour{h > 1 ? "s" : ""}
								</option>
							))}
						</Select>
					</Field>
				</div>

				<fieldset className="mt-5 flex flex-col gap-2">
					<legend className="mb-2 text-sm font-semibold">Technician</legend>
					{techs.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
					{!techs.isLoading && sorted.length === 0 && (
						<p className="rounded-xl bg-paper p-4 text-sm text-ink-soft">No technician has this skill yet. Add one from the Technicians page.</p>
					)}
					{sorted.map((tech) => {
						const busy = tech.isFreeInWindow === false;
						const unavailable = tech.technicianProfile?.isAvailable === false;
						const disabled = busy || unavailable;
						return (
							<label
								key={tech.id}
								className={cn(
									"flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition",
									technicianId === tech.id ? "border-ink bg-paper shadow-ticket" : "border-line hover:border-ink-faint",
									disabled && "cursor-not-allowed opacity-55",
								)}
							>
								<input type="radio" name="technician" value={tech.id} checked={technicianId === tech.id} disabled={disabled} onChange={() => setTechnicianId(tech.id)} className="size-4 accent-[var(--signal)]" />
								<Avatar name={tech.name} src={tech.avatarUrl} size={36} />
								<div className="min-w-0 flex-1">
									<p className="font-semibold">{tech.name}</p>
									<p className="flex items-center gap-2 text-xs text-ink-soft">
										<Star className="size-3 fill-signal text-signal" aria-hidden />
										{rating(tech.technicianProfile?.avgRating, tech.technicianProfile?.ratingCount)} · {tech.technicianProfile?.totalJobs ?? 0} jobs
									</p>
								</div>
								<span
									className={cn(
										"rounded-full px-2.5 py-1 text-xs font-semibold",
										disabled ? "bg-[var(--st-rejected-bg)] text-[var(--st-rejected)]" : "bg-[var(--st-completed-bg)] text-[var(--st-completed)]",
									)}
								>
									{unavailable ? "Off duty" : busy ? "Busy" : "Free"}
								</span>
							</label>
						);
					})}
				</fieldset>
			</Dialog>
		</>
	);
}

export function DeleteOrder({ order }: { order: WorkOrderDetail }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const remove = useOrderAction(order.id, () => api.delete(`/work-orders/${order.id}`), "Work order archived", () => router.replace("/admin/work-orders"));
	return (
		<>
			<Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => setOpen(true)} className="text-ink-faint hover:text-[var(--st-rejected)]">
				Archive
			</Button>
			<Dialog
				open={open}
				onClose={() => setOpen(false)}
				title="Archive this work order?"
				description="It is soft-deleted: hidden everywhere, but kept in the database and audit log."
				footer={
					<>
						<Button variant="ghost" onClick={() => setOpen(false)}>
							Keep
						</Button>
						<Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(undefined)}>
							Archive
						</Button>
					</>
				}
			>
				<p className="font-mono text-sm">{order.code}</p>
			</Dialog>
		</>
	);
}
