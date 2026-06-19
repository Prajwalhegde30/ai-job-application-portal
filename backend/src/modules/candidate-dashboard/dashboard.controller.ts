import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import * as dashboardService from './dashboard.service';

// =============================================================================
// GET /api/v1/dashboard/summary
// =============================================================================

/**
 * Returns aggregated dashboard summary for the authenticated candidate.
 * Includes profile completion, application counts, unread notifications, resume info.
 */
export async function getSummary(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const summary = await dashboardService.getDashboardSummary(userId);
  sendSuccess(res, { summary });
}

// =============================================================================
// GET /api/v1/dashboard/application-status
// =============================================================================

/**
 * Returns per-status application counts for the authenticated candidate.
 */
export async function getApplicationStatus(
  req: Request,
  res: Response
): Promise<void> {
  const userId = req.user!.userId;
  const status = await dashboardService.getApplicationStatusOverview(userId);
  sendSuccess(res, { status });
}

// =============================================================================
// GET /api/v1/dashboard/recent-applications
// =============================================================================

/**
 * Returns the 5 most recent applications for the authenticated candidate.
 */
export async function getRecentApplications(
  req: Request,
  res: Response
): Promise<void> {
  const userId = req.user!.userId;
  const applications = await dashboardService.getRecentApplications(userId);
  sendSuccess(res, { applications });
}

// =============================================================================
// GET /api/v1/dashboard/recent-notifications
// =============================================================================

/**
 * Returns the 5 most recent notifications for the authenticated candidate.
 */
export async function getRecentNotifications(
  req: Request,
  res: Response
): Promise<void> {
  const userId = req.user!.userId;
  const notifications = await dashboardService.getRecentNotifications(userId);
  sendSuccess(res, { notifications });
}

// =============================================================================
// GET /api/v1/dashboard/resume-summary
// =============================================================================

/**
 * Returns resume summary for the authenticated candidate.
 */
export async function getResumeSummary(
  req: Request,
  res: Response
): Promise<void> {
  const userId = req.user!.userId;
  const resumeSummary = await dashboardService.getResumeSummary(userId);
  sendSuccess(res, { resumeSummary });
}
