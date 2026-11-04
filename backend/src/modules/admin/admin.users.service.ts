import type { Prisma, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import type { AuthUser } from "../../types/express";
import { AppError } from "../../utils/AppError";
import { AuditAction, recordAudit } from "../../utils/auditLog";
import { buildMeta, toSkipTake } from "../../utils/pagination";
import { publicUserSelect, userWithProfileSelect } from "../user/user.select";
import { ACTIVE_SCHEDULE_STATUSES } from "../workOrder/workOrder.stateMachine";
import type { CreateTechnicianInput, ListUsersQuery } from "./admin.validation";

async function listUsers(query: ListUsersQuery) {
	const where: Prisma.UserWhereInput = {
		...(query.includeDeleted ? {} : { deletedAt: null }),
		...(query.role ? { role: query.role } : {}),
		...(query.status ? { status: query.status } : {}),
		...(query.q
			? {
					OR: [
						{ name: { contains: query.q, mode: "insensitive" } },
						{ email: { contains: query.q, mode: "insensitive" } },
						{ phone: { contains: query.q } },
					],
				}
			: {}),
	};
	const [data, total] = await prisma.$transaction([
		prisma.user.findMany({
			where,
			select: { ...publicUserSelect, deletedAt: true },
			orderBy: { [query.sortBy]: query.sortOrder },
			...toSkipTake(query),
		}),
		prisma.user.count({ where }),
	]);
	return { data, meta: buildMeta(query, total) };
}

async function createTechnician(input: CreateTechnicianInput, admin: AuthUser) {
	const { skillIds, bio, password, ...userData } = input;

	const [emailTaken, validSkills] = await Promise.all([
		prisma.user.findUnique({
			where: { email: input.email },
			select: { id: true },
		}),
		prisma.serviceCategory.count({
			where: { id: { in: skillIds }, isActive: true, deletedAt: null },
		}),
	]);
	if (emailTaken)
		throw AppError.conflict("An account with this email already exists");
	if (validSkills !== new Set(skillIds).size) {
		throw AppError.badRequest("One or more skills are invalid or inactive", [
			{ path: "skillIds", message: "Unknown or inactive category id" },
		]);
	}

	const hashed = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
	return prisma.$transaction(async (tx) => {
		const technician = await tx.user.create({
			data: {
				...userData,
				password: hashed,
				role: "TECHNICIAN",
				technicianProfile: {
					create: {
						bio,
						skills: { connect: skillIds.map((id) => ({ id })) },
					},
				},
			},
			select: userWithProfileSelect,
		});
		await recordAudit(
			{
				actorId: admin.id,
				action: AuditAction.TECHNICIAN_CREATED,
				entity: "User",
				entityId: technician.id,
				after: { email: technician.email, skillIds },
			},
			tx,
		);
		return technician;
	});
}

async function findManagedUser(id: string, admin: AuthUser) {
	if (id === admin.id) {
		throw AppError.badRequest("Admins cannot change their own role or status");
	}
	const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
	if (!user) throw AppError.notFound("User");
	return user;
}

async function changeRole(id: string, role: Role, admin: AuthUser) {
	const user = await findManagedUser(id, admin);
	if (user.role === role) {
		throw AppError.conflict(`User already has role ${role}`);
	}
	if (user.role === "TECHNICIAN") {
		const activeJobs = await prisma.workOrder.count({
			where: {
				technicianId: id,
				status: { in: ACTIVE_SCHEDULE_STATUSES },
				deletedAt: null,
			},
		});
		if (activeJobs > 0) {
			throw AppError.conflict(
				`Technician still has ${activeJobs} active job(s); reassign them first`,
			);
		}
	}

	return prisma.$transaction(async (tx) => {
		const updated = await tx.user.update({
			where: { id },
			data: {
				role,
				...(role === "TECHNICIAN"
					? {
							technicianProfile: {
								connectOrCreate: { where: { userId: id }, create: {} },
							},
						}
					: {}),
			},
			select: userWithProfileSelect,
		});
		// Role is embedded in access tokens: force re-login so it takes effect
		await tx.refreshToken.updateMany({
			where: { userId: id, revokedAt: null },
			data: { revokedAt: new Date() },
		});
		await recordAudit(
			{
				actorId: admin.id,
				action: AuditAction.USER_ROLE_CHANGED,
				entity: "User",
				entityId: id,
				before: { role: user.role },
				after: { role },
			},
			tx,
		);
		return updated;
	});
}

async function changeStatus(
	id: string,
	status: UserStatus,
	reason: string | undefined,
	admin: AuthUser,
) {
	const user = await findManagedUser(id, admin);
	if (user.status === status) {
		throw AppError.conflict(`User is already ${status}`);
	}
	return prisma.$transaction(async (tx) => {
		const updated = await tx.user.update({
			where: { id },
			data: { status },
			select: publicUserSelect,
		});
		if (status === "BLOCKED") {
			await tx.refreshToken.updateMany({
				where: { userId: id, revokedAt: null },
				data: { revokedAt: new Date() },
			});
		}
		await recordAudit(
			{
				actorId: admin.id,
				action: AuditAction.USER_STATUS_CHANGED,
				entity: "User",
				entityId: id,
				before: { status: user.status },
				after: { status, ...(reason ? { reason } : {}) },
			},
			tx,
		);
		return updated;
	});
}

export const adminUsersService = {
	listUsers,
	createTechnician,
	changeRole,
	changeStatus,
};
