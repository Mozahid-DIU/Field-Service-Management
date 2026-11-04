import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { isProduction } from "../config/env";
import { AppError, type ErrorDetail } from "../utils/AppError";
import { logger } from "../utils/logger";

interface NormalizedError {
	statusCode: number;
	message: string;
	errors: ErrorDetail[];
}

function fromPrisma(
	error: Prisma.PrismaClientKnownRequestError,
): NormalizedError {
	switch (error.code) {
		case "P2002": {
			const target = (error.meta?.target as string[] | undefined) ?? [];
			return {
				statusCode: StatusCodes.CONFLICT,
				message: "Duplicate value violates a unique constraint",
				errors: target.map((field) => ({
					path: field,
					message: `${field} already exists`,
				})),
			};
		}
		case "P2025":
			return {
				statusCode: StatusCodes.NOT_FOUND,
				message: "Requested record was not found",
				errors: [],
			};
		case "P2003":
			return {
				statusCode: StatusCodes.BAD_REQUEST,
				message: "Related record does not exist",
				errors: [],
			};
		default:
			return {
				statusCode: StatusCodes.BAD_REQUEST,
				message: "Database request failed",
				errors: [],
			};
	}
}

function normalize(error: unknown): NormalizedError {
	if (error instanceof AppError) {
		return {
			statusCode: error.statusCode,
			message: error.message,
			errors: error.errors,
		};
	}
	if (error instanceof ZodError) {
		return {
			statusCode: StatusCodes.BAD_REQUEST,
			message: "Validation failed",
			errors: error.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
			})),
		};
	}
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		return fromPrisma(error);
	}
	if (error instanceof Prisma.PrismaClientValidationError) {
		return {
			statusCode: StatusCodes.BAD_REQUEST,
			message: "Invalid data for database operation",
			errors: [],
		};
	}
	if (error instanceof jwt.TokenExpiredError) {
		return {
			statusCode: StatusCodes.UNAUTHORIZED,
			message: "Token has expired",
			errors: [],
		};
	}
	if (error instanceof jwt.JsonWebTokenError) {
		return {
			statusCode: StatusCodes.UNAUTHORIZED,
			message: "Invalid token",
			errors: [],
		};
	}
	if (error instanceof SyntaxError && "body" in error) {
		return {
			statusCode: StatusCodes.BAD_REQUEST,
			message: "Malformed JSON body",
			errors: [],
		};
	}
	return {
		statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
		message: "Something went wrong",
		errors: [],
	};
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
	const { statusCode, message, errors } = normalize(error);

	if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
		logger.error(`${req.method} ${req.originalUrl} failed`, error);
	}

	res.status(statusCode).json({
		success: false,
		message,
		errors,
		...(!isProduction && statusCode >= StatusCodes.INTERNAL_SERVER_ERROR
			? { stack: error instanceof Error ? error.stack : undefined }
			: {}),
	});
};
