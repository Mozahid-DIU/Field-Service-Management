import type { CookieOptions, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { isProduction } from "../../config/env";
import { requireUser } from "../../middlewares/auth";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { REFRESH_COOKIE_NAME, refreshCookieMaxAgeMs } from "../../utils/tokens";
import { type AuthResult, authService } from "./auth.service";

const refreshCookieOptions = (): CookieOptions => ({
	httpOnly: true,
	secure: isProduction,
	// Frontend (Vercel) and API (Render) are on different sites in production
	sameSite: isProduction ? "none" : "lax",
	path: "/api/v1/auth",
	maxAge: refreshCookieMaxAgeMs(),
});

function sendAuth(
	res: Response,
	result: AuthResult,
	message: string,
	statusCode: number = StatusCodes.OK,
) {
	res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
	return sendResponse(res, { statusCode, message, data: result });
}

function readRefreshToken(req: Request): string | undefined {
	const fromCookie = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
	const fromBody = (req.body as { refreshToken?: string } | undefined)
		?.refreshToken;
	return fromCookie ?? fromBody;
}

export const authController = {
	register: catchAsync(async (req, res) => {
		const result = await authService.register(req.body, req.ip);
		sendAuth(res, result, "Registration successful", StatusCodes.CREATED);
	}),

	login: catchAsync(async (req, res) => {
		const result = await authService.login(req.body);
		sendAuth(res, result, "Login successful");
	}),

	google: catchAsync(async (req, res) => {
		const result = await authService.loginWithGoogle(req.body.idToken);
		sendAuth(res, result, "Google login successful");
	}),

	refreshToken: catchAsync(async (req, res) => {
		const token = readRefreshToken(req);
		if (!token) throw AppError.unauthorized("Refresh token is required");
		const result = await authService.refresh(token);
		sendAuth(res, result, "Token refreshed");
	}),

	logout: catchAsync(async (req, res) => {
		await authService.logout(readRefreshToken(req));
		res.clearCookie(REFRESH_COOKIE_NAME, {
			...refreshCookieOptions(),
			maxAge: undefined,
		});
		sendResponse(res, { message: "Logged out successfully", data: null });
	}),

	changePassword: catchAsync(async (req, res) => {
		const user = requireUser(req.user);
		await authService.changePassword(user.id, req.body);
		res.clearCookie(REFRESH_COOKIE_NAME, {
			...refreshCookieOptions(),
			maxAge: undefined,
		});
		sendResponse(res, {
			message: "Password changed. Please log in again on all devices.",
			data: null,
		});
	}),
};
