import { z } from 'zod';

/**
 * Job type enum — matches backend PostgreSQL job_type ENUM.
 */
export const JOB_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'REMOTE',
  'INTERNSHIP',
] as const;

export type JobType = (typeof JOB_TYPES)[number];

/**
 * Job status enum — matches backend PostgreSQL job_status ENUM.
 */
export const JOB_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * Human-readable labels for job types.
 */
export const JOB_TYPE_LABELS: Record<JobType, string> = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  CONTRACT: 'Contract',
  REMOTE: 'Remote',
  INTERNSHIP: 'Internship',
};

/**
 * Human-readable labels for job statuses.
 */
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CLOSED: 'Closed',
};

/**
 * Create Job form schema — used with React Hook Form + Zod resolver.
 * Salary fields use number | null directly (no transforms that conflict with RHF).
 */
export const createJobSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters'),
  company: z
    .string()
    .min(1, 'Company is required')
    .max(255, 'Company must be at most 255 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(10000, 'Description must be at most 10000 characters'),
  requirements: z
    .string()
    .min(10, 'Requirements must be at least 10 characters')
    .max(10000, 'Requirements must be at most 10000 characters'),
  responsibilities: z
    .string()
    .max(10000, 'Responsibilities must be at most 10000 characters')
    .optional()
    .or(z.literal('')),
  location: z
    .string()
    .min(1, 'Location is required')
    .max(255, 'Location must be at most 255 characters'),
  salaryMin: z.number().int().min(0).nullable(),
  salaryMax: z.number().int().min(0).nullable(),
  jobType: z.enum(JOB_TYPES),
  status: z.enum(JOB_STATUSES),
  isFeatured: z.boolean(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

/**
 * API response shape for a single job.
 */
export interface JobResponse {
  id: string;
  postedBy: string;
  title: string;
  company: string;
  description: string;
  requirements: string;
  responsibilities: string | null;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  jobType: JobType;
  status: JobStatus;
  slug: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  applicationCount?: number;
}
