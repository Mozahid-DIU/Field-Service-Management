"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/** Filters, tab, page and search live in the URL so views are shareable and survive reloads. */
export function useUrlState<K extends string>(defaults: Record<K, string>) {
	const params = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	const state = Object.fromEntries(
		(Object.keys(defaults) as K[]).map((key) => [key, params.get(key) ?? defaults[key]]),
	) as Record<K, string>;

	const set = useCallback(
		(patch: Partial<Record<K, string>>) => {
			const next = new URLSearchParams(params.toString());
			for (const [key, value] of Object.entries(patch) as [K, string | undefined][]) {
				if (!value || value === defaults[key]) next.delete(key);
				else next.set(key, value);
			}
			// Any filter change resets pagination
			if (!("page" in patch)) next.delete("page");
			const query = next.toString();
			router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
		},
		[params, router, pathname, defaults],
	);

	return [state, set] as const;
}

export function useDebounced<T>(value: T, delay = 350): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);
	return debounced;
}
