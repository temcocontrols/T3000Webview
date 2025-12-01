/**
 * Shared route constants for hybrid Vue + React architecture
 * Defines which routes belong to Vue vs React apps
 */

export const APP_ROUTES = {
  // Vue routes (existing app - Quasar + Ant Design)
  VUE_HOME: '/v2',
  VUE_DASHBOARD: '/v2/dashboard',
  VUE_TRENDLOG: '/v2/trendlog',
  VUE_MODBUS: '/v2/modbus',
  VUE_GRAPHICS: '/v2/graphics',
  VUE_NETWORK: '/v2/network',
  VUE_LOGIN: '/v2/login',

  // React routes (new T3BASWeb - React + Fluent UI)
  REACT_HOME: '/t3000',
  REACT_TSTAT: '/t3000/tstat',
  REACT_BACNET_INPUT: '/t3000/bacnet/input',
  REACT_BACNET_OUTPUT: '/t3000/bacnet/output',
  REACT_BACNET_VARIABLE: '/t3000/bacnet/variable',
  REACT_NETWORK: '/t3000/network',
  REACT_PROGRAM: '/t3000/program',
  REACT_SCHEDULE: '/t3000/schedule',
  REACT_HOLIDAY: '/t3000/holiday',
  REACT_TRENDLOG: '/t3000/trendlog',
  REACT_ALARM: '/t3000/alarm',
  REACT_USER: '/t3000/user',
  REACT_GRAPHICS: '/t3000/graphics',
  REACT_OSCILLOSCOPE: '/t3000/oscilloscope',
} as const;

/**
 * Determine which app should handle the current route
 */
export function getActiveApp(): 'vue' | 'react' {
  // Use hash for hash routing mode
  const hash = window.location.hash.replace('#', '');
  const path = hash || window.location.pathname;

  // Check if React route
  if (path.startsWith('/t3000')) {
    return 'react';
  }

  // Default to Vue for all other routes
  return 'vue';
}

/**
 * Navigate to another app (triggers page reload for app switching)
 */
export function navigateToApp(path: string): void {
  const currentApp = getActiveApp();
  const targetApp = path.startsWith('/t3000') ? 'react' : 'vue';

  if (currentApp !== targetApp) {
    // Switching apps - use window.location for full page reload
    window.location.href = path;
  } else {
    // Same app - use router navigation (will be handled by Vue/React router)
    window.location.href = path;
  }
}

/**
 * Check if current route belongs to React app
 */
export function isReactRoute(): boolean {
  return getActiveApp() === 'react';
}

/**
 * Check if current route belongs to Vue app
 */
export function isVueRoute(): boolean {
  return getActiveApp() === 'vue';
}
