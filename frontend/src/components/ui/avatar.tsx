import { cn, initials } from "@/lib/format";

const PALETTE = ["#ff5b1f", "#2155d0", "#0b7486", "#6a3fd1", "#1c7f47", "#a87300"];

function hueFor(name: string): string {
	let hash = 0;
	for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return PALETTE[hash % PALETTE.length];
}

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
	if (src) {
		return (
			// biome-ignore lint/performance/noImgElement: tiny avatar, remote host varies
			<img
				src={src}
				alt=""
				width={size}
				height={size}
				className={cn("shrink-0 rounded-full object-cover", className)}
				style={{ width: size, height: size }}
				referrerPolicy="no-referrer"
			/>
		);
	}
	return (
		<span
			aria-hidden
			className={cn("grid shrink-0 place-items-center rounded-full font-display font-bold text-white", className)}
			style={{ width: size, height: size, background: hueFor(name), fontSize: size * 0.38 }}
		>
			{initials(name)}
		</span>
	);
}
