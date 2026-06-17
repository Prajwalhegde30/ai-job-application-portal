-- =============================================================================
-- AI Job Application Portal — Complete Database Schema
-- Source of truth: PROJECT.md Section 5.2
-- =============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');

CREATE TYPE job_type AS ENUM (
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'REMOTE',
  'INTERNSHIP'
);

CREATE TYPE job_status AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

CREATE TYPE application_status AS ENUM (
  'PENDING',
  'REVIEWING',
  'SHORTLISTED',
  'REJECTED',
  'HIRED'
);

CREATE TYPE analysis_type AS ENUM ('RESUME_EXTRACT', 'MATCH_SCORE');

-- =============================================================================
-- TABLE: users
-- Central user account table. Both admins (recruiters) and regular users
-- (job seekers) share this table, distinguished by the `role` enum.
-- =============================================================================
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    role          user_role NOT NULL DEFAULT 'USER',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: profiles
-- One-to-one extension of users. Auto-created on registration.
-- Skills, experience, and education stored as JSONB for flexible schema.
-- =============================================================================
CREATE TABLE profiles (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    headline           VARCHAR(255),
    bio                TEXT,
    location           VARCHAR(255),
    phone              VARCHAR(50),
    website            VARCHAR(255),
    linkedin_url       VARCHAR(255),
    github_url         VARCHAR(255),
    skills             JSONB NOT NULL DEFAULT '[]',
    experience         JSONB NOT NULL DEFAULT '[]',
    education          JSONB NOT NULL DEFAULT '[]',
    profile_completion INT NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: jobs
-- Job postings created by ADMIN users. Status lifecycle: DRAFT → PUBLISHED → CLOSED.
-- posted_by references the admin who created the listing.
-- =============================================================================
CREATE TABLE jobs (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    posted_by        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    company          VARCHAR(255) NOT NULL,
    description      TEXT NOT NULL,
    requirements     TEXT NOT NULL,
    responsibilities TEXT,
    location         VARCHAR(255) NOT NULL,
    salary_min       INT,
    salary_max       INT,
    job_type         job_type NOT NULL DEFAULT 'FULL_TIME',
    status           job_status NOT NULL DEFAULT 'DRAFT',
    slug             VARCHAR(500),
    is_featured      BOOLEAN NOT NULL DEFAULT FALSE,
    published_at     TIMESTAMPTZ,
    closed_at        TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Job indexes for search and filtering performance
CREATE UNIQUE INDEX idx_jobs_slug ON jobs (slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_jobs_title ON jobs (title);
CREATE INDEX idx_jobs_company ON jobs (company);
CREATE INDEX idx_jobs_location ON jobs (location);
CREATE INDEX idx_jobs_status ON jobs (status);
CREATE INDEX idx_jobs_created_by ON jobs (posted_by);
CREATE INDEX idx_jobs_job_type ON jobs (job_type);
CREATE INDEX idx_jobs_is_featured ON jobs (is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_jobs_status_created ON jobs (status, created_at DESC);

-- =============================================================================
-- TABLE: resumes
-- User-uploaded resume files (PDF). Each user can have multiple resumes
-- with one marked as default. File storage is external (Supabase/Cloudinary).
-- =============================================================================
CREATE TABLE resumes (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    file_url      TEXT NOT NULL,
    file_key      VARCHAR(500) NOT NULL,
    is_default    BOOLEAN NOT NULL DEFAULT FALSE,
    file_name     VARCHAR(255) NOT NULL,
    storage_path  VARCHAR(500) NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT FALSE,
    file_size     INT,
    file_type     VARCHAR(100),
    resume_text   TEXT,
    parsed_at     TIMESTAMPTZ,
    resume_title  VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: applications
-- Links a user to a job via a resume. Unique constraint prevents duplicate
-- applications. Status lifecycle: PENDING → REVIEWING → SHORTLISTED → REJECTED | HIRED.
-- =============================================================================
CREATE TABLE applications (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id         UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_id      UUID NOT NULL REFERENCES resumes(id),
    cover_letter   TEXT,
    status         application_status NOT NULL DEFAULT 'PENDING',
    ai_match_score INT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_application UNIQUE (job_id, user_id)
);

-- =============================================================================
-- TABLE: ai_analysis
-- Stores AI-generated analysis results. Two types:
-- RESUME_EXTRACT: skills/experience/education extracted from resume PDF
-- MATCH_SCORE: resume-to-job compatibility score with skill gap analysis
-- =============================================================================
CREATE TABLE ai_analysis (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id     UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    job_id        UUID REFERENCES jobs(id) ON DELETE SET NULL,
    analysis_type analysis_type NOT NULL,
    result        JSONB NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: notifications
-- In-app notifications for users. Created by system events (e.g., application
-- status change). Not persisted chat messages.
-- =============================================================================
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    link       VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: refresh_tokens
-- JWT refresh token storage for token rotation pattern. Tokens are hashed
-- before storage. Revoked on logout or rotation.
-- =============================================================================
CREATE TABLE refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
