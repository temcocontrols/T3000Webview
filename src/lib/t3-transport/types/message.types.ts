/**
 * WebView Message Types - Based on C++ WEBVIEW_MESSAGE_TYPE enum
 * These actions are used for communication with T3000.exe via WebSocket, WebView2, or FFI
 */

/**
 * WebView Message Type Enum
 * Maps to C++ enum WEBVIEW_MESSAGE_TYPE in T3000.exe
 * Actions 0-17 for graphics, device management, and data synchronization
 */
export enum WebViewMessageType {
  /** Get panel/graphics data */
  GET_PANEL_DATA = 0,

  /** Get initial graphics data */
  GET_INITIAL_DATA = 1,

  /** Save graphic data */
  SAVE_GRAPHIC_DATA = 2,

  /** Update single entry (graphics or point) */
  UPDATE_ENTRY = 3,

  /** Get lightweight device list */
  GET_PANELS_LIST = 4,

  /** Get panel range information */
  GET_PANEL_RANGE_INFO = 5,

  /** Get graphic entries */
  GET_ENTRIES = 6,

  /** Load specific graphic entry */
  LOAD_GRAPHIC_ENTRY = 7,

  /** Open entry edit window */
  OPEN_ENTRY_EDIT_WINDOW = 8,

  /** Save image data */
  SAVE_IMAGE = 9,

  /** Save library data */
  SAVE_LIBRAY_DATA = 10,

  /** Delete image */
  DELETE_IMAGE = 11,

  /** Get selected device information */
  GET_SELECTED_DEVICE_INFO = 12,

  /** Bind device */
  BIND_DEVICE = 13,

  /** Save new library data */
  SAVE_NEW_LIBRARY_DATA = 14,

  /** Full device data synchronization (all points) */
  LOGGING_DATA = 15,

  /** Update full records to device */
  UPDATE_WEBVIEW_LIST = 16,

  /** Refresh records from device */
  REFRESH_WEBVIEW_LIST = 17
}

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

/**
 * Entry type constants for UPDATE_ENTRY and point operations
 */
export const EntryType = {
  OUTPUT: 0,
  INPUT: 1,
  VARIABLE: 2
} as const;

export type EntryTypeValue = typeof EntryType[keyof typeof EntryType];
