"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Navigation, Plus, Trash2, Wrench } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input, Textarea } from "@/components/ui/field";
import { api } from "@/lib/api";
import { taka } from "@/lib/format";
import type { WorkOrderDetail } from "@/lib/types";
import { useOrderAction } from "./use-order-action";

const NEXT_STEP = {
	ASSIGNED: { to: "EN_ROUTE", label: "I'm on my way", icon: Navigation, hint: "Lets the customer know you're coming." },
	EN_ROUTE: { to: "IN_PROGRESS", label: "Start work", icon: Wrench, hint: "Tap when you've arrived and begun." },
} as const;

export function AdvanceStatus({ order, asAdmin }: { order: WorkOrderDetail; asAdmin?: boolean }) {
	const step = NEXT_STEP[order.status as keyof typeof NEXT_STEP];
	const advance = useOrderAction(
		order.id,
		() => api.patch(`/work-orders/${order.id}/status`, { status: step.to }),
		step?.to === "EN_ROUTE" ? "The customer knows you're on the way" : "Job started",
	);
	if (!step) return null;
	return (
		<div className="ticket p-5">
			<Button size="lg" className="h-14 w-full text-base" icon={<step.icon className="size-5" />} loading={advance.isPending} onClick={() => advance.mutate(undefined)}>
				{asAdmin ? (step.to === "EN_ROUTE" ? "Mark as on the way" : "Mark work as started") : step.label}
			</Button>
			<p className="mt-2 text-center text-xs text-ink-faint">
				{asAdmin ? "Use this if the technician can't update it themselves." : step.hint}
			</p>
		</div>
	);
}

const partSchema = z.object({
	name: z.string().trim().min(1, "Part name"),
	qty: z.coerce.number<string | number>().int().min(1, "≥1"),
	unitCost: z.coerce.number<string | number>().min(0, "≥0"),
});
const reportSchema = z.object({
	workDone: z.string().trim().min(10, "Describe the work in at least 10 characters"),
	laborMinutes: z.coerce.number<string | number>().int().min(1, "Enter minutes worked").max(1440),
	partsUsed: z.array(partSchema),
});
type ReportValues = z.input<typeof reportSchema>;
type ReportOutput = z.output<typeof reportSchema>;

export function ServiceReportForm({ order }: { order: WorkOrderDetail }) {
	const {
		register,
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<ReportValues, unknown, ReportOutput>({
		resolver: zodResolver(reportSchema),
		defaultValues: { workDone: "", laborMinutes: 60, partsUsed: [] },
	});
	const { fields, append, remove } = useFieldArray({ control, name: "partsUsed" });
	const parts = useWatch({ control, name: "partsUsed" }) ?? [];
	const partsTotal = parts.reduce((sum, p) => sum + (Number(p?.qty) || 0) * (Number(p?.unitCost) || 0), 0);
	const serviceFee = Number(order.category.basePrice);

	const submit = useOrderAction(
		order.id,
		(values: ReportOutput) => api.post(`/work-orders/${order.id}/report`, values),
		"Job completed. Invoice sent to the customer.",
	);

	return (
		<form onSubmit={handleSubmit((values) => submit.mutate(values))} className="ticket flex flex-col gap-4 p-5" noValidate>
			<div>
				<p className="font-display text-lg font-semibold">Finish job</p>
				<p className="text-sm text-ink-soft">Submitting the report completes the job and issues the invoice.</p>
			</div>
			<Field label="Work done" htmlFor="workDone" error={errors.workDone?.message}>
				<Textarea placeholder="What did you diagnose and fix?" {...describedBy("workDone", errors.workDone?.message)} {...register("workDone")} />
			</Field>
			<Field label="Labour (minutes)" htmlFor="laborMinutes" error={errors.laborMinutes?.message}>
				<Input type="number" inputMode="numeric" min={1} {...describedBy("laborMinutes", errors.laborMinutes?.message)} {...register("laborMinutes")} />
			</Field>

			<div className="flex flex-col gap-2">
				<p className="text-sm font-semibold">Parts used</p>
				{fields.length === 0 && <p className="text-sm text-ink-faint">No parts used.</p>}
				{fields.map((field, index) => (
					<div key={field.id} className="grid grid-cols-[1fr_64px_96px_36px] items-start gap-2">
						<Input placeholder="Part" aria-label="Part name" {...register(`partsUsed.${index}.name`)} aria-invalid={Boolean(errors.partsUsed?.[index]?.name)} />
						<Input type="number" inputMode="numeric" aria-label="Quantity" min={1} {...register(`partsUsed.${index}.qty`)} />
						<Input type="number" inputMode="decimal" aria-label="Unit cost" min={0} step="0.01" {...register(`partsUsed.${index}.unitCost`)} />
						<button type="button" onClick={() => remove(index)} className="grid h-11 cursor-pointer place-items-center rounded-lg text-ink-faint hover:bg-paper-sunken hover:text-[var(--st-rejected)]" aria-label="Remove part">
							<Trash2 className="size-4" />
						</button>
					</div>
				))}
				<Button variant="outline" size="sm" className="self-start" icon={<Plus className="size-4" />} onClick={() => append({ name: "", qty: 1, unitCost: 0 })}>
					Add part
				</Button>
			</div>

			<dl className="grid grid-cols-2 gap-y-1 rounded-xl bg-paper p-4 font-mono text-sm">
				<dt className="text-ink-soft">Service fee</dt>
				<dd className="text-right">{taka(serviceFee)}</dd>
				<dt className="text-ink-soft">Parts</dt>
				<dd className="text-right">{taka(partsTotal)}</dd>
				<dt className="mt-1 border-t border-line pt-2 font-semibold text-ink">Invoice total</dt>
				<dd className="mt-1 border-t border-line pt-2 text-right text-base font-semibold">{taka(serviceFee + partsTotal)}</dd>
			</dl>

			<Button type="submit" size="lg" icon={<CheckCircle2 className="size-5" />} loading={submit.isPending}>
				Complete job & send invoice
			</Button>
		</form>
	);
}
