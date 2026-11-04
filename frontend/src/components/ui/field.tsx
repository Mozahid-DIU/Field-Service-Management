import {
	forwardRef,
	type InputHTMLAttributes,
	type ReactNode,
	type SelectHTMLAttributes,
	type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/format";

const control =
	"w-full rounded-xl border border-line-strong bg-card px-3.5 text-[15px] text-ink placeholder:text-ink-faint transition-[border,box-shadow] duration-150 hover:border-ink-faint focus:border-ink focus:outline-none focus:ring-4 focus:ring-signal/15 disabled:bg-paper-sunken disabled:text-ink-faint aria-[invalid=true]:border-[var(--st-rejected)] aria-[invalid=true]:ring-[var(--st-rejected)]/10";

interface FieldProps {
	label: string;
	htmlFor: string;
	error?: string;
	hint?: ReactNode;
	optional?: boolean;
	children: ReactNode;
	className?: string;
}

export function Field({ label, htmlFor, error, hint, optional, children, className }: FieldProps) {
	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<label htmlFor={htmlFor} className="flex items-baseline justify-between text-sm font-semibold text-ink">
				{label}
				{optional && <span className="text-xs font-normal text-ink-faint">Optional</span>}
			</label>
			{children}
			{error ? (
				<p id={`${htmlFor}-error`} role="alert" className="text-[13px] font-medium text-[var(--st-rejected)]">
					{error}
				</p>
			) : hint ? (
				<p className="text-[13px] text-ink-faint">{hint}</p>
			) : null}
		</div>
	);
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
	function Input({ className, ...props }, ref) {
		return <input ref={ref} className={cn(control, "h-11", className)} {...props} />;
	},
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
	function Textarea({ className, ...props }, ref) {
		return <textarea ref={ref} className={cn(control, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
	},
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
	function Select({ className, children, ...props }, ref) {
		return (
			<select
				ref={ref}
				className={cn(
					control,
					"h-11 appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2317160f' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-10",
					className,
				)}
				{...props}
			>
				{children}
			</select>
		);
	},
);

/** a11y props for an input bound to Field */
export function describedBy(id: string, error?: string) {
	return {
		id,
		"aria-invalid": error ? true : undefined,
		"aria-describedby": error ? `${id}-error` : undefined,
	} as const;
}
