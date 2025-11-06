/**
 * Application Constants
 * Re-export window constants, routes, and other shared constants
 */

// Re-export window constants
export {
  WINDOW_INPUT,
  WINDOW_OUTPUT,
  WINDOW_VARIABLE,
  WINDOW_PROGRAM,
  WINDOW_CONTROLLER,
  WINDOW_SCREEN,
  WINDOW_WEEKLY,
  WINDOW_ANNUAL,
  WINDOW_MONITOR,
  WINDOW_ALARMLOG,
  WINDOW_SETTING,
  WINDOW_ARRAY,
  WINDOW_REMOTE_POINT,
} from '../../common/types/window';

// Window IDs object for convenience
export const WINDOW_IDS = {
  HOME: 0,
  INPUT: 1,
  OUTPUT: 2,
  VARIABLE: 3,
  PROGRAM: 4,
  CONTROLLER: 7,
  SCREEN: 8,
  WEEKLY: 5,
  ANNUAL: 6,
  MONITOR: 9,
  ALARMLOG: 10,
  SETTING: 11,
  ARRAY: 14,
  REMOTE_POINT: 13,
} as const;

// Re-export layout dimensions from theme
export {
  layoutDimensions,
  spacing,
  typography,
  borderRadius,
  shadows,
  transitions,
  zIndex,
} from './theme';

/**
 * Application Routes
 */
export const routes = {
  // Root
  home: '/t3000',

  // Windows
  inputs: '/t3000/inputs',
  outputs: '/t3000/outputs',
  variables: '/t3000/variables',
  programs: '/t3000/programs',
  controllers: '/t3000/controllers',
  graphics: '/t3000/graphics',
  schedules: '/t3000/schedules',
  holidays: '/t3000/holidays',
  trendLogs: '/t3000/trend-logs',
  alarms: '/t3000/alarms',
  network: '/t3000/network',
  array: '/t3000/array',
  settings: '/t3000/settings',

  // Dialogs (handled by query params or modal state)
  discover: '/t3000?dialog=discover',
  buildings: '/t3000?dialog=buildings',
} as const;

/**
 * Window route mapping
 * Maps window IDs to routes
 */
export const windowRoutes: Record<number, string> = {
  1: routes.inputs,       // WINDOW_INPUT
  2: routes.outputs,      // WINDOW_OUTPUT
  3: routes.variables,    // WINDOW_VARIABLE
  4: routes.programs,     // WINDOW_PROGRAM
  5: routes.controllers,  // WINDOW_CONTROLLER
  6: routes.graphics,     // WINDOW_SCREEN
  7: routes.schedules,    // WINDOW_WEEKLY
  8: routes.holidays,     // WINDOW_ANNUAL
  9: routes.trendLogs,    // WINDOW_MONITOR
  10: routes.alarms,      // WINDOW_ALARMLOG
  11: routes.settings,    // WINDOW_SETTING
  14: routes.array,       // WINDOW_ARRAY
  15: routes.network,     // WINDOW_REMOTE_POINT
};

/**
 * Window names mapping
 */
export const windowNames: Record<number, string> = {
  1: 'Inputs',
  2: 'Outputs',
  3: 'Variables',
  4: 'Programs',
  5: 'Controllers',
  6: 'Graphics',
  7: 'Schedules',
  8: 'Holidays',
  9: 'Trend Logs',
  10: 'Alarms',
  11: 'Settings',
  14: 'Array',
  15: 'Network Points',
};

/**
 * Keyboard shortcuts mapping
 */
export const keyboardShortcuts: Record<string, number> = {
  'Alt+I': 1,  // WINDOW_INPUT
  'Alt+O': 2,  // WINDOW_OUTPUT
  'Alt+V': 3,  // WINDOW_VARIABLE
  'Alt+P': 4,  // WINDOW_PROGRAM
  'Alt+L': 5,  // WINDOW_CONTROLLER
  'Alt+G': 6,  // WINDOW_SCREEN
  'Alt+S': 7,  // WINDOW_WEEKLY
  'Alt+H': 8,  // WINDOW_ANNUAL
  'Alt+T': 9,  // WINDOW_MONITOR
  'Alt+A': 10, // WINDOW_ALARMLOG
  'Alt+E': 11, // WINDOW_SETTING
  'Alt+N': 15, // WINDOW_REMOTE_POINT
  'F5': -1,    // Refresh
  'F2': -2,    // Rename
};

/**
 * Application metadata
 */
export const appMetadata = {
  name: 'T3000 BAS Web',
  version: '1.0.0',
  description: 'Building Automation System Web Interface',
  copyright: '© 2025 Temco Controls',
  website: 'https://www.temcocontrols.com',
} as const;

/**
 * API endpoints (relative to base URL)
 */
export const apiEndpoints = {
  auth: '/auth',
  buildings: '/buildings',
  devices: '/devices',
  network: '/network',
  bacnet: '/bacnet',
  modbus: '/modbus',
} as const;

/**
 * Local storage keys
 */
export const storageKeys = {
  authToken: 'auth_token',
  userPreferences: 'user_preferences',
  treeState: 'tree_state',
  windowLayout: 'window_layout',
  recentDevices: 'recent_devices',
  theme: 'theme',
} as const;

/**
 * Session storage keys
 */
export const sessionStorageKeys = {
  tempAuthToken: 'temp_auth_token',
  formData: 'form_data',
  scrollPosition: 'scroll_position',
} as const;

/**
 * Default pagination settings
 */
export const pagination = {
  defaultPageSize: 50,
  pageSizeOptions: [10, 25, 50, 100, 200],
  maxPageSize: 500,
} as const;

/**
 * Default polling intervals (milliseconds)
 */
export const pollingIntervals = {
  deviceStatus: 5000,      // 5 seconds
  pointValues: 2000,       // 2 seconds
  alarms: 3000,            // 3 seconds
  trends: 10000,           // 10 seconds
  networkScan: 30000,      // 30 seconds
} as const;

/**
 * Timeout settings (milliseconds)
 */
export const timeouts = {
  apiRequest: 30000,       // 30 seconds
  fileUpload: 60000,       // 1 minute
  deviceScan: 60000,       // 1 minute
  firmwareUpdate: 300000,  // 5 minutes
} as const;

/**
 * File size limits (bytes)
 */
export const fileSizeLimits = {
  maxImageSize: 5 * 1024 * 1024,      // 5 MB
  maxConfigSize: 10 * 1024 * 1024,    // 10 MB
  maxBackupSize: 50 * 1024 * 1024,    // 50 MB
  maxFirmwareSize: 100 * 1024 * 1024, // 100 MB
} as const;

/**
 * Validation patterns
 */
export const validationPatterns = {
  ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  macAddress: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  port: /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/,
} as const;

/**
 * Default port numbers
 */
export const defaultPorts = {
  bacnetIp: 47808,
  modbusTcp: 502,
  http: 80,
  https: 443,
} as const;
