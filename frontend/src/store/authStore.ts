import { create } from 'zustand';

/**
 * Authenticated user data stored in the client.
 */
interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

/**
 * Auth state managed by Zustand.
 * Access token stored in memory (via lib/auth.ts).
 * Refresh token stored in HTTP-only cookie (managed by browser).
 */
interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AuthUser) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // True initially until auth check completes

  setAuth: (user: AuthUser) =>
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
    }),

  clearAuth: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
