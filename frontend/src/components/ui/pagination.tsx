import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageMeta } from "@/lib/types";
import { Button } from "./button";

export function Pagination({ meta, onPage }: { meta?: PageMeta; onPage: (page: number) => void }) {
	if (!meta || meta.totalPages <= 1) return null;
	const from = (meta.page - 1) * meta.limit + 1;
	const to = Math.min(meta.page * meta.limit, meta.total);
	return (
		<nav className="flex items-center justify-between gap-4 pt-2" aria-label="Pagination">
			<p className="text-sm text-ink-soft">
				<span className="font-mono text-ink">
					{from}–{to}
				</span>{" "}
				of <span className="font-mono text-ink">{meta.total}</span>
			</p>
			<div className="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => onPage(meta.page - 1)}
					disabled={meta.page <= 1}
					icon={<ChevronLeft className="size-4" />}
				>
					Prev
				</Button>
				<Button variant="outline" size="sm" onClick={() => onPage(meta.page + 1)} disabled={meta.page >= meta.totalPages}>
					Next
					<ChevronRight className="size-4" />
				</Button>
			</div>
		</nav>
	);
}
