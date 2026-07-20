import { query } from '../../config/database';
import { AppError } from '../../utils/appError';
import {
  JobRow,
  AdminJobRow,
  PaginationParams,
  JobFilters,
  PaginatedResult,
} from './jobs.types';
import { CreateJobInput, UpdateJobInput } from './jobs.validators';
import { eventBus } from '../../core/events/eventBus';
import { EventType } from '../../core/events/eventTypes';

/**
 * Generate a URL-friendly slug from job title and location.
 * Example: "Senior Data Analyst", "Bangalore" → "senior-data-analyst-bangalore"
 * Appends a short random suffix to ensure uniqueness.
 */
function generateSlug(title: string, location: string): string {
  const base = `${title}-${location}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 450); // Leave room for suffix

  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

/**
 * Map camelCase input fields to snake_case database columns.
 */
const FIELD_MAP: Record<string, string> = {
  title: 'title',
  company: 'company',
  description: 'description',
  requirements: 'requirements',
  responsibilities: 'responsibilities',
  location: 'location',
  salaryMin: 'salary_min',
  salaryMax: 'salary_max',
  jobType: 'job_type',
  status: 'status',
  isFeatured: 'is_featured',
};

// =============================================================================
// CREATE
// =============================================================================

/**
 * Create a new job posting.
 * Generates a slug automatically from title + location.
 * Status defaults to DRAFT if not provided.
 */
export async function createJob(
  adminId: string,
  data: CreateJobInput
): Promise<JobRow> {
  const slug = generateSlug(data.title, data.location);

  const result = await query<JobRow>(
    `INSERT INTO jobs (
       posted_by, title, company, description, requirements, responsibilities,
       location, salary_min, salary_max, job_type, status, slug, is_featured
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      adminId,
      data.title,
      data.company,
      data.description,
      data.requirements,
      data.responsibilities || null,
      data.location,
      data.salaryMin ?? null,
      data.salaryMax ?? null,
      data.jobType,
      data.status || 'DRAFT',
      slug,
      data.isFeatured || false,
    ]
  );

  const job = result.rows[0];

  // If created directly as PUBLISHED, set published_at
  if (job.status === 'PUBLISHED') {
    const updated = await query<JobRow>(
      `UPDATE jobs SET published_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [job.id]
    );
    const published = updated.rows[0];
    eventBus.publish(EventType.JOB_PUBLISHED, { jobId: published.id });
    return published;
  }

  return job;
}

// =============================================================================
// UPDATE
// =============================================================================

/**
 * Update an existing job posting.
 * Only the job owner (admin who created it) can update.
 * Regenerates slug if title or location changes.
 */
export async function updateJob(
  jobId: string,
  adminId: string,
  data: UpdateJobInput
): Promise<JobRow> {
  // Verify ownership
  const existing = await query<JobRow>('SELECT * FROM jobs WHERE id = $1', [
    jobId,
  ]);

  if (existing.rows.length === 0) {
    throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
  }

  if (existing.rows[0].posted_by !== adminId) {
    throw new AppError('You can only edit jobs you created', 403, 'FORBIDDEN');
  }

  const job = existing.rows[0];

  // Build dynamic SET clause
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [camelKey, value] of Object.entries(data)) {
    if (value !== undefined && FIELD_MAP[camelKey]) {
      setClauses.push(`${FIELD_MAP[camelKey]} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  // Regenerate slug if title or location changed
  const newTitle = data.title ?? job.title;
  const newLocation = data.location ?? job.location;
  if (data.title !== undefined || data.location !== undefined) {
    const newSlug = generateSlug(newTitle, newLocation);
    setClauses.push(`slug = $${paramIndex}`);
    params.push(newSlug);
    paramIndex++;
  }

  // Always update updated_at
  setClauses.push(`updated_at = NOW()`);

  if (setClauses.length === 1) {
    // Only updated_at — nothing to change
    return job;
  }

  params.push(jobId);

  const updateSql = `
    UPDATE jobs
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query<JobRow>(updateSql, params);
  return result.rows[0];
}

// =============================================================================
// DELETE (Soft delete — set status to CLOSED)
// =============================================================================

/**
 * Soft-delete a job by setting status to CLOSED and closed_at to NOW().
 * Only the job owner can delete.
 */
export async function deleteJob(jobId: string, adminId: string): Promise<void> {
  const existing = await query<JobRow>(
    'SELECT id, posted_by FROM jobs WHERE id = $1',
    [jobId]
  );

  if (existing.rows.length === 0) {
    throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
  }

  if (existing.rows[0].posted_by !== adminId) {
    throw new AppError(
      'You can only delete jobs you created',
      403,
      'FORBIDDEN'
    );
  }

  await query(
    `UPDATE jobs SET status = 'CLOSED', closed_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [jobId]
  );
}

// =============================================================================
// PUBLISH — DRAFT → PUBLISHED
// =============================================================================

/**
 * Transition job status from DRAFT to PUBLISHED.
 * Sets published_at to NOW().
 */
export async function publishJob(
  jobId: string,
  adminId: string
): Promise<JobRow> {
  const existing = await query<JobRow>('SELECT * FROM jobs WHERE id = $1', [
    jobId,
  ]);

  if (existing.rows.length === 0) {
    throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
  }

  if (existing.rows[0].posted_by !== adminId) {
    throw new AppError(
      'You can only publish jobs you created',
      403,
      'FORBIDDEN'
    );
  }

  if (
    existing.rows[0].status !== 'DRAFT' &&
    existing.rows[0].status !== 'CLOSED'
  ) {
    throw new AppError(
      `Cannot publish a job with status '${existing.rows[0].status}'. Only DRAFT or CLOSED jobs can be published.`,
      400,
      'INVALID_STATUS_TRANSITION'
    );
  }

  const result = await query<JobRow>(
    `UPDATE jobs SET status = 'PUBLISHED', published_at = NOW(), closed_at = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [jobId]
  );

  const published = result.rows[0];
  eventBus.publish(EventType.JOB_PUBLISHED, { jobId: published.id });
  return published;
}

// =============================================================================
// CLOSE — PUBLISHED → CLOSED
// =============================================================================

/**
 * Transition job status from PUBLISHED to CLOSED.
 * Sets closed_at to NOW().
 */
export async function closeJob(
  jobId: string,
  adminId: string
): Promise<JobRow> {
  const existing = await query<JobRow>('SELECT * FROM jobs WHERE id = $1', [
    jobId,
  ]);

  if (existing.rows.length === 0) {
    throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
  }

  if (existing.rows[0].posted_by !== adminId) {
    throw new AppError('You can only close jobs you created', 403, 'FORBIDDEN');
  }

  if (existing.rows[0].status !== 'PUBLISHED') {
    throw new AppError(
      `Cannot close a job with status '${existing.rows[0].status}'. Only PUBLISHED jobs can be closed.`,
      400,
      'INVALID_STATUS_TRANSITION'
    );
  }

  const result = await query<JobRow>(
    `UPDATE jobs SET status = 'CLOSED', closed_at = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [jobId]
  );

  return result.rows[0];
}

// =============================================================================
// GET BY ID
// =============================================================================

/**
 * Get a single job by ID.
 * Public users (USER role) can only see PUBLISHED jobs.
 * Admins can view any status.
 */
export async function getJobById(
  jobId: string,
  userRole: string
): Promise<JobRow> {
  const result = await query<JobRow>('SELECT * FROM jobs WHERE id = $1', [
    jobId,
  ]);

  if (result.rows.length === 0) {
    throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
  }

  const job = result.rows[0];

  // Non-admin users can only see published jobs
  if (userRole !== 'ADMIN' && job.status !== 'PUBLISHED') {
    throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
  }

  return job;
}

/**
 * Get a single job by its slug.
 * Only returns PUBLISHED jobs (for public consumption).
 */
export async function getJobBySlug(slug: string): Promise<JobRow> {
  const result = await query<JobRow>(
    'SELECT * FROM jobs WHERE slug = $1 AND status = $2',
    [slug, 'PUBLISHED']
  );

  if (result.rows.length === 0) {
    throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
  }

  return result.rows[0];
}

// =============================================================================
// LIST — Public (PUBLISHED only)
// =============================================================================

/**
 * List published jobs with optional search, filters, and pagination.
 * Search is case-insensitive across title, company, description, location.
 */
export async function listJobs(
  filters: JobFilters,
  pagination: PaginationParams
): Promise<PaginatedResult<JobRow>> {
  const whereClauses: string[] = ["status = 'PUBLISHED'"];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Search across multiple fields
  if (filters.search) {
    whereClauses.push(
      `(title ILIKE $${paramIndex} OR company ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR location ILIKE $${paramIndex})`
    );
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Filter by job type
  if (filters.jobType) {
    whereClauses.push(`job_type = $${paramIndex}`);
    params.push(filters.jobType);
    paramIndex++;
  }

  // Filter by location (case-insensitive partial match)
  if (filters.location) {
    whereClauses.push(`location ILIKE $${paramIndex}`);
    params.push(`%${filters.location}%`);
    paramIndex++;
  }

  const whereClause = whereClauses.join(' AND ');
  const offset = (pagination.page - 1) * pagination.limit;

  // Count query
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM jobs WHERE ${whereClause}`,
    params
  );
  const totalCount = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalCount / pagination.limit);

  // Data query with pagination
  const dataParams = [...params, pagination.limit, offset];
  const dataResult = await query<JobRow>(
    `SELECT * FROM jobs WHERE ${whereClause}
     ORDER BY is_featured DESC, created_at DESC
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
// LIST — Admin (own jobs only)
// =============================================================================

/**
 * List jobs posted by a specific admin with application counts.
 * Returns all statuses (DRAFT, PUBLISHED, CLOSED).
 */
export async function listAdminJobs(
  adminId: string,
  filters: JobFilters,
  pagination: PaginationParams
): Promise<PaginatedResult<AdminJobRow>> {
  const whereClauses: string[] = ['j.posted_by = $1'];
  const params: unknown[] = [adminId];
  let paramIndex = 2;

  // Search across multiple fields
  if (filters.search) {
    whereClauses.push(
      `(j.title ILIKE $${paramIndex} OR j.company ILIKE $${paramIndex} OR j.location ILIKE $${paramIndex})`
    );
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Filter by status
  if (filters.status) {
    whereClauses.push(`j.status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  // Filter by job type
  if (filters.jobType) {
    whereClauses.push(`j.job_type = $${paramIndex}`);
    params.push(filters.jobType);
    paramIndex++;
  }

  const whereClause = whereClauses.join(' AND ');
  const offset = (pagination.page - 1) * pagination.limit;

  // Count query
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM jobs j WHERE ${whereClause}`,
    params
  );
  const totalCount = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalCount / pagination.limit);

  // Data query with application counts
  const dataParams = [...params, pagination.limit, offset];
  const dataResult = await query<AdminJobRow>(
    `SELECT j.*,
            COALESCE(
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id),
              0
            )::int AS application_count
     FROM jobs j
     WHERE ${whereClause}
     ORDER BY j.created_at DESC
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
