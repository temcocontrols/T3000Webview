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
      const requestId = response.id;

      if (requestId && this.pendingRequests.has(requestId)) {
        const pending = this.pendingRequests.get(requestId)!;
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(requestId);

        this.log(`Received response from C++ (ID: ${requestId})`);
        pending.resolve(response);
      } else {
        // Unsolicited message from C++ (notification/event)
        this.log('Received unsolicited message from C++');
        this.emit('message' as any, response);
      }
    } catch (error) {
      this.log(`Failed to parse message from C++: ${error}`, 'error');
    }
  }

  private generateRequestId(): string {
    return `webview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
