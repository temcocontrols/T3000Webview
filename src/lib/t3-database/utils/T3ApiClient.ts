/**
 * HTTP Client for T3 Database API
 * Configured axios instance with defaults for T3000 backend communication
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class HttpClient {
  private axiosInstance: AxiosInstance;

  constructor(config: HttpClientConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000, // 30 seconds default
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (request) => {
        // Log requests in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[HTTP] ${request.method?.toUpperCase()} ${request.url}`);
        }
        return request;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error: AxiosError) => {
        // Enhanced error handling
        if (error.response) {
          // Server responded with error status
          console.error(`[HTTP Error] ${error.response.status}: ${error.response.statusText}`);
          if (error.response.data) {
            console.error('[HTTP Error Data]', error.response.data);
          }
        } else if (error.request) {
          // Request made but no response received
          console.error('[HTTP Error] No response received from server');
        } else {
          // Error in request setup
          console.error('[HTTP Error]', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.delete(url, config);
    return response.data;
  }

  // Get raw axios instance for advanced usage
  getInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// Factory function for creating configured HTTP client
export function createHttpClient(baseURL: string, config?: Partial<HttpClientConfig>): HttpClient {
  return new HttpClient({
    baseURL,
    ...config,
  });
}
