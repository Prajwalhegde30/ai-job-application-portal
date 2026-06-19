import { Request, Response, NextFunction } from 'express';
import * as applicationsService from './applications.service';
import { sendSuccess, sendError } from '../../utils/response';
import { listApplicationsQuerySchema } from './applications.validators';
import {
  ApplicationRow,
  ApplicationWithJob,
  ApplicationWithDetails,
  TimelineEventRow,
} from './applications.types';

// =============================================================================
// UTIL
// =============================================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

// =============================================================================
// RESPONSE MAPPERS
// =============================================================================

/**
 * Map a database application row (snake_case) to a camelCase API response object.
 */
function mapApplicationToResponse(app: ApplicationRow) {
  return {
    id: app.id,
    jobId: app.job_id,
    userId: app.user_id,
    resumeId: app.resume_id,
    coverLetter: app.cover_letter,
    status: app.status,
    aiMatchScore: app.ai_match_score,
    resumeSnapshotTitle: app.resume_snapshot_title,
    resumeSnapshotFileName: app.resume_snapshot_file_name,
    resumeSnapshotStoragePath: app.resume_snapshot_storage_path,
    reviewedAt: app.reviewed_at,
    reviewedBy: app.reviewed_by,
    notes: app.notes,
    appliedAt: app.applied_at,
    createdAt: app.created_at,
    updatedAt: app.updated_at,
  };
}

/**
 * Map an application-with-job row to a camelCase API response.
 */
function mapApplicationWithJobToResponse(app: ApplicationWithJob) {
  return {
    ...mapApplicationToResponse(app),
    job: {
      title: app.job_title,
      company: app.job_company,
      location: app.job_location,
      jobType: app.job_type,
      status: app.job_status,
    },
  };
}

/**
 * Map an application-with-details row to a full camelCase API response.
 */
function mapApplicationWithDetailsToResponse(app: ApplicationWithDetails) {
  return {
    ...mapApplicationToResponse(app),
    job: {
      title: app.job_title,
      company: app.job_company,
      location: app.job_location,
      jobType: app.job_type,
      status: app.job_status,
      description: app.job_description,
      requirements: app.job_requirements,
      salaryMin: app.job_salary_min,
      salaryMax: app.job_salary_max,
      postedBy: app.job_posted_by,
    },
    applicant: {
      name: app.applicant_name,
      email: app.applicant_email,
    },
  };
}

/**
 * Map a timeline event row to a camelCase API response.
 */
function mapTimelineEventToResponse(event: TimelineEventRow) {
  return {
    id: event.id,
    applicationId: event.application_id,
    eventType: event.event_type,
    oldStatus: event.old_status,
    newStatus: event.new_status,
    notes: event.notes,
    performedBy: event.performed_by,
    actorType: event.actor_type,
    performerName: event.performer_name || null,
    createdAt: event.created_at,
  };
}

// =============================================================================
// POST /api/v1/applications — Apply to a job
// =============================================================================

export async function apply(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const application = await applicationsService.applyToJob(
      req.user!.userId,
      req.body
    );
    sendSuccess(
      res,
      { application: mapApplicationToResponse(application) },
      'Application submitted successfully',
      201
    );
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// PATCH /api/v1/applications/:applicationId/withdraw — Withdraw application
// =============================================================================

export async function withdraw(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const applicationId = req.params.applicationId as string;
    if (!isValidUUID(applicationId)) {
      sendError(
        res,
        400,
        'INVALID_APPLICATION_ID',
        'Invalid application ID format'
      );
      return;
    }

    const application = await applicationsService.withdrawApplication(
      applicationId,
      req.user!.userId
    );
    sendSuccess(
      res,
      { application: mapApplicationToResponse(application) },
      'Application withdrawn successfully'
    );
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// GET /api/v1/applications/my — User's applications
// =============================================================================

export async function getMyApplications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const queryParams = listApplicationsQuerySchema.parse(req.query);

    const result = await applicationsService.getMyApplications(
      req.user!.userId,
      {
        page: queryParams.page,
        limit: queryParams.limit,
      }
    );

    sendSuccess(
      res,
      { applications: result.items.map(mapApplicationWithJobToResponse) },
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
// GET /api/v1/applications/:applicationId — Application details
// =============================================================================

export async function getApplicationDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const applicationId = req.params.applicationId as string;
    if (!isValidUUID(applicationId)) {
      sendError(
        res,
        400,
        'INVALID_APPLICATION_ID',
        'Invalid application ID format'
      );
      return;
    }

    const application = await applicationsService.getApplicationById(
      applicationId,
      req.user!.userId,
      req.user!.role
    );

    sendSuccess(res, {
      application: mapApplicationWithDetailsToResponse(application),
    });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// GET /api/v1/applications/:applicationId/timeline — Timeline events
// =============================================================================

export async function getTimeline(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const applicationId = req.params.applicationId as string;
    if (!isValidUUID(applicationId)) {
      sendError(
        res,
        400,
        'INVALID_APPLICATION_ID',
        'Invalid application ID format'
      );
      return;
    }

    const events = await applicationsService.getApplicationTimeline(
      applicationId,
      req.user!.userId,
      req.user!.role
    );

    sendSuccess(res, {
      timeline: events.map(mapTimelineEventToResponse),
    });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// GET /api/v1/admin/applications — Admin application list
// =============================================================================

export async function getAdminApplications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const queryParams = listApplicationsQuerySchema.parse(req.query);

    const result = await applicationsService.getAdminApplications(
      req.user!.userId,
      {
        status: queryParams.status,
        jobId: queryParams.jobId,
        candidateId: queryParams.candidateId,
        search: queryParams.search,
      },
      {
        page: queryParams.page,
        limit: queryParams.limit,
      }
    );

    sendSuccess(
      res,
      {
        applications: result.items.map(mapApplicationWithDetailsToResponse),
      },
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
// PATCH /api/v1/admin/applications/:applicationId/status — Update status
// =============================================================================

export async function updateStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const applicationId = req.params.applicationId as string;
    if (!isValidUUID(applicationId)) {
      sendError(
        res,
        400,
        'INVALID_APPLICATION_ID',
        'Invalid application ID format'
      );
      return;
    }

    const application = await applicationsService.updateApplicationStatus(
      applicationId,
      req.user!.userId,
      req.body
    );

    sendSuccess(
      res,
      { application: mapApplicationToResponse(application) },
      'Application status updated successfully'
    );
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// GET /api/v1/applications/check/:jobId — Check if already applied
// =============================================================================

export async function checkApplication(
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

    const applicationId = await applicationsService.getUserApplicationForJob(
      req.user!.userId,
      jobId
    );

    sendSuccess(res, {
      hasApplied: applicationId !== null,
      applicationId,
    });
  } catch (err) {
    next(err);
  }
}
