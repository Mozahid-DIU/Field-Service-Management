import { requireUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { userService } from "./user.service";

export const userController = {
	getMe: catchAsync(async (req, res) => {
		const { id } = requireUser(req.user);
		const data = await userService.getMe(id);
		sendResponse(res, { message: "Profile retrieved", data });
	}),

	updateMe: catchAsync(async (req, res) => {
		const { id } = requireUser(req.user);
		const data = await userService.updateMe(id, req.body);
		sendResponse(res, { message: "Profile updated", data });
	}),

	updateTechnicianProfile: catchAsync(async (req, res) => {
		const { id } = requireUser(req.user);
		const data = await userService.updateTechnicianProfile(id, req.body);
		sendResponse(res, { message: "Technician profile updated", data });
	}),
};
