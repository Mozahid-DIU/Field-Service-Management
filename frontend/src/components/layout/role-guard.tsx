"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { homeFor, useAuth } from "@/lib/auth-store";
import type { Role } from "@/lib/types";

function FullScreenLoader() {
	return (
		<div className="grid min-h-dvh place-items-center" aria-busy="true" aria-label="Loading your workspace">
			<div className="flex flex-col items-center gap-4">
				<div className="flex gap-1.5">
					{[0, 1, 2].map((i) => (
						<span
							key={i}
							className="size-2.5 animate-bounce rounded-full bg-signal"
							style={{ animationDelay: `${i * 120}ms` }}
						/>
					))}
				</div>
				<p className="font-mono text-xs tracking-widest text-ink-faint uppercase">Loading workspace</p>
			</div>
		</div>
	);
}

/**
 * Client-side guard (the access token lives in memory). The API enforces
 * every rule again server-side — this only routes people to the right place.
 */
export function RoleGuard({ allow, children }: { allow: Role[]; children: ReactNode }) {
	const { status, user } = useAuth();
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (status === "anonymous") {
			router.replace(`/login?next=${encodeURIComponent(pathname)}`);
		} else if (status === "authenticated" && user && !allow.includes(user.role)) {
			router.replace(homeFor(user.role));
		}
	}, [status, user, allow, router, pathname]);

	if (status !== "authenticated" || !user || !allow.includes(user.role)) {
		return <FullScreenLoader />;
	}
	return <>{children}</>;
}
