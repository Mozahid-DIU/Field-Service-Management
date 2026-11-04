import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { auth, requireUser } from "../../middlewares/auth";
import { uploadImages } from "../../middlewares/upload";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { uploadService } from "./upload.service";

const router = Router();

/**
 * multipart/form-data, field "images" (1-5 files, ≤2 MB, jpeg/png/webp).
 * Returns Cloudinary URLs to pass as `images` when creating a work order.
 */
router.post(
	"/images",
	auth(),
	uploadImages("images"),
	catchAsync(async (req, res) => {
		const files = (req.files as Express.Multer.File[] | undefined) ?? [];
		const data = await uploadService.uploadImages(
			files,
			requireUser(req.user).id,
		);
		sendResponse(res, {
			statusCode: StatusCodes.CREATED,
			message: `${data.length} image(s) uploaded`,
			data,
		});
	}),
);

export const uploadRoutes = router;
