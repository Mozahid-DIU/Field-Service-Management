import { StatusCodes } from "http-status-codes";
import { requireUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { feedbackService } from "./feedback.service";

export const feedbackController = {
	create: catchAsync(async (req, res) => {
		const { id } = (res.locals.validated as { params: { id: string } }).params;
		const data = await feedbackService.create(
			id,
			req.body,
			requireUser(req.user),
		);
		sendResponse(res, {
			statusCode: StatusCodes.CREATED,
			message: "Thank you for your feedback",
			data,
		});
	}),
};
