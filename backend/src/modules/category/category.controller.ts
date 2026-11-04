import { StatusCodes } from "http-status-codes";
import { requireUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { categoryService } from "./category.service";

export const categoryController = {
	list: catchAsync(async (_req, res) => {
		const data = await categoryService.listActive();
		sendResponse(res, { message: "Service categories retrieved", data });
	}),

	create: catchAsync(async (req, res) => {
		const { id: actorId } = requireUser(req.user);
		const data = await categoryService.create(req.body, actorId);
		sendResponse(res, {
			statusCode: StatusCodes.CREATED,
			message: "Service category created",
			data,
		});
	}),

	update: catchAsync(async (req, res) => {
		const { id: actorId } = requireUser(req.user);
		const { id } = res.locals.validated.params;
		const data = await categoryService.update(id, req.body, actorId);
		sendResponse(res, { message: "Service category updated", data });
	}),

	remove: catchAsync(async (req, res) => {
		const { id: actorId } = requireUser(req.user);
		const { id } = res.locals.validated.params;
		await categoryService.softDelete(id, actorId);
		sendResponse(res, { message: "Service category deleted", data: null });
	}),
};
