import { Router } from 'express';
import {
  createJob,
  updateJob,
  deleteJob,
  publishJob,
  closeJob,
  getJobDetails,
  listJobsPublic,
  listJobsAdmin,
} from './jobs.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createJobSchema, updateJobSchema } from './jobs.validators';

const router = Router();

// =============================================================================
// PUBLIC / USER ROUTES (authenticated)
// =============================================================================

/**
 * GET /api/v1/jobs
 * List all published jobs with search, filters, and pagination.
 * Accessible to all authenticated users.
 */
router.get('/', authenticate, listJobsPublic);

/**
 * GET /api/v1/jobs/admin/list
 * List jobs posted by the authenticated admin (all statuses).
 * ADMIN only. Registered before /:jobId to prevent route conflict.
 */
router.get('/admin/list', authenticate, requireRole('ADMIN'), listJobsAdmin);

/**
 * GET /api/v1/jobs/:jobId
 * Get job details by UUID or slug.
 * Accessible to all authenticated users.
 * Non-admin users can only view PUBLISHED jobs.
 */
router.get('/:jobId', authenticate, getJobDetails);

// =============================================================================
// ADMIN ROUTES
// =============================================================================

/**
 * POST /api/v1/jobs
 * Create a new job posting. ADMIN only.
 */
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate(createJobSchema),
  createJob
);

/**
 * PUT /api/v1/jobs/:jobId
 * Update a job posting. ADMIN only, owner only.
 */
router.put(
  '/:jobId',
  authenticate,
  requireRole('ADMIN'),
  validate(updateJobSchema),
  updateJob
);

/**
 * DELETE /api/v1/jobs/:jobId
 * Soft-delete a job (set to CLOSED). ADMIN only, owner only.
 */
router.delete('/:jobId', authenticate, requireRole('ADMIN'), deleteJob);

/**
 * PATCH /api/v1/jobs/:jobId/publish
 * Transition DRAFT → PUBLISHED. ADMIN only, owner only.
 */
router.patch('/:jobId/publish', authenticate, requireRole('ADMIN'), publishJob);

/**
 * PATCH /api/v1/jobs/:jobId/close
 * Transition PUBLISHED → CLOSED. ADMIN only, owner only.
 */
router.patch('/:jobId/close', authenticate, requireRole('ADMIN'), closeJob);

export default router;
