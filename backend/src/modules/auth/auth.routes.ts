import { Router } from 'express';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  meHandler,
} from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { registerSchema, loginSchema } from './auth.validators';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Public — creates a new USER account with auto-profile creation.
 */
router.post('/register', validate(registerSchema), registerHandler);

/**
 * POST /api/v1/auth/login
 * Public — authenticates user and returns access token + refresh cookie.
 */
router.post('/login', validate(loginSchema), loginHandler);

/**
 * POST /api/v1/auth/refresh
 * Public — rotates refresh token from HTTP-only cookie.
 */
router.post('/refresh', refreshHandler);

/**
 * POST /api/v1/auth/logout
 * Authenticated — revokes refresh token and clears cookie.
 */
router.post('/logout', authenticate, logoutHandler);

/**
 * GET /api/v1/auth/me
 * Authenticated — returns current user data.
 */
router.get('/me', authenticate, meHandler);

export default router;
