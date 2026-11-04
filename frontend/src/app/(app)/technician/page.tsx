"use client";

import { CalendarClock, ChevronRight, MapPin, Phone, Star } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { StatusPill } from "@/components/ui/badges";
import { EmptyState, Skeleton, TicketSkeleton } from "@/components/ui/states";
import { useAuth } from "@/lib/auth-store";
import { cn, rating, taka, timeRange } from "@/lib/format";
import { useMyJobs, useTechnicianStats } from "@/lib/queries";
import type { WorkOrder } from "@/lib/types";

function todayKey(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Big, thumb-friendly job card for the field. */
function JobCard({ job, highlight }: { job: WorkOrder; highlight?: boolean }) {
	return (
		<Link
			href={`/orders/${job.id}`}
			className={cn("ticket group flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-lift", highlight && "ring-2 ring-signal")}
		>
			<div className="flex items-center justify-between gap-3">
				<span className="font-mono text-xs font-semibold text-ink-soft">{job.code}</span>
				<StatusPill status={job.status} />
			</div>
			<div>
				<p className="font-display text-xl leading-tight font-semibold">{job.title}</p>
				<p className="text-sm text-ink-soft">{job.category.name}</p>
			</div>
			<div className="flex flex-col gap-1.5 text-sm">
				<span className="flex items-center gap-2 font-semibold">
					<CalendarClock className="size-4 text-signal" aria-hidden />
					{timeRange(job.scheduledStart, job.scheduledEnd)}
				</span>
				<span className="flex items-start gap-2 text-ink-soft">
					<MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
					{job.address}
				</span>
			</div>
			<div className="flex items-center justify-between border-t border-line pt-3 text-sm">
				<span className="flex items-center gap-2">
					{job.customer.name}
					{job.customer.phone && (
						<span className="inline-flex items-center gap-1 font-mono text-xs text-ink-faint">
							<Phone className="size-3" /> {job.customer.phone}
						</span>
					)}
				</span>
				<ChevronRight className="size-4 text-ink-faint transition group-hover:translate-x-0.5" />
			</div>
		</Link>
	);
}

export default function TechnicianToday() {
	const { user } = useAuth();
	const live = useMyJobs({ status: "EN_ROUTE", limit: 5 });
	const working = useMyJobs({ status: "IN_PROGRESS", limit: 5 });
	const today = useMyJobs({ date: todayKey(), limit: 20 });
	const upcoming = useMyJobs({ status: "ASSIGNED", limit: 6 });
	const stats = useTechnicianStats(user?.id);

	const current = [...(working.data?.data ?? []), ...(live.data?.data ?? [])];
	const todays = (today.data?.data ?? []).filter((j) => !current.some((c) => c.id === j.id));
	const later = (upcoming.data?.data ?? []).filter((j) => !todays.some((t) => t.id === j.id));
	const profile = stats.data?.technician.technicianProfile;

	return (
		<>
			<PageHeader
				eyebrow={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
				title={<>Ready to roll, {user?.name.split(" ")[0]}?</>}
				description="Your route for today. Tap a job to update its status."
			/>

			<section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 stagger">
				{stats.isLoading
					? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)
					: [
							{ label: "Today", value: String(todays.length + current.length) },
							{ label: "Upcoming", value: String(stats.data?.upcomingJobs ?? 0) },
							{ label: "Jobs done", value: String(profile?.totalJobs ?? 0) },
							{ label: "Rating", value: rating(profile?.avgRating, profile?.ratingCount), star: true },
						].map((s) => (
							<div key={s.label} className="ticket p-4">
								<p className="text-xs font-semibold text-ink-faint">{s.label}</p>
								<p className="mt-1 flex items-center gap-1.5 font-display text-3xl font-bold">
									{s.value}
									{s.star && <Star className="size-5 fill-signal text-signal" aria-hidden />}
								</p>
							</div>
						))}
			</section>

			{current.length > 0 && (
				<section className="mb-8">
					<h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold">
						<span className="size-2 rounded-full bg-signal live-dot text-signal" /> Now
					</h2>
					<div className="grid gap-3 md:grid-cols-2">
						{current.map((job) => (
							<JobCard key={job.id} job={job} highlight />
						))}
					</div>
				</section>
			)}

			<section className="mb-8">
				<h2 className="mb-3 font-display text-xl font-bold">Today</h2>
				{today.isLoading ? (
					<TicketSkeleton rows={2} />
				) : todays.length === 0 ? (
					<EmptyState title="No more visits today" description="Enjoy the breather — new bookings show up here instantly." />
				) : (
					<div className="grid gap-3 md:grid-cols-2 stagger">
						{todays.map((job) => (
							<JobCard key={job.id} job={job} />
						))}
					</div>
				)}
			</section>

			{later.length > 0 && (
				<section>
					<h2 className="mb-3 font-display text-xl font-bold">Coming up</h2>
					<div className="grid gap-3 md:grid-cols-2 stagger">
						{later.map((job) => (
							<JobCard key={job.id} job={job} />
						))}
					</div>
				</section>
			)}

			{stats.data && (
				<p className="mt-10 text-center text-xs text-ink-faint">
					Lifetime revenue generated: <span className="font-mono">{taka(stats.data.revenueGenerated)}</span>
				</p>
			)}
		</>
	);
}
