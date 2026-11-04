import { z } from "zod";
import type { PaginationMeta } from "./sendResponse";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export const paginationQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
	limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export interface PageParams {
	page: number;
	limit: number;
}

export function toSkipTake({ page, limit }: PageParams): {
	skip: number;
	take: number;
} {
	return { skip: (page - 1) * limit, take: limit };
}

export function buildMeta(
	{ page, limit }: PageParams,
	total: number,
): PaginationMeta {
	return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
