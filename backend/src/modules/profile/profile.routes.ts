import { Router } from 'express';
import {
  getOwnProfile,
  updateOwnProfile,
  getProfileByUserIdAdmin,
  getPublicProfile,
} from './profile.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { updateProfileSchema } from './profile.validators';

const router = Router();

/**
 * GET /api/v1/profile
 * Authenticated — returns the current user's own profile.
 */
router.get('/', authenticate, getOwnProfile);

/**
 * PUT /api/v1/profile
 * Authenticated — updates the current user's own profile.
 * Validated with Zod schema.
 */
router.put('/', authenticate, validate(updateProfileSchema), updateOwnProfile);

/**
 * GET /api/v1/profile/public/:userId
 * Authenticated — returns a public-safe profile for any user.
 * Excludes phone, email, internal identifiers.
 * NOTE: This route MUST be registered before /:userId to prevent
 *       "public" from being captured as a userId parameter.
 */
router.get('/public/:userId', authenticate, getPublicProfile);

/**
 * GET /api/v1/profile/:userId
 * ADMIN only — returns full profile for any user by their user ID.
 */
router.get(
  '/:userId',
  authenticate,
  requireRole('ADMIN'),
  getProfileByUserIdAdmin
);

export default router;
