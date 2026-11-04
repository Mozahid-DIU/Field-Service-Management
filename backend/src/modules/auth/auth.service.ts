import type { User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { AuditAction, recordAudit } from "../../utils/auditLog";
import {
	generateRefreshToken,
	hashToken,
	signAccessToken,
} from "../../utils/tokens";
import type { PublicUser } from "../user/user.select";
import type {
	ChangePasswordInput,
	LoginInput,
	RegisterInput,
} from "./auth.validation";

export interface AuthResult {
	user: PublicUser;
	accessToken: string;
	refreshToken: string;
}

const INVALID_CREDENTIALS = "Invalid email or password";

const googleClient = new OAuth2Client();

function toPublicUser(user: User): PublicUser {
	const { password: _p, googleId: _g, deletedAt: _d, ...rest } = user;
	return rest;
}

async function issueTokens(user: User): Promise<AuthResult> {
	const refresh = generateRefreshToken();
	await prisma.refreshToken.create({
		data: {
			userId: user.id,
			tokenHash: refresh.tokenHash,
			expiresAt: refresh.expiresAt,
		},
	});
	return {
		user: toPublicUser(user),
		accessToken: signAccessToken({
			sub: user.id,
			email: user.email,
			role: user.role,
		}),
		refreshToken: refresh.token,
	};
}

function assertCanLogin(user: User): void {
	if (user.deletedAt) throw AppError.unauthorized(INVALID_CREDENTIALS);
	if (user.status === "BLOCKED") {
		throw AppError.forbidden("Your account has been blocked");
	}
}

async function register(
	input: RegisterInput,
	ip?: string,
): Promise<AuthResult> {
	const existing = await prisma.user.findUnique({
		where: { email: input.email },
		select: { id: true },
	});
	if (existing) {
		throw AppError.conflict("An account with this email already exists");
	}

	const password = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
	const user = await prisma.$transaction(async (tx) => {
		const created = await tx.user.create({
			data: { ...input, password, role: "CUSTOMER" },
		});
		await recordAudit(
			{
				actorId: created.id,
				action: AuditAction.USER_REGISTERED,
				entity: "User",
				entityId: created.id,
				after: { role: created.role, provider: created.provider },
				ip,
			},
			tx,
		);
		return created;
	});

	return issueTokens(user);
}

async function login(input: LoginInput): Promise<AuthResult> {
	const user = await prisma.user.findUnique({ where: { email: input.email } });
	// Same error for unknown email and wrong password — no user enumeration
	if (!user?.password) {
		throw AppError.unauthorized(INVALID_CREDENTIALS);
	}
	const matches = await bcrypt.compare(input.password, user.password);
	if (!matches) {
		throw AppError.unauthorized(INVALID_CREDENTIALS);
	}
	assertCanLogin(user);
	return issueTokens(user);
}

async function loginWithGoogle(idToken: string): Promise<AuthResult> {
	if (!env.GOOGLE_CLIENT_ID) {
		throw new AppError(
			StatusCodes.SERVICE_UNAVAILABLE,
			"Google login is not configured on this server",
		);
	}

	const ticket = await googleClient
		.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID })
		.catch(() => {
			throw AppError.unauthorized("Invalid Google ID token");
		});
	const payload = ticket.getPayload();
	if (!payload?.email || !payload.email_verified) {
		throw AppError.unauthorized("Google account email is not verified");
	}

	const email = payload.email.toLowerCase();
	const existing = await prisma.user.findFirst({
		where: { OR: [{ googleId: payload.sub }, { email }] },
	});

	let user: User;
	if (existing) {
		assertCanLogin(existing);
		user = existing.googleId
			? existing
			: await prisma.user.update({
					where: { id: existing.id },
					data: {
						googleId: payload.sub,
						avatarUrl: existing.avatarUrl ?? payload.picture,
					},
				});
	} else {
		user = await prisma.user.create({
			data: {
				name: payload.name ?? email.split("@")[0],
				email,
				googleId: payload.sub,
				avatarUrl: payload.picture,
				provider: "GOOGLE",
				role: "CUSTOMER",
			},
		});
		await recordAudit({
			actorId: user.id,
			action: AuditAction.USER_REGISTERED,
			entity: "User",
			entityId: user.id,
			after: { role: user.role, provider: user.provider },
		});
	}

	return issueTokens(user);
}

/**
 * Refresh-token rotation with reuse detection: a revoked token being presented
 * again means it was stolen, so every session of that user is revoked.
 */
async function refresh(token: string): Promise<AuthResult> {
	const stored = await prisma.refreshToken.findUnique({
		where: { tokenHash: hashToken(token) },
		include: { user: true },
	});
	if (!stored) {
		throw AppError.unauthorized("Invalid refresh token");
	}
	if (stored.revokedAt) {
		await prisma.refreshToken.updateMany({
			where: { userId: stored.userId, revokedAt: null },
			data: { revokedAt: new Date() },
		});
		throw AppError.unauthorized(
			"Refresh token reuse detected, all sessions were revoked",
		);
	}
	if (stored.expiresAt < new Date()) {
		throw AppError.unauthorized("Refresh token has expired");
	}
	assertCanLogin(stored.user);

	// Atomic claim: only one concurrent request can rotate this token
	const claimed = await prisma.refreshToken.updateMany({
		where: { id: stored.id, revokedAt: null },
		data: { revokedAt: new Date() },
	});
	if (claimed.count === 0) {
		throw AppError.unauthorized("Refresh token already used");
	}

	return issueTokens(stored.user);
}

async function logout(token: string | undefined): Promise<void> {
	if (!token) return;
	await prisma.refreshToken.updateMany({
		where: { tokenHash: hashToken(token), revokedAt: null },
		data: { revokedAt: new Date() },
	});
}

async function changePassword(
	userId: string,
	input: ChangePasswordInput,
): Promise<void> {
	const user = await prisma.user.findUnique({ where: { id: userId } });
	if (!user) throw AppError.notFound("User");
	if (!user.password) {
		throw AppError.badRequest(
			"This account uses Google login and has no password to change",
		);
	}
	const matches = await bcrypt.compare(input.currentPassword, user.password);
	if (!matches) {
		throw AppError.badRequest("Current password is incorrect", [
			{ path: "currentPassword", message: "Incorrect password" },
		]);
	}

	const password = await bcrypt.hash(input.newPassword, env.BCRYPT_SALT_ROUNDS);
	await prisma.$transaction(async (tx) => {
		await tx.user.update({ where: { id: userId }, data: { password } });
		// Force re-login everywhere after a password change
		await tx.refreshToken.updateMany({
			where: { userId, revokedAt: null },
			data: { revokedAt: new Date() },
		});
		await recordAudit(
			{
				actorId: userId,
				action: AuditAction.PASSWORD_CHANGED,
				entity: "User",
				entityId: userId,
			},
			tx,
		);
	});
}

export const authService = {
	register,
	login,
	loginWithGoogle,
	refresh,
	logout,
	changePassword,
};
