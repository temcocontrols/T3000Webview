/**
 * WebView2 Transport
 * Uses window.chrome.webview.postMessage() for direct communication with C++ in desktop app
 */

import { BaseTransport } from './base/BaseTransport';
import {
  TransportConfig,
  TransportStatus,
  WebViewMessageType,
  WebViewResponse
} from '../types/transport.types';

// Extend Window interface for WebView2
declare global {
  interface Window {
    chrome?: {
      webview?: {
        postMessage(message: any): void;
        addEventListener(type: string, listener: (event: any) => void): void;
        removeEventListener(type: string, listener: (event: any) => void): void;
      };
    };
  }
}

export class WebViewTransport extends BaseTransport {
  private messageHandler?: (event: any) => void;
  private pendingRequests: Map<string, {
    resolve: (value: WebViewResponse) => void;
    reject: (reason: any) => void;
    timeout: number;
  }> = new Map();

  constructor(config?: Partial<TransportConfig>) {
    super('webview', config);
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' &&
           typeof window.chrome?.webview?.postMessage === 'function';
  }

  async connect(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('WebView2 is not available (not running in desktop app)');
    }

    this.log('Connecting to WebView2');

    // Set up message handler
    this.messageHandler = (event: any) => {
      this.handleMessage(event.data);
    };

    window.chrome!.webview!.addEventListener('message', this.messageHandler);

    this.setStatus(TransportStatus.CONNECTED);
    this.log('Connected to WebView2');
  }

  async disconnect(): Promise<void> {
    if (this.messageHandler && window.chrome?.webview) {
      window.chrome.webview.removeEventListener('message', this.messageHandler);
      this.messageHandler = undefined;
    }

    // Reject all pending requests
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('WebView2 transport disconnected'));
    });
    this.pendingRequests.clear();

    this.setStatus(TransportStatus.DISCONNECTED);
    this.log('Disconnected from WebView2');
  }

  async send(action: WebViewMessageType, payload: any): Promise<WebViewResponse> {
    if (!this.isAvailable()) {
      throw new Error('WebView2 is not available');
    }

    if (this._status !== TransportStatus.CONNECTED) {
      throw new Error('WebView2 transport is not connected');
    }

    const requestId = this.generateRequestId();
    const message = {
      id: requestId,
      action,
      ...payload
    };

    this.log(`Sending message to C++ (ID: ${requestId}, Action: ${action})`);

    return new Promise((resolve, reject) => {
      // Set timeout for this request
      const timeoutId = window.setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout (${this.config.timeout}ms)`));
      }, this.config.timeout);

      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutId
      });

      // Send message to C++ via WebView2
      try {
        window.chrome!.webview!.postMessage(message);
      } catch (error) {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private handleMessage(data: any): void {
    try {
      const response = typeof data === 'string' ? JSON.parse(data) : data;

      // Check if this is an error response
      const hasError = response.error !== undefined || response?.status === false;
      if (hasError) {
        this.log(`Received error response from C++: ${response.error || 'Unknown error'}`, 'error');
        // Try to match with pending request
        const matchingRequest = this.findMatchingPendingRequest(response);
        if (matchingRequest) {
          const pending = this.pendingRequests.get(matchingRequest)!;
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(matchingRequest);
          pending.resolve({
            success: false,
            error: response.error,
            message: response.message,
            data: response
          });
        } else {
          // Emit as error event
          this.emit('error' as any, response);
        }
        return;
      }

      const requestId = response.id;

      if (requestId && this.pendingRequests.has(requestId)) {
        // Direct ID match
        const pending = this.pendingRequests.get(requestId)!;
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(requestId);

        this.log(`Received response from C++ (ID: ${requestId})`);
        pending.resolve({
          success: true,
          data: response.data || response,
          message: response.message
        });
      } else if (response.action) {
        // Response action-based matching (C++ backend pattern)
        const matchingRequest = this.findMatchingPendingRequest(response);
        if (matchingRequest) {
          const pending = this.pendingRequests.get(matchingRequest)!;
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(matchingRequest);

          this.log(`Received response from C++ (Action: ${response.action})`);
          pending.resolve({
            success: true,
            data: response.data || response,
            message: response.message
          });
        } else {
          // Unsolicited message from C++ (notification/event)
          this.log(`Received unsolicited message from C++ (Action: ${response.action})`);
          this.emit('message' as any, response);
        }
      } else if (response.action === 'DATA_SERVER_ONLINE' || response.action === -1) {
        // Special notification: T3000 data server is online
        this.log('T3000 data server is online (C++)');
        this.emit('message' as any, response);
      } else {
        // Unsolicited message from C++ (notification/event)
        this.log('Received unsolicited message from C++');
        this.emit('message' as any, response);
      }
    } catch (error) {
      this.log(`Failed to parse message from C++: ${error}`, 'error');
    }
  }

  /**
   * Find matching pending request based on response context
   * Used when response doesn't have direct ID but has panel_id, serialNumber, or action
   */
  private findMatchingPendingRequest(response: any): string | undefined {
    // Strategy 1: Match by panel_id and action context
    if (response.panel_id !== undefined || response.panelId !== undefined) {
      const panelId = response.panel_id || response.panelId;
      // Find most recent request that matches this panel
      for (const [requestId] of this.pendingRequests) {
        return requestId; // Return first pending (FIFO assumption)
      }
    }

    // Strategy 2: Match by serialNumber
    if (response.serialNumber !== undefined || response.serial_number !== undefined) {
      for (const [requestId] of this.pendingRequests) {
        return requestId; // Return first pending (FIFO assumption)
      }
    }

    // Strategy 3: Return first pending request (FIFO)
    const firstPending = this.pendingRequests.keys().next();
    return firstPending.done ? undefined : firstPending.value;
  }

  private generateRequestId(): string {
    return `webview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
