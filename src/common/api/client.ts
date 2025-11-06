/**
 * API Client
 * Axios-based HTTP client with authentication, error handling, and logging
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { ApiResponse, ApiError, ApiRequestOptions } from '../types';

// Environment variables (will be set by Vite)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const LOCAL_API_URL = import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:8080/api';
const LOCAL_API_SECRET = import.meta.env.VITE_LOCAL_API_SECRET_KEY || 'secret';

// Token management helpers
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }
  return null;
};

const setAuthToken = (token: string, remember: boolean = false): void => {
  if (typeof window !== 'undefined') {
    if (remember) {
      localStorage.setItem('auth_token', token);
    } else {
      sessionStorage.setItem('auth_token', token);
    }
  }
};

const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
  }
};

/**
 * Create Axios instance for live API (cloud/remote server)
 */
export const liveApiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Create Axios instance for local API (local T3000 service)
 */
export const localApiClient: AxiosInstance = axios.create({
  baseURL: LOCAL_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': LOCAL_API_SECRET,
  },
});

/**
 * Request interceptor for live API - adds auth token
 */
liveApiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Request interceptor for local API - adds secret key
 */
localApiClient.interceptors.request.use(
  (config) => {
    config.headers.Authorization = LOCAL_API_SECRET;

    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[Local API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }

    return config;
  },
  (error) => {
    console.error('[Local API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for live API - handles errors and logging
 */
liveApiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }

    return response;
  },
  (error: AxiosError) => {
    // Handle 401 Unauthorized - remove invalid token
    if (error.response?.status === 401) {
      removeAuthToken();
      // Optionally redirect to login
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }

    // Log error
    console.error('[API Response Error]', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });

    return Promise.reject(error);
  }
);

/**
 * Response interceptor for local API - handles errors and logging
 */
localApiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[Local API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }

    return response;
  },
  (error: AxiosError) => {
    console.error('[Local API Response Error]', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });

    return Promise.reject(error);
  }
);

/**
 * Wrapper function to handle API responses with consistent error handling
 */
async function handleApiCall<T>(
  apiCall: Promise<AxiosResponse<ApiResponse<T>>>
): Promise<ApiResponse<T>> {
  try {
    const response = await apiCall;
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError: ApiError = {
        code: error.response?.data?.code || error.code || 'UNKNOWN_ERROR',
        message: error.response?.data?.message || error.message || 'An error occurred',
        details: error.response?.data?.details,
      };

      return {
        success: false,
        error: apiError,
        timestamp: new Date(),
      };
    }

    // Handle non-Axios errors
    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      timestamp: new Date(),
    };
  }
}

/**
 * API utility functions
 */
export const api = {
  /**
   * GET request
   */
  async get<T>(url: string, config?: ApiRequestOptions): Promise<ApiResponse<T>> {
    const client = config?.useLocalApi ? localApiClient : liveApiClient;
    return handleApiCall<T>(client.get(url, config));
  },

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, config?: ApiRequestOptions): Promise<ApiResponse<T>> {
    const client = config?.useLocalApi ? localApiClient : liveApiClient;
    return handleApiCall<T>(client.post(url, data, config));
  },

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, config?: ApiRequestOptions): Promise<ApiResponse<T>> {
    const client = config?.useLocalApi ? localApiClient : liveApiClient;
    return handleApiCall<T>(client.put(url, data, config));
  },

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any, config?: ApiRequestOptions): Promise<ApiResponse<T>> {
    const client = config?.useLocalApi ? localApiClient : liveApiClient;
    return handleApiCall<T>(client.patch(url, data, config));
  },

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: ApiRequestOptions): Promise<ApiResponse<T>> {
    const client = config?.useLocalApi ? localApiClient : liveApiClient;
    return handleApiCall<T>(client.delete(url, config));
  },
};

/**
 * Export token management functions
 */
export const auth = {
  getToken: getAuthToken,
  setToken: setAuthToken,
  removeToken: removeAuthToken,
};

export default api;
