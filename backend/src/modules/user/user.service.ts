import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { userWithProfileSelect } from "./user.select";
import type {
	UpdateMeInput,
	UpdateTechnicianProfileInput,
} from "./user.validation";

async function getMe(userId: string) {
	const user = await prisma.user.findFirst({
		where: { id: userId, deletedAt: null },
		select: userWithProfileSelect,
	});
	if (!user) throw AppError.notFound("User");
	return user;
}

async function updateMe(userId: string, input: UpdateMeInput) {
	return prisma.user.update({
		where: { id: userId },
		data: input,
		select: userWithProfileSelect,
	});
}

async function updateTechnicianProfile(
	userId: string,
	input: UpdateTechnicianProfileInput,
) {
	const { skillIds, ...rest } = input;

	if (skillIds) {
		const found = await prisma.serviceCategory.count({
			where: { id: { in: skillIds }, deletedAt: null, isActive: true },
		});
		if (found !== new Set(skillIds).size) {
			throw AppError.badRequest("One or more skills are invalid or inactive", [
				{ path: "skillIds", message: "Unknown or inactive category id" },
			]);
		}
	}

	await prisma.technicianProfile.upsert({
		where: { userId },
		create: {
			userId,
			...rest,
			...(skillIds
				? { skills: { connect: skillIds.map((id) => ({ id })) } }
				: {}),
		},
		update: {
			...rest,
			...(skillIds ? { skills: { set: skillIds.map((id) => ({ id })) } } : {}),
		},
	});

	return getMe(userId);
}

export const userService = { getMe, updateMe, updateTechnicianProfile };
