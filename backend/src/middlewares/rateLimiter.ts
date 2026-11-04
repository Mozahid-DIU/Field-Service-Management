import rateLimit from "express-rate-limit";
import { StatusCodes } from "http-status-codes";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const API_MAX_REQUESTS = 300;
const AUTH_MAX_REQUESTS = 20;

const rateLimitBody = (message: string) => ({
	success: false,
	message,
	errors: [],
});

/** General limit for every /api/v1 route. */
export const apiLimiter = rateLimit({
	windowMs: FIFTEEN_MINUTES_MS,
	limit: API_MAX_REQUESTS,
	standardHeaders: "draft-8",
	legacyHeaders: false,
	statusCode: StatusCodes.TOO_MANY_REQUESTS,
	message: rateLimitBody("Too many requests, please try again later"),
});

/** Stricter limit for login / register / refresh to slow brute force. */
export const authLimiter = rateLimit({
	windowMs: FIFTEEN_MINUTES_MS,
	limit: AUTH_MAX_REQUESTS,
	standardHeaders: "draft-8",
	legacyHeaders: false,
	statusCode: StatusCodes.TOO_MANY_REQUESTS,
	message: rateLimitBody(
		"Too many authentication attempts, please try again in 15 minutes",
	),
});
