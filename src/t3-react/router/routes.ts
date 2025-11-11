/**
 * React Router Routes Configuration
 * Defines all routes for the T3000 React application
 */

import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

// Lazy load page components for code splitting
const HomePage = lazy(() => import('../app/pages').then(m => ({ default: m.HomePage })));
const DashboardPage = lazy(() => import('../app/pages').then(m => ({ default: m.DashboardPage })));
const InputsPage = lazy(() => import('../app/pages').then(m => ({ default: m.InputsPage })));
const OutputsPage = lazy(() => import('../app/pages').then(m => ({ default: m.OutputsPage })));
const VariablesPage = lazy(() => import('../app/pages').then(m => ({ default: m.VariablesPage })));
const ProgramsPage = lazy(() => import('../app/pages').then(m => ({ default: m.ProgramsPage })));
const ControllersPage = lazy(() => import('../app/pages').then(m => ({ default: m.ControllersPage })));
const GraphicsPage = lazy(() => import('../app/pages').then(m => ({ default: m.GraphicsPage })));
const SchedulesPage = lazy(() => import('../app/pages').then(m => ({ default: m.SchedulesPage })));
const HolidaysPage = lazy(() => import('../app/pages').then(m => ({ default: m.HolidaysPage })));
const TrendLogsPage = lazy(() => import('../app/pages').then(m => ({ default: m.TrendLogsPage })));
const AlarmsPage = lazy(() => import('../app/pages').then(m => ({ default: m.AlarmsPage })));
const NetworkPage = lazy(() => import('../app/pages').then(m => ({ default: m.NetworkPage })));
const ArrayPage = lazy(() => import('../app/pages').then(m => ({ default: m.ArrayPage })));
const SettingsPage = lazy(() => import('../app/pages').then(m => ({ default: m.SettingsPage })));
const DiscoverPage = lazy(() => import('../app/pages').then(m => ({ default: m.DiscoverPage })));
const BuildingsPage = lazy(() => import('../app/pages').then(m => ({ default: m.BuildingsPage })));

/**
 * Route configuration with metadata
 */
export interface T3000Route {
  path: string;
  element: React.LazyExoticComponent<React.FC>;
  title: string;
  windowId?: number;
  shortcut?: string;
  requiresDevice?: boolean; // If true, requires a device to be selected
}

/**
 * All application routes
 */
export const t3000Routes: T3000Route[] = [
  {
    path: '/t3000',
    element: HomePage,
    title: 'Home',
  },
  {
    path: '/t3000/dashboard',
    element: DashboardPage,
    title: 'Dashboard',
    windowId: 0, // WINDOW_DASHBOARD
  },
  {
    path: '/t3000/inputs',
    element: InputsPage,
    title: 'Inputs',
    windowId: 1, // WINDOW_INPUT
    shortcut: 'Alt+I',
    requiresDevice: true,
  },
  {
    path: '/t3000/outputs',
    element: OutputsPage,
    title: 'Outputs',
    windowId: 2, // WINDOW_OUTPUT
    shortcut: 'Alt+O',
    requiresDevice: true,
  },
  {
    path: '/t3000/variables',
    element: VariablesPage,
    title: 'Variables',
    windowId: 3, // WINDOW_VARIABLE
    shortcut: 'Alt+V',
    requiresDevice: true,
  },
  {
    path: '/t3000/programs',
    element: ProgramsPage,
    title: 'Programs',
    windowId: 4, // WINDOW_PROGRAM
    shortcut: 'Alt+P',
    requiresDevice: true,
  },
  {
    path: '/t3000/schedules',
    element: SchedulesPage,
    title: 'Schedules',
    windowId: 5, // WINDOW_WEEKLY
    shortcut: 'Alt+S',
    requiresDevice: true,
  },
  {
    path: '/t3000/holidays',
    element: HolidaysPage,
    title: 'Holidays',
    windowId: 6, // WINDOW_ANNUAL
    shortcut: 'Alt+H',
    requiresDevice: true,
  },
  {
    path: '/t3000/controllers',
    element: ControllersPage,
    title: 'Controllers',
    windowId: 7, // WINDOW_CONTROLLER
    shortcut: 'Alt+L',
    requiresDevice: true,
  },
  {
    path: '/t3000/graphics',
    element: GraphicsPage,
    title: 'Graphics',
    windowId: 8, // WINDOW_SCREEN
    shortcut: 'Alt+G',
    requiresDevice: true,
  },
  {
    path: '/t3000/trend-logs',
    element: TrendLogsPage,
    title: 'Trend Logs',
    windowId: 9, // WINDOW_MONITOR
    shortcut: 'Alt+T',
    requiresDevice: true,
  },
  {
    path: '/t3000/alarms',
    element: AlarmsPage,
    title: 'Alarms',
    windowId: 10, // WINDOW_ALARMLOG
    shortcut: 'Alt+A',
    requiresDevice: true,
  },
  {
    path: '/t3000/settings',
    element: SettingsPage,
    title: 'Settings',
    windowId: 11, // WINDOW_SETTING
    shortcut: 'Alt+E',
    requiresDevice: true,
  },
  {
    path: '/t3000/network',
    element: NetworkPage,
    title: 'Network Points',
    windowId: 13, // WINDOW_REMOTE_POINT
    shortcut: 'Alt+N',
    requiresDevice: true,
  },
  {
    path: '/t3000/array',
    element: ArrayPage,
    title: 'Array',
    windowId: 14, // WINDOW_ARRAY
    requiresDevice: true,
  },
  {
    path: '/t3000/discover',
    element: DiscoverPage,
    title: 'Discover Devices',
    windowId: 15, // WINDOW_DISCOVER
  },
  {
    path: '/t3000/buildings',
    element: BuildingsPage,
    title: 'Buildings',
    windowId: 16, // WINDOW_BUILDINGS
  },
];

/**
 * Convert T3000Route to React Router RouteObject
 */
export function getRouteObjects(): RouteObject[] {
  return t3000Routes.map((route) => ({
    path: route.path,
    element: route.element as any, // React Router accepts lazy components
  }));
}

/**
 * Get route by path
 */
export function getRouteByPath(path: string): T3000Route | undefined {
  return t3000Routes.find((route) => route.path === path);
}

/**
 * Get route by window ID
 */
export function getRouteByWindowId(windowId: number): T3000Route | undefined {
  return t3000Routes.find((route) => route.windowId === windowId);
}

/**
 * Get route by shortcut
 */
export function getRouteByShortcut(shortcut: string): T3000Route | undefined {
  return t3000Routes.find((route) => route.shortcut === shortcut);
}

/**
 * Get all routes that require device selection
 */
export function getDeviceRequiredRoutes(): T3000Route[] {
  return t3000Routes.filter((route) => route.requiresDevice);
}

/**
 * Check if current path requires device
 */
export function isDeviceRequired(path: string): boolean {
  const route = getRouteByPath(path);
  return route?.requiresDevice || false;
}
