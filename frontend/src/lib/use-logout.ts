"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
import { api } from "./api";
import { authStore } from "./auth-store";

export function useLogout(): () => Promise<void> {
	const router = useRouter();
	const queryClient = useQueryClient();
	return useCallback(async () => {
		try {
			await api.post("/auth/logout");
		} catch {
			// Session is cleared locally regardless
		}
		authStore.signOut();
		queryClient.clear();
		toast.success("Signed out");
		router.replace("/login");
	}, [router, queryClient]);
}
