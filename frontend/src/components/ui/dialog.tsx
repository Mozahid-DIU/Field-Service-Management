"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/format";

interface DialogProps {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	children: ReactNode;
	footer?: ReactNode;
	size?: "md" | "lg";
}

/** Native <dialog>: focus trap, Esc to close and inert background for free. */
export function Dialog({ open, onClose, title, description, children, footer, size = "md" }: DialogProps) {
	const ref = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	return (
		<dialog
			ref={ref}
			onClose={onClose}
			onClick={(event) => {
				if (event.target === ref.current) onClose();
			}}
			className={cn(
				"m-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-card p-0 text-ink shadow-lift backdrop:bg-ink/40 backdrop:backdrop-blur-[2px] open:animate-rise",
				size === "lg" ? "max-w-2xl" : "max-w-lg",
			)}
		>
			<div className="flex items-start justify-between gap-4 border-b border-line px-6 pt-5 pb-4">
				<div>
					<h2 className="font-display text-xl font-semibold">{title}</h2>
					{description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
				</div>
				<button
					type="button"
					onClick={onClose}
					className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-soft hover:bg-paper-sunken hover:text-ink"
					aria-label="Close"
				>
					<X className="size-4" />
				</button>
			</div>
			<div className="max-h-[65dvh] overflow-y-auto px-6 py-5">{children}</div>
			{footer && <div className="flex justify-end gap-2 border-t border-line bg-paper/50 px-6 py-4">{footer}</div>}
		</dialog>
	);
}
