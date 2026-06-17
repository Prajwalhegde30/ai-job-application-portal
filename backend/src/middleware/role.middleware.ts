import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/models';

/**
 * RBAC middleware factory — requireRole().
 *
 * Creates a middleware that enforces role-based access control on a route.
 * Must be used AFTER the `authenticate` middleware (which populates req.user).
 *
 * Authorization is fully separated from authentication:
 * - `authenticate` determines WHO the user is.
 * - `requireRole` determines WHAT the user can do.
 *
 * @param roles - One or more roles allowed to access the route.
 * @returns Express middleware that returns 403 if the user's role is not in `roles`.
 *
 * @example
 * // Single role
 * router.post('/jobs', authenticate, requireRole('ADMIN'), createJob);
 *
 * @example
 * // Multiple roles
 * router.get('/notifications', authenticate, requireRole('ADMIN', 'USER'), getNotifications);
 */
export function requireRole(
  ...roles: (UserRole | 'ADMIN' | 'USER')[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Defensive: authenticate must run first
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication is required',
        },
      });
      return;
    }

    const userRole = req.user.role;

    if (!roles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${userRole}`,
        },
      });
      return;
    }

    next();
  };
}
