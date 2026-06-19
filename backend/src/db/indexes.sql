-- =============================================================================
-- AI Job Application Portal — Performance Indexes
-- Source of truth: PROJECT.md Section 5.2
-- =============================================================================

-- ---------------------------------------------------------------------------
-- JOBS INDEXES
-- ---------------------------------------------------------------------------

-- Filter jobs by publication status (DRAFT/PUBLISHED/CLOSED).
-- Used on: GET /api/v1/jobs (public listing filters by PUBLISHED)
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Look up all jobs posted by a specific admin.
-- Used on: GET /api/v1/jobs/mine
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON jobs(posted_by);

-- Recruiter analytics aggregate jobs by owner, status, and creation date.
-- Used on: GET /api/v1/analytics/summary, /analytics/top-jobs
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by_status_created
    ON jobs(posted_by, status, created_at DESC);

-- Sort jobs by newest first for listing pages.
-- Used on: GET /api/v1/jobs (default sort order)
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- ---------------------------------------------------------------------------
-- APPLICATIONS INDEXES
-- ---------------------------------------------------------------------------

-- Look up all applications for a specific job.
-- Used on: GET /api/v1/applications/job/:jobId (admin applicant review)
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);

-- Look up all applications submitted by a specific user.
-- Used on: GET /api/v1/applications/mine (user application tracker)
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);

-- Filter applications by status for admin review workflows.
-- Used on: GET /api/v1/applications/job/:jobId?status=PENDING
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- Look up applications reviewed by a specific admin.
-- Used on: Admin review audit trail
CREATE INDEX IF NOT EXISTS idx_applications_reviewed_by ON applications(reviewed_by);

-- Sort applications by applied_at for analytics and metrics.
-- Used on: Hiring pipeline reports
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at DESC);

-- Recruiter analytics count applications by job/status/date.
-- Used on: /api/v1/analytics/hiring-funnel, /top-jobs, /job-performance/:jobId
CREATE INDEX IF NOT EXISTS idx_applications_job_status_applied
    ON applications(job_id, status, applied_at DESC);

-- Recruiter analytics recent activity and date trends by job.
-- Used on: /api/v1/analytics/application-trends, /recent-applications
CREATE INDEX IF NOT EXISTS idx_applications_job_applied
    ON applications(job_id, applied_at DESC);

-- ---------------------------------------------------------------------------
-- APPLICATION TIMELINE INDEXES
-- ---------------------------------------------------------------------------

-- Look up all timeline events for a specific application.
-- Used on: GET /api/v1/applications/:id/timeline
CREATE INDEX IF NOT EXISTS idx_application_timeline_app_id ON application_timeline(application_id);

-- Chronological ordering of timeline events per application.
-- Used on: Timeline display (sorted by created_at)
CREATE INDEX IF NOT EXISTS idx_application_timeline_created ON application_timeline(application_id, created_at ASC);

-- ---------------------------------------------------------------------------
-- RESUMES INDEXES
-- ---------------------------------------------------------------------------

-- Look up all resumes owned by a specific user.
-- Used on: GET /api/v1/resumes (user resume manager)
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);

-- ---------------------------------------------------------------------------
-- AI ANALYSIS INDEXES
-- ---------------------------------------------------------------------------

-- Look up all analyses for a specific resume.
-- Used on: Resume analysis result retrieval and cache lookup
CREATE INDEX IF NOT EXISTS idx_ai_analysis_resume_id ON ai_analysis(resume_id);

-- Filter analyses by type (RESUME_EXTRACT vs MATCH_SCORE).
-- Used on: Differentiating analysis results by purpose
CREATE INDEX IF NOT EXISTS idx_ai_analysis_type ON ai_analysis(analysis_type);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS INDEXES
-- ---------------------------------------------------------------------------

-- Look up all notifications for a specific user.
-- Used on: GET /api/v1/notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Filter unread notifications efficiently.
-- Used on: GET /api/v1/notifications?unreadOnly=true
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Count unread notifications for a specific recruiter dashboard.
-- Used on: GET /api/v1/analytics/summary
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, is_read)
    WHERE is_read = FALSE;

-- Sort notifications chronologically (newest first).
-- Used on: GET /api/v1/notifications
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ---------------------------------------------------------------------------
-- REFRESH TOKENS INDEXES
-- ---------------------------------------------------------------------------

-- Look up all refresh tokens for a specific user (for revocation on logout).
-- Used on: POST /api/v1/auth/logout (revoke all user tokens)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
