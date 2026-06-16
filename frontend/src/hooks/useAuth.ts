'use client';

import { useAuthContext } from '@/providers/AuthProvider';

/**
 * Custom hook for accessing authentication state and actions.
 * Provides: user, isAuthenticated, isLoading, login, register, logout.
 *
 * Must be used within an AuthProvider.
 */
export function useAuth() {
  return useAuthContext();
}
