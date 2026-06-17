'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { useAuthStore } from '@/store/authStore';
import { setAccessToken, clearAccessToken } from '@/lib/auth';
import api from '@/lib/api';
import type { LoginFormData, RegisterFormData } from '@/lib/validators/auth';

/**
 * Authenticated user data.
 */
interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

/**
 * Auth context type exposing auth state and actions.
 */
interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
  /** True if the authenticated user has the ADMIN role. */
  isAdmin: boolean;
  /** True if the authenticated user has the USER role. */
  isUser: boolean;
  /**
   * Check if the current user has one of the specified roles.
   * @param roles - One or more roles to check against
   */
  hasRole: (...roles: ('ADMIN' | 'USER')[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Auth provider component.
 * - On mount: attempts silent refresh to restore session from HTTP-only cookie
 * - Provides login/register/logout actions to all children
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, setAuth, clearAuth, setLoading } =
    useAuthStore();

  /**
   * Attempt to restore session on mount.
   * If a valid refresh token cookie exists, the backend will return a new access token.
   */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await api.post('/auth/refresh');
        const { accessToken } = response.data.data;
        setAccessToken(accessToken);

        // Fetch user data
        const meResponse = await api.get('/auth/me');
        setAuth(meResponse.data.data);
      } catch {
        // No valid refresh token — user is not authenticated
        clearAuth();
      }
    };

    restoreSession();
  }, [setAuth, clearAuth]);

  /**
   * Login with email and password.
   */
  const login = useCallback(
    async (data: LoginFormData) => {
      setLoading(true);
      try {
        const response = await api.post('/auth/login', data);
        const { user: userData, accessToken } = response.data.data;

        setAccessToken(accessToken);
        setAuth(userData);
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    [setAuth, setLoading]
  );

  /**
   * Register a new user account.
   */
  const register = useCallback(
    async (data: RegisterFormData) => {
      setLoading(true);
      try {
        const response = await api.post('/auth/register', data);
        const { user: userData, accessToken } = response.data.data;

        setAccessToken(accessToken);
        setAuth(userData);
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    [setAuth, setLoading]
  );

  /**
   * Logout: revoke refresh token and clear state.
   */
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Silently ignore logout errors (token may already be expired)
    } finally {
      clearAccessToken();
      clearAuth();
    }
  }, [clearAuth]);

  const isAdmin = user?.role === 'ADMIN';
  const isUser = user?.role === 'USER';

  /** Role check helper — returns true if user has any of the specified roles. */
  const hasRole = useCallback(
    (...roles: ('ADMIN' | 'USER')[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
      isAdmin,
      isUser,
      hasRole,
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
      isAdmin,
      isUser,
      hasRole,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context.
 * Must be used within an AuthProvider.
 */
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
