import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { authLimiter } from "../../middlewares/rateLimiter";
import { validate } from "../../middlewares/validate";
import { authController } from "./auth.controller";
import {
	changePasswordSchema,
	googleLoginSchema,
	loginSchema,
	refreshTokenSchema,
	registerSchema,
} from "./auth.validation";

const router = Router();

router.post(
	"/register",
	authLimiter,
	validate({ body: registerSchema }),
	authController.register,
);
router.post(
	"/login",
	authLimiter,
	validate({ body: loginSchema }),
	authController.login,
);
router.post(
	"/google",
	authLimiter,
	validate({ body: googleLoginSchema }),
	authController.google,
);
router.post(
	"/refresh-token",
	authLimiter,
	validate({ body: refreshTokenSchema }),
	authController.refreshToken,
);
// Logout only needs the refresh token, so an expired access token cannot block it
router.post("/logout", authController.logout);
router.patch(
	"/change-password",
	auth(),
	validate({ body: changePasswordSchema }),
	authController.changePassword,
);

export const authRoutes = router;
