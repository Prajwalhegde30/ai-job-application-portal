import { query, getClient } from '../../config/database';
import { AppError } from '../../utils/appError';
import {
  ApplicationRow,
  ApplicationWithJob,
  ApplicationWithDetails,
  TimelineEventRow,
  PaginationParams,
  ApplicationFilters,
  PaginatedResult,
} from './applications.types';
import {
  ApplyToJobInput,
  UpdateApplicationStatusInput,
} from './applications.validators';
import { eventBus } from '../../core/events/eventBus';
import { EventType } from '../../core/events/eventTypes';

// =============================================================================
// STATUS TRANSITION MAP
// =============================================================================

/**
 * Defines which status transitions are allowed.
 * Key: current status → Value: set of valid next statuses.
 */
const VALID_TRANSITIONS: Record<string, Set<string>> = {
  PENDING: new Set(['REVIEWING', 'WITHDRAWN']),
  REVIEWING: new Set(['SHORTLISTED', 'REJECTED', 'WITHDRAWN']),
  SHORTLISTED: new Set(['HIRED', 'REJECTED']),
  // Terminal statuses — no transitions out
  REJECTED: new Set(),
  HIRED: new Set(),
  WITHDRAWN: new Set(),
};

/**
 * Validate that a status transition is allowed.
 * Throws AppError(400) on invalid transition.
 */
function validateTransition(currentStatus: string, newStatus: string): void {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.has(newStatus)) {
    throw new AppError(
      `Cannot transition from '${currentStatus}' to '${newStatus}'. ` +
        `Allowed transitions from '${currentStatus}': ${
          allowed && allowed.size > 0
            ? Array.from(allowed).join(', ')
            : 'none (terminal status)'
        }`,
      400,
      'INVALID_STATUS_TRANSITION'
    );
  }
}

// =============================================================================
// NOTIFICATION PLACEHOLDERS
// =============================================================================

/**
 * Placeholder: Emit APPLICATION_CREATED notification.
 * Will be implemented in the Notification System phase.
 */
function _emitApplicationCreated(
  applicationId: string,
  userId: string,
  jobId: string
): void {
  eventBus.publish(EventType.APPLICATION_CREATED, {
    applicationId,
    userId,
    jobId,
  });
}

function _emitApplicationWithdrawn(
  applicationId: string,
  userId: string,
  jobId: string
): void {
  eventBus.publish(EventType.APPLICATION_WITHDRAWN, {
    applicationId,
    userId,
    jobId,
  });
}

function _emitApplicationStatusChanged(
  applicationId: string,
  userId: string,
  oldStatus: string,
  newStatus: string,
  performedBy: string,
  actorType: 'USER' | 'ADMIN' | 'SYSTEM'
): void {
  eventBus.publish(EventType.APPLICATION_STATUS_CHANGED, {
    applicationId,
    userId,
    jobId: '', // Resolved downstream by handler
    oldStatus,
    newStatus,
    performedBy,
    actorType,
  });
}

// =============================================================================
// APPLY TO JOB
// =============================================================================

/**
 * Create a new job application with resume snapshot.
 * Uses a transaction to ensure atomicity of:
 *   1. Duplicate check
 *   2. Application creation (with snapshot)
 *   3. Timeline event creation
 *
 * @param userId - ID of the applying user
 * @param data - Application input data (jobId, resumeId, coverLetter)
 * @returns The created application row
 */
export async function applyToJob(
  userId: string,
  data: ApplyToJobInput
): Promise<ApplicationRow> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Verify job exists and is PUBLISHED
    const jobResult = await client.query(
      'SELECT id, status, closed_at FROM jobs WHERE id = $1',
      [data.jobId]
    );

    if (jobResult.rows.length === 0) {
      throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    const job = jobResult.rows[0];

    if (job.status !== 'PUBLISHED') {
      throw new AppError(
        'Applications are only accepted for published jobs',
        400,
        'JOB_NOT_PUBLISHED'
      );
    }

    if (job.closed_at && new Date(job.closed_at) < new Date()) {
      throw new AppError(
        'This job is no longer accepting applications',
        400,
        'JOB_CLOSED'
      );
    }

    // 2. Verify resume belongs to user
    const resumeResult = await client.query(
      'SELECT id, user_id, resume_title, file_name, storage_path FROM resumes WHERE id = $1',
      [data.resumeId]
    );

    if (resumeResult.rows.length === 0) {
      throw new AppError('Resume not found', 404, 'RESUME_NOT_FOUND');
    }

    const resume = resumeResult.rows[0];

    if (resume.user_id !== userId) {
      throw new AppError(
        'You can only apply with your own resumes',
        403,
        'RESUME_OWNERSHIP_DENIED'
      );
    }

    // 3. Check for duplicate application
    const duplicateCheck = await client.query(
      'SELECT id FROM applications WHERE job_id = $1 AND user_id = $2',
      [data.jobId, userId]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new AppError(
        'You have already applied to this job. Only one application per job is allowed.',
        409,
        'DUPLICATE_APPLICATION'
      );
    }

    // 4. Create application with snapshot
    const appResult = await client.query<ApplicationRow>(
      `INSERT INTO applications (
         user_id, job_id, resume_id, cover_letter, status,
         resume_snapshot_title, resume_snapshot_file_name, resume_snapshot_storage_path,
         applied_at
       ) VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, NOW())
       RETURNING *`,
      [
        userId,
        data.jobId,
        data.resumeId,
        data.coverLetter || null,
        resume.resume_title,
        resume.file_name,
        resume.storage_path,
      ]
    );

    const application = appResult.rows[0];

    // 5. Create initial timeline event
    await client.query(
      `INSERT INTO application_timeline (
         application_id, event_type, old_status, new_status, notes, performed_by, actor_type
       ) VALUES ($1, 'APPLICATION_SUBMITTED', NULL, 'PENDING', 'Application submitted', $2, 'USER')`,
      [application.id, userId]
    );

    await client.query('COMMIT');

    // 6. Notification placeholder
    _emitApplicationCreated(application.id, userId, data.jobId);

    return application;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// =============================================================================
// WITHDRAW APPLICATION
// =============================================================================

/**
 * Withdraw a user's application.
 * Only the application owner can withdraw.
 * Cannot withdraw HIRED or REJECTED applications.
 *
 * @param applicationId - ID of the application to withdraw
 * @param userId - ID of the requesting user
 * @returns The updated application row
 */
export async function withdrawApplication(
  applicationId: string,
  userId: string
): Promise<ApplicationRow> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Verify application exists and belongs to user
    const appResult = await client.query<ApplicationRow>(
      'SELECT * FROM applications WHERE id = $1',
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      throw new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }

    const application = appResult.rows[0];

    if (application.user_id !== userId) {
      throw new AppError(
        'You can only withdraw your own applications',
        403,
        'OWNERSHIP_DENIED'
      );
    }

    // 2. Validate transition
    validateTransition(application.status, 'WITHDRAWN');

    // 3. Update status
    const updatedResult = await client.query<ApplicationRow>(
      `UPDATE applications SET status = 'WITHDRAWN', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [applicationId]
    );

    // 4. Create timeline event
    await client.query(
      `INSERT INTO application_timeline (
         application_id, event_type, old_status, new_status, notes, performed_by, actor_type
       ) VALUES ($1, 'APPLICATION_WITHDRAWN', $2, 'WITHDRAWN', 'Application withdrawn by candidate', $3, 'USER')`,
      [applicationId, application.status, userId]
    );

    await client.query('COMMIT');

    // 5. Notification placeholder
    _emitApplicationWithdrawn(applicationId, userId, application.job_id);

    return updatedResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// =============================================================================
// GET MY APPLICATIONS (USER)
// =============================================================================

/**
 * Get paginated list of applications for the authenticated user.
 * Joins with jobs table to include job details.
 *
 * @param userId - ID of the authenticated user
 * @param pagination - Page and limit parameters
 * @returns Paginated list of applications with job details
 */
export async function getMyApplications(
  userId: string,
  pagination: PaginationParams
): Promise<PaginatedResult<ApplicationWithJob>> {
  const offset = (pagination.page - 1) * pagination.limit;

  // Count query
  const countResult = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM applications WHERE user_id = $1',
    [userId]
  );
  const totalCount = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalCount / pagination.limit);

  // Data query with job join
  const dataResult = await query<ApplicationWithJob>(
    `SELECT
       a.*,
       j.title AS job_title,
       j.company AS job_company,
       j.location AS job_location,
       j.job_type AS job_type,
       j.status AS job_status
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.user_id = $1
     ORDER BY a.applied_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, pagination.limit, offset]
  );

  return {
    items: dataResult.rows,
    totalCount,
    totalPages,
    currentPage: pagination.page,
  };
}

// =============================================================================
// GET APPLICATION BY ID
// =============================================================================

/**
 * Get detailed application information.
 * Authorization: owner (USER) or ADMIN who owns the job.
 *
 * @param applicationId - ID of the application
 * @param userId - ID of the requesting user
 * @param userRole - Role of the requesting user
 * @returns Full application details with job and user info
 */
export async function getApplicationById(
  applicationId: string,
  userId: string,
  userRole: string
): Promise<ApplicationWithDetails> {
  const result = await query<ApplicationWithDetails>(
    `SELECT
       a.*,
       j.title AS job_title,
       j.company AS job_company,
       j.location AS job_location,
       j.job_type AS job_type,
       j.status AS job_status,
       j.description AS job_description,
       j.requirements AS job_requirements,
       j.salary_min AS job_salary_min,
       j.salary_max AS job_salary_max,
       j.posted_by AS job_posted_by,
       u.name AS applicant_name,
       u.email AS applicant_email
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN users u ON u.id = a.user_id
     WHERE a.id = $1`,
    [applicationId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  const application = result.rows[0];

  // Authorization check: owner or admin who owns the job
  if (userRole === 'ADMIN') {
    if (application.job_posted_by !== userId) {
      throw new AppError(
        'You can only view applications for jobs you posted',
        403,
        'FORBIDDEN'
      );
    }
  } else {
    if (application.user_id !== userId) {
      throw new AppError(
        'You can only view your own applications',
        403,
        'FORBIDDEN'
      );
    }
  }

  return application;
}

// =============================================================================
// ADMIN: LIST APPLICATIONS
// =============================================================================

/**
 * Get paginated list of applications for admin review.
 * Only returns applications for jobs posted by the requesting admin.
 * Supports search (by candidate name/email) and filters (status, jobId, candidateId).
 *
 * @param adminId - ID of the requesting admin
 * @param filters - Filter parameters
 * @param pagination - Page and limit parameters
 * @returns Paginated list of applications with details
 */
export async function getAdminApplications(
  adminId: string,
  filters: ApplicationFilters,
  pagination: PaginationParams
): Promise<PaginatedResult<ApplicationWithDetails>> {
  // Only show applications for jobs this admin posted
  const whereClauses: string[] = ['j.posted_by = $1'];
  const params: unknown[] = [adminId];
  let paramIndex = 2;

  // Filter by status
  if (filters.status) {
    whereClauses.push(`a.status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  // Filter by jobId
  if (filters.jobId) {
    whereClauses.push(`a.job_id = $${paramIndex}`);
    params.push(filters.jobId);
    paramIndex++;
  }

  // Filter by candidateId
  if (filters.candidateId) {
    whereClauses.push(`a.user_id = $${paramIndex}`);
    params.push(filters.candidateId);
    paramIndex++;
  }

  // Search by candidate name or email
  if (filters.search) {
    whereClauses.push(
      `(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`
    );
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  const whereClause = whereClauses.join(' AND ');
  const offset = (pagination.page - 1) * pagination.limit;

  // Count query
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN users u ON u.id = a.user_id
     WHERE ${whereClause}`,
    params
  );
  const totalCount = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalCount / pagination.limit);

  // Data query
  const dataParams = [...params, pagination.limit, offset];
  const dataResult = await query<ApplicationWithDetails>(
    `SELECT
       a.*,
       j.title AS job_title,
       j.company AS job_company,
       j.location AS job_location,
       j.job_type AS job_type,
       j.status AS job_status,
       j.description AS job_description,
       j.requirements AS job_requirements,
       j.salary_min AS job_salary_min,
       j.salary_max AS job_salary_max,
       j.posted_by AS job_posted_by,
       u.name AS applicant_name,
       u.email AS applicant_email
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN users u ON u.id = a.user_id
     WHERE ${whereClause}
     ORDER BY a.applied_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    dataParams
  );

  return {
    items: dataResult.rows,
    totalCount,
    totalPages,
    currentPage: pagination.page,
  };
}

// =============================================================================
// ADMIN: UPDATE APPLICATION STATUS
// =============================================================================

/**
 * Update application status (admin only, must own the job).
 * Validates the status transition, records review metadata, and creates a timeline event.
 *
 * @param applicationId - ID of the application to update
 * @param adminId - ID of the reviewing admin
 * @param data - New status and optional notes
 * @returns The updated application row
 */
export async function updateApplicationStatus(
  applicationId: string,
  adminId: string,
  data: UpdateApplicationStatusInput
): Promise<ApplicationRow> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Fetch application with job ownership check
    const appResult = await client.query<
      ApplicationRow & { job_posted_by: string; app_user_id: string }
    >(
      `SELECT a.*, j.posted_by AS job_posted_by, a.user_id AS app_user_id
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1`,
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      throw new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }

    const application = appResult.rows[0];

    // 2. Verify admin owns the job this application belongs to
    if (application.job_posted_by !== adminId) {
      throw new AppError(
        'You can only manage applications for jobs you posted',
        403,
        'FORBIDDEN'
      );
    }

    // 3. Validate transition
    const oldStatus = application.status;
    validateTransition(oldStatus, data.status);

    // 4. Update application
    const updateResult = await client.query<ApplicationRow>(
      `UPDATE applications
       SET status = $1, notes = $2, reviewed_at = NOW(), reviewed_by = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [data.status, data.notes || null, adminId, applicationId]
    );

    // 5. Create timeline event
    await client.query(
      `INSERT INTO application_timeline (
         application_id, event_type, old_status, new_status, notes, performed_by, actor_type
       ) VALUES ($1, 'STATUS_CHANGED', $2, $3, $4, $5, 'ADMIN')`,
      [applicationId, oldStatus, data.status, data.notes || null, adminId]
    );

    await client.query('COMMIT');

    // 6. Notification placeholder
    _emitApplicationStatusChanged(
      applicationId,
      application.app_user_id,
      oldStatus,
      data.status,
      adminId,
      'ADMIN'
    );

    return updateResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// =============================================================================
// GET APPLICATION TIMELINE
// =============================================================================

/**
 * Get chronological timeline events for an application.
 * Authorization: application owner (USER) or admin who owns the job.
 *
 * @param applicationId - ID of the application
 * @param userId - ID of the requesting user
 * @param userRole - Role of the requesting user
 * @returns Array of timeline events in chronological order
 */
export async function getApplicationTimeline(
  applicationId: string,
  userId: string,
  userRole: string
): Promise<TimelineEventRow[]> {
  // First verify authorization
  const appResult = await query<{ user_id: string; job_posted_by: string }>(
    `SELECT a.user_id, j.posted_by AS job_posted_by
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.id = $1`,
    [applicationId]
  );

  if (appResult.rows.length === 0) {
    throw new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  const app = appResult.rows[0];

  if (userRole === 'ADMIN') {
    if (app.job_posted_by !== userId) {
      throw new AppError(
        'You can only view timelines for applications on jobs you posted',
        403,
        'FORBIDDEN'
      );
    }
  } else {
    if (app.user_id !== userId) {
      throw new AppError(
        'You can only view your own application timelines',
        403,
        'FORBIDDEN'
      );
    }
  }

  // Fetch timeline with performer name
  const result = await query<TimelineEventRow>(
    `SELECT
       t.*,
       u.name AS performer_name
     FROM application_timeline t
     LEFT JOIN users u ON u.id = t.performed_by
     WHERE t.application_id = $1
     ORDER BY t.created_at ASC`,
    [applicationId]
  );

  return result.rows;
}

// =============================================================================
// CHECK IF USER ALREADY APPLIED
// =============================================================================

/**
 * Check if a user has already applied to a specific job.
 * Used by the frontend to show "Already Applied" badge.
 *
 * @param userId - ID of the user
 * @param jobId - ID of the job
 * @returns The existing application ID or null
 */
export async function getUserApplicationForJob(
  userId: string,
  jobId: string
): Promise<string | null> {
  const result = await query<{ id: string }>(
    'SELECT id FROM applications WHERE user_id = $1 AND job_id = $2',
    [userId, jobId]
  );

  return result.rows.length > 0 ? result.rows[0].id : null;
}
