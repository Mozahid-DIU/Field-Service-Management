import { Wrench } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/format";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
	return (
		<Link href={href} className={cn("inline-flex items-center gap-2", className)} aria-label="FixFlow home">
			<span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
				<Wrench className="size-5" aria-hidden />
			</span>
			<span className="text-xl font-bold tracking-tight text-ink">FixFlow</span>
		</Link>
	);
}
