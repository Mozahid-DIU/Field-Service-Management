import Redis from "ioredis";
import { logger } from "../utils/logger";
import { env } from "./env";

const CONNECT_TIMEOUT_MS = 5000;

/** null when REDIS_URL is not configured — callers must degrade gracefully. */
export const redis: Redis | null = env.REDIS_URL
	? new Redis(env.REDIS_URL, {
			maxRetriesPerRequest: 1,
			connectTimeout: CONNECT_TIMEOUT_MS,
			lazyConnect: true,
		})
	: null;

redis?.on("error", (error) => {
	logger.warn("Redis error (cache bypassed)", error.message);
});
