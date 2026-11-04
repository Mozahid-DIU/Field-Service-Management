"use client";

import { useSyncExternalStore } from "react";
import type { User } from "./types";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthState {
	status: AuthStatus;
	user: User | null;
	accessToken: string | null;
}

/**
 * Access token lives in memory only (never localStorage) — XSS cannot steal a
 * persisted token. The session survives reloads via the httpOnly refresh cookie.
 */
let state: AuthState = { status: "loading", user: null, accessToken: null };
const listeners = new Set<() => void>();

function emit(next: AuthState): void {
	state = next;
	for (const listener of listeners) listener();
}

export const authStore = {
	get: (): AuthState => state,
	subscribe(listener: () => void): () => void {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
	signIn(user: User, accessToken: string): void {
		emit({ status: "authenticated", user, accessToken });
	},
	setUser(user: User): void {
		emit({ ...state, user });
	},
	signOut(): void {
		emit({ status: "anonymous", user: null, accessToken: null });
	},
};

const serverSnapshot: AuthState = { status: "loading", user: null, accessToken: null };

export function useAuth(): AuthState {
	return useSyncExternalStore(authStore.subscribe, authStore.get, () => serverSnapshot);
}

/**
 * A same-site path from ?next=, or null. Blocks //evil.com and /\evil.com
 * (browsers treat a backslash like a slash) to prevent open redirects.
 */
export function safeNext(next: string | null | undefined): string | null {
	if (!next?.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
	return next;
}

export function homeFor(role: User["role"]): string {
	switch (role) {
		case "ADMIN":
			return "/admin";
		case "TECHNICIAN":
			return "/technician";
		default:
			return "/customer";
	}
}
