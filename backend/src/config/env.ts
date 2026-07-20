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
    JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
    JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
    AI_PROVIDER: z
      .enum(['mock', 'openai', 'gemini', 'openrouter'])
      .default('mock'),
    OPENAI_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    /**
     * OpenRouter API key — required when AI_PROVIDER=openrouter.
     * Obtain from https://openrouter.ai/keys
     */
    OPENROUTER_API_KEY: z.string().optional(),
    /**
     * OpenRouter model slug (default: openai/gpt-4o-mini-high:free).
     * Any model listed on https://openrouter.ai/models is valid.
     */
    OPENROUTER_MODEL: z.string().optional(),
    /**
     * OpenRouter base URL — override only when using a proxy.
     * Default: https://openrouter.ai/api/v1
     */
    OPENROUTER_BASE_URL: z.string().optional(),
    SUPABASE_URL: z.string().optional(),
    SUPABASE_SERVICE_KEY: z.string().optional(),
    SUPABASE_BUCKET: z.string().default('resumes'),
    FRONTEND_URL: z.string().default('http://localhost:3000'),
    BACKEND_URL: z.string().default('http://localhost:8080'),

    // Configurable rate limits
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // default 15 minutes
    RATE_LIMIT_MAX_AUTH: z.coerce.number().default(20),
    RATE_LIMIT_MAX_AI_ANALYSIS: z.coerce.number().default(10),
    RATE_LIMIT_MAX_CAREER_ADVICE: z.coerce.number().default(15),
    RATE_LIMIT_MAX_MATCH_ANALYSIS: z.coerce.number().default(20),
    RATE_LIMIT_MAX_NOTIFICATIONS: z.coerce.number().default(100),
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
  )
  .refine(
    (data) => {
      // Fail fast on missing API key if specific AI provider is selected
      if (data.NODE_ENV !== 'test') {
        if (data.AI_PROVIDER === 'openai' && !data.OPENAI_API_KEY) return false;
        if (data.AI_PROVIDER === 'gemini' && !data.GEMINI_API_KEY) return false;
        if (data.AI_PROVIDER === 'openrouter' && !data.OPENROUTER_API_KEY)
          return false;
      }
      return true;
    },
    {
      message: 'API key is required for the selected AI_PROVIDER',
      path: ['AI_PROVIDER'],
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
