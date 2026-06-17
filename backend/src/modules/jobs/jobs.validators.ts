import { z } from 'zod';

/**
 * Allowed job type enum values — must match PostgreSQL job_type ENUM.
 */
const jobTypeEnum = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'REMOTE',
  'INTERNSHIP',
]);

/**
 * Allowed job status enum values — must match PostgreSQL job_status ENUM.
 */
const jobStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']);

/**
 * POST /api/v1/jobs — Create a new job posting.
 * All required fields must be provided. Status defaults to DRAFT.
 */
export const createJobSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(255, 'Title must be at most 255 characters')
      .trim(),
    company: z
      .string()
      .min(1, 'Company is required')
      .max(255, 'Company must be at most 255 characters')
      .trim(),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(10000, 'Description must be at most 10000 characters')
      .trim(),
    requirements: z
      .string()
      .min(10, 'Requirements must be at least 10 characters')
      .max(10000, 'Requirements must be at most 10000 characters')
      .trim(),
    responsibilities: z
      .string()
      .min(10, 'Responsibilities must be at least 10 characters')
      .max(10000, 'Responsibilities must be at most 10000 characters')
      .trim()
      .optional(),
    location: z
      .string()
      .min(1, 'Location is required')
      .max(255, 'Location must be at most 255 characters')
      .trim(),
    salaryMin: z
      .number()
      .int('Salary must be a whole number')
      .min(0, 'Salary must be non-negative')
      .optional()
      .nullable(),
    salaryMax: z
      .number()
      .int('Salary must be a whole number')
      .min(0, 'Salary must be non-negative')
      .optional()
      .nullable(),
    jobType: jobTypeEnum.default('FULL_TIME'),
    status: jobStatusEnum.default('DRAFT'),
    isFeatured: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (
        data.salaryMin != null &&
        data.salaryMax != null &&
        data.salaryMax < data.salaryMin
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Maximum salary must be greater than or equal to minimum salary',
      path: ['salaryMax'],
    }
  );

/**
 * PUT /api/v1/jobs/:jobId — Update an existing job posting.
 * All fields are optional — only provided fields are updated.
 */
export const updateJobSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(255, 'Title must be at most 255 characters')
      .trim()
      .optional(),
    company: z
      .string()
      .min(1, 'Company is required')
      .max(255, 'Company must be at most 255 characters')
      .trim()
      .optional(),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(10000, 'Description must be at most 10000 characters')
      .trim()
      .optional(),
    requirements: z
      .string()
      .min(10, 'Requirements must be at least 10 characters')
      .max(10000, 'Requirements must be at most 10000 characters')
      .trim()
      .optional(),
    responsibilities: z
      .string()
      .min(10, 'Responsibilities must be at least 10 characters')
      .max(10000, 'Responsibilities must be at most 10000 characters')
      .trim()
      .optional()
      .nullable(),
    location: z
      .string()
      .min(1, 'Location is required')
      .max(255, 'Location must be at most 255 characters')
      .trim()
      .optional(),
    salaryMin: z
      .number()
      .int('Salary must be a whole number')
      .min(0, 'Salary must be non-negative')
      .optional()
      .nullable(),
    salaryMax: z
      .number()
      .int('Salary must be a whole number')
      .min(0, 'Salary must be non-negative')
      .optional()
      .nullable(),
    jobType: jobTypeEnum.optional(),
    status: jobStatusEnum.optional(),
    isFeatured: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (
        data.salaryMin != null &&
        data.salaryMax != null &&
        data.salaryMax < data.salaryMin
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Maximum salary must be greater than or equal to minimum salary',
      path: ['salaryMax'],
    }
  );

/**
 * Query parameters for listing jobs with search, filter, and pagination.
 */
export const listJobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(255).optional(),
  jobType: jobTypeEnum.optional(),
  location: z.string().trim().max(255).optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;
