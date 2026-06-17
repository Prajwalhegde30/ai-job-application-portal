import { Request, Response, NextFunction } from 'express';
import * as jobsService from './jobs.service';
import { sendSuccess, sendError } from '../../utils/response';
import { listJobsQuerySchema } from './jobs.validators';
import { JobRow, AdminJobRow } from './jobs.types';

/**
 * Map a database job row (snake_case) to a camelCase API response object.
 */
function mapJobToResponse(job: JobRow | AdminJobRow) {
  return {
    id: job.id,
    postedBy: job.posted_by,
    title: job.title,
    company: job.company,
    description: job.description,
    requirements: job.requirements,
    responsibilities: job.responsibilities,
    location: job.location,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    jobType: job.job_type,
    status: job.status,
    slug: job.slug,
    isFeatured: job.is_featured,
    publishedAt: job.published_at,
    closedAt: job.closed_at,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    ...('application_count' in job
      ? { applicationCount: (job as AdminJobRow).application_count }
      : {}),
  };
}

// =============================================================================
// POST /api/v1/jobs — Create a new job
// =============================================================================

export async function createJob(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const job = await jobsService.createJob(req.user!.userId, req.body);
    sendSuccess(
      res,
      { job: mapJobToResponse(job) },
      'Job created successfully',
      201
    );
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// PUT /api/v1/jobs/:jobId — Update an existing job
// =============================================================================

export async function updateJob(
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

    const job = await jobsService.updateJob(jobId, req.user!.userId, req.body);
    sendSuccess(
      res,
      { job: mapJobToResponse(job) },
      'Job updated successfully'
    );
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// DELETE /api/v1/jobs/:jobId — Soft-delete a job
// =============================================================================

export async function deleteJob(
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

    await jobsService.deleteJob(jobId, req.user!.userId);
    sendSuccess(res, null, 'Job deleted successfully');
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// PATCH /api/v1/jobs/:jobId/publish — Publish a draft job
// =============================================================================

export async function publishJob(
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

    const job = await jobsService.publishJob(jobId, req.user!.userId);
    sendSuccess(
      res,
      { job: mapJobToResponse(job) },
      'Job published successfully'
    );
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// PATCH /api/v1/jobs/:jobId/close — Close a published job
// =============================================================================

export async function closeJob(
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

    const job = await jobsService.closeJob(jobId, req.user!.userId);
    sendSuccess(res, { job: mapJobToResponse(job) }, 'Job closed successfully');
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// GET /api/v1/jobs/:jobId — Get job details (UUID or slug)
// =============================================================================

export async function getJobDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const jobId = req.params.jobId as string;
    let job: JobRow;

    if (isValidUUID(jobId)) {
      job = await jobsService.getJobById(jobId, req.user!.role);
    } else {
      // Treat as slug
      job = await jobsService.getJobBySlug(jobId);
    }

    sendSuccess(res, { job: mapJobToResponse(job) });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// GET /api/v1/jobs — List published jobs (public)
// =============================================================================

export async function listJobsPublic(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const queryParams = listJobsQuerySchema.parse(req.query);

    const result = await jobsService.listJobs(
      {
        search: queryParams.search,
        jobType: queryParams.jobType,
        location: queryParams.location,
      },
      {
        page: queryParams.page,
        limit: queryParams.limit,
      }
    );

    sendSuccess(
      res,
      { jobs: result.items.map(mapJobToResponse) },
      undefined,
      200,
      {
        page: result.currentPage,
        limit: queryParams.limit,
        total: result.totalCount,
      }
    );
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// GET /api/v1/jobs/admin/list — List admin's own jobs
// =============================================================================

export async function listJobsAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const queryParams = listJobsQuerySchema.parse(req.query);

    const result = await jobsService.listAdminJobs(
      req.user!.userId,
      {
        search: queryParams.search,
        jobType: queryParams.jobType,
        status: req.query.status as string | undefined,
      },
      {
        page: queryParams.page,
        limit: queryParams.limit,
      }
    );

    sendSuccess(
      res,
      { jobs: result.items.map(mapJobToResponse) },
      undefined,
      200,
      {
        page: result.currentPage,
        limit: queryParams.limit,
        total: result.totalCount,
      }
    );
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// UTIL
// =============================================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}
