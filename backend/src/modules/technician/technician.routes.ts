import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { technicianController as c } from "./technician.controller";
import {
	listTechniciansQuerySchema,
	myJobsQuerySchema,
	technicianFeedbackQuerySchema,
	technicianIdParamSchema,
} from "./technician.validation";

const router = Router();

router.get(
	"/",
	auth("ADMIN"),
	validate({ query: listTechniciansQuerySchema }),
	c.list,
);
// Must be declared before /:id routes
router.get(
	"/me/jobs",
	auth("TECHNICIAN"),
	validate({ query: myJobsQuerySchema }),
	c.myJobs,
);
router.get(
	"/:id/stats",
	auth("ADMIN", "TECHNICIAN"),
	validate({ params: technicianIdParamSchema }),
	c.stats,
);
router.get(
	"/:id/feedback",
	auth(),
	validate({
		params: technicianIdParamSchema,
		query: technicianFeedbackQuerySchema,
	}),
	c.feedback,
);

export const technicianRoutes = router;
