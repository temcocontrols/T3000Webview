/**
 * Toolbar Configuration
 * 16 icon buttons for quick access to main windows
 */

import type { ToolbarButton } from '../../common/types/menu';
import {
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

/**
 * Toolbar Button Configuration
 * Based on C++ T3000 desktop toolbar layout
 */
export const toolbarConfig: ToolbarButton[] = [
  {
    id: 'toolbar-info',
    icon: 'Info',
    label: 'Information',
    tooltip: 'Device Information',
    action: 'openDeviceInfo',
  },
  {
    id: 'toolbar-inputs',
    icon: 'ArrowCircleDown',
    label: 'Inputs',
    tooltip: 'Inputs (Alt+I)',
    action: 'openWindow',
    windowId: WINDOW_INPUT,
    route: '/t3000/inputs',
    shortcut: 'Alt+I',
  },
  {
    id: 'toolbar-outputs',
    icon: 'ArrowCircleUp',
    label: 'Outputs',
    tooltip: 'Outputs (Alt+O)',
    action: 'openWindow',
    windowId: WINDOW_OUTPUT,
    route: '/t3000/outputs',
    shortcut: 'Alt+O',
  },
  {
    id: 'toolbar-variables',
    icon: 'Variable',
    label: 'Variables',
    tooltip: 'Variables (Alt+V)',
    action: 'openWindow',
    windowId: WINDOW_VARIABLE,
    route: '/t3000/variables',
    shortcut: 'Alt+V',
  },
  {
    id: 'toolbar-programs',
    icon: 'Code',
    label: 'Programs',
    tooltip: 'Programs (Alt+P)',
    action: 'openWindow',
    windowId: WINDOW_PROGRAM,
    route: '/t3000/programs',
    shortcut: 'Alt+P',
  },
  {
    id: 'toolbar-controllers',
    icon: 'Settings',
    label: 'Controllers',
    tooltip: 'PID Controllers (Alt+L)',
    action: 'openWindow',
    windowId: WINDOW_CONTROLLER,
    route: '/t3000/controllers',
    shortcut: 'Alt+L',
  },
  {
    id: 'toolbar-graphics',
    icon: 'Image',
    label: 'Graphics',
    tooltip: 'Graphics Screens (Alt+G)',
    action: 'openWindow',
    windowId: WINDOW_SCREEN,
    route: '/t3000/graphics',
    shortcut: 'Alt+G',
  },
  {
    id: 'toolbar-schedules',
    icon: 'Calendar',
    label: 'Schedules',
    tooltip: 'Weekly Schedules (Alt+S)',
    action: 'openWindow',
    windowId: WINDOW_WEEKLY,
    route: '/t3000/schedules',
    shortcut: 'Alt+S',
  },
  {
    id: 'toolbar-holidays',
    icon: 'CalendarStar',
    label: 'Holidays',
    tooltip: 'Annual Routines (Alt+H)',
    action: 'openWindow',
    windowId: WINDOW_ANNUAL,
    route: '/t3000/holidays',
    shortcut: 'Alt+H',
  },
  {
    id: 'toolbar-trends',
    icon: 'LineChart',
    label: 'Trends',
    tooltip: 'Trend Logs (Alt+T)',
    action: 'openWindow',
    windowId: WINDOW_MONITOR,
    route: '/t3000/trend-logs',
    shortcut: 'Alt+T',
  },
  {
    id: 'toolbar-alarms',
    icon: 'Alert',
    label: 'Alarms',
    tooltip: 'Alarm Log (Alt+A)',
    action: 'openWindow',
    windowId: WINDOW_ALARMLOG,
    route: '/t3000/alarms',
    shortcut: 'Alt+A',
  },
  {
    id: 'toolbar-array',
    icon: 'Table',
    label: 'Array',
    tooltip: 'Array Data',
    action: 'openWindow',
    windowId: WINDOW_ARRAY,
    route: '/t3000/array',
  },
  {
    id: 'toolbar-network',
    icon: 'Network',
    label: 'Network',
    tooltip: 'Network Points (Alt+N)',
    action: 'openWindow',
    windowId: WINDOW_REMOTE_POINT,
    route: '/t3000/network',
    shortcut: 'Alt+N',
  },
  {
    id: 'toolbar-settings',
    icon: 'SettingsGear',
    label: 'Settings',
    tooltip: 'Device Settings (Alt+E)',
    action: 'openWindow',
    windowId: WINDOW_SETTING,
    route: '/t3000/settings',
    shortcut: 'Alt+E',
  },
  {
    id: 'toolbar-discover',
    icon: 'Search',
    label: 'Discover',
    tooltip: 'Discover Devices',
    action: 'openDialog',
    dialogId: 'discoverDialog',
  },
  {
    id: 'toolbar-buildings',
    icon: 'BuildingMultiple',
    label: 'Buildings',
    tooltip: 'Manage Buildings',
    action: 'openDialog',
    dialogId: 'buildingsDialog',
  },
  {
    id: 'toolbar-refresh',
    icon: 'ArrowClockwise',
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
