/**
 * In-memory access token management.
 * Access tokens are stored ONLY in memory (never localStorage/sessionStorage).
 * Refresh tokens are managed via HTTP-only cookies by the backend.
 */

let accessToken: string | null = null;

/**
 * Get the current access token from memory.
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Store the access token in memory.
 * @param token - JWT access token string
 */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/**
 * Clear the access token from memory.
 * Called on logout or when the session is invalidated.
 */
export function clearAccessToken(): void {
  accessToken = null;
}
