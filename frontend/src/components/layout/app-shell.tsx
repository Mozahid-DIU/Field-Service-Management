"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { Avatar } from "@/components/ui/avatar";
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
		<div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
			{/* Desktop sidebar */}
			<aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-card lg:flex">
				<div className="px-5 pt-6 pb-6">
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
									"flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors",
									active ? "bg-gradient-to-r from-bottle-700 to-bottle-600 text-white shadow-md shadow-bottle-700/25" : "text-ink-soft hover:bg-paper hover:text-ink",
								)}
							>
								<item.icon className="size-5" aria-hidden />
								{item.label}
							</Link>
						);
					})}
				</nav>
				<div className="border-t border-line p-4">
					<div className="flex items-center gap-3">
						<Avatar name={user.name} src={user.avatarUrl} />
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-semibold">{user.name}</p>
							<p className="truncate text-xs text-ink-faint">{user.email}</p>
						</div>
						<button
							type="button"
							onClick={logout}
							className="grid size-9 cursor-pointer place-items-center rounded-lg text-ink-faint hover:bg-paper hover:text-ink"
							aria-label="Sign out"
							title="Sign out"
						>
							<LogOut className="size-4" />
						</button>
					</div>
				</div>
			</aside>

			{/* Mobile top bar */}
			<header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-card px-4 py-3 lg:hidden">
				<Logo href={homeFor(user.role)} />
				<div className="flex items-center gap-1">
					<Link href="/profile" aria-label="Profile" className="p-1">
						<Avatar name={user.name} src={user.avatarUrl} size={32} />
					</Link>
					<button
						type="button"
						onClick={logout}
						className="grid size-9 cursor-pointer place-items-center rounded-lg text-ink-faint hover:bg-paper"
						aria-label="Sign out"
					>
						<LogOut className="size-4" />
					</button>
				</div>
			</header>

			<main className="min-w-0 px-4 pt-6 pb-28 sm:px-8 lg:px-10 lg:pt-8 lg:pb-12">
				<div className="mx-auto max-w-6xl">{children}</div>
			</main>

			{/* Mobile bottom tab bar */}
			<nav
				aria-label="Main"
				className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
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
								"flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
								active ? "text-signal-strong" : "text-ink-faint",
							)}
						>
							<item.icon className="size-5" aria-hidden />
							{item.label}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}

export function PageHeader({
	title,
	description,
	actions,
}: {
	/** kept for call-site compatibility; not shown */
	eyebrow?: string;
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
				{description && <p className="mt-1 text-ink-soft">{description}</p>}
			</div>
			{actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
		</header>
	);
}
