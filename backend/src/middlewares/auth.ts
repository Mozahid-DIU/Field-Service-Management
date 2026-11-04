import type { Role } from "@prisma/client";
import type { RequestHandler } from "express";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/tokens";

const BEARER_PREFIX = "Bearer ";

/**
 * Verifies the Bearer access token and re-checks the user in the DB so that
 * blocked / deleted accounts lose access immediately (not after token expiry).
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
	const header = req.headers.authorization;
	if (!header?.startsWith(BEARER_PREFIX)) {
		throw AppError.unauthorized(
			"Missing or malformed Authorization header (expected: Bearer <token>)",
		);
	}

	const payload = verifyAccessToken(header.slice(BEARER_PREFIX.length).trim());

	const user = await prisma.user.findUnique({
		where: { id: payload.sub },
		select: {
			id: true,
			email: true,
			role: true,
			status: true,
			deletedAt: true,
		},
	});
	if (!user || user.deletedAt) {
		throw AppError.unauthorized("Account no longer exists");
	}
	if (user.status === "BLOCKED") {
		throw AppError.forbidden("Your account has been blocked");
	}

	req.user = { id: user.id, email: user.email, role: user.role };
	next();
};

/** Role-based guard. Use after authenticate: authorize('ADMIN', 'TECHNICIAN') */
export const authorize =
	(...allowedRoles: Role[]): RequestHandler =>
	(req, _res, next) => {
		if (!req.user) {
			throw AppError.unauthorized();
		}
		if (!allowedRoles.includes(req.user.role)) {
			throw AppError.forbidden(
				`This action requires role: ${allowedRoles.join(" or ")}`,
			);
		}
		next();
	};

/** Shortcut: auth('ADMIN') === [authenticate, authorize('ADMIN')]; auth() = any logged-in user */
export const auth = (...allowedRoles: Role[]): RequestHandler[] =>
	allowedRoles.length > 0
		? [authenticate, authorize(...allowedRoles)]
		: [authenticate];

/** Helper for controllers: throws if not authenticated, returns typed user. */
export function requireUser(user: Express.Request["user"]) {
	if (!user) throw AppError.unauthorized();
	return user;
}
