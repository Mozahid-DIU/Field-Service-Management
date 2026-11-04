import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "ink" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
	primary:
		"bg-signal text-white shadow-[0_2px_0_var(--signal-strong)] hover:bg-signal-strong active:translate-y-px active:shadow-none",
	ink: "bg-ink text-paper shadow-[0_2px_0_#000] hover:bg-ink-soft active:translate-y-px active:shadow-none",
	outline:
		"border border-line-strong bg-card text-ink hover:border-ink hover:bg-paper active:translate-y-px",
	ghost: "text-ink-soft hover:bg-paper-sunken hover:text-ink",
	danger:
		"border border-[var(--st-rejected)]/30 bg-[var(--st-rejected-bg)] text-[var(--st-rejected)] hover:bg-[var(--st-rejected)] hover:text-white",
};

const SIZES: Record<Size, string> = {
	sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
	md: "h-10 px-4 text-sm gap-2 rounded-xl",
	lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

const base =
	"inline-flex items-center justify-center font-semibold whitespace-nowrap transition-[background,color,border,transform,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
	loading?: boolean;
	icon?: ReactNode;
}

export function Button({
	variant = "primary",
	size = "md",
	loading,
	icon,
	className,
	children,
	disabled,
	type = "button",
	...props
}: ButtonProps) {
	return (
		<button
			type={type}
			className={cn(base, VARIANTS[variant], SIZES[size], className)}
			disabled={disabled || loading}
			aria-busy={loading || undefined}
			{...props}
		>
			{loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
			{children}
		</button>
	);
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
	variant?: Variant;
	size?: Size;
	icon?: ReactNode;
}

export function ButtonLink({
	variant = "primary",
	size = "md",
	icon,
	className,
	children,
	...props
}: ButtonLinkProps) {
	return (
		<Link className={cn(base, VARIANTS[variant], SIZES[size], className)} {...props}>
			{icon}
			{children}
		</Link>
	);
}
