import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Utility helper to create a rate limiter with standard production configuration.
 * Automatically bypassed in test mode.
 */
function createLimiter(max: number) {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    },
  });
}

/** Rate limiter for /api/v1/auth/* (default: 20 reqs / 15m) */
export const authRateLimit = createLimiter(env.RATE_LIMIT_MAX_AUTH);

/** Rate limiter for /api/v1/ai-analysis/* (default: 10 reqs / 15m) */
export const aiAnalysisRateLimit = createLimiter(
  env.RATE_LIMIT_MAX_AI_ANALYSIS
);

/** Rate limiter for /api/v1/career-advice/* (default: 15 reqs / 15m) */
export const careerAdviceRateLimit = createLimiter(
  env.RATE_LIMIT_MAX_CAREER_ADVICE
);

/** Rate limiter for /api/v1/match-analysis/* (default: 20 reqs / 15m) */
export const matchAnalysisRateLimit = createLimiter(
  env.RATE_LIMIT_MAX_MATCH_ANALYSIS
);

/** Rate limiter for /api/v1/notifications/* (default: 100 reqs / 15m) */
export const notificationsRateLimit = createLimiter(
  env.RATE_LIMIT_MAX_NOTIFICATIONS
);
