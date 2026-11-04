import { PrismaClient } from "@prisma/client";
import { isProduction } from "./env";

const TX_MAX_WAIT_MS = 10_000;
const TX_TIMEOUT_MS = 30_000;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: isProduction ? ["error"] : ["warn", "error"],
		// Interactive transactions (row locks + audit) make several round trips;
		// Prisma's 5s default is too tight for a remote serverless database.
		transactionOptions: {
			maxWait: TX_MAX_WAIT_MS,
			timeout: TX_TIMEOUT_MS,
		},
	});

if (!isProduction) {
	globalForPrisma.prisma = prisma;
}
