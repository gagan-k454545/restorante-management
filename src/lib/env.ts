import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().min(1).default('postgres://postgres:postgres@localhost:5432/qr_ordering'),
  AUTH_SECRET: z.string().min(32).default('secret-auth-key-32-characters-minimum-required!'),
  DEVICE_COOKIE_SECRET: z.string().min(32).default('secret-cookie-key-32-chars-minimum-required!'),
  DEFAULT_TIMEZONE: z.string().default('Asia/Kolkata'),
  USE_PGLITE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  ENABLE_DEMO_SEED: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  LOG_LEVEL: process.env.LOG_LEVEL,
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  DEVICE_COOKIE_SECRET: process.env.DEVICE_COOKIE_SECRET,
  DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE,
  USE_PGLITE: process.env.USE_PGLITE,
  ENABLE_DEMO_SEED: process.env.ENABLE_DEMO_SEED,
});
