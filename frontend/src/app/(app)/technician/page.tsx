"use client";

import { CalendarClock, CheckCircle2, ChevronRight, MapPin, Phone, Star, Sun } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatCard, WelcomeBanner } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/badges";
import { EmptyState, Skeleton, TicketSkeleton } from "@/components/ui/states";
import { useAuth } from "@/lib/auth-store";
import { CategoryIcon } from "@/lib/category-icon";
import { cn, rating, taka, timeRange } from "@/lib/format";
import { useMyJobs, useTechnicianStats } from "@/lib/queries";
import type { WorkOrder } from "@/lib/types";

/** Today's start and end in the technician's own timezone, sent as ISO instants. */
function todayWindow(): { from: string; to: string } {
	const start = new Date();
	start.setHours(0, 0, 0, 0);
	const end = new Date(start);
	end.setDate(end.getDate() + 1);
	return { from: start.toISOString(), to: end.toISOString() };
}

const OPEN_JOBS = "ASSIGNED,EN_ROUTE,IN_PROGRESS";

/** Big, thumb-friendly job card for the field. */
function JobCard({ job, highlight }: { job: WorkOrder; highlight?: boolean }) {
	return (
		<Link
			href={`/orders/${job.id}`}
			className={cn("ticket group flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-lift", highlight && "ring-2 ring-signal")}
		>
			<div className="flex items-center justify-between gap-3">
				<span className="flex items-center gap-2 text-sm text-ink-soft"><CategoryIcon name={job.category.name} size="sm" />{job.category.name}</span>
				<StatusPill status={job.status} />
			</div>
			<div>
				<p className="font-display text-xl leading-tight font-semibold">{job.title}</p>
				<p className="text-sm text-ink-faint">#{job.code.slice(-6)}</p>
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
	const [{ from, to }] = useState(todayWindow);
	const today = useMyJobs({ status: OPEN_JOBS, from, to, limit: 50 });
	const upcoming = useMyJobs({ status: "ASSIGNED", limit: 6 });
	const stats = useTechnicianStats(user?.id);

	const current = [...(working.data?.data ?? []), ...(live.data?.data ?? [])];
	const todays = (today.data?.data ?? []).filter((j) => !current.some((c) => c.id === j.id));
	const later = (upcoming.data?.data ?? []).filter((j) => !todays.some((t) => t.id === j.id));
	const profile = stats.data?.technician.technicianProfile;

	return (
		<>
			<WelcomeBanner
				title={<>Hi, {user?.name.split(" ")[0]} 👋</>}
				description={`${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · Here are your jobs for today.`}
			/>

			<section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 stagger">
				{stats.isLoading
					? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)
					: (
							<>
								<StatCard label="Today" value={new Set([...(today.data?.data ?? []), ...current].map((j) => j.id)).size} icon={Sun} tone="sky" />
								<StatCard label="Upcoming" value={stats.data?.upcomingJobs ?? 0} icon={CalendarClock} tone="violet" />
								<StatCard label="Jobs done" value={profile?.totalJobs ?? 0} icon={CheckCircle2} tone="emerald" />
								<StatCard label="Rating" value={rating(profile?.avgRating, profile?.ratingCount)} icon={Star} tone="amber" />
							</>
						)}
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
					<EmptyState title="No more visits today" description="New bookings will show up here." />
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
