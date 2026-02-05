/**
 * Window constants from C++ global_define.h
 * These define the 13 main windows in T3000 desktop application
 */

// Main window types (from WINDOW_ constants)
export const WINDOW_DASHBOARD = 0;      // Dashboard (new)
export const WINDOW_INPUT = 1;
export const WINDOW_OUTPUT = 2;
export const WINDOW_VARIABLE = 3;
export const WINDOW_PROGRAM = 4;
export const WINDOW_WEEKLY = 5;         // Schedules
export const WINDOW_ANNUAL = 6;         // Holidays
export const WINDOW_CONTROLLER = 7;     // PID Loops
export const WINDOW_SCREEN = 8;         // Graphics
export const WINDOW_MONITOR = 9;        // Trend Logs
export const WINDOW_ALARMLOG = 10;      // Alarms
export const WINDOW_SETTING = 11;       // Device Settings
export const WINDOW_REMOTE_POINT = 13;  // Network Points
export const WINDOW_ARRAY = 14;
export const WINDOW_DISCOVER = 15;      // Discover Devices (new)
export const WINDOW_BUILDINGS = 16;     // Buildings Management (new)

// Window type enum for type safety
export enum WindowType {
  DASHBOARD = 0,
  INPUT = 1,
  OUTPUT = 2,
  VARIABLE = 3,
  PROGRAM = 4,
  WEEKLY = 5,
  ANNUAL = 6,
  CONTROLLER = 7,
  SCREEN = 8,
  MONITOR = 9,
  ALARMLOG = 10,
  SETTING = 11,
  REMOTE_POINT = 13,
  ARRAY = 14,
  DISCOVER = 15,
  BUILDINGS = 16,
}

// Window route mapping for React Router
export const WINDOW_ROUTES: Record<WindowType, string> = {
  [WindowType.DASHBOARD]: '/t3000/dashboard',
  [WindowType.INPUT]: '/t3000/inputs',
  [WindowType.OUTPUT]: '/t3000/outputs',
  [WindowType.VARIABLE]: '/t3000/variables',
  [WindowType.PROGRAM]: '/t3000/programs',
  [WindowType.WEEKLY]: '/t3000/schedules',
  [WindowType.ANNUAL]: '/t3000/holidays',
  [WindowType.CONTROLLER]: '/t3000/pidloops',
  [WindowType.SCREEN]: '/t3000/graphics',
  [WindowType.MONITOR]: '/t3000/trend-logs',
  [WindowType.ALARMLOG]: '/t3000/alarms',
  [WindowType.SETTING]: '/t3000/settings',
  [WindowType.REMOTE_POINT]: '/t3000/network',
  [WindowType.ARRAY]: '/t3000/array',
  [WindowType.DISCOVER]: '/t3000/discover',
  [WindowType.BUILDINGS]: '/t3000/buildings',
};

// Window display names
export const WINDOW_NAMES: Record<WindowType, string> = {
  [WindowType.DASHBOARD]: 'Dashboard',
  [WindowType.INPUT]: 'Inputs',
  [WindowType.OUTPUT]: 'Outputs',
  [WindowType.VARIABLE]: 'Variables',
  [WindowType.PROGRAM]: 'Programs',
  [WindowType.WEEKLY]: 'Schedules',
  [WindowType.ANNUAL]: 'Holidays',
  [WindowType.CONTROLLER]: 'PID Loops',
  [WindowType.SCREEN]: 'Graphics',
  [WindowType.MONITOR]: 'Trend Logs',
  [WindowType.ALARMLOG]: 'Alarms',
  [WindowType.SETTING]: 'Settings',
  [WindowType.REMOTE_POINT]: 'Network Points',
  [WindowType.ARRAY]: 'Array',
  [WindowType.DISCOVER]: 'Discover Devices',
  [WindowType.BUILDINGS]: 'Buildings',
};

// Keyboard shortcuts (from C++ menu accelerators)
export const WINDOW_SHORTCUTS: Record<WindowType, string> = {
  [WindowType.DASHBOARD]: '',
  [WindowType.INPUT]: 'Alt+I',
  [WindowType.OUTPUT]: 'Alt+O',
  [WindowType.VARIABLE]: 'Alt+V',
  [WindowType.PROGRAM]: 'Alt+P',
  [WindowType.WEEKLY]: 'Alt+S',
  [WindowType.ANNUAL]: 'Alt+H',
  [WindowType.CONTROLLER]: 'Alt+L',
  [WindowType.SCREEN]: 'Alt+G',
  [WindowType.MONITOR]: 'Alt+T',
  [WindowType.ALARMLOG]: 'Alt+A',
  [WindowType.SETTING]: 'Alt+E',
  [WindowType.REMOTE_POINT]: 'Alt+N',
  [WindowType.ARRAY]: '',
  [WindowType.DISCOVER]: '',
  [WindowType.BUILDINGS]: '',
};
