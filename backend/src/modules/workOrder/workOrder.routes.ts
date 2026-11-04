import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { idParamSchema } from "../../utils/validators";
import { workOrderController as c } from "./workOrder.controller";
import {
	assignWorkOrderSchema,
	cancelWorkOrderSchema,
	createWorkOrderSchema,
	listWorkOrdersQuerySchema,
	reviewWorkOrderSchema,
	searchWorkOrdersQuerySchema,
	serviceReportSchema,
	updateStatusSchema,
	updateWorkOrderSchema,
} from "./workOrder.validation";

const router = Router();
const byId = { params: idParamSchema };

// Collection
router.post(
	"/",
	auth("CUSTOMER"),
	validate({ body: createWorkOrderSchema }),
	c.create,
);
router.get("/", auth(), validate({ query: listWorkOrdersQuerySchema }), c.list);
router.get(
	"/search",
	auth(),
	validate({ query: searchWorkOrdersQuerySchema }),
	c.search,
);

// Single resource
router.get("/:id", auth(), validate(byId), c.getById);
router.patch(
	"/:id",
	auth("CUSTOMER"),
	validate({ ...byId, body: updateWorkOrderSchema }),
	c.update,
);
router.delete("/:id", auth("ADMIN"), validate(byId), c.remove);
router.get("/:id/history", auth(), validate(byId), c.history);

// Workflow
router.patch(
	"/:id/review",
	auth("ADMIN"),
	validate({ ...byId, body: reviewWorkOrderSchema }),
	c.review,
);
router.post(
	"/:id/assign",
	auth("ADMIN"),
	validate({ ...byId, body: assignWorkOrderSchema }),
	c.assign,
);
router.patch(
	"/:id/status",
	auth("TECHNICIAN", "ADMIN"),
	validate({ ...byId, body: updateStatusSchema }),
	c.updateStatus,
);
router.post(
	"/:id/cancel",
	auth("CUSTOMER", "ADMIN"),
	validate({ ...byId, body: cancelWorkOrderSchema }),
	c.cancel,
);
router.post(
	"/:id/report",
	auth("TECHNICIAN"),
	validate({ ...byId, body: serviceReportSchema }),
	c.submitReport,
);

export const workOrderRoutes = router;
