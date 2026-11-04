import { createHash, randomBytes } from "node:crypto";
import type { Role } from "@prisma/client";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

const REFRESH_TOKEN_BYTES = 48;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface AccessTokenPayload {
	sub: string;
	email: string;
	role: Role;
}

export function signAccessToken(payload: AccessTokenPayload): string {
	return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
		expiresIn: env.JWT_ACCESS_EXPIRES as SignOptions["expiresIn"],
		issuer: "fixflow-api",
	});
}

export function verifyAccessToken(token: string): AccessTokenPayload {
	const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
		issuer: "fixflow-api",
	});
	if (typeof decoded === "string" || !decoded.sub || !decoded.role) {
		throw new jwt.JsonWebTokenError("Malformed token payload");
	}
	return decoded as AccessTokenPayload;
}

/** Refresh tokens are opaque random strings; only their SHA-256 hash is stored. */
export function generateRefreshToken(): {
	token: string;
	tokenHash: string;
	expiresAt: Date;
} {
	const token = randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
	return {
		token,
		tokenHash: hashToken(token),
		expiresAt: new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * DAY_MS),
	};
}

export function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

export const REFRESH_COOKIE_NAME = "refreshToken";
export const refreshCookieMaxAgeMs = (): number =>
	env.JWT_REFRESH_EXPIRES_DAYS * DAY_MS;
