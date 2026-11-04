"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api";
import { useInvalidateOrder } from "@/lib/queries";

/** Mutation with consistent toasts + cache refresh for a work order. */
export function useOrderAction<TVars>(
	orderId: string,
	request: (vars: TVars) => Promise<unknown>,
	successMessage: string | ((vars: TVars) => string),
	onDone?: () => void,
) {
	const invalidate = useInvalidateOrder();
	return useMutation({
		mutationFn: request,
		onSuccess: (_data, vars) => {
			toast.success(typeof successMessage === "function" ? successMessage(vars) : successMessage);
			invalidate(orderId);
			onDone?.();
		},
		onError: (error) => toast.error(errorMessage(error)),
	});
}
