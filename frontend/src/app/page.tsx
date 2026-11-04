"use client";

import { ArrowRight, BadgeCheck, CalendarCheck2, History, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { LiveTicket } from "@/components/landing/live-ticket";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { homeFor, useAuth } from "@/lib/auth-store";
import { taka } from "@/lib/format";
import { useCategories } from "@/lib/queries";

const STEPS = [
	{ n: "01", title: "Tell us what broke", body: "Pick a service, describe the problem, add photos. Takes a minute." },
	{ n: "02", title: "We book the right hands", body: "A manager reviews it and schedules a technician with the right skill — never double-booked." },
	{ n: "03", title: "Track the visit live", body: "See when they're on the way, when work starts and what was replaced." },
	{ n: "04", title: "Pay with bKash", body: "A clear invoice, verified directly with bKash. Then rate the job." },
];

const PROMISES = [
	{ icon: CalendarCheck2, title: "Conflict-free scheduling", body: "Bookings lock the technician's calendar, so two jobs can never overlap." },
	{ icon: ShieldCheck, title: "Verified payments", body: "We confirm every bKash payment server-side before an invoice is marked paid." },
	{ icon: History, title: "Full audit trail", body: "Every status change records who did it and when." },
	{ icon: Smartphone, title: "Built for the field", body: "Technicians run their whole day from their phone with one-tap updates." },
];

const SEATS = [
	{ role: "Customer", line: "Book, track and pay.", points: ["4-step request wizard", "Live status rail", "bKash checkout & ratings"] },
	{ role: "Technician", line: "A route, not a spreadsheet.", points: ["Today's jobs at a glance", "One-tap status updates", "Report → invoice in one go"] },
	{ role: "Admin", line: "The dispatch desk.", points: ["Review & assign queue", "Free/busy technician picker", "Revenue, users & audit log"] },
];

function Nav() {
	const { status, user } = useAuth();
	return (
		<header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
			<Logo />
			<nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
				<a href="#services" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink sm:block">
					Services
				</a>
				<a href="#how" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink sm:block">
					How it works
				</a>
				{status === "authenticated" && user ? (
					<ButtonLink href={homeFor(user.role)} variant="ink" size="sm">
						Open dashboard
					</ButtonLink>
				) : (
					<>
						<Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-paper-sunken">
							Sign in
						</Link>
						<ButtonLink href="/register" size="sm">
							Book a technician
						</ButtonLink>
					</>
				)}
			</nav>
		</header>
	);
}

export default function LandingPage() {
	const categories = useCategories();

	return (
		<div className="overflow-x-clip">
			<Nav />

			{/* Hero */}
			<section className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pt-8 pb-20 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-14 lg:pb-28">
				<div className="pointer-events-none absolute top-10 -right-32 -z-10 size-[460px] rounded-full bg-signal/20 blur-[110px]" aria-hidden />
				<div className="animate-rise">
					<p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-ink-soft">
						<span className="size-1.5 rounded-full bg-signal live-dot text-signal" /> Technicians active across Dhaka
					</p>
					<h1 className="mt-6 font-display text-[clamp(2.6rem,1.4rem+4.2vw,4.9rem)] leading-[0.92] font-bold tracking-tight">
						Broken today.
						<br />
						Fixed by{" "}
						<span className="relative inline-block">
							tonight.
							<svg className="absolute -bottom-2 left-0 w-full text-signal" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden>
								<path d="M2 9 C 80 2, 220 2, 298 7" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
							</svg>
						</span>
					</h1>
					<p className="mt-8 max-w-lg text-lg leading-relaxed text-ink-soft">
						FixFlow books verified technicians for AC, plumbing, electrical and appliance repairs — then lets you follow every step until the invoice is paid with bKash.
					</p>
					<div className="mt-9 flex flex-wrap gap-3">
						<ButtonLink href="/register" size="lg">
							Book a technician <ArrowRight className="size-5" />
						</ButtonLink>
						<ButtonLink href="/login" size="lg" variant="outline">
							Try the demo
						</ButtonLink>
					</div>
					<p className="mt-5 flex items-center gap-2 text-sm text-ink-faint">
						<BadgeCheck className="size-4 text-[var(--st-completed)]" aria-hidden /> Demo logins for all three roles on the sign-in page
					</p>
				</div>
				<div className="animate-rise [animation-delay:150ms]">
					<LiveTicket />
				</div>
			</section>

			{/* Services as a price list */}
			<section id="services" className="border-y border-line bg-card/60 py-20">
				<div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.6fr]">
					<div>
						<p className="font-mono text-xs font-semibold tracking-[0.18em] text-signal-strong uppercase">Services & prices</p>
						<h2 className="mt-3 font-display text-4xl leading-tight font-bold tracking-tight">Upfront service fees. Parts at cost.</h2>
						<p className="mt-4 text-ink-soft">The base fee covers the visit and labour. Your technician adds any parts to the invoice — you see every line before you pay.</p>
					</div>
					<ul className="divide-y divide-line border-y border-line">
						{categories.isLoading &&
							[0, 1, 2, 3, 4].map((i) => (
								<li key={i} className="py-5">
									<Skeleton className="h-6" />
								</li>
							))}
						{categories.data?.map((c) => (
							<li key={c.id}>
								<Link href="/register" className="group flex items-baseline gap-4 py-5">
									<span className="font-display text-xl font-semibold group-hover:text-signal-strong">{c.name}</span>
									<span className="hidden truncate text-sm text-ink-faint sm:block">{c.description}</span>
									<span className="mb-1 flex-1 border-b border-dotted border-line-strong" aria-hidden />
									<span className="font-mono text-lg font-semibold whitespace-nowrap">{taka(c.basePrice)}</span>
								</Link>
							</li>
						))}
					</ul>
				</div>
			</section>

			{/* How it works */}
			<section id="how" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
				<p className="font-mono text-xs font-semibold tracking-[0.18em] text-signal-strong uppercase">How it works</p>
				<h2 className="mt-3 max-w-xl font-display text-4xl leading-tight font-bold tracking-tight">From “it's broken” to “it's paid” in four stops.</h2>
				<ol className="mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
					{STEPS.map((step) => (
						<li key={step.n} className="relative border-t-2 border-ink pt-6">
							<span className="absolute -top-[9px] left-0 size-4 rounded-full border-2 border-ink bg-signal" aria-hidden />
							<span className="font-mono text-sm font-semibold text-ink-faint">{step.n}</span>
							<h3 className="mt-2 font-display text-xl font-semibold">{step.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
						</li>
					))}
				</ol>
			</section>

			{/* Seats: one platform, three roles */}
			<section className="bg-ink py-24 text-paper">
				<div className="mx-auto max-w-6xl px-5 sm:px-8">
					<p className="font-mono text-xs font-semibold tracking-[0.18em] text-signal uppercase">One platform · three seats</p>
					<h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight font-bold tracking-tight">Everyone sees exactly what they need — and nothing they shouldn't.</h2>
					<div className="mt-12 grid gap-4 md:grid-cols-3">
						{SEATS.map((seat, i) => (
							<article key={seat.role} className="rounded-2xl border border-white/10 bg-white/[0.04] p-7" style={{ transform: `translateY(${i * 18}px)` }}>
								<p className="font-mono text-xs text-signal">{seat.role.toUpperCase()}</p>
								<p className="mt-3 font-display text-2xl font-semibold">{seat.line}</p>
								<ul className="mt-6 flex flex-col gap-2.5 text-sm text-paper/70">
									{seat.points.map((point) => (
										<li key={point} className="flex items-center gap-2">
											<span className="size-1.5 rounded-full bg-signal" /> {point}
										</li>
									))}
								</ul>
							</article>
						))}
					</div>
				</div>
			</section>

			{/* Promises */}
			<section className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
				<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
					{PROMISES.map((p) => (
						<div key={p.title}>
							<span className="grid size-11 place-items-center rounded-xl bg-signal-wash text-signal-strong">
								<p.icon className="size-5" aria-hidden />
							</span>
							<h3 className="mt-4 font-display text-lg font-semibold">{p.title}</h3>
							<p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{p.body}</p>
						</div>
					))}
				</div>
			</section>

			{/* CTA */}
			<section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
				<div className="relative overflow-hidden rounded-3xl bg-signal px-8 py-14 text-white sm:px-14">
					<div className="pointer-events-none absolute -right-20 -bottom-24 size-80 rounded-full bg-white/15 blur-2xl" aria-hidden />
					<h2 className="max-w-xl font-display text-4xl leading-tight font-bold tracking-tight sm:text-5xl">Something broken right now?</h2>
					<p className="mt-3 max-w-md text-white/85">Create an account and your request reaches our dispatch desk in under a minute.</p>
					<ButtonLink href="/register" size="lg" variant="ink" className="mt-8">
						Get started <ArrowRight className="size-5" />
					</ButtonLink>
				</div>
			</section>

			<footer className="border-t border-line">
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-ink-faint sm:flex-row sm:px-8">
					<Logo />
					<p>© {new Date().getFullYear()} FixFlow · Field Service Management</p>
				</div>
			</footer>
		</div>
	);
}
