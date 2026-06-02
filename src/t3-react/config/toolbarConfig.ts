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
  SettingsRegular,
  OptionsRegular,
  WrenchRegular,
  CodeRegular,
  CircleFilled,
  CircleMultipleConcentricRegular,
  DeveloperBoardRegular,
  DeskMultipleRegular,
  FlowRegular,
  ImageRegular,
  CalendarRegular,
  CalendarDateRegular,
  CalendarStarRegular,
  ChartMultipleRegular,
  AlertRegular,
  TableRegular,
  ListRegular,
  NetworkCheckRegular,
  SettingsRegular as SettingsGearRegular,
  SearchRegular,
  BuildingMultipleRegular,
  ArrowClockwiseRegular,
  ArrowSyncRegular,
} from '@fluentui/react-icons';

/**
 * Toolbar Button Configuration
 * Based on C++ T3000 desktop toolbar layout
 */
export const toolbarConfig: ToolbarButton[] = [
  {
    id: 'toolbar-dashboard',
    icon: DeskMultipleRegular,
    label: 'Dashboard',
    tooltip: 'Dashboard',
    description: 'More information at a glance with customizable widgets',
    action: 'openWindow',
    windowId: WINDOW_DASHBOARD,
    route: '/t3000/dashboard',
  },
  {
    id: 'toolbar-inputs',
    icon: WrenchRegular,
    label: 'Inputs',
    tooltip: 'Inputs [ Alt-I ]',
    description: 'Sensors and feedback points wired to the controller',
    action: 'openWindow',
    windowId: WINDOW_INPUT,
    route: '/t3000/inputs',
    shortcut: 'Alt+I',
  },
  {
    id: 'toolbar-outputs',
    icon: OptionsRegular,
    label: 'Outputs',
    tooltip: 'Outputs [ Alt-O ]',
    description:'Values, relays and actuators wired to the controller',
    action: 'openWindow',
    windowId: WINDOW_OUTPUT,
    route: '/t3000/outputs',
    shortcut: 'Alt+O',
  },
  {
    id: 'toolbar-variables',
    icon: CircleMultipleConcentricRegular,
    label: 'Variables',
    tooltip: 'Variables [ Alt-V ]',
    description:'Setpoints, counters, timers and other system defined items',
    action: 'openWindow',
    windowId: WINDOW_VARIABLE,
    route: '/t3000/variables',
    shortcut: 'Alt+V',
  },
  {
    id: 'toolbar-programs',
    icon: DeveloperBoardRegular,
    label: 'Programs',
    tooltip: 'Programs [ Alt-P ]',
    description:'System logic and sequencing',
    action: 'openWindow',
    windowId: WINDOW_PROGRAM,
    route: '/t3000/programs',
    shortcut: 'Alt+P',
  },
  {
    id: 'toolbar-pidloops',
    icon: FlowRegular,
    label: 'PID Loops',
    tooltip: 'PID Loops [ Alt-L ]',
    description:'Proportional-Integral-Derivative feedback control loops',
    action: 'openWindow',
    windowId: WINDOW_CONTROLLER,
    route: '/t3000/pidloops',
    shortcut: 'Alt+L',
  },
  {
    id: 'toolbar-graphics',
    icon: ImageRegular,
    label: 'Graphics',
    tooltip: 'Graphics [ Alt-G ]',
    description:'Floor plans, system diagrams, graphical displays',
    action: 'openWindow',
    windowId: WINDOW_SCREEN,
    route: '/t3000/graphics',
    shortcut: 'Alt+G',
  },
  {
    id: 'toolbar-schedules',
    icon: CalendarRegular,
    label: 'Schedules',
    tooltip: 'Schedules [ Alt-S ]',
    description:'Daily on and off events for the week',
    action: 'openWindow',
    windowId: WINDOW_WEEKLY,
    route: '/t3000/schedules',
    shortcut: 'Alt+S',
  },
  {
    id: 'toolbar-holidays',
    icon: CalendarDateRegular,
    label: 'Holidays',
    tooltip: 'Holidays [ Alt-H ]',
    description:'Holidays and days with special schedules during the year',
    action: 'openWindow',
    windowId: WINDOW_ANNUAL,
    route: '/t3000/holidays',
    shortcut: 'Alt+H',
  },
  {
    id: 'toolbar-trendlogs',
    icon: ChartMultipleRegular,
    label: 'Trend Logs',
    tooltip: 'Trend Logs [ Alt-T ]',
    description:'Graphics and historical data',
    action: 'openWindow',
    windowId: WINDOW_MONITOR,
    route: '/t3000/trendlogs',
    shortcut: 'Alt+T',
  },
  {
    id: 'toolbar-alarms',
    icon: AlertRegular,
    label: 'Alarms',
    tooltip: 'Alarms [ Alt-A ]',
    description:'Current and past alarm events',
    action: 'openWindow',
    windowId: WINDOW_ALARMLOG,
    route: '/t3000/alarms',
    shortcut: 'Alt+A',
  },
  {
    id: 'toolbar-array',
    icon: ListRegular,
    label: 'Array',
    tooltip: 'Array [ Alt-E ]',
    description:'Defining array',
    action: 'openWindow',
    windowId: WINDOW_ARRAY,
    route: '/t3000/array',
  },
  {
    id: 'toolbar-network',
    icon: NetworkCheckRegular,
    label: 'Network',
    tooltip: 'Network Points [ Alt-N]',
    description:'Network points from other nodes used by the controller',
    action: 'openWindow',
    windowId: WINDOW_REMOTE_POINT,
    route: '/t3000/network',
    shortcut: 'Alt+N',
  },
  {
    id: 'toolbar-settings',
    icon: SettingsGearRegular,
    label: 'Settings',
    tooltip: 'Configuration [ Alt-C ]',
    description:'Setup and advanced parameters',
    action: 'openWindow',
    windowId: WINDOW_SETTING,
    route: '/t3000/settings',
    shortcut: 'Alt+E',
  },
  {
    id: 'toolbar-discover',
    icon: SearchRegular,
    label: 'Discover',
    tooltip: 'Discover [ Alt-D ]',
    description:'Discover new devices on the LAN, com ports and USB',
    action: 'openWindow',
    windowId: WINDOW_DISCOVER,
    route: '/t3000/discover',
  },
  {
    id: 'toolbar-buildings',
    icon: BuildingMultipleRegular,
    label: 'Buildings',
    tooltip: 'Buildings [ Alt-B ]',
    description:'Database of all buildings, connect to a different site or go offline to set up a new one',
    action: 'openWindow',
    windowId: WINDOW_BUILDINGS,
    route: '/t3000/buildings',
  },
  {
    id: 'toolbar-refresh',
    icon: ArrowClockwiseRegular,
    label: 'Refresh',
    tooltip: 'Refresh Data',
    description:'Refresh data from device',
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
