import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from './auth';

/**
 * Configured Axios instance for API communication.
 * - Attaches access token to all requests via interceptor
 * - Automatically refreshes tokens on 401 responses
 * - Sends credentials (cookies) with every request for refresh token handling
 */
/**
 * Helper to construct and normalize the API base URL.
 * Ensures the `/api/v1` suffix is appended if it is missing from the environment variable.
 */
const getBaseURL = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl) {
    return 'http://localhost:8080/api/v1';
  }
  // Trim trailing slash
  const cleanUrl = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  // Append /api/v1 if it doesn't end with it
  if (!cleanUrl.endsWith('/api/v1')) {
    return `${cleanUrl}/api/v1`;
  }
  return cleanUrl;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
  withCredentials: true, // Send HTTP-only cookies with every request
});

/** Flag to prevent multiple simultaneous refresh attempts. */
let isRefreshing = false;
/** Queue of requests waiting for a token refresh to complete. */
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

/**
 * Process the queue of failed requests after a successful token refresh.
 */
function processQueue(
  error: unknown | null,
  token: string | null = null
): void {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token!);
    }
  });
  failedQueue = [];
}

/**
 * Request interceptor: attach access token to Authorization header.
 */
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor: handle 401 errors with automatic token refresh.
 * Uses a queue pattern to prevent multiple simultaneous refresh calls.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't attempt refresh for non-401 errors or if already retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't attempt refresh for auth endpoints (prevent infinite loop)
    if (
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login')
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Another refresh is in progress — queue this request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const response = await api.post('/auth/refresh');
      const newAccessToken = response.data.data.accessToken;

      setAccessToken(newAccessToken);
      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAccessToken();

      // Redirect to login if refresh fails and we're in the browser
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
