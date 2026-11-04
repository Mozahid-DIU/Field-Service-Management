"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Loader2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { cn, dateTime, taka, toLocalInput } from "@/lib/format";
import { useCategories, useInvalidateOrder } from "@/lib/queries";
import { PRIORITY_META } from "@/lib/status";
import type { ApiSuccess, Priority, WorkOrder } from "@/lib/types";

const PRIORITIES: { value: Priority; hint: string }[] = [
	{ value: "LOW", hint: "Whenever convenient" },
	{ value: "MEDIUM", hint: "Within a few days" },
	{ value: "HIGH", hint: "Affects daily life" },
	{ value: "URGENT", hint: "Leak, sparks, no power" },
];

const schema = z.object({
	categoryId: z.string().min(1, "Choose a service"),
	title: z.string().trim().min(5, "At least 5 characters").max(150),
	description: z.string().trim().min(10, "Tell us a bit more (10+ characters)").max(2000),
	address: z.string().trim().min(5, "Enter the full address").max(300),
	priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
	preferredDate: z.string().optional(),
});
type Values = z.infer<typeof schema>;

const STEPS = ["Service", "Problem", "Visit", "Review"] as const;
const STEP_FIELDS: (keyof Values)[][] = [["categoryId"], ["title", "description"], ["address", "priority", "preferredDate"], []];

function NewRequestWizard() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const presetCategory = searchParams.get("category") ?? "";
	const presetArea = searchParams.get("area");
	const categories = useCategories();
	const invalidate = useInvalidateOrder();
	const [step, setStep] = useState(presetCategory ? 1 : 0);
	const [images, setImages] = useState<string[]>([]);
	const [uploading, setUploading] = useState(false);

	const {
		register,
		control,
		trigger,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: { categoryId: presetCategory, priority: "MEDIUM", title: "", description: "", address: presetArea ? `${presetArea}, Dhaka` : "", preferredDate: "" },
	});
	const values = useWatch({ control });
	const category = categories.data?.find((c) => c.id === values.categoryId);

	const next = async () => {
		if (await trigger(STEP_FIELDS[step])) setStep((s) => Math.min(s + 1, STEPS.length - 1));
	};

	const upload = async (files: FileList | null) => {
		if (!files?.length) return;
		const form = new FormData();
		for (const file of Array.from(files).slice(0, 5 - images.length)) form.append("images", file);
		setUploading(true);
		try {
			const res = await api.post<ApiSuccess<{ url: string }[]>>("/uploads/images", form);
			setImages((prev) => [...prev, ...res.data.data.map((i) => i.url)]);
		} catch (error) {
			toast.error(errorMessage(error, "Upload failed"));
		} finally {
			setUploading(false);
		}
	};

	const onSubmit = handleSubmit(async ({ preferredDate, ...rest }) => {
		try {
			const res = await api.post<ApiSuccess<WorkOrder>>("/work-orders", {
				...rest,
				images,
				...(preferredDate ? { preferredDate: new Date(preferredDate).toISOString() } : {}),
			});
			invalidate();
			toast.success(`Request ${res.data.data.code} submitted`);
			router.replace(`/orders/${res.data.data.id}`);
		} catch (error) {
			toast.error(errorMessage(error, "Could not submit your request"));
		}
	});

	return (
		<>
			<PageHeader eyebrow="New request" title="What needs fixing?" description="Four quick steps. A manager reviews every request before a technician is booked." />

			<ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Steps">
				{STEPS.map((label, index) => (
					<li key={label} aria-current={index === step ? "step" : undefined}>
						<span className={cn("block h-1.5 rounded-full transition-colors duration-300", index <= step ? "bg-ink" : "bg-line")} />
						<span className={cn("mt-2 block text-xs font-semibold", index === step ? "text-ink" : "text-ink-faint")}>
							{index + 1}. {label}
						</span>
					</li>
				))}
			</ol>

			<form
				noValidate
				className="ticket p-5 sm:p-8"
				onSubmit={(event) => {
					// Enter on an earlier step advances instead of submitting
					if (step < STEPS.length - 1) {
						event.preventDefault();
						void next();
						return;
					}
					void onSubmit(event);
				}}
			>
				{step === 0 && (
					<fieldset className="animate-fade">
						<legend className="mb-4 font-display text-xl font-semibold">Choose a service</legend>
						<div className="grid gap-3 sm:grid-cols-2">
							{categories.isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
							{categories.data?.map((c) => (
								<label
									key={c.id}
									className={cn(
										"relative flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-4 transition",
										values.categoryId === c.id ? "border-ink bg-paper" : "border-line hover:border-ink-faint",
									)}
								>
									<input type="radio" value={c.id} className="sr-only" {...register("categoryId")} />
									<span className="font-display text-lg font-semibold">{c.name}</span>
									<span className="text-sm text-ink-soft">{c.description}</span>
									<span className="mt-2 font-mono text-sm">from {taka(c.basePrice)}</span>
									{values.categoryId === c.id && (
										<span className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-signal text-white">
											<Check className="size-3.5" strokeWidth={3} />
										</span>
									)}
								</label>
							))}
						</div>
						{errors.categoryId && <p className="mt-3 text-sm text-[var(--st-rejected)]">{errors.categoryId.message}</p>}
					</fieldset>
				)}

				{step === 1 && (
					<div className="flex flex-col gap-5 animate-fade">
						<Field label="Short title" htmlFor="title" error={errors.title?.message} hint="e.g. “AC blowing warm air”">
							<Input autoFocus {...describedBy("title", errors.title?.message)} {...register("title")} />
						</Field>
						<Field label="Describe the problem" htmlFor="description" error={errors.description?.message} hint="When did it start? Any sounds, smells or error codes?">
							<Textarea rows={5} {...describedBy("description", errors.description?.message)} {...register("description")} />
						</Field>
						<div>
							<p className="mb-2 text-sm font-semibold">
								Photos <span className="font-normal text-ink-faint">(optional, up to 5)</span>
							</p>
							<div className="flex flex-wrap gap-2">
								{images.map((src) => (
									<div key={src} className="relative">
										{/* biome-ignore lint/performance/noImgElement: Cloudinary preview */}
										<img src={src} alt="Attachment preview" className="size-20 rounded-xl object-cover" />
										<button type="button" onClick={() => setImages((p) => p.filter((i) => i !== src))} className="absolute -top-2 -right-2 grid size-6 cursor-pointer place-items-center rounded-full bg-ink text-paper" aria-label="Remove photo">
											<X className="size-3" />
										</button>
									</div>
								))}
								{images.length < 5 && (
									<label className="grid size-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line-strong text-ink-faint hover:border-ink hover:text-ink">
										{uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
										<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={uploading} onChange={(e) => upload(e.target.files)} />
										<span className="sr-only">Add photos</span>
									</label>
								)}
							</div>
						</div>
					</div>
				)}

				{step === 2 && (
					<div className="flex flex-col gap-5 animate-fade">
						<Field label="Address" htmlFor="address" error={errors.address?.message}>
							<Textarea rows={2} placeholder="House, road, area, city" {...describedBy("address", errors.address?.message)} {...register("address")} />
						</Field>
						<fieldset>
							<legend className="mb-2 text-sm font-semibold">How urgent is it?</legend>
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
								{PRIORITIES.map((p) => (
									<label key={p.value} className={cn("cursor-pointer rounded-xl border-2 p-3 transition", values.priority === p.value ? "border-ink bg-paper" : "border-line hover:border-ink-faint")}>
										<input type="radio" value={p.value} className="sr-only" {...register("priority")} />
										<span className={cn("block text-sm font-semibold", PRIORITY_META[p.value].className)}>{PRIORITY_META[p.value].label}</span>
										<span className="text-xs text-ink-faint">{p.hint}</span>
									</label>
								))}
							</div>
						</fieldset>
						<Field label="Preferred time" htmlFor="preferredDate" optional hint="We'll try to match it when scheduling.">
							<Input type="datetime-local" min={toLocalInput(new Date())} {...describedBy("preferredDate")} {...register("preferredDate")} />
						</Field>
					</div>
				)}

				{step === 3 && (
					<div className="animate-fade">
						<p className="mb-4 font-display text-xl font-semibold">Check & submit</p>
						<dl className="divide-y divide-line rounded-xl border border-line">
							{[
								["Service", category ? `${category.name} · from ${taka(category.basePrice)}` : "—"],
								["Problem", values.title],
								["Details", values.description],
								["Address", values.address],
								["Priority", PRIORITY_META[(values.priority ?? "MEDIUM") as Priority].label],
								["Preferred time", values.preferredDate ? dateTime(values.preferredDate) : "Flexible"],
								["Photos", images.length ? `${images.length} attached` : "None"],
							].map(([label, value]) => (
								<div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr]">
									<dt className="text-sm text-ink-faint">{label}</dt>
									<dd className="text-sm font-medium break-words">{value}</dd>
								</div>
							))}
						</dl>
					</div>
				)}

				<div className="mt-8 flex items-center justify-between border-t border-line pt-5">
					<Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={() => setStep((s) => s - 1)} className={cn(step === 0 && "invisible")}>
						Back
					</Button>
					{step < STEPS.length - 1 ? (
						// Distinct keys: React must not morph this button into the submit button
						// mid-click, or the browser submits the form on the same click.
						<Button key="continue" variant="ink" onClick={next}>
							Continue <ArrowRight className="size-4" />
						</Button>
					) : (
						<Button key="submit" type="submit" size="lg" loading={isSubmitting} icon={<Check className="size-5" />}>
							Submit request
						</Button>
					)}
				</div>
			</form>
		</>
	);
}

export default function NewRequestPage() {
	return (
		<Suspense>
			<NewRequestWizard />
		</Suspense>
	);
}
