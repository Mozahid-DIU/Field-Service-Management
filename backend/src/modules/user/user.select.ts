import type { Prisma } from "@prisma/client";

/** Fields safe to return to clients — never includes password or googleId. */
export const publicUserSelect = {
	id: true,
	name: true,
	email: true,
	phone: true,
	avatarUrl: true,
	role: true,
	status: true,
	provider: true,
	createdAt: true,
	updatedAt: true,
} satisfies Prisma.UserSelect;

export const userWithProfileSelect = {
	...publicUserSelect,
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

export type PublicUser = Prisma.UserGetPayload<{
	select: typeof publicUserSelect;
}>;
