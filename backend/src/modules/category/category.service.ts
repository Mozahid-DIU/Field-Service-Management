import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { AuditAction, recordAudit } from "../../utils/auditLog";
import { CacheKeys, cache } from "../../utils/cache";
import type {
	CreateCategoryInput,
	UpdateCategoryInput,
} from "./category.validation";

const CATEGORY_CACHE_TTL_SECONDS = 10 * 60;

const categorySelect = {
	id: true,
	name: true,
	description: true,
	basePrice: true,
	isActive: true,
	createdAt: true,
	updatedAt: true,
} as const;

async function listActive() {
	return cache.remember(CacheKeys.categories, CATEGORY_CACHE_TTL_SECONDS, () =>
		prisma.serviceCategory.findMany({
			where: { isActive: true, deletedAt: null },
			select: {
				...categorySelect,
				_count: { select: { technicians: true } },
			},
			orderBy: { name: "asc" },
		}),
	);
}

async function findExisting(id: string) {
	const category = await prisma.serviceCategory.findFirst({
		where: { id, deletedAt: null },
	});
	if (!category) throw AppError.notFound("Service category");
	return category;
}

async function assertNameAvailable(name: string, excludeId?: string) {
	const clash = await prisma.serviceCategory.findFirst({
		where: {
			name: { equals: name, mode: "insensitive" },
			...(excludeId ? { id: { not: excludeId } } : {}),
		},
		select: { deletedAt: true },
	});
	if (clash) {
		throw AppError.conflict(
			clash.deletedAt
				? `Category "${name}" exists in the archive, choose another name`
				: `Category "${name}" already exists`,
		);
	}
}

async function create(input: CreateCategoryInput, actorId: string) {
	await assertNameAvailable(input.name);
	const category = await prisma.$transaction(async (tx) => {
		const created = await tx.serviceCategory.create({
			data: input,
			select: categorySelect,
		});
		await recordAudit(
			{
				actorId,
				action: AuditAction.CATEGORY_CREATED,
				entity: "ServiceCategory",
				entityId: created.id,
				after: { name: created.name, basePrice: input.basePrice },
			},
			tx,
		);
		return created;
	});
	await cache.del(CacheKeys.categories);
	return category;
}

async function update(id: string, input: UpdateCategoryInput, actorId: string) {
	const existing = await findExisting(id);
	if (input.name) await assertNameAvailable(input.name, id);

	const category = await prisma.$transaction(async (tx) => {
		const updated = await tx.serviceCategory.update({
			where: { id },
			data: input,
			select: categorySelect,
		});
		await recordAudit(
			{
				actorId,
				action: AuditAction.CATEGORY_UPDATED,
				entity: "ServiceCategory",
				entityId: id,
				before: {
					name: existing.name,
					basePrice: existing.basePrice.toString(),
					isActive: existing.isActive,
				},
				after: { ...input },
			},
			tx,
		);
		return updated;
	});
	await cache.del(CacheKeys.categories);
	return category;
}

async function softDelete(id: string, actorId: string) {
	await findExisting(id);
	await prisma.$transaction(async (tx) => {
		await tx.serviceCategory.update({
			where: { id },
			data: { deletedAt: new Date(), isActive: false },
		});
		await recordAudit(
			{
				actorId,
				action: AuditAction.CATEGORY_DELETED,
				entity: "ServiceCategory",
				entityId: id,
			},
			tx,
		);
	});
	await cache.del(CacheKeys.categories);
}

export const categoryService = {
	listActive,
	create,
	update,
	softDelete,
	findExisting,
};
