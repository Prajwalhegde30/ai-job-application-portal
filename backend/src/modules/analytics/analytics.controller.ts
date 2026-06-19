import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import * as analyticsService from './analytics.service';
import { sendSuccess, sendError } from '../../utils/response';
import { applicationTrendQuerySchema } from './analytics.validators';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export async function getSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const summary = await analyticsService.getDashboardSummary(
      req.user!.userId
    );
    sendSuccess(res, { summary });
  } catch (err) {
    next(err);
  }
}

export async function getApplicationTrends(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsedQuery = applicationTrendQuerySchema.parse(req.query);
    const trends = await analyticsService.getApplicationTrends(
      req.user!.userId,
      parsedQuery.range
    );
    sendSuccess(res, { trends });
  } catch (err) {
    if (err instanceof ZodError) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid analytics range');
      return;
    }
    next(err);
  }
}

export async function getHiringFunnel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const funnel = await analyticsService.getHiringFunnel(req.user!.userId);
    sendSuccess(res, { funnel });
  } catch (err) {
    next(err);
  }
}

export async function getTopJobs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const jobs = await analyticsService.getTopJobs(req.user!.userId);
    sendSuccess(res, { jobs });
  } catch (err) {
    next(err);
  }
}

export async function getJobPerformance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const jobId = req.params.jobId as string;
    if (!isValidUUID(jobId)) {
      sendError(res, 400, 'INVALID_JOB_ID', 'Invalid job ID format');
      return;
    }

    const performance = await analyticsService.getJobPerformance(
      req.user!.userId,
      jobId
    );
    sendSuccess(res, { performance });
  } catch (err) {
    next(err);
  }
}

export async function getRecentApplications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const applications = await analyticsService.getRecentApplications(
      req.user!.userId
    );
    sendSuccess(res, { applications });
  } catch (err) {
    next(err);
  }
}
