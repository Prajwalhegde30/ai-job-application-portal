-- =============================================================================
-- Migration 003: Update resumes table schema
-- Implements Phase 7 multi-resume support with fallback columns to reduce risk.
-- =============================================================================

BEGIN;

-- Add new columns as nullable first
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS storage_path VARCHAR(500);
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS file_size INT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS resume_text TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMPTZ;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS resume_title VARCHAR(255);
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill data from legacy columns
UPDATE resumes SET file_name = name WHERE file_name IS NULL;
UPDATE resumes SET storage_path = file_key WHERE storage_path IS NULL;
UPDATE resumes SET is_active = is_default WHERE is_active IS NULL;
UPDATE resumes SET resume_title = name WHERE resume_title IS NULL;

-- Set constraints on backfilled columns
ALTER TABLE resumes ALTER COLUMN file_name SET NOT NULL;
ALTER TABLE resumes ALTER COLUMN storage_path SET NOT NULL;
ALTER TABLE resumes ALTER COLUMN is_active SET DEFAULT FALSE;
UPDATE resumes SET is_active = FALSE WHERE is_active IS NULL;
ALTER TABLE resumes ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE resumes ALTER COLUMN resume_title SET NOT NULL;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_resumes_updated_at ON resumes;
CREATE TRIGGER trg_resumes_updated_at
    BEFORE UPDATE ON resumes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
