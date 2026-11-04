"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
	ApiSuccess,
	AuditLog,
	Category,
	DashboardStats,
	HistoryEntry,
	Paged,
	Payment,
	TechnicianListItem,
	TechnicianStats,
	User,
	WorkOrder,
	WorkOrderDetail,
} from "./types";

export type Params = Record<string, string | number | boolean | undefined | null>;

function clean(params: Params): Record<string, string | number | boolean> {
	return Object.fromEntries(
		Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
	) as Record<string, string | number | boolean>;
}

async function getData<T>(url: string, params?: Params): Promise<T> {
	const res = await api.get<ApiSuccess<T>>(url, { params: params ? clean(params) : undefined });
	return res.data.data;
}

async function getPaged<T>(url: string, params: Params): Promise<Paged<T>> {
	const res = await api.get<ApiSuccess<T[]>>(url, { params: clean(params) });
	return {
		data: res.data.data,
		meta: res.data.meta ?? { page: 1, limit: res.data.data.length, total: res.data.data.length, totalPages: 1 },
	};
}

export const keys = {
	categories: ["categories"] as const,
	workOrders: (params: Params) => ["work-orders", params] as const,
	workOrder: (id: string) => ["work-order", id] as const,
	history: (id: string) => ["work-order", id, "history"] as const,
	myJobs: (params: Params) => ["my-jobs", params] as const,
	technicians: (params: Params) => ["technicians", params] as const,
	techStats: (id: string) => ["technician-stats", id] as const,
	stats: ["dashboard-stats"] as const,
	users: (params: Params) => ["users", params] as const,
	audit: (params: Params) => ["audit-logs", params] as const,
	payments: (params: Params) => ["payments", params] as const,
	payment: (id: string) => ["payment", id] as const,
	me: ["me"] as const,
};

export const useCategories = () =>
	useQuery({ queryKey: keys.categories, queryFn: () => getData<Category[]>("/categories"), staleTime: 5 * 60_000 });

export const useWorkOrders = (params: Params, enabled = true) =>
	useQuery({
		queryKey: keys.workOrders(params),
		queryFn: () => getPaged<WorkOrder>(params.q ? "/work-orders/search" : "/work-orders", params),
		placeholderData: keepPreviousData,
		enabled,
	});

export const useWorkOrder = (id: string) =>
	useQuery({ queryKey: keys.workOrder(id), queryFn: () => getData<WorkOrderDetail>(`/work-orders/${id}`) });

export const useHistory = (id: string) =>
	useQuery({ queryKey: keys.history(id), queryFn: () => getData<HistoryEntry[]>(`/work-orders/${id}/history`) });

export const useMyJobs = (params: Params) =>
	useQuery({
		queryKey: keys.myJobs(params),
		queryFn: () => getPaged<WorkOrder>("/technicians/me/jobs", params),
		placeholderData: keepPreviousData,
	});

export const useTechnicians = (params: Params, enabled = true) =>
	useQuery({
		queryKey: keys.technicians(params),
		queryFn: () => getPaged<TechnicianListItem>("/technicians", params),
		placeholderData: keepPreviousData,
		enabled,
	});

export const useTechnicianStats = (id: string | undefined) =>
	useQuery({
		queryKey: keys.techStats(id ?? ""),
		queryFn: () => getData<TechnicianStats>(`/technicians/${id}/stats`),
		enabled: Boolean(id),
	});

export const useDashboardStats = () =>
	useQuery({ queryKey: keys.stats, queryFn: () => getData<DashboardStats>("/admin/dashboard-stats") });

export const useUsers = (params: Params) =>
	useQuery({
		queryKey: keys.users(params),
		queryFn: () => getPaged<User>("/admin/users", params),
		placeholderData: keepPreviousData,
	});

export const useAuditLogs = (params: Params) =>
	useQuery({
		queryKey: keys.audit(params),
		queryFn: () => getPaged<AuditLog>("/admin/audit-logs", params),
		placeholderData: keepPreviousData,
	});

export const usePayments = (params: Params) =>
	useQuery({
		queryKey: keys.payments(params),
		queryFn: () => getPaged<Payment>("/payments/me", params),
		placeholderData: keepPreviousData,
	});

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: () => getData<User>("/users/me") });

/** After any work-order mutation: refresh lists, the detail, its history and stats. */
export function useInvalidateOrder() {
	const qc = useQueryClient();
	return (id?: string) => {
		void qc.invalidateQueries({ queryKey: ["work-orders"] });
		void qc.invalidateQueries({ queryKey: ["my-jobs"] });
		void qc.invalidateQueries({ queryKey: keys.stats });
		void qc.invalidateQueries({ queryKey: ["technician-stats"] });
		void qc.invalidateQueries({ queryKey: ["technicians"] });
		if (id) void qc.invalidateQueries({ queryKey: ["work-order", id] });
	};
}
