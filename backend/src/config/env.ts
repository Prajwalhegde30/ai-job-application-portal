import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Zod schema for environment variable validation.
 * Application fails fast on startup if required vars are missing.
 */
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().default(8080),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    REFRESH_TOKEN_SECRET: z.string().min(1, 'REFRESH_TOKEN_SECRET is required'),
    OPENAI_API_KEY: z.string().optional(),
    SUPABASE_URL: z.string().optional(),
    SUPABASE_SERVICE_KEY: z.string().optional(),
    SUPABASE_BUCKET: z.string().default('resumes'),
    ALLOWED_ORIGIN: z.string().default('http://localhost:3000'),
  })
  .refine(
    (data) => {
      // Require Supabase storage variables in development and production
      if (data.NODE_ENV !== 'test') {
        return !!data.SUPABASE_URL && !!data.SUPABASE_SERVICE_KEY;
      }
      return true;
    },
    {
      message:
        'SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required in non-test modes.',
      path: ['SUPABASE_URL'],
    }
  );

/**
 * Validated environment configuration.
 * Throws at import time if validation fails (fail-fast).
 */
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    '❌ Invalid environment variables:',
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = parsed.data;
