import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { categoryRoutes } from "../modules/category/category.routes";
import { userRoutes } from "../modules/user/user.routes";

const router = Router();

interface ModuleRoute {
	path: string;
	route: Router;
}

const moduleRoutes: ModuleRoute[] = [
	{ path: "/auth", route: authRoutes },
	{ path: "/users", route: userRoutes },
	{ path: "/categories", route: categoryRoutes },
];

for (const { path, route } of moduleRoutes) {
	router.use(path, route);
}

export default router;
