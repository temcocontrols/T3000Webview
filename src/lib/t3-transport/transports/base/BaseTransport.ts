/**
 * Base Transport Class
 * Abstract base class for all transport implementations
 */

import {
  ITransport,
  TransportType,
  TransportStatus,
  TransportConfig,
  TransportInfo,
  TransportEvent,
  TransportEventCallback,
  WebViewMessageType,
  WebViewResponse,
  DEFAULT_TRANSPORT_CONFIG
} from '../../types/transport.types';

export abstract class BaseTransport implements ITransport {
  protected config: Required<TransportConfig>;
  protected _status: TransportStatus = TransportStatus.DISCONNECTED;
  protected _connectedAt?: Date;
  protected _lastError?: string;
  protected _reconnectAttempts: number = 0;
  protected eventListeners: Map<TransportEvent, Set<TransportEventCallback>> = new Map();

  constructor(
    public readonly type: TransportType,
    config?: Partial<TransportConfig>
  ) {
    this.config = { ...DEFAULT_TRANSPORT_CONFIG, ...config };

    // Initialize event listener maps
    Object.values(TransportEvent).forEach(event => {
      this.eventListeners.set(event as TransportEvent, new Set());
    });
  }

  get status(): TransportStatus {
    return this._status;
  }

  protected setStatus(status: TransportStatus): void {
    if (this._status !== status) {
      this._status = status;
      this.log(`Status changed: ${status}`);

      // Emit status change events
      if (status === TransportStatus.CONNECTED) {
        this._connectedAt = new Date();
        this._reconnectAttempts = 0;
        this.emit(TransportEvent.CONNECTED);
      } else if (status === TransportStatus.DISCONNECTED) {
        this._connectedAt = undefined;
        this.emit(TransportEvent.DISCONNECTED);
      } else if (status === TransportStatus.RECONNECTING) {
        this.emit(TransportEvent.RECONNECTING, { attempts: this._reconnectAttempts });
      }
    }
  }

  protected setError(error: string | Error): void {
    this._lastError = error instanceof Error ? error.message : error;
    this.log(`Error: ${this._lastError}`, 'error');
    this.emit(TransportEvent.ERROR, { error: this._lastError });
  }

  protected log(message: string, level: 'log' | 'warn' | 'error' = 'log'): void {
    if (this.config.debug) {
      console[level](`[${this.type.toUpperCase()}] ${message}`);
    }
  }

  protected emit(event: TransportEvent, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  on(event: TransportEvent, callback: TransportEventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
  }

  off(event: TransportEvent, callback: TransportEventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  getInfo(): TransportInfo {
    return {
      type: this.type,
      status: this._status,
      connectedAt: this._connectedAt,
      lastError: this._lastError,
      reconnectAttempts: this._reconnectAttempts
    };
  }

  // Abstract methods to be implemented by subclasses
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(action: WebViewMessageType, payload: any): Promise<WebViewResponse>;
  abstract isAvailable(): boolean;
}
