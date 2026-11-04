import type { RequestHandler } from "express";
import type { ZodType } from "zod";

interface RequestSchemas {
	body?: ZodType;
	query?: ZodType;
	params?: ZodType;
}

/**
 * Validates req.body / req.query / req.params with Zod.
 * Parsed (coerced, defaulted) values are stored on res.locals.validated
 * because Express 5 makes req.query a read-only getter.
 */
export const validate =
	(schemas: RequestSchemas): RequestHandler =>
	(req, res, next) => {
		const validated = {
			body: schemas.body ? schemas.body.parse(req.body ?? {}) : req.body,
			query: schemas.query ? schemas.query.parse(req.query) : req.query,
			params: schemas.params ? schemas.params.parse(req.params) : req.params,
		};
		req.body = validated.body;
		res.locals.validated = validated;
		next();
	};
