"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { homeFor, useAuth } from "@/lib/auth-store";
import type { Role } from "@/lib/types";

function FullScreenLoader() {
	return (
		<div className="grid min-h-dvh place-items-center" aria-busy="true" aria-label="Loading">
			<div className="size-8 animate-spin rounded-full border-[3px] border-signal-wash border-t-signal" />
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
