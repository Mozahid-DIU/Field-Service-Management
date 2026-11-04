import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { logger } from "../../utils/logger";

const UPLOAD_FOLDER = "fixflow/work-orders";

function ensureConfigured(): void {
	const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
		env;
	if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
		throw new AppError(
			StatusCodes.SERVICE_UNAVAILABLE,
			"Image upload is not configured on this server",
		);
	}
	cloudinary.config({
		cloud_name: CLOUDINARY_CLOUD_NAME,
		api_key: CLOUDINARY_API_KEY,
		api_secret: CLOUDINARY_API_SECRET,
		secure: true,
	});
}

function uploadBuffer(
	buffer: Buffer,
	ownerId: string,
): Promise<UploadApiResponse> {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{
				folder: UPLOAD_FOLDER,
				resource_type: "image",
				context: { owner: ownerId },
				transformation: [{ width: 1600, height: 1600, crop: "limit" }],
			},
			(error, result) => {
				if (error || !result) {
					reject(error ?? new Error("Empty upload response"));
					return;
				}
				resolve(result);
			},
		);
		stream.end(buffer);
	});
}

export interface UploadedImage {
	url: string;
	publicId: string;
	width: number;
	height: number;
	bytes: number;
}

async function uploadImages(
	files: Express.Multer.File[],
	ownerId: string,
): Promise<UploadedImage[]> {
	if (files.length === 0) {
		throw AppError.badRequest(
			'Attach at least one image in the "images" field',
		);
	}
	ensureConfigured();
	try {
		const results = await Promise.all(
			files.map((file) => uploadBuffer(file.buffer, ownerId)),
		);
		return results.map((result) => ({
			url: result.secure_url,
			publicId: result.public_id,
			width: result.width,
			height: result.height,
			bytes: result.bytes,
		}));
	} catch (error) {
		logger.error("Cloudinary upload failed", error);
		throw AppError.badGateway("Image upload failed, please try again");
	}
}

export const uploadService = { uploadImages };
