/**
 * Backend model interfaces and enums.
 * These types mirror the PostgreSQL schema defined in schema.sql.
 * Source of truth: PROJECT.md Section 5.
 */

// =============================================================================
// ENUMS — Match PostgreSQL ENUM types exactly
// =============================================================================

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum JobType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  REMOTE = 'REMOTE',
  INTERNSHIP = 'INTERNSHIP',
}

export enum JobStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
}

export enum ApplicationStatus {
  PENDING = 'PENDING',
  REVIEWING = 'REVIEWING',
  SHORTLISTED = 'SHORTLISTED',
  REJECTED = 'REJECTED',
  HIRED = 'HIRED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum EventActorType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

export enum AnalysisType {
  RESUME_EXTRACT = 'RESUME_EXTRACT',
  MATCH_SCORE = 'MATCH_SCORE',
}

// =============================================================================
// JSONB SUB-TYPES — Structured data within JSONB columns
// =============================================================================

/** profiles.experience JSONB array entry */
export interface ExperienceEntry {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

/** profiles.education JSONB array entry */
export interface EducationEntry {
  institution: string;
  degree: string;
  field: string;
  startYear: number;
  endYear: number;
}

/** ai_analysis.result when analysis_type = 'RESUME_EXTRACT' */
export interface ResumeExtractResult {
  skills: string[];
  education: { institution: string; degree: string }[];
  experience: { company: string; title: string; duration: string }[];
  summary: string;
}

/** ai_analysis.result when analysis_type = 'MATCH_SCORE' */
export interface MatchScoreResult {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: string[];
}

// =============================================================================
// TABLE INTERFACES — One interface per database table
// =============================================================================

/** Represents a row in the `users` table. */
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/** Represents a row in the `profiles` table. */
export interface Profile {
  id: string;
  user_id: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  profile_completion: number;
  created_at: Date;
  updated_at: Date;
}

/** Represents a row in the `jobs` table. */
export interface Job {
  id: string;
  posted_by: string;
  title: string;
  company: string;
  description: string;
  requirements: string;
  responsibilities: string | null;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  job_type: JobType;
  status: JobStatus;
  slug: string | null;
  is_featured: boolean;
  published_at: Date | null;
  closed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** Represents a row in the `resumes` table. */
export interface Resume {
  id: string;
  user_id: string;
  name: string;
  file_url: string;
  file_key: string;
  is_default: boolean;
  file_name: string;
  storage_path: string;
  is_active: boolean;
  file_size: number | null;
  file_type: string | null;
  resume_text: string | null;
  parsed_at: Date | null;
  resume_title: string;
  created_at: Date;
  updated_at: Date;
}

/** Represents a row in the `applications` table. */
export interface Application {
  id: string;
  job_id: string;
  user_id: string;
  resume_id: string;
  cover_letter: string | null;
  status: ApplicationStatus;
  ai_match_score: number | null;
  resume_snapshot_title: string | null;
  resume_snapshot_file_name: string | null;
  resume_snapshot_storage_path: string | null;
  reviewed_at: Date | null;
  reviewed_by: string | null;
  notes: string | null;
  applied_at: Date;
  created_at: Date;
  updated_at: Date;
}

/** Represents a row in the `application_timeline` table. */
export interface ApplicationTimelineEvent {
  id: string;
  application_id: string;
  event_type: string;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  performed_by: string | null;
  actor_type: EventActorType;
  created_at: Date;
}

/** Represents a row in the `ai_analysis` table. */
export interface AIAnalysis {
  id: string;
  resume_id: string;
  job_id: string | null;
  analysis_type: AnalysisType;
  result: ResumeExtractResult | MatchScoreResult;
  created_at: Date;
}

/** Represents a row in the `notifications` table. */
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: Date;
}

/** Represents a row in the `refresh_tokens` table. */
export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  is_revoked: boolean;
  created_at: Date;
}
