import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes";

const router = Router();

interface ModuleRoute {
	path: string;
	route: Router;
}

const moduleRoutes: ModuleRoute[] = [{ path: "/auth", route: authRoutes }];

for (const { path, route } of moduleRoutes) {
	router.use(path, route);
}

export default router;
