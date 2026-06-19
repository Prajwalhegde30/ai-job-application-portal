-- =============================================================================
-- Migration 008: Resume Match Score Engine
-- Description: Creates the match_analysis table to store deterministic 
-- comparisons between resumes and job requirements.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS match_analysis (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id      UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_id           UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    match_score         INT NOT NULL,
    matched_skills      JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_skills      JSONB NOT NULL DEFAULT '[]'::jsonb,
    additional_skills   JSONB NOT NULL DEFAULT '[]'::jsonb,
    education_score     INT NOT NULL DEFAULT 0,
    experience_score    INT NOT NULL DEFAULT 0,
    certification_score INT NOT NULL DEFAULT 0,
    skills_score        INT NOT NULL DEFAULT 0,
    projects_score      INT NOT NULL DEFAULT 0,
    strengths           JSONB NOT NULL DEFAULT '[]'::jsonb,
    weaknesses          JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations     JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optimization indexes for quick retrieval
CREATE INDEX IF NOT EXISTS idx_match_analysis_application_id ON match_analysis(application_id);
CREATE INDEX IF NOT EXISTS idx_match_analysis_user_id ON match_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_match_analysis_job_id ON match_analysis(job_id);

-- Setup trigger to maintain updated_at column automatically
DROP TRIGGER IF EXISTS trg_match_analysis_updated_at ON match_analysis;
CREATE TRIGGER trg_match_analysis_updated_at
    BEFORE UPDATE ON match_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
