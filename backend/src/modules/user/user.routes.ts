import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { userController } from "./user.controller";
import {
	updateMeSchema,
	updateTechnicianProfileSchema,
} from "./user.validation";

const router = Router();

router.get("/me", auth(), userController.getMe);
router.patch(
	"/me",
	auth(),
	validate({ body: updateMeSchema }),
	userController.updateMe,
);
router.patch(
	"/me/technician-profile",
	auth("TECHNICIAN"),
	validate({ body: updateTechnicianProfileSchema }),
	userController.updateTechnicianProfile,
);

export const userRoutes = router;
