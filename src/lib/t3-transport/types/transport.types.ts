/**
 * Transport Configuration and Type Definitions
 */

import { WebViewMessageType } from './message-enums';
import type { WebViewResponse } from './message.types';

/**
 * Transport type identifier
 */
export type TransportType = 'websocket' | 'webview' | 'ffi';

/**
 * Transport connection status
 */
export enum TransportStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * Transport configuration options
 */
export interface TransportConfig {
  /** WebSocket URL (e.g., 'ws://localhost:9104' or 'ws://192.168.1.100:9104') */
  websocketUrl?: string;

  /** API base URL for FFI HTTP calls (e.g., '/api' or 'http://localhost:3000/api') */
  apiBaseUrl?: string;

  /** Enable automatic reconnection */
  autoReconnect?: boolean;

  /** Reconnection interval in milliseconds */
  reconnectInterval?: number;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Enable debug logging */
  debug?: boolean;

  /** Maximum reconnection attempts (0 = infinite) */
  maxReconnectAttempts?: number;
}

/**
 * Default transport configuration
 */
export const DEFAULT_TRANSPORT_CONFIG: Required<TransportConfig> = {
  websocketUrl: 'ws://localhost:9104',
  apiBaseUrl: 'http://localhost:9103/api',
  autoReconnect: true,
  reconnectInterval: 3000,
  timeout: 10000,
  debug: false,
  maxReconnectAttempts: 0
};

/**
 * Transport information
 */
export interface TransportInfo {
  /** Current transport type */
  type: TransportType;

  /** Connection status */
  status: TransportStatus;

  /** Last connection time */
  connectedAt?: Date;

  /** Last error */
  lastError?: string;

  /** Reconnection attempt count */
  reconnectAttempts?: number;
}

/**
 * Transport event types
 */
export enum TransportEvent {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  MESSAGE = 'message',
  RECONNECTING = 'reconnecting'
}

/**
 * Transport event callback
 */
export type TransportEventCallback = (data?: any) => void;

/**
 * Transport interface
 */
export interface ITransport {
  /** Transport type */
  readonly type: TransportType;

  /** Current connection status */
  readonly status: TransportStatus;

  /** Connect to transport */
  connect(): Promise<void>;

  /** Disconnect from transport */
  disconnect(): Promise<void>;

  /** Send message */
  send(action: WebViewMessageType, payload: any): Promise<WebViewResponse>;

  /** Check if transport is available/supported */
  isAvailable(): boolean;

  /** Get transport information */
  getInfo(): TransportInfo;

  /** Register event listener */
  on(event: TransportEvent, callback: TransportEventCallback): void;

  /** Unregister event listener */
  off(event: TransportEvent, callback: TransportEventCallback): void;
}

// Re-export message enum for convenience
export { WebViewMessageType };
export type { WebViewResponse };
