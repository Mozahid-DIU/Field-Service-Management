import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { idParamSchema } from "../../utils/validators";
import { categoryController } from "./category.controller";
import {
	createCategorySchema,
	updateCategorySchema,
} from "./category.validation";

const router = Router();

router.get("/", categoryController.list);
router.post(
	"/",
	auth("ADMIN"),
	validate({ body: createCategorySchema }),
	categoryController.create,
);
router.patch(
	"/:id",
	auth("ADMIN"),
	validate({ params: idParamSchema, body: updateCategorySchema }),
	categoryController.update,
);
router.delete(
	"/:id",
	auth("ADMIN"),
	validate({ params: idParamSchema }),
	categoryController.remove,
);

export const categoryRoutes = router;
