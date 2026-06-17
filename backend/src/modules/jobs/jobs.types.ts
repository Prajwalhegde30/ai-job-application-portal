/**
 * Jobs module type definitions.
 * Used across service, controller, and route layers.
 */

/** Database row shape for the jobs table. */
export interface JobRow {
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
  job_type: string;
  status: string;
  slug: string | null;
  is_featured: boolean;
  published_at: Date | null;
  closed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** Extended row returned from admin listing queries with application counts. */
export interface AdminJobRow extends JobRow {
  application_count: number;
}

/** Pagination parameters accepted by list endpoints. */
export interface PaginationParams {
  page: number;
  limit: number;
}

/** Filters for the public job listing endpoint. */
export interface JobFilters {
  search?: string;
  jobType?: string;
  location?: string;
  status?: string;
}

/** Paginated result shape returned by list queries. */
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}
