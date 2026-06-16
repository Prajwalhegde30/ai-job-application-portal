'use client';

import { createContext, useContext } from 'react';

/**
 * Auth context placeholder.
 * Will hold user state, login/logout functions once auth is implemented.
 */
interface AuthContextType {
  user: null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
});

/**
 * Auth provider placeholder.
 * Will be fully implemented in Phase 2 with JWT token management.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: null,
        isAuthenticated: false,
        isLoading: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
