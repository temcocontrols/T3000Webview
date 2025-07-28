/**
 * Secure WebSocket Client for T3000 System
 * Provides encrypted communication and authentication
 */

import MessageType from "../Hvac/Opt/Socket/MessageType"
import MessageModel from "../Hvac/Opt/Socket/MessageModel"
import { T3Security } from './T3SecurityUtil';
import LogUtil from "../Hvac/Util/LogUtil"

export interface SecureWebSocketConfig {
  useSSL: boolean;
  authToken?: string;
  validateCertificate: boolean;
  maxRetries: number;
  pingInterval: number;
  connectionTimeout: number;
}

export interface MessageValidation {
  isValid: boolean;
  sanitizedData?: any;
  error?: string;
}

/**
 * Secure WebSocket Client with encryption and authentication
 */
class SecureWebSocketClient {
  private socket: WebSocket | null = null;
  private retries: number = 0;
  private config: SecureWebSocketConfig;
  private pingIntervalId: NodeJS.Timeout | null = null;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private uri: string;
  private isDestroyed: boolean = false;
  private messageQueue: string[] = [];
  private authToken: string | null = null;
  private sessionId: string | null = null;

  constructor(config: Partial<SecureWebSocketConfig> = {}) {
    this.config = {
      useSSL: true, // Default to secure connections
      validateCertificate: true,
      maxRetries: 10,
      pingInterval: 10000,
      connectionTimeout: 30000,
      ...config
    };
  }

  /**
   * Set authentication token for secure connection
   */
  public setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Connect to T3000 server with security
   */
  public async connect(uri: string): Promise<boolean> {
    if (this.isDestroyed) {
      LogUtil.Error('Cannot connect: SecureWebSocketClient has been destroyed');
      return false;
    }

    this.cleanup();
    this.uri = uri;

    // Use WSS (secure WebSocket) when SSL is enabled
    const protocol = this.config.useSSL ? 'wss' : 'ws';
    const wsUri = `${protocol}://${this.uri}:9104`;

    try {
      // Generate session ID for this connection
      this.sessionId = T3Security.generateSecureId('session');

      LogUtil.Info(`Attempting secure connection to: ${wsUri}`);

      this.socket = new WebSocket(wsUri);
      this.setupSecureEventHandlers();

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.config.connectionTimeout);

        this.socket!.onopen = () => {
          clearTimeout(timeout);
          LogUtil.Info('Secure WebSocket connection established');
          this.onSecureConnectionOpen();
          resolve(true);
        };

        this.socket!.onerror = (error) => {
          clearTimeout(timeout);
          LogUtil.Error('Secure WebSocket connection failed:', error);
          reject(error);
        };
      });

    } catch (error) {
      LogUtil.Error('Failed to create secure WebSocket connection:', error);
      return false;
    }
  }

  /**
   * Setup secure event handlers with validation
   */
  private setupSecureEventHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.onSecureConnectionOpen();
    };

    this.socket.onmessage = (event) => {
      this.handleSecureMessage(event);
    };

    this.socket.onclose = (event) => {
      this.handleSecureClose(event);
    };

    this.socket.onerror = (error) => {
      this.handleSecureError(error);
    };
  }

  /**
   * Handle secure connection opening
   */
  private onSecureConnectionOpen(): void {
    LogUtil.Info('Secure WebSocket connection opened');
    this.retries = 0;

    // Start secure ping mechanism
    this.startSecurePing();

    // Send authentication if token is available
    if (this.authToken) {
      this.sendAuthenticationMessage();
    }

    // Process queued messages
    this.processMessageQueue();
  }

  /**
   * Send authentication message
   */
  private sendAuthenticationMessage(): void {
    const authMessage = {
      type: 999, // Custom authentication type
      sessionId: this.sessionId,
      token: this.authToken,
      timestamp: Date.now()
    };

    this.sendSecureMessage(JSON.stringify(authMessage));
  }

  /**
   * Handle incoming messages with security validation
   */
  private handleSecureMessage(event: MessageEvent): void {
    try {
      const validation = this.validateMessage(event.data);

      if (!validation.isValid) {
        console.warn(`Invalid message received: ${validation.error}`);
        return;
      }

      const messageData = validation.sanitizedData;

      // Process authenticated message
      this.processAuthenticatedMessage(messageData);

    } catch (error) {
      LogUtil.Error('Error processing secure message:', error);
    }
  }

  /**
   * Validate incoming message for security
   */
  private validateMessage(rawData: string): MessageValidation {
    try {
      // Basic validation
      if (!rawData || typeof rawData !== 'string') {
        return { isValid: false, error: 'Invalid message format' };
      }

      // Sanitize the message content
      const sanitizedData = T3Security.validateInput(rawData, 'text');

      // Attempt to parse as JSON if applicable
      let parsedData;
      try {
        parsedData = JSON.parse(sanitizedData);
      } catch {
        // Not JSON, treat as plain text
        parsedData = sanitizedData;
      }

      // Additional validation for T3000 message structure
      if (typeof parsedData === 'object' && parsedData !== null) {
        if (!this.isValidT3000Message(parsedData)) {
          return { isValid: false, error: 'Invalid T3000 message structure' };
        }
      }

      return { isValid: true, sanitizedData: parsedData };

    } catch (error) {
      return { isValid: false, error: `Validation error: ${error}` };
    }
  }

  /**
   * Validate T3000 specific message structure
   */
  private isValidT3000Message(data: any): boolean {
    // Basic T3000 message validation
    if (data.type && typeof data.type === 'number') {
      return Object.values(MessageType).includes(data.type);
    }
    return true; // Allow other message types
  }

  /**
   * Process authenticated and validated message
   */
  private processAuthenticatedMessage(data: any): void {
    // Handle different message types securely
    if (typeof data === 'object' && data.type) {
      switch (data.type) {
        case 999: // Authentication response
          this.handleAuthenticationResponse(data);
          break;
        case 998: // Data update
          this.handleSecureDataUpdate(data);
          break;
        default:
          // Handle existing T3000 message types
          LogUtil.Info('Received secure message:', data.type);
          break;
      }
    }
  }

  /**
   * Handle authentication response
   */
  private handleAuthenticationResponse(data: any): void {
    if (data.success) {
      LogUtil.Info('Authentication successful');
      // Store session info securely
      this.sessionId = data.sessionId;
    } else {
      LogUtil.Error('Authentication failed:', data.message);
      this.disconnect();
    }
  }

  /**
   * Handle secure data updates
   */
  private handleSecureDataUpdate(data: any): void {
    // Validate data structure before processing
    if (this.validateDataStructure(data.payload)) {
      // Process the validated data
      LogUtil.Info('Processing secure data update');
    } else {
      console.warn('Invalid data structure in update');
    }
  }

  /**
   * Validate data structure for updates
   */
  private validateDataStructure(payload: any): boolean {
    // Implement T3000-specific data validation
    return payload && typeof payload === 'object';
  }

  /**
   * Send message with security checks
   */
  public sendSecureMessage(message: string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket not connected');
      this.messageQueue.push(message);
      return false;
    }

    try {
      // Validate outgoing message
      const sanitizedMessage = T3Security.validateInput(message, 'text');

      // Add security headers if authenticated
      const secureMessage = this.addSecurityHeaders(sanitizedMessage);

      this.socket.send(secureMessage);
      LogUtil.Debug('Secure message sent successfully');
      return true;

    } catch (error) {
      LogUtil.Error('Failed to send secure message:', error);
      return false;
    }
  }

  /**
   * Add security headers to outgoing messages
   */
  private addSecurityHeaders(message: string): string {
    try {
      const messageObj = JSON.parse(message);

      // Add security headers
      messageObj.sessionId = this.sessionId;
      messageObj.timestamp = Date.now();

      // Add integrity check
      messageObj.checksum = this.calculateChecksum(message);

      return JSON.stringify(messageObj);
    } catch {
      // If not JSON, send as-is but log warning
      console.warn('Sending non-JSON message without security headers');
      return message;
    }
  }

  /**
   * Calculate simple checksum for message integrity
   */
  private calculateChecksum(message: string): string {
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Start secure ping mechanism
   */
  private startSecurePing(): void {
    this.pingIntervalId = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        const pingMessage = {
          type: 997, // Custom ping type
          sessionId: this.sessionId,
          timestamp: Date.now()
        };
        this.sendSecureMessage(JSON.stringify(pingMessage));
      }
    }, this.config.pingInterval);
  }

  /**
   * Handle secure connection close
   */
  private handleSecureClose(event: CloseEvent): void {
    LogUtil.Info(`Secure WebSocket connection closed: ${event.code} - ${event.reason}`);
    this.cleanup();

    if (!this.isDestroyed && this.retries < this.config.maxRetries) {
      this.scheduleSecureReconnect();
    }
  }

  /**
   * Handle secure connection error
   */
  private handleSecureError(error: Event): void {
    LogUtil.Error('Secure WebSocket error:', error);
  }

  /**
   * Schedule secure reconnection
   */
  private scheduleSecureReconnect(): void {
    const delay = Math.min(1000 * Math.pow(2, this.retries), 30000); // Exponential backoff, max 30s

    LogUtil.Info(`Scheduling secure reconnection in ${delay}ms (attempt ${this.retries + 1})`);

    this.reconnectTimeoutId = setTimeout(async () => {
      this.retries++;
      await this.connect(this.uri);
    }, delay);
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendSecureMessage(message);
      }
    }
  }

  /**
   * Disconnect securely
   */
  public disconnect(): void {
    LogUtil.Info('Disconnecting secure WebSocket');
    this.cleanup();

    if (this.socket) {
      this.socket.close(1000, 'Normal closure');
      this.socket = null;
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    // Clear sensitive data
    this.authToken = null;
    this.sessionId = null;
    this.messageQueue = [];
  }

  /**
   * Destroy the client
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
    LogUtil.Info('Secure WebSocket client destroyed');
  }

  /**
   * Get connection status
   */
  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection info
   */
  public getConnectionInfo() {
    return {
      connected: this.isConnected(),
      sessionId: this.sessionId,
      retries: this.retries,
      useSSL: this.config.useSSL
    };
  }
}

export default SecureWebSocketClient;
