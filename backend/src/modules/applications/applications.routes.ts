import { Router } from 'express';
import {
  apply,
  withdraw,
  getMyApplications,
  getApplicationDetails,
  getTimeline,
  getAdminApplications,
  updateStatus,
  checkApplication,
} from './applications.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  applyToJobSchema,
  updateApplicationStatusSchema,
} from './applications.validators';

// =============================================================================
// USER APPLICATION ROUTES — /api/v1/applications
// =============================================================================

const applicationRoutes = Router();

/**
 * POST /api/v1/applications
 * Apply to a job. USER only.
 */
applicationRoutes.post(
  '/',
  authenticate,
  requireRole('USER'),
  validate(applyToJobSchema),
  apply
);

/**
 * GET /api/v1/applications/my
 * Get authenticated user's applications with pagination.
 * USER only. Registered before /:applicationId to prevent route conflict.
 */
applicationRoutes.get(
  '/my',
  authenticate,
  requireRole('USER'),
  getMyApplications
);

/**
 * GET /api/v1/applications/check/:jobId
 * Check if the user has already applied to a specific job.
 * USER only.
 */
applicationRoutes.get(
  '/check/:jobId',
  authenticate,
  requireRole('USER'),
  checkApplication
);

/**
 * GET /api/v1/applications/:applicationId
 * Get application details. Owner (USER) or ADMIN who owns the job.
 */
applicationRoutes.get('/:applicationId', authenticate, getApplicationDetails);

/**
 * PATCH /api/v1/applications/:applicationId/withdraw
 * Withdraw an application. USER only, owner only.
 */
applicationRoutes.patch(
  '/:applicationId/withdraw',
  authenticate,
  requireRole('USER'),
  withdraw
);

/**
 * GET /api/v1/applications/:applicationId/timeline
 * Get application timeline events. Owner (USER) or ADMIN who owns the job.
 */
applicationRoutes.get('/:applicationId/timeline', authenticate, getTimeline);

// =============================================================================
// ADMIN APPLICATION ROUTES — /api/v1/admin/applications
// =============================================================================

const adminApplicationRoutes = Router();

/**
 * GET /api/v1/admin/applications
 * List applications for admin review. ADMIN only (scoped to own jobs).
 * Supports pagination, search, and filters.
 */
adminApplicationRoutes.get(
  '/',
  authenticate,
  requireRole('ADMIN'),
  getAdminApplications
);

/**
 * PATCH /api/v1/admin/applications/:applicationId/status
 * Update application status. ADMIN only (must own the job).
 */
adminApplicationRoutes.patch(
  '/:applicationId/status',
  authenticate,
  requireRole('ADMIN'),
  validate(updateApplicationStatusSchema),
  updateStatus
);

export { applicationRoutes, adminApplicationRoutes };
