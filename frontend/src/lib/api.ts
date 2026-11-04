"use client";

import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { authStore } from "./auth-store";
import type { ApiErrorBody, AuthPayload } from "./types";

/** Same-origin: Next rewrites /api/v1/* to the Express API. */
export const api = axios.create({
	baseURL: "/api/v1",
	withCredentials: true,
	timeout: 45_000,
});

api.interceptors.request.use((config) => {
	const token = authStore.get().accessToken;
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

let refreshInFlight: Promise<AuthPayload | null> | null = null;

async function doRefresh(): Promise<AuthPayload | null> {
	try {
		const res = await axios.post<{ data: AuthPayload }>(
			"/api/v1/auth/refresh-token",
			{},
			{ withCredentials: true },
		);
		authStore.signIn(res.data.data.user, res.data.data.accessToken);
		return res.data.data;
	} catch {
		authStore.signOut();
		return null;
	}
}

/**
 * Refresh tokens rotate and reuse is treated as theft, so concurrent refreshes
 * must never send the same token twice: dedupe within the tab and serialize
 * across tabs with the Web Locks API.
 */
export function refreshSession(): Promise<AuthPayload | null> {
	if (refreshInFlight) return refreshInFlight;
	const run: Promise<AuthPayload | null> =
		typeof navigator !== "undefined" && "locks" in navigator
			? navigator.locks.request("fixflow-refresh", () => doRefresh()).then((result) => result)
			: doRefresh();
	const tracked = run.finally(() => {
		refreshInFlight = null;
	});
	refreshInFlight = tracked;
	return tracked;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
	(response) => response,
	async (error: AxiosError<ApiErrorBody>) => {
		const config = error.config as RetriableConfig | undefined;
		const isAuthCall = config?.url?.startsWith("/auth/");
		if (
			error.response?.status === 401 &&
			config &&
			!config._retried &&
			!isAuthCall
		) {
			config._retried = true;
			const session = await refreshSession();
			if (session) return api(config);
		}
		return Promise.reject(error);
	},
);

export interface FieldError {
	path: string;
	message: string;
}

export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
	if (error instanceof AxiosError) {
		if (!error.response) return "Can't reach the server. Check your connection.";
		return (error.response.data as ApiErrorBody | undefined)?.message ?? fallback;
	}
	return error instanceof Error ? error.message : fallback;
}

export function fieldErrors(error: unknown): FieldError[] {
	if (error instanceof AxiosError) {
		return (error.response?.data as ApiErrorBody | undefined)?.errors ?? [];
	}
	return [];
}

export function statusOf(error: unknown): number | undefined {
	return error instanceof AxiosError ? error.response?.status : undefined;
}
