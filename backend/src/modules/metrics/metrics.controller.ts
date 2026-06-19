import { Request, Response } from 'express';
import { metricsService } from '../../core/metrics/metrics.service';
import { sendSuccess } from '../../utils/response';

/**
 * GET /api/v1/metrics
 * Retreives active system performance metrics.
 * Restricted to authenticated ADMIN users.
 */
export function getMetrics(_req: Request, res: Response): void {
  const stats = metricsService.getMetrics();
  sendSuccess(res, stats, 'System metrics retrieved successfully');
}
