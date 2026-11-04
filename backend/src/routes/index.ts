import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { categoryRoutes } from "../modules/category/category.routes";
import {
	invoiceRoutes,
	paymentRoutes,
} from "../modules/payment/payment.routes";
import { technicianRoutes } from "../modules/technician/technician.routes";
import { userRoutes } from "../modules/user/user.routes";
import { workOrderRoutes } from "../modules/workOrder/workOrder.routes";

const router = Router();

interface ModuleRoute {
	path: string;
	route: Router;
}

const moduleRoutes: ModuleRoute[] = [
	{ path: "/auth", route: authRoutes },
	{ path: "/users", route: userRoutes },
	{ path: "/categories", route: categoryRoutes },
	{ path: "/work-orders", route: workOrderRoutes },
	{ path: "/technicians", route: technicianRoutes },
	{ path: "/invoices", route: invoiceRoutes },
	{ path: "/payments", route: paymentRoutes },
];

for (const { path, route } of moduleRoutes) {
	router.use(path, route);
}

export default router;
