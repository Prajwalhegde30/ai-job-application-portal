-- =============================================================================
-- Migration 005: Notification System schema updates
-- Phase 9 — Adds notification_type enum, alters notifications table, and
-- indexes created_at for performant retrieval.
-- =============================================================================

BEGIN;

-- 1. Create notification_type enum
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'APPLICATION_CREATED',
    'APPLICATION_WITHDRAWN',
    'APPLICATION_REVIEWING',
    'APPLICATION_SHORTLISTED',
    'APPLICATION_REJECTED',
    'APPLICATION_HIRED',
    'JOB_PUBLISHED',
    'SYSTEM'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add type column to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type notification_type NOT NULL DEFAULT 'SYSTEM';

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

COMMIT;
