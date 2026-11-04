"use client";

import { ArrowRight, BadgeCheck, MapPin, ShieldCheck, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { homeFor, useAuth } from "@/lib/auth-store";
import { CategoryIcon } from "@/lib/category-icon";
import { taka } from "@/lib/format";
import { useCategories } from "@/lib/queries";

const AREAS = [
	"Mirpur",
	"Dhanmondi",
	"Gulshan",
	"Banani",
	"Uttara",
	"Mohammadpur",
	"Bashundhara",
	"Motijheel",
	"Badda",
	"Old Dhaka",
];

/** Hero booking card: pick a service and area, continue to the request form. */
export function QuickBook() {
	const router = useRouter();
	const { status, user } = useAuth();
	const categories = useCategories();
	const [categoryId, setCategoryId] = useState("");
	const [area, setArea] = useState("");
	const [error, setError] = useState("");

	const selected = categories.data?.find((c) => c.id === categoryId);
	const lowestPrice = categories.data?.length ? Math.min(...categories.data.map((c) => Number(c.basePrice))) : null;

	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (!categoryId) {
			setError("Please choose a service");
			return;
		}
		const params = new URLSearchParams({ category: categoryId, ...(area ? { area } : {}) });
		const target = `/customer/new?${params.toString()}`;
		if (status === "authenticated" && user) {
			router.push(user.role === "CUSTOMER" ? target : homeFor(user.role));
		} else {
			router.push(`/login?next=${encodeURIComponent(target)}`);
		}
	};

	return (
		<form onSubmit={submit} noValidate className="mx-auto w-full max-w-md rounded-3xl bg-card p-6 text-ink shadow-2xl shadow-black/30 sm:p-7">
			<h2 className="text-xl font-bold">Book a technician</h2>
			<p className="mt-1 text-sm text-ink-soft">Tell us what you need. It takes less than a minute.</p>

			<div className="mt-5 flex flex-col gap-4">
				<Field label="Service" htmlFor="qb-service" error={error}>
					<div className="relative">
						<Select
							id="qb-service"
							value={categoryId}
							onChange={(e) => {
								setCategoryId(e.target.value);
								setError("");
							}}
							aria-invalid={error ? true : undefined}
							className={selected ? "pl-12" : undefined}
						>
							<option value="">Choose a service</option>
							{categories.data?.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name} (from {taka(c.basePrice)})
								</option>
							))}
						</Select>
						{selected && (
							<span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2">
								<CategoryIcon name={selected.name} size="sm" className="size-8" />
							</span>
						)}
					</div>
				</Field>

				<Field label="Area" htmlFor="qb-area" optional>
					<div className="relative">
						<MapPin className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
						<Select id="qb-area" value={area} onChange={(e) => setArea(e.target.value)} className="pl-10">
							<option value="">Select your area in Dhaka</option>
							{AREAS.map((a) => (
								<option key={a} value={a}>
									{a}
								</option>
							))}
						</Select>
					</div>
				</Field>

				{selected && (
					<div className="flex items-center justify-between rounded-xl bg-signal-wash px-4 py-3 text-sm animate-fade">
						<span className="text-ink-soft">Service fee</span>
						<span className="font-bold text-signal-strong">{taka(selected.basePrice)}</span>
					</div>
				)}

				<Button type="submit" size="lg" className="w-full">
					Continue <ArrowRight className="size-5" />
				</Button>
			</div>

			<ul className="mt-6 grid grid-cols-3 gap-2 border-t border-line pt-5 text-center text-xs text-ink-soft">
				<li className="flex flex-col items-center gap-1.5">
					<Wallet className="size-5 text-signal" aria-hidden />
					{lowestPrice !== null ? `From ${taka(lowestPrice)}` : "Fair prices"}
				</li>
				<li className="flex flex-col items-center gap-1.5">
					<ShieldCheck className="size-5 text-signal" aria-hidden />
					Pay after the job
				</li>
				<li className="flex flex-col items-center gap-1.5">
					<BadgeCheck className="size-5 text-signal" aria-hidden />
					Skilled technicians
				</li>
			</ul>
		</form>
	);
}
