import { query } from '../../config/database';
import { calculateProfileCompletion } from '../profile/profile.service';
import { getUnreadCount } from '../notifications/notifications.service';
import {
  DashboardSummary,
  ApplicationStatusOverview,
  RecentApplication,
  RecentNotification,
  ResumeSummary,
} from './dashboard.types';

// =============================================================================
// DASHBOARD SUMMARY
// =============================================================================

/**
 * Get aggregated dashboard summary for a candidate.
 * Uses Promise.all to run 4 parallel queries for optimal performance.
 *
 * @param userId - ID of the authenticated user
 * @returns Aggregated dashboard summary
 */
export async function getDashboardSummary(
  userId: string
): Promise<DashboardSummary> {
  // Run all queries in parallel for performance
  const [profileData, appCounts, unreadNotifications, resumeCounts] =
    await Promise.all([
      // 1. Profile completion — fetch profile and calculate using existing engine
      query<{
        headline: string | null;
        bio: string | null;
        location: string | null;
        phone: string | null;
        website: string | null;
        linkedin_url: string | null;
        github_url: string | null;
        skills: string[];
        experience: unknown[];
        education: unknown[];
      }>(
        `SELECT headline, bio, location, phone, website,
                linkedin_url, github_url, skills, experience, education
         FROM profiles WHERE user_id = $1`,
        [userId]
      ),

      // 2. Application counts per status — single aggregation query
      query<{
        total: string;
        pending: string;
        reviewing: string;
        shortlisted: string;
        rejected: string;
        hired: string;
      }>(
        `SELECT
           COUNT(*)::text AS total,
           COUNT(*) FILTER (WHERE status = 'PENDING')::text AS pending,
           COUNT(*) FILTER (WHERE status = 'REVIEWING')::text AS reviewing,
           COUNT(*) FILTER (WHERE status = 'SHORTLISTED')::text AS shortlisted,
           COUNT(*) FILTER (WHERE status = 'REJECTED')::text AS rejected,
           COUNT(*) FILTER (WHERE status = 'HIRED')::text AS hired
         FROM applications
         WHERE user_id = $1`,
        [userId]
      ),

      // 3. Unread notifications — reuse existing service function
      getUnreadCount(userId),

      // 4. Resume counts
      query<{ total: string; has_active: boolean }>(
        `SELECT
           COUNT(*)::text AS total,
           BOOL_OR(is_active) AS has_active
         FROM resumes
         WHERE user_id = $1`,
        [userId]
      ),
    ]);

  // Calculate profile completion using the existing engine (single source of truth)
  let profileCompletion = 0;
  if (profileData.rows.length > 0) {
    profileCompletion = calculateProfileCompletion(profileData.rows[0]);
  }

  const apps = appCounts.rows[0];
  const resumes = resumeCounts.rows[0];

  return {
    profileCompletion,
    totalApplications: parseInt(apps.total, 10),
    pendingApplications: parseInt(apps.pending, 10),
    reviewingApplications: parseInt(apps.reviewing, 10),
    shortlistedApplications: parseInt(apps.shortlisted, 10),
    rejectedApplications: parseInt(apps.rejected, 10),
    hiredApplications: parseInt(apps.hired, 10),
    unreadNotifications,
    totalResumes: parseInt(resumes.total, 10),
    activeResume: resumes.has_active || false,
  };
}

// =============================================================================
// APPLICATION STATUS OVERVIEW
// =============================================================================

/**
 * Get application counts by status for the authenticated user.
 * Single SQL query with COUNT FILTER for each status.
 *
 * @param userId - ID of the authenticated user
 * @returns Per-status application counts
 */
export async function getApplicationStatusOverview(
  userId: string
): Promise<ApplicationStatusOverview> {
  const result = await query<{
    pending: string;
    reviewing: string;
    shortlisted: string;
    rejected: string;
    hired: string;
    withdrawn: string;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'PENDING')::text AS pending,
       COUNT(*) FILTER (WHERE status = 'REVIEWING')::text AS reviewing,
       COUNT(*) FILTER (WHERE status = 'SHORTLISTED')::text AS shortlisted,
       COUNT(*) FILTER (WHERE status = 'REJECTED')::text AS rejected,
       COUNT(*) FILTER (WHERE status = 'HIRED')::text AS hired,
       COUNT(*) FILTER (WHERE status = 'WITHDRAWN')::text AS withdrawn
     FROM applications
     WHERE user_id = $1`,
    [userId]
  );

  const row = result.rows[0];

  return {
    pending: parseInt(row.pending, 10),
    reviewing: parseInt(row.reviewing, 10),
    shortlisted: parseInt(row.shortlisted, 10),
    rejected: parseInt(row.rejected, 10),
    hired: parseInt(row.hired, 10),
    withdrawn: parseInt(row.withdrawn, 10),
  };
}

// =============================================================================
// RECENT APPLICATIONS
// =============================================================================

/**
 * Get the 5 most recent applications for the authenticated user.
 * Joins with jobs table for title and company.
 *
 * @param userId - ID of the authenticated user
 * @returns Array of up to 5 recent applications
 */
export async function getRecentApplications(
  userId: string
): Promise<RecentApplication[]> {
  const result = await query<{
    id: string;
    job_title: string;
    company: string;
    status: string;
    applied_at: Date;
  }>(
    `SELECT
       a.id,
       j.title AS job_title,
       j.company,
       a.status,
       a.applied_at
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.user_id = $1
     ORDER BY a.applied_at DESC
     LIMIT 5`,
    [userId]
  );

  return result.rows.map((row) => ({
    applicationId: row.id,
    jobTitle: row.job_title,
    company: row.company,
    status: row.status,
    appliedAt: row.applied_at,
  }));
}

// =============================================================================
// RECENT NOTIFICATIONS
// =============================================================================

/**
 * Get the 5 most recent notifications for the authenticated user.
 *
 * @param userId - ID of the authenticated user
 * @returns Array of up to 5 recent notifications
 */
export async function getRecentNotifications(
  userId: string
): Promise<RecentNotification[]> {
  const result = await query<{
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: Date;
  }>(
    `SELECT id, title, message, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
  }));
}

// =============================================================================
// RESUME SUMMARY
// =============================================================================

/**
 * Get resume summary for the authenticated user.
 * Single query returns count and active resume details.
 *
 * @param userId - ID of the authenticated user
 * @returns Resume summary with count and active resume info
 */
export async function getResumeSummary(userId: string): Promise<ResumeSummary> {
  // Get total count
  const countResult = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM resumes WHERE user_id = $1',
    [userId]
  );

  const totalResumes = parseInt(countResult.rows[0].count, 10);

  // Get active resume details
  const activeResult = await query<{
    resume_title: string;
    updated_at: Date;
  }>(
    `SELECT resume_title, updated_at
     FROM resumes
     WHERE user_id = $1 AND is_active = TRUE
     LIMIT 1`,
    [userId]
  );

  const activeRow = activeResult.rows[0] || null;

  return {
    totalResumes,
    activeResume: !!activeRow,
    activeResumeTitle: activeRow ? activeRow.resume_title : null,
    activeResumeUpdatedAt: activeRow ? activeRow.updated_at : null,
  };
}
