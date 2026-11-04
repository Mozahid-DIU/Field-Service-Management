import { StatusCodes } from "http-status-codes";

export interface ErrorDetail {
	path: string;
	message: string;
}

export class AppError extends Error {
	readonly statusCode: number;
	readonly errors: ErrorDetail[];

	constructor(statusCode: number, message: string, errors: ErrorDetail[] = []) {
		super(message);
		this.name = "AppError";
		this.statusCode = statusCode;
		this.errors = errors;
	}

	static badRequest(message: string, errors: ErrorDetail[] = []): AppError {
		return new AppError(StatusCodes.BAD_REQUEST, message, errors);
	}

	static unauthorized(message = "Authentication required"): AppError {
		return new AppError(StatusCodes.UNAUTHORIZED, message);
	}

	static forbidden(
		message = "You do not have permission to perform this action",
	): AppError {
		return new AppError(StatusCodes.FORBIDDEN, message);
	}

	static notFound(resource = "Resource"): AppError {
		return new AppError(StatusCodes.NOT_FOUND, `${resource} not found`);
	}

	static conflict(message: string): AppError {
		return new AppError(StatusCodes.CONFLICT, message);
	}

	static badGateway(message: string): AppError {
		return new AppError(StatusCodes.BAD_GATEWAY, message);
	}
}
