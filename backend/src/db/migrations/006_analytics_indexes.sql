-- =============================================================================
-- Migration 006: Recruiter Analytics performance indexes
-- Phase 10 — Supports recruiter-scoped dashboard aggregation queries.
-- =============================================================================

BEGIN;

-- Recruiter dashboards repeatedly group/filter jobs by owner, status, and date.
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by_status_created
    ON jobs(posted_by, status, created_at DESC);

-- Top jobs, funnel, and job performance queries join applications through job_id.
CREATE INDEX IF NOT EXISTS idx_applications_job_status_applied
    ON applications(job_id, status, applied_at DESC);

-- Recent applications and trend queries sort/filter by application date per job.
CREATE INDEX IF NOT EXISTS idx_applications_job_applied
    ON applications(job_id, applied_at DESC);

-- Summary cards count unread notifications for the current recruiter.
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, is_read)
    WHERE is_read = FALSE;

COMMIT;
