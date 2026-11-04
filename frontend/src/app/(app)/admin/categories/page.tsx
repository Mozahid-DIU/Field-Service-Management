"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { describedBy, Field, Input, Textarea } from "@/components/ui/field";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { taka } from "@/lib/format";
import { keys, useCategories } from "@/lib/queries";
import type { Category } from "@/lib/types";

const schema = z.object({
	name: z.string().trim().min(2, "Enter a name").max(100),
	description: z.string().trim().max(500),
	basePrice: z.coerce.number<string | number>().positive("Must be more than 0").max(1_000_000),
});
type Input_ = z.input<typeof schema>;
type Output = z.output<typeof schema>;

function CategoryDialog({ category, open, onClose }: { category: Category | null; open: boolean; onClose: () => void }) {
	const qc = useQueryClient();
	const { register, handleSubmit, reset, formState: { errors } } = useForm<Input_, unknown, Output>({ resolver: zodResolver(schema) });

	useEffect(() => {
		if (open) reset({ name: category?.name ?? "", description: category?.description ?? "", basePrice: category ? Number(category.basePrice) : "" });
	}, [open, category, reset]);

	const save = useMutation({
		mutationFn: (values: Output) => {
			// PATCH keeps "" so a cleared description is saved; POST simply omits it
			const body = category || values.description ? values : { ...values, description: undefined };
			return category ? api.patch(`/categories/${category.id}`, body) : api.post("/categories", body);
		},
		onSuccess: () => {
			toast.success(category ? "Service updated" : "Service created");
			void qc.invalidateQueries({ queryKey: keys.categories });
			onClose();
		},
		onError: (e) => toast.error(errorMessage(e)),
	});

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title={category ? "Edit service" : "New service"}
			description="The base price is the service fee; parts are added by the technician."
			footer={
				<>
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button type="submit" form="category-form" loading={save.isPending}>
						Save
					</Button>
				</>
			}
		>
			<form id="category-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="flex flex-col gap-4" noValidate>
				<Field label="Name" htmlFor="c-name" error={errors.name?.message}>
					<Input {...describedBy("c-name", errors.name?.message)} {...register("name")} />
				</Field>
				<Field label="Description" htmlFor="c-desc" optional error={errors.description?.message}>
					<Textarea rows={3} {...describedBy("c-desc", errors.description?.message)} {...register("description")} />
				</Field>
				<Field label="Price (Tk)" htmlFor="c-price" error={errors.basePrice?.message}>
					<Input type="number" inputMode="decimal" step="0.01" {...describedBy("c-price", errors.basePrice?.message)} {...register("basePrice")} />
				</Field>
			</form>
		</Dialog>
	);
}

export default function CategoriesPage() {
	const qc = useQueryClient();
	const categories = useCategories();
	const [editing, setEditing] = useState<Category | null>(null);
	const [open, setOpen] = useState(false);
	const [archiving, setArchiving] = useState<Category | null>(null);

	const archive = useMutation({
		mutationFn: (c: Category) => api.delete(`/categories/${c.id}`),
		onSuccess: () => {
			toast.success("Service archived");
			void qc.invalidateQueries({ queryKey: keys.categories });
			setArchiving(null);
		},
		onError: (e) => toast.error(errorMessage(e)),
	});

	return (
		<>
			<PageHeader
				eyebrow="Catalog"
				title="Services"
				description="Services customers can book, with their prices."
				actions={<Button icon={<Plus className="size-4" />} onClick={() => { setEditing(null); setOpen(true); }}>New service</Button>}
			/>
			{categories.isLoading ? (
				<Skeleton className="h-64" />
			) : categories.error ? (
				<ErrorState message={errorMessage(categories.error)} onRetry={() => categories.refetch()} />
			) : categories.data?.length === 0 ? (
				<EmptyState title="No services yet" icon={<Wrench className="size-6" />} />
			) : (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 stagger">
					{categories.data?.map((c) => (
						<article key={c.id} className="ticket flex flex-col p-5">
							<p className="font-display text-lg font-semibold">{c.name}</p>
							<p className="mt-1 flex-1 text-sm text-ink-soft">{c.description || "No description"}</p>
							<div className="perforation -mx-5 my-4" aria-hidden />
							<div className="flex items-center justify-between">
								<div>
									<p className="font-mono text-xl font-semibold">{taka(c.basePrice)}</p>
									<p className="text-xs text-ink-faint">{c._count?.technicians ?? 0} skilled technician(s)</p>
								</div>
								<div className="flex gap-1">
									<Button variant="ghost" size="sm" aria-label={`Edit ${c.name}`} onClick={() => { setEditing(c); setOpen(true); }}>
										<Pencil className="size-4" />
									</Button>
									<Button variant="ghost" size="sm" aria-label={`Archive ${c.name}`} onClick={() => setArchiving(c)} className="hover:text-[var(--st-rejected)]">
										<Archive className="size-4" />
									</Button>
								</div>
							</div>
						</article>
					))}
				</div>
			)}
			<CategoryDialog category={editing} open={open} onClose={() => setOpen(false)} />
			<Dialog
				open={archiving !== null}
				onClose={() => setArchiving(null)}
				title={`Archive “${archiving?.name}”?`}
				description="Customers can no longer book it. Existing work orders are unaffected (soft delete)."
				footer={
					<>
						<Button variant="ghost" onClick={() => setArchiving(null)}>
							Keep
						</Button>
						<Button variant="danger" loading={archive.isPending} onClick={() => archiving && archive.mutate(archiving)}>
							Archive
						</Button>
					</>
				}
			>
				<p className="text-sm text-ink-soft">This is recorded in the audit log.</p>
			</Dialog>
		</>
	);
}
