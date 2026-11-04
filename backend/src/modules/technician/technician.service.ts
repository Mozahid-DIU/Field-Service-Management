import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthUser } from "../../types/express";
import { AppError } from "../../utils/AppError";
import { buildMeta, type PageParams, toSkipTake } from "../../utils/pagination";
import { workOrderListInclude } from "../workOrder/workOrder.access";
import { findBusyTechnicianIds } from "../workOrder/workOrder.scheduling";
import type {
	ListTechniciansQuery,
	MyJobsQuery,
} from "./technician.validation";

const DAY_MS = 24 * 60 * 60 * 1000;

const technicianSelect = {
	id: true,
	name: true,
	email: true,
	phone: true,
	avatarUrl: true,
	status: true,
	technicianProfile: {
		select: {
			bio: true,
			isAvailable: true,
			avgRating: true,
			ratingCount: true,
			totalJobs: true,
			skills: { select: { id: true, name: true } },
		},
	},
} satisfies Prisma.UserSelect;

function orderByFor(
	sortBy: ListTechniciansQuery["sortBy"],
	sortOrder: "asc" | "desc",
): Prisma.UserOrderByWithRelationInput {
	if (sortBy === "name") return { name: sortOrder };
	return { technicianProfile: { [sortBy]: sortOrder } };
}

async function list(query: ListTechniciansQuery) {
	const busyIds =
		query.from && query.to
			? await findBusyTechnicianIds(prisma, {
					start: query.from,
					end: query.to,
				})
			: null;

	const where: Prisma.UserWhereInput = {
		role: "TECHNICIAN",
		deletedAt: null,
		technicianProfile: {
			...(query.available !== undefined
				? { isAvailable: query.available }
				: {}),
			...(query.categoryId
				? { skills: { some: { id: query.categoryId } } }
				: {}),
		},
		...(query.q
			? {
					OR: [
						{ name: { contains: query.q, mode: "insensitive" } },
						{ email: { contains: query.q, mode: "insensitive" } },
					],
				}
			: {}),
	};

	const [rows, total] = await prisma.$transaction([
		prisma.user.findMany({
			where,
			select: technicianSelect,
			orderBy: orderByFor(query.sortBy, query.sortOrder),
			...toSkipTake(query),
		}),
		prisma.user.count({ where }),
	]);

	const data = rows.map((tech) => ({
		...tech,
		...(busyIds ? { isFreeInWindow: !busyIds.has(tech.id) } : {}),
	}));
	return { data, meta: buildMeta(query, total) };
}

async function myJobs(technicianId: string, query: MyJobsQuery) {
	const dayStart = query.date ? new Date(`${query.date}T00:00:00.000Z`) : null;
	const where: Prisma.WorkOrderWhereInput = {
		technicianId,
		deletedAt: null,
		...(query.status ? { status: query.status } : {}),
		...(dayStart
			? {
					scheduledStart: {
						gte: dayStart,
						lt: new Date(dayStart.getTime() + DAY_MS),
					},
				}
			: {}),
	};

	const [data, total] = await prisma.$transaction([
		prisma.workOrder.findMany({
			where,
			include: workOrderListInclude,
			orderBy: { scheduledStart: "asc" },
			...toSkipTake(query),
		}),
		prisma.workOrder.count({ where }),
	]);
	return { data, meta: buildMeta(query, total) };
}

async function assertTechnicianExists(id: string) {
	const technician = await prisma.user.findFirst({
		where: { id, role: "TECHNICIAN", deletedAt: null },
		select: technicianSelect,
	});
	if (!technician) throw AppError.notFound("Technician");
	return technician;
}

async function stats(id: string, viewer: AuthUser) {
	if (viewer.role === "TECHNICIAN" && viewer.id !== id) {
		throw AppError.forbidden("Technicians can only view their own stats");
	}
	const technician = await assertTechnicianExists(id);

	const [byStatus, revenue, upcoming] = await Promise.all([
		prisma.workOrder.groupBy({
			by: ["status"],
			where: { technicianId: id, deletedAt: null },
			_count: { _all: true },
		}),
		prisma.invoice.aggregate({
			where: { status: "PAID", workOrder: { technicianId: id } },
			_sum: { total: true },
		}),
		prisma.workOrder.count({
			where: {
				technicianId: id,
				deletedAt: null,
				status: "ASSIGNED",
				scheduledStart: { gte: new Date() },
			},
		}),
	]);

	return {
		technician,
		jobsByStatus: Object.fromEntries(
			byStatus.map((row) => [row.status, row._count._all]),
		),
		upcomingJobs: upcoming,
		revenueGenerated: revenue._sum.total ?? 0,
	};
}

async function feedback(id: string, page: PageParams) {
	await assertTechnicianExists(id);
	const where = { technicianId: id };
	const [data, total] = await prisma.$transaction([
		prisma.feedback.findMany({
			where,
			select: {
				id: true,
				rating: true,
				comment: true,
				createdAt: true,
				customer: { select: { id: true, name: true } },
				workOrder: { select: { id: true, code: true, title: true } },
			},
			orderBy: { createdAt: "desc" },
			...toSkipTake(page),
		}),
		prisma.feedback.count({ where }),
	]);
	return { data, meta: buildMeta(page, total) };
}

export const technicianService = { list, myJobs, stats, feedback };
