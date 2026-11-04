import { redis } from "../config/redis";
import { logger } from "./logger";

const KEY_PREFIX = "fixflow:";

export const CacheKeys = {
	categories: `${KEY_PREFIX}categories:active`,
	dashboardStats: `${KEY_PREFIX}admin:dashboard-stats`,
	bkashToken: `${KEY_PREFIX}bkash:id-token`,
} as const;

async function get<T>(key: string): Promise<T | null> {
	if (!redis) return null;
	try {
		const raw = await redis.get(key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch (error) {
		logger.warn(`Cache read failed for ${key}`, error);
		return null;
	}
}

async function set(
	key: string,
	value: unknown,
	ttlSeconds: number,
): Promise<void> {
	if (!redis) return;
	try {
		await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
	} catch (error) {
		logger.warn(`Cache write failed for ${key}`, error);
	}
}

async function del(...keys: string[]): Promise<void> {
	if (!redis || keys.length === 0) return;
	try {
		await redis.del(...keys);
	} catch (error) {
		logger.warn(`Cache delete failed for ${keys.join(",")}`, error);
	}
}

/** Read-through cache: returns cached value or computes, stores and returns it. */
async function remember<T>(
	key: string,
	ttlSeconds: number,
	compute: () => Promise<T>,
): Promise<T> {
	const cached = await get<T>(key);
	if (cached !== null) return cached;
	const fresh = await compute();
	await set(key, fresh, ttlSeconds);
	return fresh;
}

export const cache = { get, set, del, remember };
