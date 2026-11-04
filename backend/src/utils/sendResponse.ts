import type { Response } from "express";
import { StatusCodes } from "http-status-codes";

export interface PaginationMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

interface SuccessPayload<T> {
	statusCode?: number;
	message: string;
	data: T;
	meta?: PaginationMeta;
}

export function sendResponse<T>(
	res: Response,
	{ statusCode = StatusCodes.OK, message, data, meta }: SuccessPayload<T>,
): Response {
	return res.status(statusCode).json({
		success: true,
		message,
		data,
		...(meta ? { meta } : {}),
	});
}
