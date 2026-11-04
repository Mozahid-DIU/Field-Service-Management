import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { allowedOrigins, env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import { notFound } from "./middlewares/notFound";
import { apiLimiter } from "./middlewares/rateLimiter";
import router from "./routes";
import { sendResponse } from "./utils/sendResponse";

const app: Application = express();

// Render / Vercel sit behind a proxy — needed for correct client IPs in rate limiting
app.set("trust proxy", 1);

app.use(helmet());
app.use(
	cors({
		origin: allowedOrigins,
		credentials: true,
	}),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (env.NODE_ENV === "development") {
	app.use(morgan("dev"));
}

app.get("/", (_req, res) => {
	sendResponse(res, {
		message: "FixFlow Field Service Management API is running",
		data: { version: "v1", docs: "/api/v1/health" },
	});
});

app.get("/api/v1/health", (_req, res) => {
	sendResponse(res, {
		message: "Healthy",
		data: { uptime: process.uptime(), timestamp: new Date().toISOString() },
	});
});

app.use("/api/v1", apiLimiter, router);

app.use(notFound);
app.use(errorHandler);

export default app;
