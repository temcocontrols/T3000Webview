/**
 * WebView Message Type Enum (Runtime Export Only)
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
  GET_WEBVIEW_LIST = 17
}

/**
 * Entry type constants for UPDATE_ENTRY and point operations
 * Maps to C++ #define constants in global_define.h
 */
export const EntryType = {
  OUTPUT: 0,      // BAC_OUT
  INPUT: 1,       // BAC_IN
  VARIABLE: 2,    // BAC_VAR
  CONTROLLER: 3,  // BAC_PID (PID Loops)
  SCHEDULE: 4,    // BAC_SCH
  ANNUAL: 5,      // BAC_HOL (Holidays)
  PROGRAM: 6,     // BAC_PRG
  TABLE: 7,       // BAC_TBL (Trendlog)
  DMON: 8,        // BAC_DMON (Digital Monitors)
  AMON: 9,        // BAC_AMON (Analog Monitors)
  GROUP: 10,      // BAC_GRP (Groups)
  ALARMM: 12,     // BAC_ALARMM (Alarm Monitors)
  ALARMS: 15,     // BAC_ALARMS (Alarm Settings)
  READ_SETTING_COMMAND: 98,  // Device Settings (Str_Setting_Info - 400 bytes)
} as const;

export type EntryTypeValue = typeof EntryType[keyof typeof EntryType];
