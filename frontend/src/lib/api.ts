import axios from 'axios';

/**
 * Configured Axios instance for API communication.
 * Base URL reads from environment variable.
 * Interceptors for token refresh will be added in Phase 2.
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor — will add Authorization header in Phase 2
// api.interceptors.request.use(...)

// Response interceptor — will handle 401 + token refresh in Phase 2
// api.interceptors.response.use(...)

export default api;
