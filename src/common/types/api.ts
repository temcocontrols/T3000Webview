/**
 * API response types
 */

// Generic API response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
}

// API error
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// API request options
export interface ApiRequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  useLocalApi?: boolean; // If true, use local API client instead of live API
}

// WebSocket message
export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: Date;
  id?: string;
}

// WebSocket connection state
export enum WebSocketState {
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnecting = 'disconnecting',
  Disconnected = 'disconnected',
  Error = 'error',
}
