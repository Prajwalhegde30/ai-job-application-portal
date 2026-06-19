import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { metricsService } from '../core/metrics/metrics.service';

/**
 * Recursively scans and masks sensitive data keys from logged request payloads.
 * Implemented strictly without 'any' types to ensure full compliance.
 */
function maskSecrets(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSecrets(item));
  }

  const masked: Record<string, unknown> = {
    ...(obj as Record<string, unknown>),
  };
  const sensitiveKeys = [
    'password',
    'token',
    'accesstoken',
    'refreshtoken',
    'authorization',
    'cookie',
    'secret',
    'key',
  ];

  for (const key of Object.keys(masked)) {
    const value = masked[key];
    if (sensitiveKeys.includes(key.toLowerCase())) {
      masked[key] = '******';
    } else if (value && typeof value === 'object') {
      masked[key] = maskSecrets(value);
    }
  }

  return masked;
}

/**
 * Production-grade request logger middleware.
 * - Captures request details and log levels dynamically (info, warn, error)
 * - Tracks API performance and error counts inside MetricsService
 * - Shields authorization details and user passwords from logs
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const isHealthCheck =
    req.originalUrl.includes('/health') ||
    req.originalUrl.includes('/ready') ||
    req.originalUrl.includes('/live') ||
    req.originalUrl.includes('/metrics');

  // Track the request in metrics
  metricsService.incrementRequestCount();
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    metricsService.recordResponseTime(duration);

    if (res.statusCode >= 400) {
      metricsService.incrementErrorCount();
    }

    // Only log actual application traffic to prevent health check clutter
    if (!isHealthCheck) {
      const logPayload = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        query: maskSecrets(req.query),
        body: req.method !== 'GET' ? maskSecrets(req.body) : undefined,
      };

      if (res.statusCode >= 500) {
        logger.error(
          `🔥 ${req.method} ${req.originalUrl} failed with status ${res.statusCode}`,
          logPayload
        );
      } else if (res.statusCode >= 400) {
        logger.warn(
          `⚠️ ${req.method} ${req.originalUrl} completed with status ${res.statusCode}`,
          logPayload
        );
      } else {
        logger.info(
          `✨ ${req.method} ${req.originalUrl} completed with status ${res.statusCode}`,
          logPayload
        );
      }
    }
  });

  next();
}
export default requestLogger;
