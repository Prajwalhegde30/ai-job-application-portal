import { create } from 'zustand';

/**
 * Auth store using Zustand.
 * Manages auth state as an alternative/complement to AuthProvider context.
 * Will be fully implemented in Phase 2.
 */
interface AuthState {
  user: null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(() => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
}));
