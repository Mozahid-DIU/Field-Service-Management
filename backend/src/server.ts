import type { Server } from "node:http";
import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { logger } from "./utils/logger";

let server: Server | undefined;

async function bootstrap(): Promise<void> {
	await prisma.$connect();
	server = app.listen(env.PORT, () => {
		logger.info(`FixFlow API listening on port ${env.PORT} (${env.NODE_ENV})`);
	});
}

async function shutdown(signal: string): Promise<void> {
	logger.info(`${signal} received, shutting down gracefully`);
	server?.close();
	await prisma.$disconnect();
	process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
	logger.error("Unhandled promise rejection", reason);
});

bootstrap().catch((error: unknown) => {
	logger.error("Failed to start server", error);
	process.exit(1);
});
