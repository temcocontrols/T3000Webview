/**
 * WebView Message Types - Based on C++ WEBVIEW_MESSAGE_TYPE enum
 * These actions are used for communication with T3000.exe via WebSocket, WebView2, or FFI
 */

import { WebViewMessageType, EntryType, type EntryTypeValue } from './message-enums';
export { WebViewMessageType, EntryType, type EntryTypeValue };

/**
 * Message payload structure for WebView communication
 */
export interface WebViewMessage {
  /** Action type (0-17) */
  action: WebViewMessageType;

  /** Panel ID / Device ID */
  panelId?: number;

  /** Serial number */
  serialNumber?: number;

  /** Entry type (for points: 0=output, 1=input, 2=variable) */
  entryType?: number;

  /** Entry index */
  entryIndex?: number;

  /** Additional data payload */
  data?: any;
}

/**
 * Response structure from T3000
 */
export interface WebViewResponse {
  /** Success status */
  success: boolean;

  /** Response message */
  message?: string;

  /** Response data */
  data?: any;

  /** Error information */
  error?: string;

  /** Timestamp */
  timestamp?: string;
}
