import type { RequestHandler } from "express";
import multer from "multer";
import { AppError } from "../utils/AppError";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGES_PER_UPLOAD = 5;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const uploader = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES_PER_UPLOAD },
	fileFilter: (_req, file, callback) => {
		if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
			callback(
				AppError.badRequest("Only JPEG, PNG or WEBP images are allowed", [
					{
						path: file.fieldname,
						message: `Unsupported type ${file.mimetype}`,
					},
				]),
			);
			return;
		}
		callback(null, true);
	},
});

/** Wraps multer so its errors become our standard 400 response. */
export const uploadImages =
	(field: string): RequestHandler =>
	(req, res, next) => {
		uploader.array(field, MAX_IMAGES_PER_UPLOAD)(req, res, (error: unknown) => {
			if (error instanceof multer.MulterError) {
				const message =
					error.code === "LIMIT_FILE_SIZE"
						? `Each image must be at most ${MAX_IMAGE_BYTES / 1024 / 1024} MB`
						: error.code === "LIMIT_FILE_COUNT" ||
								error.code === "LIMIT_UNEXPECTED_FILE"
							? `Upload up to ${MAX_IMAGES_PER_UPLOAD} images in the "${field}" field`
							: error.message;
				next(AppError.badRequest(message, [{ path: field, message }]));
				return;
			}
			next(error);
		});
	};
