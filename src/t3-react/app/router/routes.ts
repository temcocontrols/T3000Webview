/**
 * React Router Routes Configuration
 * Defines all routes for the T3000 React application
 */

import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { createResponsiveRoute } from '@t3-shared/core/router/ViewRouter';

// Lazy load page components for code splitting
const HomePage = lazy(() => import('../pages').then(m => ({ default: m.HomePage })));
const DashboardPage = lazy(() => import('../pages').then(m => ({ default: m.DashboardPage })));
const InputsPage = lazy(() => import('../pages').then(m => ({ default: m.InputsPage })));
const InputsPageMobile = lazy(() => import('../../../t3-mobile/features/inputs/pages/InputsPageMobile').then(m => ({ default: m.InputsPageMobile })));
const OutputsPage = lazy(() => import('../pages').then(m => ({ default: m.OutputsPage })));
const VariablesPage = lazy(() => import('../pages').then(m => ({ default: m.VariablesPage })));
const ProgramsPage = lazy(() => import('../pages').then(m => ({ default: m.ProgramsPage })));
const PIDLoopsPage = lazy(() => import('../pages').then(m => ({ default: m.PIDLoopsPage })));
const GraphicsPage = lazy(() => import('../pages').then(m => ({ default: m.GraphicsPage })));
const SchedulesPage = lazy(() => import('../pages').then(m => ({ default: m.SchedulesPage })));
const HolidaysPage = lazy(() => import('../pages').then(m => ({ default: m.HolidaysPage })));
const TrendLogsPage = lazy(() => import('../pages').then(m => ({ default: m.TrendLogsPage })));
const TrendPolicyRouteAdapterPage = lazy(() => import('../../features/trendlogs/pages/TrendPolicyRouteAdapterPage').then(m => ({ default: m.TrendPolicyRouteAdapterPage })));
const TrendChartPage = lazy(() => import('../pages').then(m => ({ default: m.TrendChartPage })));
const AlarmsPage = lazy(() => import('../pages').then(m => ({ default: m.AlarmsPage })));
const NetworkPage = lazy(() => import('../pages').then(m => ({ default: m.NetworkPage })));
const ArrayPage = lazy(() => import('../pages').then(m => ({ default: m.ArrayPage })));
const DiscoverPage = lazy(() => import('../pages').then(m => ({ default: m.DiscoverPage })));
const BuildingsPage = lazy(() => import('../pages').then(m => ({ default: m.BuildingsPage })));
const Tstat10SimulatorPage = lazy(() => import('../pages').then(m => ({ default: m.Tstat10SimulatorPage })));

// Create responsive route for Tstat10 Simulator (desktop + mobile)
const Tstat10SimulatorPageResponsive = lazy(() =>
  Promise.all([
    import('../pages').then(m => m.Tstat10SimulatorPage),
    import('../../../t3-mobile/features/tstat10-simulator/pages/Tstat10SimulatorPageMobile').then(m => m.Tstat10SimulatorPageMobile),
  ]).then(([DesktopPage, MobilePage]) => ({
    default: createResponsiveRoute(DesktopPage, MobilePage)
  }))
);

// Create responsive route components that switch between desktop and mobile
const InputsPageResponsive = lazy(() =>
  Promise.all([
    import('../pages').then(m => m.InputsPage),
    import('../../../t3-mobile/features/inputs/pages/InputsPageMobile').then(m => m.InputsPageMobile),
  ]).then(([InputsPage, InputsPageMobile]) => ({
    default: createResponsiveRoute(InputsPage, InputsPageMobile)
  }))
);

const OutputsPageResponsive = lazy(() =>
  Promise.all([
    import('../pages').then(m => m.OutputsPage),
    import('../../../t3-mobile/features/outputs/pages/OutputsPageMobile').then(m => m.OutputsPageMobile),
  ]).then(([OutputsPage, OutputsPageMobile]) => ({
    default: createResponsiveRoute(OutputsPage, OutputsPageMobile)
  }))
);

const VariablesPageResponsive = lazy(() =>
  Promise.all([
    import('../pages').then(m => m.VariablesPage),
    import('../../../t3-mobile/features/variables/pages/VariablesPageMobile').then(m => m.VariablesPageMobile),
  ]).then(([VariablesPage, VariablesPageMobile]) => ({
    default: createResponsiveRoute(VariablesPage, VariablesPageMobile)
  }))
);

const AlarmsPageResponsive = lazy(() =>
  Promise.all([
    import('../pages').then(m => m.AlarmsPage),
    import('../../../t3-mobile/features/alarms/pages/AlarmsPageMobile').then(m => m.AlarmsPageMobile),
  ]).then(([AlarmsPage, AlarmsPageMobile]) => ({
    default: createResponsiveRoute(AlarmsPage, AlarmsPageMobile)
  }))
);

const SettingsPageResponsive = lazy(() =>
  Promise.all([
    import('../pages').then(m => m.SettingsPage),
    import('../../../t3-mobile/features/settings/pages/SettingsPageMobile').then(m => m.SettingsPageMobile),
  ]).then(([SettingsPage, SettingsPageMobile]) => ({
    default: createResponsiveRoute(SettingsPage, SettingsPageMobile)
  }))
);

// Database configuration page
const DatabaseConfigPage = lazy(() => import('../../features/database/pages/DatabaseConfigPage'));
const SyncConfigurationPage = lazy(() => import('../../features/develop/pages/SyncConfigurationPage').then(m => ({ default: m.SyncConfigurationPage })));

// Additional pages in App.tsx
const TablesPage = lazy(() => import('../../features/tables/pages/TablesPage').then(m => ({ default: m.TablesPage })));
const UsersPage = lazy(() => import('../../features/users/pages/UsersPage').then(m => ({ default: m.UsersPage })));
const CustomUnitsPage = lazy(() => import('../../features/customUnits/pages/CustomUnitsPage').then(m => ({ default: m.CustomUnitsPage })));
const HvacDesignerPage = lazy(() => import('../../features/hvac-designer/pages/HvacDesignerPage').then(m => ({ default: m.HvacDesignerPage })));
const DocumentationPage = lazy(() => import('../../features/documentation/pages/DocumentationPage').then(m => ({ default: m.DocumentationPage })));

// Develop section pages
const FileBrowserPage = lazy(() => import('../../features/develop/pages/FileBrowserPage'));
const DatabaseViewerPage = lazy(() => import('../../features/develop/pages/DatabaseViewerPage'));
const TransportTesterPage = lazy(() => import('../../features/develop/pages/TransportTesterPage'));
const LogsPage = lazy(() => import('../../features/logs/pages/LogsPage'));

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
    element: InputsPageResponsive,
    title: 'Inputs',
    windowId: 1, // WINDOW_INPUT
    shortcut: 'Alt+I',
    requiresDevice: true,
  },
  {
    path: '/t3000/outputs',
    element: OutputsPageResponsive,
    title: 'Outputs',
    windowId: 2, // WINDOW_OUTPUT
    shortcut: 'Alt+O',
    requiresDevice: true,
  },
  {
    path: '/t3000/variables',
    element: VariablesPageResponsive,
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
    path: '/t3000/pidloops',
    element: PIDLoopsPage,
    title: 'PID Loops',
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
    path: '/t3000/trendlogs',
    element: TrendLogsPage,
    title: 'Trend Logs',
    windowId: 9, // WINDOW_MONITOR
    shortcut: 'Alt+T',
    requiresDevice: true,
  },
  {
    path: '/t3000/trend-policy',
    element: TrendPolicyRouteAdapterPage,
    title: 'Unified Trend Logging',
    requiresDevice: false,
  },
  {
    path: '/t3000/trends/chart',
    element: TrendChartPage,
    title: 'Trend Chart',
    requiresDevice: false, // C++ opens with URL params
  },
  {
    path: '/t3000/alarms',
    element: AlarmsPageResponsive,
    title: 'Alarms',
    windowId: 10, // WINDOW_ALARMLOG
    shortcut: 'Alt+A',
    requiresDevice: true,
  },
  {
    path: '/t3000/settings',
    element: SettingsPageResponsive,
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
    path: '/t3000/tables',
    element: TablesPage,
    title: 'Tables',
    requiresDevice: true,
  },
  {
    path: '/t3000/users',
    element: UsersPage,
    title: 'Users',
  },
  {
    path: '/t3000/custom-units',
    element: CustomUnitsPage,
    title: 'Custom Units',
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
  {
    path: '/t3000/tstat10-simulator',
    element: Tstat10SimulatorPageResponsive,
    title: 'Tstat10 Simulator',
    windowId: 17, // WINDOW_TSTAT10_SIMULATOR
    shortcut: 'Alt+M',
    requiresDevice: false,
  },
  // Database configuration
  {
    path: '/t3000/database/config',
    element: DatabaseConfigPage,
    title: 'Database Configuration',
  },
  // Developer routes
  {
    path: '/t3000/developer/sync',
    element: SyncConfigurationPage,
    title: 'Sync Configuration',
  },
  // HVAC & Documentation (minimal layout in App.tsx)
  {
    path: '/t3000/hvac-designer',
    element: HvacDesignerPage,
    title: 'HVAC Designer',
  },
  {
    path: '/t3000/documentation',
    element: DocumentationPage,
    title: 'Documentation',
  },
  // Develop section routes
  {
    path: '/t3000/develop/files',
    element: FileBrowserPage,
    title: 'File Browser',
  },
  {
    path: '/t3000/develop/database',
    element: DatabaseViewerPage,
    title: 'Database Viewer',
  },
  {
    path: '/t3000/develop/transport',
    element: TransportTesterPage,
    title: 'Transport Tester',
  },
  {
    path: '/t3000/develop/logs',
    element: LogsPage,
    title: 'T3000 Logs',
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
