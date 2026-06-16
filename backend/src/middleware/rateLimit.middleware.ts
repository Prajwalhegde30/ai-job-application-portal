import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints.
 * FR-AUTH-09: Max 10 requests per minute per IP on /api/v1/auth/* routes.
 */
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
});
