import { query } from '../../config/database';
import { AppError } from '../../utils/appError';
import {
  AnalyticsRange,
  ApplicationTrendPoint,
  DashboardSummary,
  HiringFunnel,
  JobPerformance,
  RecentApplication,
  TopJob,
} from './analytics.types';

function toInt(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : parseInt(value, 10);
}

function toFloat(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : parseFloat(value);
}

const RANGE_TO_DAYS: Record<AnalyticsRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export async function getDashboardSummary(
  recruiterId: string
): Promise<DashboardSummary> {
  const result = await query<{
    total_jobs: string;
    draft_jobs: string;
    published_jobs: string;
    closed_jobs: string;
    total_applications: string;
    reviewing_applications: string;
    shortlisted_applications: string;
    hired_applications: string;
    rejected_applications: string;
    unread_notifications: string;
  }>(
    `WITH owned_jobs AS (
       SELECT id, status
       FROM jobs
       WHERE posted_by = $1
     ),
     owned_applications AS (
       SELECT a.id, a.status
       FROM applications a
       JOIN owned_jobs j ON j.id = a.job_id
     )
     SELECT
       (SELECT COUNT(*) FROM owned_jobs)::int AS total_jobs,
       (SELECT COUNT(*) FILTER (WHERE status = 'DRAFT') FROM owned_jobs)::int AS draft_jobs,
       (SELECT COUNT(*) FILTER (WHERE status = 'PUBLISHED') FROM owned_jobs)::int AS published_jobs,
       (SELECT COUNT(*) FILTER (WHERE status = 'CLOSED') FROM owned_jobs)::int AS closed_jobs,
       (SELECT COUNT(*) FROM owned_applications)::int AS total_applications,
       (SELECT COUNT(*) FILTER (WHERE status = 'REVIEWING') FROM owned_applications)::int AS reviewing_applications,
       (SELECT COUNT(*) FILTER (WHERE status = 'SHORTLISTED') FROM owned_applications)::int AS shortlisted_applications,
       (SELECT COUNT(*) FILTER (WHERE status = 'HIRED') FROM owned_applications)::int AS hired_applications,
       (SELECT COUNT(*) FILTER (WHERE status = 'REJECTED') FROM owned_applications)::int AS rejected_applications,
       (SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE)::int AS unread_notifications`,
    [recruiterId]
  );

  const row = result.rows[0];
  return {
    totalJobs: toInt(row.total_jobs),
    draftJobs: toInt(row.draft_jobs),
    publishedJobs: toInt(row.published_jobs),
    closedJobs: toInt(row.closed_jobs),
    totalApplications: toInt(row.total_applications),
    reviewingApplications: toInt(row.reviewing_applications),
    shortlistedApplications: toInt(row.shortlisted_applications),
    hiredApplications: toInt(row.hired_applications),
    rejectedApplications: toInt(row.rejected_applications),
    unreadNotifications: toInt(row.unread_notifications),
  };
}

export async function getApplicationTrends(
  recruiterId: string,
  range: AnalyticsRange
): Promise<ApplicationTrendPoint[]> {
  const days = RANGE_TO_DAYS[range];
  const result = await query<{ date: string; applications: string }>(
    `WITH day_series AS (
       SELECT generate_series(
         CURRENT_DATE - ($2::int - 1),
         CURRENT_DATE,
         INTERVAL '1 day'
       )::date AS day
     ),
     owned_application_counts AS (
       SELECT a.applied_at::date AS day, COUNT(*)::int AS applications
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.posted_by = $1
         AND a.applied_at >= CURRENT_DATE - ($2::int - 1)
       GROUP BY a.applied_at::date
     )
     SELECT
       to_char(ds.day, 'YYYY-MM-DD') AS date,
       COALESCE(oac.applications, 0)::int AS applications
     FROM day_series ds
     LEFT JOIN owned_application_counts oac ON oac.day = ds.day
     ORDER BY ds.day ASC`,
    [recruiterId, days]
  );

  return result.rows.map((row) => ({
    date: row.date,
    applications: toInt(row.applications),
  }));
}

export async function getHiringFunnel(
  recruiterId: string
): Promise<HiringFunnel> {
  const result = await query<{
    pending: string;
    reviewing: string;
    shortlisted: string;
    hired: string;
    rejected: string;
    withdrawn: string;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE a.status = 'PENDING')::int AS pending,
       COUNT(*) FILTER (WHERE a.status = 'REVIEWING')::int AS reviewing,
       COUNT(*) FILTER (WHERE a.status = 'SHORTLISTED')::int AS shortlisted,
       COUNT(*) FILTER (WHERE a.status = 'HIRED')::int AS hired,
       COUNT(*) FILTER (WHERE a.status = 'REJECTED')::int AS rejected,
       COUNT(*) FILTER (WHERE a.status = 'WITHDRAWN')::int AS withdrawn
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE j.posted_by = $1`,
    [recruiterId]
  );

  const row = result.rows[0];
  return {
    pending: toInt(row.pending),
    reviewing: toInt(row.reviewing),
    shortlisted: toInt(row.shortlisted),
    hired: toInt(row.hired),
    rejected: toInt(row.rejected),
    withdrawn: toInt(row.withdrawn),
  };
}

export async function getTopJobs(recruiterId: string): Promise<TopJob[]> {
  const result = await query<{
    job_id: string;
    title: string;
    slug: string | null;
    status: string;
    created_at: Date;
    application_count: string;
  }>(
    `SELECT
       j.id AS job_id,
       j.title,
       j.slug,
       j.status,
       j.created_at,
       COUNT(a.id)::int AS application_count
     FROM jobs j
     LEFT JOIN applications a ON a.job_id = j.id
     WHERE j.posted_by = $1
     GROUP BY j.id, j.title, j.slug, j.status, j.created_at
     ORDER BY COUNT(a.id) DESC, j.created_at DESC
     LIMIT 10`,
    [recruiterId]
  );

  return result.rows.map((row) => ({
    jobId: row.job_id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    createdAt: row.created_at,
    applicationCount: toInt(row.application_count),
  }));
}

export async function getJobPerformance(
  recruiterId: string,
  jobId: string
): Promise<JobPerformance> {
  const result = await query<{
    applications: string;
    reviewing: string;
    shortlisted: string;
    hired: string;
    rejected: string;
    withdrawn: string;
    conversion_rate: string;
    hire_rate: string;
  }>(
    `SELECT
       COUNT(a.id)::int AS applications,
       COUNT(a.id) FILTER (WHERE a.status = 'REVIEWING')::int AS reviewing,
       COUNT(a.id) FILTER (WHERE a.status = 'SHORTLISTED')::int AS shortlisted,
       COUNT(a.id) FILTER (WHERE a.status = 'HIRED')::int AS hired,
       COUNT(a.id) FILTER (WHERE a.status = 'REJECTED')::int AS rejected,
       COUNT(a.id) FILTER (WHERE a.status = 'WITHDRAWN')::int AS withdrawn,
       ROUND(
         COALESCE(
           (
             COUNT(a.id) FILTER (WHERE a.status IN ('SHORTLISTED', 'HIRED'))::numeric
             / NULLIF(COUNT(a.id), 0)
           ) * 100,
           0
         ),
         2
       ) AS conversion_rate,
       ROUND(
         COALESCE(
           (
             COUNT(a.id) FILTER (WHERE a.status = 'HIRED')::numeric
             / NULLIF(COUNT(a.id), 0)
           ) * 100,
           0
         ),
         2
       ) AS hire_rate
     FROM jobs j
     LEFT JOIN applications a ON a.job_id = j.id
     WHERE j.id = $1 AND j.posted_by = $2
     GROUP BY j.id`,
    [jobId, recruiterId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
  }

  const row = result.rows[0];
  return {
    applications: toInt(row.applications),
    reviewing: toInt(row.reviewing),
    shortlisted: toInt(row.shortlisted),
    hired: toInt(row.hired),
    rejected: toInt(row.rejected),
    withdrawn: toInt(row.withdrawn),
    conversionRate: toFloat(row.conversion_rate),
    hireRate: toFloat(row.hire_rate),
  };
}

export async function getRecentApplications(
  recruiterId: string
): Promise<RecentApplication[]> {
  const result = await query<{
    application_id: string;
    candidate_name: string;
    candidate_email: string;
    job_id: string;
    job_title: string;
    status: string;
    applied_at: Date;
  }>(
    `SELECT
       a.id AS application_id,
       u.name AS candidate_name,
       u.email AS candidate_email,
       j.id AS job_id,
       j.title AS job_title,
       a.status,
       a.applied_at
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN users u ON u.id = a.user_id
     WHERE j.posted_by = $1
     ORDER BY a.applied_at DESC
     LIMIT 20`,
    [recruiterId]
  );

  return result.rows.map((row) => ({
    applicationId: row.application_id,
    candidateName: row.candidate_name,
    candidateEmail: row.candidate_email,
    jobId: row.job_id,
    jobTitle: row.job_title,
    status: row.status,
    appliedAt: row.applied_at,
  }));
}
