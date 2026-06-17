'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface RoleGuardProps {
  /** The roles allowed to access the wrapped content. */
  roles: ('ADMIN' | 'USER')[];
  /** Content to render when authorized. */
  children: React.ReactNode;
  /**
   * Optional redirect path on unauthorized access.
   * Defaults to '/dashboard' so users land on their correct dashboard.
   */
  redirectTo?: string;
  /**
   * If true, renders null silently instead of redirecting.
   * Useful for conditionally hiding UI elements.
   */
  silent?: boolean;
}

/**
 * RoleGuard component.
 * Wraps content that should only be visible to specific roles.
 *
 * Behaviour:
 * - While loading: renders null (parent AuthGuard already shows spinner)
 * - Authenticated + wrong role: redirects to `redirectTo` (default: /dashboard)
 * - Authenticated + correct role: renders children
 * - `silent` mode: renders null without redirecting (for partial page guards)
 *
 * NOTE: This is a client-side convenience guard only.
 * Backend remains the source of truth for authorization.
 * All API routes enforce requireRole() middleware independently.
 *
 * @example
 * // Page-level guard (redirects away)
 * <RoleGuard roles={['ADMIN']} redirectTo="/dashboard">
 *   <AdminDashboard />
 * </RoleGuard>
 *
 * @example
 * // UI-element guard (hides element, no redirect)
 * <RoleGuard roles={['ADMIN']} silent>
 *   <CreateJobButton />
 * </RoleGuard>
 */
export function RoleGuard({
  roles,
  children,
  redirectTo = '/dashboard',
  silent = false,
}: RoleGuardProps) {
  const { isLoading, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();

  const isAuthorized = isAuthenticated && hasRole(...roles);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return; // AuthGuard handles this redirect
    if (!isAuthorized && !silent) {
      router.replace(redirectTo);
    }
  }, [isLoading, isAuthenticated, isAuthorized, silent, redirectTo, router]);

  // While loading, render nothing (parent AuthGuard shows spinner)
  if (isLoading) return null;

  // Not authenticated — AuthGuard will handle redirect
  if (!isAuthenticated) return null;

  // Authorized — render children
  if (isAuthorized) return <>{children}</>;

  // Unauthorized + silent mode — hide element
  if (silent) return null;

  // Unauthorized + redirect mode — render null while redirect fires
  return null;
}
