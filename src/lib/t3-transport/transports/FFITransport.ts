/**
 * FFI Transport
 * Uses HTTP/Axios to call Rust backend, which then calls C++ FFI
 * Endpoint: POST /api/t3000/ffi/call
 */

import { BaseTransport } from './base/BaseTransport';
import {
  TransportConfig,
  TransportStatus,
  WebViewMessageType,
  WebViewResponse
} from '../types/transport.types';
import axios, { AxiosInstance } from 'axios';

export class FFITransport extends BaseTransport {
  private httpClient: AxiosInstance;

  constructor(config?: Partial<TransportConfig>) {
    super('ffi', config);

    // Create axios instance with base configuration
    this.httpClient = axios.create({
      baseURL: this.config.apiBaseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  isAvailable(): boolean {
    // FFI transport is always available (uses HTTP)
    return true;
  }

  async connect(): Promise<void> {
    this.log('Testing FFI connection');
    this.setStatus(TransportStatus.CONNECTING);

    try {
      // Test connection by sending a simple request
      // We'll just set status to connected - actual connection test happens on first send
      this.setStatus(TransportStatus.CONNECTED);
      this.log('FFI transport ready');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.setError(errorMsg);
      this.setStatus(TransportStatus.ERROR);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // No persistent connection for HTTP-based FFI
    this.setStatus(TransportStatus.DISCONNECTED);
    this.log('FFI transport disconnected');
  }

  async send(action: WebViewMessageType, payload: any): Promise<WebViewResponse> {
    if (this._status === TransportStatus.DISCONNECTED) {
      throw new Error('FFI transport is not connected');
    }

    this.log(`Sending FFI request (Action: ${action})`);

    try {
      // Format message to match WebSocket/WebView2 structure
      const requestPayload = {
        header: {
          from: this.getBrowserType()
        },
        message: {
          action,
          msgId: this.generateMessageId(),
          ...payload
        }
      };

      const response = await this.httpClient.post('/t3000/ffi/call', requestPayload);

      this.log(`Received FFI response (Action: ${action})`);

      // Transform response to WebViewResponse format
      const result: WebViewResponse = {
        success: response.data.status === 'success' || response.status === 200,
        message: response.data.message,
        data: response.data.data || response.data,
        timestamp: response.data.timestamp
      };

      return result;

    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'FFI request failed';
      this.setError(errorMsg);
      this.log(`FFI request failed: ${errorMsg}`, 'error');

      // Return error response
      return {
        success: false,
        error: errorMsg,
        message: error.response?.data?.message
      };
    }
  }

  /**
   * Get browser type for header
   */
  private getBrowserType(): string {
    if (typeof navigator === 'undefined') return 'Unknown';

    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Firefox') > -1) {
      return 'Firefox';
    } else if (userAgent.indexOf('Chrome') > -1) {
      return 'Chrome';
    } else if (userAgent.indexOf('Safari') > -1) {
      return 'Safari';
    } else if (userAgent.indexOf('Edge') > -1) {
      return 'Edge';
    } else {
      return 'Unknown';
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update API base URL (useful for switching between localhost and IP)
   */
  updateBaseUrl(baseUrl: string): void {
    this.config.apiBaseUrl = baseUrl;
    this.httpClient.defaults.baseURL = baseUrl;
    this.log(`Updated API base URL to: ${baseUrl}`);
  }

  /**
   * Update timeout
   */
  updateTimeout(timeout: number): void {
    this.config.timeout = timeout;
    this.httpClient.defaults.timeout = timeout;
    this.log(`Updated timeout to: ${timeout}ms`);
  }
}
