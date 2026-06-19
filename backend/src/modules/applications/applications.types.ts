/**
 * Applications module type definitions.
 * Used across service, controller, and route layers.
 */

/** Database row shape for the applications table (full row). */
export interface ApplicationRow {
  id: string;
  job_id: string;
  user_id: string;
  resume_id: string;
  cover_letter: string | null;
  status: string;
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

/** Application row joined with basic job details for list views. */
export interface ApplicationWithJob extends ApplicationRow {
  job_title: string;
  job_company: string;
  job_location: string;
  job_type: string;
  job_status: string;
}

/** Application row with full details for single-view including user info. */
export interface ApplicationWithDetails extends ApplicationWithJob {
  applicant_name: string;
  applicant_email: string;
  job_description: string;
  job_requirements: string;
  job_salary_min: number | null;
  job_salary_max: number | null;
  job_posted_by: string;
}

/** Database row shape for the application_timeline table. */
export interface TimelineEventRow {
  id: string;
  application_id: string;
  event_type: string;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  performed_by: string | null;
  actor_type: string;
  created_at: Date;
  performer_name?: string;
}

/** Pagination parameters accepted by list endpoints. */
export interface PaginationParams {
  page: number;
  limit: number;
}

/** Filters for the admin application listing endpoint. */
export interface ApplicationFilters {
  status?: string;
  jobId?: string;
  candidateId?: string;
  search?: string;
}

/** Paginated result shape returned by list queries. */
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}
