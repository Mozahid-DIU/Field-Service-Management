import 'dotenv/config';
import { z } from 'zod';

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(14).default(10),

  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: optionalString,

  GOOGLE_CLIENT_ID: optionalString,

  BKASH_BASE_URL: z.string().url().default('https://tokenized.sandbox.bka.sh/v1.2.0-beta'),
  BKASH_USERNAME: optionalString,
  BKASH_PASSWORD: optionalString,
  BKASH_APP_KEY: optionalString,
  BKASH_APP_SECRET: optionalString,
  BKASH_CALLBACK_URL: optionalString,

  REDIS_URL: optionalString,

  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';

export const allowedOrigins = [env.FRONTEND_URL, ...(env.CORS_ORIGINS?.split(',') ?? [])]
  .map((origin) => origin.trim())
  .filter(Boolean);
