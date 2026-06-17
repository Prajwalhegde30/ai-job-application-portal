-- =============================================================================
-- Migration 002: Add slug, is_featured, responsibilities, published_at to jobs
-- Also adds performance indexes for job browsing and filtering.
-- =============================================================================

-- Add new columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS responsibilities TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS slug VARCHAR(500);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Create unique index on slug (only non-null slugs must be unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_slug ON jobs (slug) WHERE slug IS NOT NULL;

-- Performance indexes for browsing and filtering
CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs (title);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs (company);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs (location);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs (posted_by);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs (job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_is_featured ON jobs (is_featured) WHERE is_featured = TRUE;

-- Composite index for common filtering combinations
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs (status, created_at DESC);
