import { z } from 'zod';

/**
 * UUID validation helper — matches standard v4 UUID format.
 */
const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Must be a valid UUID'
  );

/**
 * Allowed application status enum values — must match PostgreSQL application_status ENUM.
 */
const applicationStatusEnum = z.enum([
  'PENDING',
  'REVIEWING',
  'SHORTLISTED',
  'REJECTED',
  'HIRED',
  'WITHDRAWN',
]);

/**
 * POST /api/v1/applications — Apply to a job.
 * Requires jobId and resumeId (both UUIDs). CoverLetter is optional.
 */
export const applyToJobSchema = z.object({
  jobId: uuidSchema,
  resumeId: uuidSchema,
  coverLetter: z
    .string()
    .max(5000, 'Cover letter must be at most 5000 characters')
    .trim()
    .optional()
    .nullable(),
});

/**
 * PATCH /api/v1/admin/applications/:applicationId/status — Update application status.
 * Validates status is a valid enum value. Notes are optional.
 */
export const updateApplicationStatusSchema = z.object({
  status: applicationStatusEnum,
  notes: z
    .string()
    .max(2000, 'Notes must be at most 2000 characters')
    .trim()
    .optional()
    .nullable(),
});

/**
 * Query parameters for listing applications with pagination and filters.
 * Used by both user and admin list endpoints.
 */
export const listApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: applicationStatusEnum.optional(),
  jobId: uuidSchema.optional(),
  candidateId: uuidSchema.optional(),
  search: z.string().trim().max(255).optional(),
});

export type ApplyToJobInput = z.infer<typeof applyToJobSchema>;
export type UpdateApplicationStatusInput = z.infer<
  typeof updateApplicationStatusSchema
>;
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;
