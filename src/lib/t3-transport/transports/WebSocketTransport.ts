/**
 * WebSocket Transport
 * Connects to T3000 WebSocket server (default port: 9104)
 */

import { BaseTransport } from './base/BaseTransport';
import {
  TransportConfig,
  TransportStatus,
  WebViewMessageType,
  WebViewResponse
} from '../types/transport.types';

export class WebSocketTransport extends BaseTransport {
  private ws?: WebSocket;
  private reconnectTimer?: number;
  private pendingRequests: Map<string, {
    resolve: (value: WebViewResponse) => void;
    reject: (reason: any) => void;
    timeout: number;
  }> = new Map();

  constructor(config?: Partial<TransportConfig>) {
    super('websocket', config);
  }

  isAvailable(): boolean {
    return typeof WebSocket !== 'undefined';
  }

  async connect(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('WebSocket is not available in this environment');
    }

    if (this._status === TransportStatus.CONNECTED) {
      this.log('Already connected');
      return;
    }

    this.setStatus(TransportStatus.CONNECTING);
    this.log(`Connecting to ${this.config.websocketUrl}`);

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.websocketUrl);

        this.ws.onopen = () => {
          this.log('Connected');
          this.setStatus(TransportStatus.CONNECTED);
          resolve();
        };

        this.ws.onerror = (event) => {
          const error = `WebSocket error: ${event.type}`;
          this.setError(error);
          this.setStatus(TransportStatus.ERROR);
          reject(new Error(error));

          // Auto-reconnect if enabled
          if (this.config.autoReconnect) {
            this.scheduleReconnect();
          }
        };

        this.ws.onclose = () => {
          this.log('Connection closed');
          this.setStatus(TransportStatus.DISCONNECTED);

          // Auto-reconnect if enabled and not manually disconnected
          if (this.config.autoReconnect && this._status !== TransportStatus.DISCONNECTED) {
            this.scheduleReconnect();
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.setError(errorMsg);
        this.setStatus(TransportStatus.ERROR);
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }

    // Reject all pending requests
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('WebSocket disconnected'));
    });
    this.pendingRequests.clear();

    this.setStatus(TransportStatus.DISCONNECTED);
    this.log('Disconnected');
  }

  async send(action: WebViewMessageType, payload: any): Promise<WebViewResponse> {
    if (this._status !== TransportStatus.CONNECTED || !this.ws) {
      throw new Error('WebSocket is not connected');
    }

    const requestId = this.generateRequestId();
    const message = {
      id: requestId,
      action,
      ...payload
    };

    this.log(`Sending message (ID: ${requestId}, Action: ${action})`);

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

      // Send message
      try {
        this.ws!.send(JSON.stringify(message));
      } catch (error) {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private handleMessage(data: string): void {
    try {
      const response = JSON.parse(data);

      // Check if this is an error response
      const hasError = response.error !== undefined || response?.status === false;
      if (hasError) {
        this.log(`Received error response: ${response.error || 'Unknown error'}`, 'error');
        // Try to match with pending request by panel_id or serialNumber
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
        // Direct ID match (modern approach)
        const pending = this.pendingRequests.get(requestId)!;
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(requestId);

        this.log(`Received response (ID: ${requestId})`);
        pending.resolve({
          success: true,
          data: response.data || response,
          message: response.message
        });
      } else if (response.action) {
        // Response action-based matching (C++ backend pattern)
        // Actions like 'GET_PANEL_DATA_RES', 'GET_PANELS_LIST_RES', etc.
        const matchingRequest = this.findMatchingPendingRequest(response);
        if (matchingRequest) {
          const pending = this.pendingRequests.get(matchingRequest)!;
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(matchingRequest);

          this.log(`Received response (Action: ${response.action})`);
          pending.resolve({
            success: true,
            data: response.data || response,
            message: response.message
          });
        } else {
          // Unsolicited message (notification/event)
          this.log(`Received unsolicited message (Action: ${response.action})`);
          this.emit('message' as any, response);
        }
      } else if (response.action === 'DATA_SERVER_ONLINE' || response.action === -1) {
        // Special notification: T3000 data server is online
        this.log('T3000 data server is online');
        this.emit('message' as any, response);
      } else {
        // Unsolicited message (notification/event)
        this.log('Received unsolicited message');
        this.emit('message' as any, response);
      }
    } catch (error) {
      this.log(`Failed to parse message: ${error}`, 'error');
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

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    // Check max reconnect attempts
    if (this.config.maxReconnectAttempts > 0 &&
        this._reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached', 'warn');
      this.setStatus(TransportStatus.ERROR);
      return;
    }

    this._reconnectAttempts++;
    this.setStatus(TransportStatus.RECONNECTING);

    this.log(`Reconnecting in ${this.config.reconnectInterval}ms (attempt ${this._reconnectAttempts})`);

    this.reconnectTimer = window.setTimeout(async () => {
      this.reconnectTimer = undefined;
      try {
        await this.connect();
      } catch (error) {
        this.log(`Reconnection failed: ${error}`, 'error');
      }
    }, this.config.reconnectInterval);
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
