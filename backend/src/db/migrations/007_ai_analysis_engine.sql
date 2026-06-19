-- =============================================================================
-- Migration 007: AI Resume Analysis Engine
-- Description: Alters the ai_analysis table to support score, strengths,
-- weaknesses, suggestions, and extracted sections as JSONB.
-- =============================================================================

BEGIN;

-- Add user_id referencing users table
ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add scoring and feedback fields
ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS score INT;
ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS strengths JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS weaknesses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS suggestions JSONB DEFAULT '[]'::jsonb;

-- Add extracted sections fields
ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS extracted_skills JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS extracted_education JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS extracted_experience JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS extracted_projects JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS extracted_certifications JSONB DEFAULT '[]'::jsonb;

-- Add updated_at column
ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill user_id from resumes where possible
UPDATE ai_analysis a
SET user_id = r.user_id
FROM resumes r
WHERE a.resume_id = r.id AND a.user_id IS NULL;

-- Delete any analysis records that couldn't be associated with a user
DELETE FROM ai_analysis WHERE user_id IS NULL;

-- Make user_id NOT NULL
ALTER TABLE ai_analysis ALTER COLUMN user_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ai_analysis_user_id ON ai_analysis(user_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_ai_analysis_updated_at ON ai_analysis;
CREATE TRIGGER trg_ai_analysis_updated_at
    BEFORE UPDATE ON ai_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
