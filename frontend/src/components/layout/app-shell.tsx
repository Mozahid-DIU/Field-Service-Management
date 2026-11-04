"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { Avatar } from "@/components/ui/avatar";
import { RoleTag } from "@/components/ui/badges";
import { homeFor, useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/format";
import { useLogout } from "@/lib/use-logout";
import { isActive, NAV } from "./nav";

export function AppShell({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const pathname = usePathname();
	const logout = useLogout();
	if (!user) return null;

	const items = NAV[user.role];
	const mobileItems = items.filter((item) => item.primary).slice(0, 4);

	return (
		<div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
			{/* Desktop sidebar */}
			<aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-card/80 backdrop-blur lg:flex">
				<div className="px-6 pt-6 pb-8">
					<Logo href={homeFor(user.role)} />
				</div>
				<nav aria-label="Main" className="flex flex-1 flex-col gap-1 px-3">
					{items.map((item) => {
						const active = isActive(pathname, item);
						return (
							<Link
								key={item.href}
								href={item.href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors",
									active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-sunken hover:text-ink",
								)}
							>
								<item.icon className={cn("size-[18px]", active && "text-signal")} aria-hidden />
								{item.label}
								{active && <span className="absolute top-1/2 right-3 size-1.5 -translate-y-1/2 rounded-full bg-signal" />}
							</Link>
						);
					})}
				</nav>
				<div className="m-3 rounded-2xl border border-line bg-paper p-3">
					<div className="flex items-center gap-3">
						<Avatar name={user.name} src={user.avatarUrl} />
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-semibold">{user.name}</p>
							<RoleTag role={user.role} />
						</div>
						<button
							type="button"
							onClick={logout}
							className="grid size-9 cursor-pointer place-items-center rounded-lg text-ink-soft hover:bg-card hover:text-[var(--st-rejected)]"
							aria-label="Sign out"
							title="Sign out"
						>
							<LogOut className="size-4" />
						</button>
					</div>
				</div>
			</aside>

			{/* Mobile top bar */}
			<header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
				<Logo href={homeFor(user.role)} />
				<div className="flex items-center gap-2">
					<Link href="/profile" aria-label="Profile">
						<Avatar name={user.name} src={user.avatarUrl} size={32} />
					</Link>
					<button
						type="button"
						onClick={logout}
						className="grid size-9 cursor-pointer place-items-center rounded-lg text-ink-soft hover:bg-card"
						aria-label="Sign out"
					>
						<LogOut className="size-4" />
					</button>
				</div>
			</header>

			<main className="min-w-0 px-4 pt-6 pb-28 sm:px-8 lg:px-12 lg:pt-10 lg:pb-16">
				<div className="mx-auto max-w-6xl">{children}</div>
			</main>

			{/* Mobile bottom tab bar — thumb reach for technicians in the field */}
			<nav
				aria-label="Main"
				className="fixed inset-x-3 bottom-3 z-30 grid rounded-2xl border border-line bg-card/95 p-1.5 shadow-lift backdrop-blur lg:hidden"
				style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}
			>
				{mobileItems.map((item) => {
					const active = isActive(pathname, item);
					return (
						<Link
							key={item.href}
							href={item.href}
							aria-current={active ? "page" : undefined}
							className={cn(
								"flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold",
								active ? "bg-ink text-paper" : "text-ink-soft",
							)}
						>
							<item.icon className={cn("size-5", active && "text-signal")} aria-hidden />
							{item.label}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}

export function PageHeader({
	eyebrow,
	title,
	description,
	actions,
}: {
	eyebrow?: string;
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-rise">
			<div>
				{eyebrow && (
					<p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.18em] text-signal-strong uppercase">
						{eyebrow}
					</p>
				)}
				<h1 className="font-display text-3xl leading-[1.05] font-bold tracking-tight sm:text-4xl">{title}</h1>
				{description && <p className="mt-2 max-w-xl text-ink-soft">{description}</p>}
			</div>
			{actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
		</header>
	);
}
