"use client";

import { ArrowRight, BadgeCheck, CalendarCheck, Check, ClipboardList, CreditCard, MapPin, ShieldCheck, Star, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { homeFor, useAuth } from "@/lib/auth-store";
import { CategoryIcon } from "@/lib/category-icon";
import { taka } from "@/lib/format";
import { useCategories } from "@/lib/queries";

const STEPS = [
	{ icon: ClipboardList, title: "Tell us the problem", body: "Choose a service, describe what's wrong and add a photo if you like.", tone: "bg-sky-100 text-sky-600", ring: "border-t-sky-400" },
	{ icon: Truck, title: "We send a technician", body: "We book a skilled technician at a time that works for you.", tone: "bg-amber-100 text-amber-600", ring: "border-t-amber-400" },
	{ icon: Wallet, title: "Pay when it's done", body: "Check the bill and pay securely with bKash. Then rate the service.", tone: "bg-emerald-100 text-emerald-600", ring: "border-t-emerald-400" },
];

const REASONS = [
	{ icon: BadgeCheck, title: "Skilled technicians", body: "Every technician is matched to the job by their skills.", tone: "bg-violet-100 text-violet-600" },
	{ icon: CalendarCheck, title: "On-time visits", body: "A technician is never booked for two jobs at the same time.", tone: "bg-sky-100 text-sky-600" },
	{ icon: MapPin, title: "Know what's happening", body: "See when your technician is on the way and when work starts.", tone: "bg-rose-100 text-rose-600" },
	{ icon: ShieldCheck, title: "Fair, clear bills", body: "A fixed service fee plus parts. You see every item before paying.", tone: "bg-amber-100 text-amber-600" },
];

function Nav() {
	const { status, user } = useAuth();
	return (
		<header className="sticky top-0 z-20 border-b border-line bg-card/95 backdrop-blur">
			<div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
				<Logo />
				<nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
					<a href="#services" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink md:block">
						Services
					</a>
					<a href="#how" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink md:block">
						How it works
					</a>
					{status === "authenticated" && user ? (
						<ButtonLink href={homeFor(user.role)} size="sm">
							My account
						</ButtonLink>
					) : (
						<>
							<Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink hover:bg-paper">
								Log in
							</Link>
							<ButtonLink href="/register" size="sm">
								Sign up
							</ButtonLink>
						</>
					)}
				</nav>
			</div>
		</header>
	);
}

function BookingPreview() {
	const steps = [
		{ label: "Request received", done: true },
		{ label: "Technician assigned", done: true },
		{ label: "On the way", current: true },
		{ label: "Work done & payment", done: false },
	];
	return (
		<div className="mx-auto w-full max-w-sm rounded-3xl bg-card p-6 text-ink shadow-2xl shadow-emerald-900/30">
			<div className="flex items-center gap-3">
				<CategoryIcon name="AC Repair" />
				<div>
					<p className="font-semibold">AC Repair</p>
					<p className="text-sm text-ink-soft">Today, 3:00 PM - 5:00 PM</p>
				</div>
			</div>
			<ol className="mt-6 flex flex-col gap-4">
				{steps.map((step) => (
					<li key={step.label} className="flex items-center gap-3 text-sm">
						<span
							className={
								step.done
									? "grid size-6 place-items-center rounded-full bg-signal text-white"
									: step.current
										? "grid size-6 place-items-center rounded-full border-2 border-signal bg-signal-wash"
										: "size-6 rounded-full border-2 border-line"
							}
						>
							{step.done && <Check className="size-3.5" strokeWidth={3} />}
							{step.current && <span className="size-2 rounded-full bg-signal live-dot" />}
						</span>
						<span className={step.current ? "font-semibold text-ink" : step.done ? "text-ink-soft" : "text-ink-faint"}>{step.label}</span>
					</li>
				))}
			</ol>
			<div className="mt-6 flex items-center gap-3 rounded-2xl bg-paper p-3">
				<Avatar name="Karim Hossain" size={40} />
				<div className="flex-1">
					<p className="text-sm font-semibold">Karim Hossain</p>
					<p className="text-xs text-ink-soft">Arriving in about 20 min</p>
				</div>
			</div>
		</div>
	);
}

export default function LandingPage() {
	const categories = useCategories();

	return (
		<div className="bg-card">
			<Nav />

			{/* Hero */}
			<section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white">
				<div className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-white/10" aria-hidden />
				<div className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-amber-300/20" aria-hidden />
				<div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:py-20">
					<div>
						<span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
							<span className="size-2 rounded-full bg-amber-300" /> Now serving Dhaka
						</span>
						<h1 className="mt-5 text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
							Home repairs,
							<br />
							<span className="text-amber-200">made easy.</span>
						</h1>
						<p className="mt-5 max-w-md text-lg leading-relaxed text-white/85">
							Book a trusted technician for your AC, plumbing, electrical or appliance problem. Know when they arrive, and pay with bKash when the job is done.
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
							<ButtonLink href="/register" size="lg" className="bg-none bg-amber-400 text-ink shadow-none hover:bg-amber-300">
								Book a service <ArrowRight className="size-5" />
							</ButtonLink>
							<ButtonLink href="/login" size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
								Try the demo
							</ButtonLink>
						</div>
						<div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
							<span className="flex items-center gap-2">
								<CreditCard className="size-4 text-amber-200" aria-hidden /> Pay with bKash
							</span>
							<span className="flex items-center gap-2">
								<BadgeCheck className="size-4 text-amber-200" aria-hidden /> Skilled technicians
							</span>
							<span className="flex items-center gap-2">
								<Star className="size-4 text-amber-200" aria-hidden /> Rated by customers
							</span>
						</div>
					</div>
					<BookingPreview />
				</div>
			</section>

			{/* Services */}
			<section id="services" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
				<h2 className="text-3xl font-bold tracking-tight">What can we fix for you?</h2>
				<p className="mt-2 text-ink-soft">The price shown is the service fee. Parts, if needed, are added to your bill.</p>
				<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{categories.isLoading && [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
					{categories.data?.map((c) => (
						<Link key={c.id} href="/register" className="ticket group flex flex-col p-5 transition hover:-translate-y-1 hover:border-signal/40 hover:shadow-lift">
							<CategoryIcon name={c.name} />
							<p className="mt-4 text-lg font-semibold">{c.name}</p>
							<p className="mt-1 flex-1 text-sm text-ink-soft">{c.description}</p>
							<div className="mt-4 flex items-center justify-between">
								<span className="text-sm text-ink-soft">
									From <span className="text-base font-bold text-ink">{taka(c.basePrice)}</span>
								</span>
								<span className="text-sm font-semibold text-signal-strong group-hover:underline">Book now</span>
							</div>
						</Link>
					))}
				</div>
			</section>

			{/* How it works */}
			<section id="how" className="bg-gradient-to-b from-sky-50 to-emerald-50/60">
				<div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
					<h2 className="text-center text-3xl font-bold tracking-tight">How it works</h2>
					<p className="mt-2 text-center text-ink-soft">Three simple steps, from booking to payment.</p>
					<ol className="mt-10 grid gap-6 md:grid-cols-3">
						{STEPS.map((step, i) => (
							<li key={step.title} className={`ticket border-t-4 p-6 text-center ${step.ring}`}>
								<span className={`mx-auto grid size-14 place-items-center rounded-2xl ${step.tone}`}>
									<step.icon className="size-6" aria-hidden />
								</span>
								<p className="mt-4 text-sm font-semibold text-ink-faint">Step {i + 1}</p>
								<p className="mt-1 text-lg font-semibold">{step.title}</p>
								<p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
							</li>
						))}
					</ol>
				</div>
			</section>

			{/* Why FixFlow */}
			<section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
				<h2 className="text-3xl font-bold tracking-tight">Why people choose FixFlow</h2>
				<div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{REASONS.map((r) => (
						<div key={r.title}>
							<span className={`grid size-12 place-items-center rounded-2xl ${r.tone}`}>
								<r.icon className="size-5" aria-hidden />
							</span>
							<p className="mt-4 font-semibold">{r.title}</p>
							<p className="mt-1 text-sm leading-relaxed text-ink-soft">{r.body}</p>
						</div>
					))}
				</div>
			</section>

			{/* CTA */}
			<section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
				<div className="flex flex-col items-start gap-6 rounded-3xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 px-8 py-10 text-white shadow-lift sm:flex-row sm:items-center sm:justify-between sm:px-12">
					<div>
						<h2 className="text-2xl font-bold sm:text-3xl">Something not working at home?</h2>
						<p className="mt-2 text-white/85">Book a technician in a few minutes.</p>
					</div>
					<ButtonLink href="/register" size="lg" variant="outline" className="border-transparent bg-white text-orange-600 hover:bg-white/90">
						Get started
					</ButtonLink>
				</div>
			</section>

			<footer className="border-t border-line">
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-ink-faint sm:flex-row sm:px-8">
					<Logo />
					<p>© {new Date().getFullYear()} FixFlow. All rights reserved.</p>
				</div>
			</footer>
		</div>
	);
}
