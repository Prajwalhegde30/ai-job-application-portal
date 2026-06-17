/**
 * RBAC type definitions and permission matrix.
 * Source of truth: PROJECT.md Section 2 — User Roles & RBAC Matrix.
 *
 * Architecture principle:
 *   Authentication → WHO the user is  (auth.middleware.ts)
 *   Authorization  → WHAT the user can do  (role.middleware.ts)
 */

import { UserRole } from './models';

// Re-export for convenience
export { UserRole };

/**
 * All permission resource areas.
 */
export type Resource =
  | 'auth'
  | 'profile'
  | 'profile:any'
  | 'jobs'
  | 'jobs:mine'
  | 'jobs:create'
  | 'jobs:edit'
  | 'jobs:delete'
  | 'applications'
  | 'applications:mine'
  | 'applications:job'
  | 'applications:status'
  | 'resumes'
  | 'ai:analyze'
  | 'ai:match'
  | 'ai:advisor'
  | 'dashboard:admin'
  | 'dashboard:user'
  | 'notifications';

/**
 * Permission matrix derived from PROJECT.md Section 2.
 * Defines which roles have access to each resource.
 *
 * This is a reference document — actual enforcement is done
 * via requireRole() in route middleware chains.
 */
export const PERMISSION_MATRIX: Record<Resource, UserRole[]> = {
  // Auth — all roles
  auth: [UserRole.ADMIN, UserRole.USER],

  // Profile — own profile: all roles; any profile: ADMIN only
  profile: [UserRole.ADMIN, UserRole.USER],
  'profile:any': [UserRole.ADMIN],

  // Job Management
  jobs: [UserRole.ADMIN, UserRole.USER], // view list
  'jobs:mine': [UserRole.ADMIN], // admin's own jobs
  'jobs:create': [UserRole.ADMIN],
  'jobs:edit': [UserRole.ADMIN],
  'jobs:delete': [UserRole.ADMIN],

  // Application Management
  applications: [UserRole.ADMIN, UserRole.USER],
  'applications:mine': [UserRole.USER], // user views own applications
  'applications:job': [UserRole.ADMIN], // admin views all per job
  'applications:status': [UserRole.ADMIN], // admin updates status

  // Resume Management
  resumes: [UserRole.USER],

  // AI Features
  'ai:analyze': [UserRole.USER],
  'ai:match': [UserRole.USER],
  'ai:advisor': [UserRole.USER],

  // Dashboards
  'dashboard:admin': [UserRole.ADMIN],
  'dashboard:user': [UserRole.USER],

  // Notifications — all roles
  notifications: [UserRole.ADMIN, UserRole.USER],
};

/**
 * Type-safe helper: check if a role has permission on a resource.
 * Used in service-layer ownership checks (not middleware).
 *
 * @param role - The user's role
 * @param resource - The permission resource to check
 * @returns true if the role is permitted
 */
export function hasPermission(
  role: UserRole | string,
  resource: Resource
): boolean {
  const allowedRoles = PERMISSION_MATRIX[resource];
  return allowedRoles.includes(role as UserRole);
}
