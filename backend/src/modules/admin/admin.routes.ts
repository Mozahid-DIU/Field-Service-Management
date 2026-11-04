import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { idParamSchema } from "../../utils/validators";
import { adminController as c } from "./admin.controller";
import {
	auditLogQuerySchema,
	changeRoleSchema,
	changeStatusSchema,
	createTechnicianSchema,
	listUsersQuerySchema,
} from "./admin.validation";

const router = Router();

// Every admin route requires the ADMIN role
router.use(auth("ADMIN"));

router.get("/users", validate({ query: listUsersQuerySchema }), c.listUsers);
router.post(
	"/technicians",
	validate({ body: createTechnicianSchema }),
	c.createTechnician,
);
router.patch(
	"/users/:id/role",
	validate({ params: idParamSchema, body: changeRoleSchema }),
	c.changeRole,
);
router.patch(
	"/users/:id/status",
	validate({ params: idParamSchema, body: changeStatusSchema }),
	c.changeStatus,
);
router.get("/dashboard-stats", c.dashboardStats);
router.get(
	"/audit-logs",
	validate({ query: auditLogQuerySchema }),
	c.auditLogs,
);

export const adminRoutes = router;
