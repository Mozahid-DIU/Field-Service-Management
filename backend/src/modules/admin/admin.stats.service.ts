import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { CacheKeys, cache } from "../../utils/cache";
import { buildMeta, toSkipTake } from "../../utils/pagination";
import type { AuditLogQuery } from "./admin.validation";

const STATS_CACHE_TTL_SECONDS = 60;
const TOP_TECHNICIAN_LIMIT = 5;
const RECENT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

async function computeDashboardStats() {
	const since = new Date(Date.now() - RECENT_DAYS * DAY_MS);

	const [
		usersByRole,
		ordersByStatus,
		revenueAll,
		revenueRecent,
		unpaidInvoices,
		topTechnicians,
		ordersByCategory,
	] = await Promise.all([
		prisma.user.groupBy({
			by: ["role"],
			where: { deletedAt: null },
			_count: { _all: true },
		}),
		prisma.workOrder.groupBy({
			by: ["status"],
			where: { deletedAt: null },
			_count: { _all: true },
		}),
		prisma.payment.aggregate({
			where: { status: "SUCCESS" },
			_sum: { amount: true },
			_count: { _all: true },
		}),
		prisma.payment.aggregate({
			where: { status: "SUCCESS", paidAt: { gte: since } },
			_sum: { amount: true },
		}),
		prisma.invoice.aggregate({
			where: { status: "UNPAID" },
			_sum: { total: true },
			_count: { _all: true },
		}),
		prisma.technicianProfile.findMany({
			where: { user: { deletedAt: null } },
			select: {
				avgRating: true,
				ratingCount: true,
				totalJobs: true,
				user: { select: { id: true, name: true } },
			},
			orderBy: [{ totalJobs: "desc" }, { avgRating: "desc" }],
			take: TOP_TECHNICIAN_LIMIT,
		}),
		prisma.workOrder.groupBy({
			by: ["categoryId"],
			where: { deletedAt: null },
			_count: { _all: true },
		}),
	]);

	const categories = await prisma.serviceCategory.findMany({
		where: { id: { in: ordersByCategory.map((row) => row.categoryId) } },
		select: { id: true, name: true },
	});
	const categoryName = new Map(categories.map((c) => [c.id, c.name]));

	return {
		users: Object.fromEntries(
			usersByRole.map((row) => [row.role, row._count._all]),
		),
		workOrders: {
			total: ordersByStatus.reduce((sum, row) => sum + row._count._all, 0),
			byStatus: Object.fromEntries(
				ordersByStatus.map((row) => [row.status, row._count._all]),
			),
			byCategory: ordersByCategory
				.map((row) => ({
					category: categoryName.get(row.categoryId) ?? "Unknown",
					count: row._count._all,
				}))
				.sort((a, b) => b.count - a.count),
		},
		revenue: {
			totalCollected: revenueAll._sum.amount ?? 0,
			successfulPayments: revenueAll._count._all,
			last30Days: revenueRecent._sum.amount ?? 0,
			outstanding: unpaidInvoices._sum.total ?? 0,
			unpaidInvoices: unpaidInvoices._count._all,
		},
		topTechnicians: topTechnicians.map((t) => ({
			id: t.user.id,
			name: t.user.name,
			totalJobs: t.totalJobs,
			avgRating: t.avgRating,
			ratingCount: t.ratingCount,
		})),
		generatedAt: new Date().toISOString(),
	};
}

function dashboardStats() {
	return cache.remember(
		CacheKeys.dashboardStats,
		STATS_CACHE_TTL_SECONDS,
		computeDashboardStats,
	);
}

async function auditLogs(query: AuditLogQuery) {
	const where: Prisma.AuditLogWhereInput = {
		...(query.entity ? { entity: query.entity } : {}),
		...(query.entityId ? { entityId: query.entityId } : {}),
		...(query.actorId ? { actorId: query.actorId } : {}),
		...(query.action ? { action: query.action } : {}),
		...(query.from || query.to
			? {
					createdAt: {
						...(query.from ? { gte: query.from } : {}),
						...(query.to ? { lte: query.to } : {}),
					},
				}
			: {}),
	};
	const [data, total] = await prisma.$transaction([
		prisma.auditLog.findMany({
			where,
			include: { actor: { select: { id: true, name: true, role: true } } },
			orderBy: { createdAt: query.sortOrder },
			...toSkipTake(query),
		}),
		prisma.auditLog.count({ where }),
	]);
	return { data, meta: buildMeta(query, total) };
}

export const adminStatsService = { dashboardStats, auditLogs };
