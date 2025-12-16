/**
 * T3 Transport Library
 * Unified communication layer for T3000 WebSocket, WebView2, and FFI transports
 *
 * @example
 * ```typescript
 * import { T3Transport, WebViewMessageType } from '@/lib/t3-transport';
 *
 * // Auto-detect and connect
 * const transport = new T3Transport({ debug: true });
 * await transport.autoConnect();
 *
 * // Get device list
 * const devices = await transport.getDeviceList();
 *
 * // Or use specific transport
 * await transport.connect('websocket');
 *
 * // Generic send
 * const result = await transport.send(WebViewMessageType.GET_PANELS_LIST, {});
 * ```
 */

// Core transport class
export { T3Transport } from './core/T3Transport';

// Transport implementations
export { WebSocketTransport } from './transports/WebSocketTransport';
export { WebViewTransport } from './transports/WebViewTransport';
export { FFITransport } from './transports/FFITransport';
export { BaseTransport } from './transports/base/BaseTransport';

// Types and enums
export {
  // Message types
  WebViewMessageType,
  EntryType,
  type WebViewMessage,
  type WebViewResponse,
  type EntryTypeValue
} from './types/message.types';

export {
  // Transport types
  TransportStatus,
  TransportEvent,
  type TransportType,
  type TransportConfig,
  type TransportInfo,
  type TransportEventCallback,
  type ITransport,
  DEFAULT_TRANSPORT_CONFIG
} from './types/transport.types';
