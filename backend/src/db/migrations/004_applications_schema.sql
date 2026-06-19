-- =============================================================================
-- Migration 004: Application Management System
-- Phase 8 — Adds snapshot columns, review tracking, timeline table,
-- WITHDRAWN status, and applied_at timestamp.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Add WITHDRAWN to application_status enum
-- ---------------------------------------------------------------------------
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'WITHDRAWN';

COMMIT;

-- Need separate transaction after ALTER TYPE ADD VALUE
BEGIN;

-- ---------------------------------------------------------------------------
-- 2. Add snapshot columns to applications table
--    Captures resume state at the moment of application submission.
-- ---------------------------------------------------------------------------
ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_snapshot_title VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_snapshot_file_name VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_snapshot_storage_path VARCHAR(500);

-- ---------------------------------------------------------------------------
-- 3. Add review tracking columns
-- ---------------------------------------------------------------------------
ALTER TABLE applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS notes TEXT;

-- ---------------------------------------------------------------------------
-- 4. Add applied_at timestamp for analytics and hiring metrics
-- ---------------------------------------------------------------------------
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

-- Backfill applied_at from created_at for any existing rows
UPDATE applications SET applied_at = created_at WHERE applied_at IS NULL;

-- Set default for future rows
ALTER TABLE applications ALTER COLUMN applied_at SET DEFAULT NOW();

-- ---------------------------------------------------------------------------
-- 5. Create event_actor_type enum for timeline
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE event_actor_type AS ENUM ('USER', 'ADMIN', 'SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Create application_timeline table
--    Stores chronological history of all application events.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS application_timeline (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    event_type     VARCHAR(100) NOT NULL,
    old_status     VARCHAR(50),
    new_status     VARCHAR(50),
    notes          TEXT,
    performed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type     event_actor_type NOT NULL DEFAULT 'SYSTEM',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 7. Performance indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_application_timeline_app_id
    ON application_timeline(application_id);

CREATE INDEX IF NOT EXISTS idx_application_timeline_created
    ON application_timeline(application_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_applications_reviewed_by
    ON applications(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_applications_applied_at
    ON applications(applied_at DESC);

COMMIT;
