import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { CONFIG } from '../config';
import { getItem, setItem, removeItem, STORAGE_KEYS } from '../utils/storage';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: CONFIG.apiBaseUrl,
  timeout: CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip adding token for auth endpoints
    const skipAuthEndpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];
    const isAuthEndpoint = skipAuthEndpoints.some((endpoint) => config.url?.includes(endpoint));

    if (!isAuthEndpoint) {
      const token = await getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // For refresh endpoint, use refresh token instead
    if (config.url?.includes('/api/auth/refresh')) {
      const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken && config.headers) {
        config.headers.Authorization = `Bearer ${refreshToken}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // If error is not 401 or request has already been retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't retry for auth endpoints
    const skipRetryEndpoints = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/auth/logout',
    ];
    const shouldSkipRetry = skipRetryEndpoints.some((endpoint) =>
      originalRequest.url?.includes(endpoint)
    );

    if (shouldSkipRetry) {
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Try to refresh token
      const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Call refresh endpoint
      const response = await axios.post(
        `${CONFIG.apiBaseUrl}/api/auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { access_token, refresh_token } = response.data;

      // Store new tokens
      await setItem(STORAGE_KEYS.AUTH_TOKEN, access_token);
      await setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);

      // Update header for original request
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
      }

      // Process queued requests
      processQueue(null, access_token);

      // Retry original request
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed - logout user
      processQueue(refreshError, null);

      // Clear tokens
      await removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await removeItem(STORAGE_KEYS.USER_PROFILE);
      await removeItem(STORAGE_KEYS.ONBOARDING_COMPLETE);

      // You might want to navigate to login screen here
      // But we can't access navigation from here, so the AuthContext will handle it

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// API service functions
export const api = {
  // Health check endpoint
  healthCheck: async () => {
    try {
      const response = await apiClient.get('/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default apiClient;
