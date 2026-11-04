"use client";

import { ArrowRight, Search, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { homeFor, useAuth } from "@/lib/auth-store";
import { CategoryIcon, shortServiceName } from "@/lib/category-icon";
import { taka } from "@/lib/format";
import { matchServices, POPULAR_PROBLEMS } from "@/lib/problem-matcher";
import { useCategories } from "@/lib/queries";
import type { Category } from "@/lib/types";

/**
 * Hero "smart finder": describe the problem in your own words (English or
 * Bangla) and get the right service, its price and a one-tap booking.
 */
export function ProblemFinder() {
	const router = useRouter();
	const { status, user } = useAuth();
	const categories = useCategories();
	const [problem, setProblem] = useState("");

	const matches = useMemo(() => matchServices(problem, categories.data ?? []), [problem, categories.data]);
	const best = matches[0]?.category;
	const others = matches.slice(1, 3).map((m) => m.category);
	const typed = problem.trim().length >= 2;

	const book = (category: Category) => {
		const params = new URLSearchParams({ category: category.id });
		if (typed) params.set("title", problem.trim().slice(0, 150));
		const target = `/customer/new?${params.toString()}`;
		if (status === "authenticated" && user) {
			router.push(user.role === "CUSTOMER" ? target : homeFor(user.role));
		} else {
			router.push(`/login?next=${encodeURIComponent(target)}`);
		}
	};

	return (
		<div className="mx-auto w-full max-w-md rounded-3xl bg-card p-6 text-ink shadow-2xl shadow-black/30 sm:p-7">
			<p className="flex items-center gap-2 text-sm font-semibold text-signal-strong">
				<Sparkles className="size-4" aria-hidden /> Smart service finder
			</p>
			<h2 className="mt-1 text-xl font-bold">What's the problem?</h2>
			<p className="mt-1 text-sm text-ink-soft">Describe it in your own words, in English or বাংলা.</p>

			<form
				className="relative mt-4"
				onSubmit={(e) => {
					e.preventDefault();
					if (best) book(best);
				}}
			>
				<Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-faint" aria-hidden />
				<input
					value={problem}
					onChange={(e) => setProblem(e.target.value)}
					placeholder="e.g. AC not cooling, পানি পড়ছে"
					aria-label="Describe your problem"
					className="h-13 w-full rounded-2xl border-2 border-line bg-paper pr-10 pl-12 text-[15px] transition focus:border-signal focus:bg-card focus:outline-none"
				/>
				{problem && (
					<button type="button" onClick={() => setProblem("")} className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-ink-faint hover:bg-paper-sunken" aria-label="Clear">
						<X className="size-4" />
					</button>
				)}
			</form>

			<div className="mt-4 min-h-[140px]" aria-live="polite">
				{categories.isLoading ? (
					<Skeleton className="h-28 rounded-2xl" />
				) : typed && best ? (
					<div className="animate-fade">
						<button
							type="button"
							onClick={() => book(best)}
							className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border-2 border-signal/30 bg-signal-wash p-4 text-left transition hover:border-signal"
						>
							<CategoryIcon name={best.name} />
							<span className="min-w-0 flex-1">
								<span className="block text-xs font-semibold text-signal-strong">Best match</span>
								<span className="block truncate font-semibold">{best.name}</span>
								<span className="block text-sm text-ink-soft">From {taka(best.basePrice)}</span>
							</span>
							<span className="flex items-center gap-1 rounded-xl bg-signal px-3 py-2 text-sm font-semibold text-white">
								Book <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
							</span>
						</button>
						{others.length > 0 && (
							<div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
								<span className="text-ink-faint">Or:</span>
								{others.map((c) => (
									<button key={c.id} type="button" onClick={() => book(c)} className="cursor-pointer rounded-full border border-line px-3 py-1 hover:border-signal hover:text-signal-strong">
										{c.name}
									</button>
								))}
							</div>
						)}
					</div>
				) : typed ? (
					<div className="animate-fade rounded-2xl bg-paper p-4 text-sm text-ink-soft">
						We couldn't tell which service fits. Pick one below and describe the problem on the next step.
					</div>
				) : (
					<div>
						<p className="mb-2 text-xs font-semibold text-ink-faint">Popular problems</p>
						<div className="flex flex-wrap gap-2">
							{POPULAR_PROBLEMS.map((p) => (
								<button key={p} type="button" onClick={() => setProblem(p)} className="cursor-pointer rounded-full bg-paper px-3 py-1.5 text-sm text-ink-soft transition hover:bg-signal-wash hover:text-signal-strong">
									{p}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			<div className="mt-2 border-t border-line pt-4">
				<p className="mb-3 text-xs font-semibold text-ink-faint">Or choose a service</p>
				<div className="grid grid-cols-6 gap-2">
					{categories.data?.map((c) => (
						<button key={c.id} type="button" onClick={() => book(c)} title={`${c.name} · from ${taka(c.basePrice)}`} aria-label={`Book ${c.name}`} className="flex cursor-pointer flex-col items-center gap-1 rounded-xl p-1 transition hover:-translate-y-0.5 hover:bg-paper">
							<CategoryIcon name={c.name} />
							<span className="text-[11px] font-medium text-ink-soft">{shortServiceName(c.name)}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
