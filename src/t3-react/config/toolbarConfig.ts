/**
 * Toolbar Configuration
 * 16 icon buttons for quick access to main windows
 */

import type { ToolbarButton } from '@common/react/types/menu';
import {
  WINDOW_DASHBOARD,
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
  WINDOW_DISCOVER,
  WINDOW_BUILDINGS,
} from '@common/react/types/window';
import {
  InfoRegular,
  ArrowCircleDownRegular,
  ArrowCircleUpRegular,
  CodeRegular,
  SettingsRegular,
  ImageRegular,
  CalendarRegular,
  CalendarStarRegular,
  ChartMultipleRegular,
  AlertRegular,
  TableRegular,
  NetworkCheckRegular,
  SettingsRegular as SettingsGearRegular,
  SearchRegular,
  BuildingMultipleRegular,
  ArrowClockwiseRegular,
} from '@fluentui/react-icons';

/**
 * Toolbar Button Configuration
 * Based on C++ T3000 desktop toolbar layout
 */
export const toolbarConfig: ToolbarButton[] = [
  {
    id: 'toolbar-dashboard',
    icon: InfoRegular,
    label: 'Dashboard',
    tooltip: 'Dashboard',
    action: 'openWindow',
    windowId: WINDOW_DASHBOARD,
    route: '/t3000/dashboard',
  },
  {
    id: 'toolbar-inputs',
    icon: ArrowCircleDownRegular,
    label: 'Inputs',
    tooltip: 'Inputs (Alt+I)',
    action: 'openWindow',
    windowId: WINDOW_INPUT,
    route: '/t3000/inputs',
    shortcut: 'Alt+I',
  },
  {
    id: 'toolbar-outputs',
    icon: ArrowCircleUpRegular,
    label: 'Outputs',
    tooltip: 'Outputs (Alt+O)',
    action: 'openWindow',
    windowId: WINDOW_OUTPUT,
    route: '/t3000/outputs',
    shortcut: 'Alt+O',
  },
  {
    id: 'toolbar-variables',
    icon: CodeRegular,
    label: 'Variables',
    tooltip: 'Variables (Alt+V)',
    action: 'openWindow',
    windowId: WINDOW_VARIABLE,
    route: '/t3000/variables',
    shortcut: 'Alt+V',
  },
  {
    id: 'toolbar-programs',
    icon: CodeRegular,
    label: 'Programs',
    tooltip: 'Programs (Alt+P)',
    action: 'openWindow',
    windowId: WINDOW_PROGRAM,
    route: '/t3000/programs',
    shortcut: 'Alt+P',
  },
  {
    id: 'toolbar-pidloops',
    icon: SettingsRegular,
    label: 'PID Loops',
    tooltip: 'PID Loops (Alt+L)',
    action: 'openWindow',
    windowId: WINDOW_CONTROLLER,
    route: '/t3000/pidloops',
    shortcut: 'Alt+L',
  },
  {
    id: 'toolbar-graphics',
    icon: ImageRegular,
    label: 'Graphics',
    tooltip: 'Graphics Screens (Alt+G)',
    action: 'openWindow',
    windowId: WINDOW_SCREEN,
    route: '/t3000/graphics',
    shortcut: 'Alt+G',
  },
  {
    id: 'toolbar-schedules',
    icon: CalendarRegular,
    label: 'Schedules',
    tooltip: 'Weekly Schedules (Alt+S)',
    action: 'openWindow',
    windowId: WINDOW_WEEKLY,
    route: '/t3000/schedules',
    shortcut: 'Alt+S',
  },
  {
    id: 'toolbar-holidays',
    icon: CalendarStarRegular,
    label: 'Holidays',
    tooltip: 'Annual Routines (Alt+H)',
    action: 'openWindow',
    windowId: WINDOW_ANNUAL,
    route: '/t3000/holidays',
    shortcut: 'Alt+H',
  },
  {
    id: 'toolbar-trends',
    icon: ChartMultipleRegular,
    label: 'Trend Logs',
    tooltip: 'Trend Logs (Alt+T)',
    action: 'openWindow',
    windowId: WINDOW_MONITOR,
    route: '/t3000/trend-logs',
    shortcut: 'Alt+T',
  },
  {
    id: 'toolbar-alarms',
    icon: AlertRegular,
    label: 'Alarms',
    tooltip: 'Alarm Log (Alt+A)',
    action: 'openWindow',
    windowId: WINDOW_ALARMLOG,
    route: '/t3000/alarms',
    shortcut: 'Alt+A',
  },
  {
    id: 'toolbar-array',
    icon: TableRegular,
    label: 'Array',
    tooltip: 'Array Data',
    action: 'openWindow',
    windowId: WINDOW_ARRAY,
    route: '/t3000/array',
  },
  {
    id: 'toolbar-network',
    icon: NetworkCheckRegular,
    label: 'Network',
    tooltip: 'Network Points (Alt+N)',
    action: 'openWindow',
    windowId: WINDOW_REMOTE_POINT,
    route: '/t3000/network',
    shortcut: 'Alt+N',
  },
  {
    id: 'toolbar-settings',
    icon: SettingsGearRegular,
    label: 'Settings',
    tooltip: 'Device Settings (Alt+E)',
    action: 'openWindow',
    windowId: WINDOW_SETTING,
    route: '/t3000/settings',
    shortcut: 'Alt+E',
  },
  {
    id: 'toolbar-discover',
    icon: SearchRegular,
    label: 'Discover',
    tooltip: 'Discover Devices',
    action: 'openWindow',
    windowId: WINDOW_DISCOVER,
    route: '/t3000/discover',
  },
  {
    id: 'toolbar-buildings',
    icon: BuildingMultipleRegular,
    label: 'Buildings',
    tooltip: 'Manage Buildings',
    action: 'openWindow',
    windowId: WINDOW_BUILDINGS,
    route: '/t3000/buildings',
  },
  {
    id: 'toolbar-refresh',
    icon: ArrowClockwiseRegular,
    label: 'Refresh',
    tooltip: 'Refresh (F5)',
    action: 'refresh',
    shortcut: 'F5',
  },
];

/**
 * Get toolbar button by ID
 */
export function getToolbarButtonById(id: string): ToolbarButton | undefined {
  return toolbarConfig.find((button) => button.id === id);
}

/**
 * Get toolbar button by window ID
 */
export function getToolbarButtonByWindowId(windowId: number): ToolbarButton | undefined {
  return toolbarConfig.find((button) => button.windowId === windowId);
}

/**
 * Get toolbar button by route
 */
export function getToolbarButtonByRoute(route: string): ToolbarButton | undefined {
  return toolbarConfig.find((button) => button.route === route);
}

/**
 * Get all toolbar buttons that open windows
 */
export function getWindowToolbarButtons(): ToolbarButton[] {
  return toolbarConfig.filter((button) => button.action === 'openWindow');
}

/**
 * Get all toolbar buttons that open dialogs
 */
export function getDialogToolbarButtons(): ToolbarButton[] {
  return toolbarConfig.filter((button) => button.action === 'openDialog');
}
