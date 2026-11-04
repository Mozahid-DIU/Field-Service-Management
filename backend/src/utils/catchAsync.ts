import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncHandler = (
	req: Request,
	res: Response,
	next: NextFunction,
) => Promise<unknown>;

/**
 * Express 5 already forwards rejected promises to the error handler,
 * this wrapper keeps controllers explicit and typed.
 */
export const catchAsync =
	(handler: AsyncHandler): RequestHandler =>
	(req, res, next) => {
		handler(req, res, next).catch(next);
	};
