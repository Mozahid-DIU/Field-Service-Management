"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Star } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { describedBy, Field, Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { cn, rating } from "@/lib/format";
import { useCategories, useTechnicians } from "@/lib/queries";
import { useDebounced } from "@/lib/use-url-state";

const schema = z.object({
	name: z.string().trim().min(2, "Enter a name"),
	email: z.string().trim().email("Enter a valid email"),
	phone: z.string().trim().regex(/^(?:\+?88)?01[3-9]\d{8}$/, "e.g. 01712345678").or(z.literal("")),
	password: z.string().min(8, "8+ characters").regex(/[A-Za-z]/, "Add a letter").regex(/\d/, "Add a number"),
	skillIds: z.array(z.string()).min(1, "Pick at least one skill"),
});
type Values = z.infer<typeof schema>;

function AddTechnician({ open, onClose }: { open: boolean; onClose: () => void }) {
	const categories = useCategories();
	const qc = useQueryClient();
	const {
		register,
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { skillIds: [], phone: "" } });

	const create = useMutation({
		mutationFn: ({ phone, ...v }: Values) => api.post("/admin/technicians", { ...v, ...(phone ? { phone } : {}) }),
		onSuccess: () => {
			toast.success("Technician account created");
			void qc.invalidateQueries({ queryKey: ["technicians"] });
			reset();
			onClose();
		},
		onError: (e) => toast.error(errorMessage(e)),
	});

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="Add technician"
			description="They can sign in right away with this email and password."
			footer={
				<>
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button type="submit" form="add-tech" loading={create.isPending}>
						Create account
					</Button>
				</>
			}
		>
			<form id="add-tech" onSubmit={handleSubmit((v) => create.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
				<Field label="Name" htmlFor="t-name" error={errors.name?.message}>
					<Input {...describedBy("t-name", errors.name?.message)} {...register("name")} />
				</Field>
				<Field label="Phone" htmlFor="t-phone" optional error={errors.phone?.message}>
					<Input type="tel" {...describedBy("t-phone", errors.phone?.message)} {...register("phone")} />
				</Field>
				<Field label="Email" htmlFor="t-email" error={errors.email?.message}>
					<Input type="email" {...describedBy("t-email", errors.email?.message)} {...register("email")} />
				</Field>
				<Field label="Temporary password" htmlFor="t-pass" error={errors.password?.message}>
					<Input type="text" autoComplete="off" {...describedBy("t-pass", errors.password?.message)} {...register("password")} />
				</Field>
				<Controller
					control={control}
					name="skillIds"
					render={({ field }) => (
						<fieldset className="sm:col-span-2">
							<legend className="mb-2 text-sm font-semibold">Skills</legend>
							<div className="flex flex-wrap gap-2">
								{categories.data?.map((c) => {
									const on = field.value.includes(c.id);
									return (
										<button
											key={c.id}
											type="button"
											aria-pressed={on}
											onClick={() => field.onChange(on ? field.value.filter((id) => id !== c.id) : [...field.value, c.id])}
											className={cn("cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition", on ? "bg-ink text-paper ring-ink" : "bg-card text-ink-soft ring-line hover:ring-ink-faint")}
										>
											{c.name}
										</button>
									);
								})}
							</div>
							{errors.skillIds && <p className="mt-2 text-[13px] text-[var(--st-rejected)]">{errors.skillIds.message}</p>}
						</fieldset>
					)}
				/>
			</form>
		</Dialog>
	);
}

export default function TechniciansPage() {
	const [adding, setAdding] = useState(false);
	const [q, setQ] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [available, setAvailable] = useState("");
	const [page, setPage] = useState(1);
	const search = useDebounced(q);
	const categories = useCategories();
	const techs = useTechnicians({ q: search, categoryId, available, page, limit: 12, sortBy: "avgRating" });

	return (
		<>
			<PageHeader
				eyebrow="Workforce"
				title="Technicians"
				description="Skills, ratings and availability of your field team."
				actions={
					<Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
						Add technician
					</Button>
				}
			/>

			<div className="mb-5 flex flex-col gap-2 sm:flex-row">
				<div className="relative flex-1">
					<Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
					<Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by name or email" className="pl-10" aria-label="Search technicians" />
				</div>
				<Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} aria-label="Skill" className="sm:w-56">
					<option value="">All skills</option>
					{categories.data?.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</Select>
				<Select value={available} onChange={(e) => { setAvailable(e.target.value); setPage(1); }} aria-label="Availability" className="sm:w-44">
					<option value="">Any status</option>
					<option value="true">On duty</option>
					<option value="false">Off duty</option>
				</Select>
			</div>

			{techs.isLoading ? (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48" />)}
				</div>
			) : techs.error ? (
				<ErrorState message={errorMessage(techs.error)} onRetry={() => techs.refetch()} />
			) : techs.data?.data.length === 0 ? (
				<EmptyState title="No technicians match" description="Try other filters or add a new technician." />
			) : (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 stagger">
					{techs.data?.data.map((t) => {
						const p = t.technicianProfile;
						return (
							<article key={t.id} className="ticket flex flex-col gap-4 p-5">
								<div className="flex items-center gap-3">
									<Avatar name={t.name} src={t.avatarUrl} size={44} />
									<div className="min-w-0 flex-1">
										<p className="truncate font-display text-lg font-semibold">{t.name}</p>
										<p className="truncate text-xs text-ink-soft">{t.email}</p>
									</div>
									<span
										className={cn(
											"rounded-full px-2 py-0.5 text-[11px] font-semibold",
											t.status === "BLOCKED"
												? "bg-[var(--st-rejected-bg)] text-[var(--st-rejected)]"
												: p?.isAvailable
													? "bg-[var(--st-completed-bg)] text-[var(--st-completed)]"
													: "bg-paper-sunken text-ink-soft",
										)}
									>
										{t.status === "BLOCKED" ? "Blocked" : p?.isAvailable ? "On duty" : "Off duty"}
									</span>
								</div>
								<div className="flex flex-wrap gap-1.5">
									{p?.skills.map((s) => (
										<span key={s.id} className="rounded-md bg-paper-sunken px-2 py-0.5 text-xs font-medium">
											{s.name}
										</span>
									))}
								</div>
								<dl className="mt-auto grid grid-cols-3 border-t border-line pt-3 text-center">
									<div>
										<dt className="text-[11px] text-ink-faint">Rating</dt>
										<dd className="flex items-center justify-center gap-1 font-display text-lg font-bold">
											{rating(p?.avgRating, p?.ratingCount)} <Star className="size-3.5 fill-signal text-signal" />
										</dd>
									</div>
									<div>
										<dt className="text-[11px] text-ink-faint">Reviews</dt>
										<dd className="font-display text-lg font-bold">{p?.ratingCount ?? 0}</dd>
									</div>
									<div>
										<dt className="text-[11px] text-ink-faint">Jobs</dt>
										<dd className="font-display text-lg font-bold">{p?.totalJobs ?? 0}</dd>
									</div>
								</dl>
							</article>
						);
					})}
				</div>
			)}
			<div className="mt-4">
				<Pagination meta={techs.data?.meta} onPage={setPage} />
			</div>
			<AddTechnician open={adding} onClose={() => setAdding(false)} />
		</>
	);
}
