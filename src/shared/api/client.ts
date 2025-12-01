/**
 * Shared API client for both Vue and React applications
 * Singleton pattern ensures both frameworks use the same instance
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { AuthService } from '../auth/authService';

/**
 * API Client configuration
 */
interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
}

/**
 * Singleton API Client
 */
class ApiClient {
  private static instance: AxiosInstance | null = null;
  private static readonly DEFAULT_BASE_URL = 'http://127.0.0.1:8080/api';
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  /**
   * Get or create the Axios instance
   */
  static getInstance(config?: ApiClientConfig): AxiosInstance {
    if (!ApiClient.instance) {
      ApiClient.instance = axios.create({
        baseURL: config?.baseURL || ApiClient.DEFAULT_BASE_URL,
        timeout: config?.timeout || ApiClient.DEFAULT_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Setup interceptors
      ApiClient.setupRequestInterceptor();
      ApiClient.setupResponseInterceptor();

      console.log('✅ Shared API client initialized');
    }

    return ApiClient.instance;
  }

  /**
   * Request interceptor - Add authentication token
   */
  private static setupRequestInterceptor(): void {
    if (!ApiClient.instance) return;

    ApiClient.instance.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = AuthService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add timestamp to prevent caching
        config.params = {
          ...config.params,
          _t: Date.now(),
        };

        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Response interceptor - Handle errors and token refresh
   */
  private static setupResponseInterceptor(): void {
    if (!ApiClient.instance) return;

    ApiClient.instance.interceptors.response.use(
      (response) => {
        // Success response
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized (token expired)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh token
            const refreshToken = AuthService.getRefreshToken();
            if (refreshToken) {
              const response = await axios.post(
                `${ApiClient.DEFAULT_BASE_URL}/auth/refresh`,
                { refreshToken }
              );

              const { token, user } = response.data;
              AuthService.setToken(token);
              AuthService.setUser(user);

              // Retry original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return axios(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed - logout user
            console.error('Token refresh failed:', refreshError);
            AuthService.logout();
            return Promise.reject(refreshError);
          }
        }

        // Handle 403 Forbidden
        if (error.response?.status === 403) {
          console.error('Access forbidden:', error.response.data);
          // Optionally redirect to access denied page
        }

        // Handle 404 Not Found
        if (error.response?.status === 404) {
          console.error('Resource not found:', error.config?.url);
        }

        // Handle network errors
        if (!error.response) {
          console.error('Network error:', error.message);
          // Optionally show offline notification
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Reset the instance (useful for testing or re-configuration)
   */
  static reset(): void {
    ApiClient.instance = null;
  }

  /**
   * Get base URL
   */
  static getBaseURL(): string {
    return ApiClient.instance?.defaults.baseURL || ApiClient.DEFAULT_BASE_URL;
  }

  /**
   * Update base URL
   */
  static setBaseURL(baseURL: string): void {
    if (ApiClient.instance) {
      ApiClient.instance.defaults.baseURL = baseURL;
    }
  }

  /**
   * Update timeout
   */
  static setTimeout(timeout: number): void {
    if (ApiClient.instance) {
      ApiClient.instance.defaults.timeout = timeout;
    }
  }
}

/**
 * Export the API instance
 * Both Vue and React apps should import this
 */
export const api = ApiClient.getInstance();

/**
 * Export utility functions for API calls
 */
export const ApiUtils = {
  /**
   * Check if error is an Axios error
   */
  isAxiosError: (error: any): error is AxiosError => {
    return axios.isAxiosError(error);
  },

  /**
   * Extract error message from API error
   */
  getErrorMessage: (error: any): string => {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.message) {
        return error.response.data.message;
      }
      if (error.response?.data?.error) {
        return error.response.data.error;
      }
      if (error.message) {
        return error.message;
      }
    }
    return 'An unexpected error occurred';
  },

  /**
   * Check if error is network error
   */
  isNetworkError: (error: any): boolean => {
    return axios.isAxiosError(error) && !error.response;
  },

  /**
   * Check if error is authentication error
   */
  isAuthError: (error: any): boolean => {
    return axios.isAxiosError(error) && error.response?.status === 401;
  },

  /**
   * Check if error is forbidden error
   */
  isForbiddenError: (error: any): boolean => {
    return axios.isAxiosError(error) && error.response?.status === 403;
  },

  /**
   * Check if error is not found error
   */
  isNotFoundError: (error: any): boolean => {
    return axios.isAxiosError(error) && error.response?.status === 404;
  },
};

// Export the ApiClient class for advanced usage
export { ApiClient };
export type { ApiClientConfig };
