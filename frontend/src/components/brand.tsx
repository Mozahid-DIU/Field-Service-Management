import Link from "next/link";
import { cn } from "@/lib/format";

/** Wordmark: a wrench-notch "F" tile + name. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
	return (
		<Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="FixFlow home">
			<span className="relative grid size-8 place-items-center rounded-[9px] bg-ink text-paper shadow-[0_2px_0_#000] transition-transform duration-200 group-hover:-rotate-6">
				<svg viewBox="0 0 24 24" className="size-[18px]" fill="none" aria-hidden>
					<path d="M6 4h12v4H10v3h6v4h-6v5H6z" fill="currentColor" />
					<circle cx="18" cy="17.5" r="2.5" fill="var(--signal)" />
				</svg>
			</span>
			<span className="font-display text-xl font-bold tracking-tight">
				Fix<span className="text-signal">Flow</span>
			</span>
		</Link>
	);
}
