import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { sendSuccess } from '../../utils/response';
import { PERMISSION_MATRIX } from '../../types/rbac';

/**
 * RBAC test routes.
 * Used to verify that role-based access control is working correctly.
 * These routes exist for automated and manual integration testing only.
 *
 * Registered at: /api/v1/rbac-test
 *
 * Routes:
 *  GET /rbac-test/admin-only    → 200 for ADMIN, 403 for USER
 *  GET /rbac-test/user-only     → 200 for USER, 403 for ADMIN
 *  GET /rbac-test/both          → 200 for ADMIN and USER
 *  GET /rbac-test/matrix        → returns the full permission matrix (any authenticated)
 *  GET /rbac-test/whoami        → returns req.user payload
 */
export const rbacTestRoutes = Router();

/**
 * GET /rbac-test/admin-only
 * Access: ADMIN only
 */
rbacTestRoutes.get(
  '/admin-only',
  authenticate,
  requireRole('ADMIN'),
  (req, res) => {
    sendSuccess(res, {
      message: 'You have ADMIN access',
      user: req.user,
    });
  }
);

/**
 * GET /rbac-test/user-only
 * Access: USER only
 */
rbacTestRoutes.get(
  '/user-only',
  authenticate,
  requireRole('USER'),
  (req, res) => {
    sendSuccess(res, {
      message: 'You have USER access',
      user: req.user,
    });
  }
);

/**
 * GET /rbac-test/both
 * Access: ADMIN or USER
 */
rbacTestRoutes.get(
  '/both',
  authenticate,
  requireRole('ADMIN', 'USER'),
  (req, res) => {
    sendSuccess(res, {
      message: 'You have authenticated access',
      user: req.user,
    });
  }
);

/**
 * GET /rbac-test/matrix
 * Returns the permission matrix for documentation/debugging.
 * Access: ADMIN or USER (authenticated)
 */
rbacTestRoutes.get(
  '/matrix',
  authenticate,
  requireRole('ADMIN', 'USER'),
  (_req, res) => {
    sendSuccess(res, {
      permissionMatrix: PERMISSION_MATRIX,
    });
  }
);

/**
 * GET /rbac-test/whoami
 * Returns the current authenticated user's JWT payload.
 * Access: ADMIN or USER (authenticated)
 */
rbacTestRoutes.get(
  '/whoami',
  authenticate,
  requireRole('ADMIN', 'USER'),
  (req, res) => {
    sendSuccess(res, {
      user: req.user,
    });
  }
);
