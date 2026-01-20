/**
 * Top Menu Bar Configuration
 * Based on C++ T3000.rc menu structure
 */

import type { MenuItem } from '@common/react/types/menu';
import { MenuAction } from '@common/react/types/menu';

/**
 * File Menu
 */
const fileMenu: MenuItem = {
  id: 'file',
  label: 'File',
  type: 'submenu',
  children: [
    {
      id: 'file-new-project',
      label: 'New Project',
      type: 'item',
      action: MenuAction.NewProject,
      icon: 'DocumentAdd',
    },
    {
      id: 'file-divider-1',
      type: 'divider',
    },
    {
      id: 'file-save-as',
      label: 'Save As...',
      type: 'item',
      action: MenuAction.SaveAs,
      shortcut: 'Ctrl+S',
      icon: 'SaveAs',
    },
    {
      id: 'file-load',
      label: 'Load File',
      type: 'item',
      action: MenuAction.Load,
      shortcut: 'Ctrl+L',
      icon: 'FolderOpen',
    },
    {
      id: 'file-import',
      label: 'Import',
      type: 'item',
      action: MenuAction.Import,
      shortcut: 'Ctrl+I',
      icon: 'ArrowUpload',
    },
    {
      id: 'file-divider-2',
      type: 'divider',
    },
    {
      id: 'file-exit',
      label: 'Exit',
      type: 'item',
      action: MenuAction.Exit,
      shortcut: 'Alt+F4',
      icon: 'SignOut',
    },
  ],
};

/**
 * View Menu
 */
const viewMenu: MenuItem = {
  id: 'view',
  label: 'View',
  type: 'submenu',
  children: [
    {
      id: 'view-toolbars',
      label: 'Toolbars and Docking Windows',
      type: 'submenu',
      icon: 'Toolbox',
      children: [
        {
          id: 'view-toolbar',
          label: 'Tool Bar',
          type: 'checkbox',
          action: MenuAction.ShowToolBar,
          checked: true,
          icon: 'ToolbarSettings',
        },
        {
          id: 'view-building-pane',
          label: 'Building Pane',
          type: 'checkbox',
          action: MenuAction.ShowBuildingPane,
          checked: true,
          icon: 'PanelLeft',
        },
      ],
    },
    {
      id: 'view-status-bar',
      label: 'Status Bar',
      type: 'checkbox',
      action: MenuAction.ShowStatusBar,
      checked: true,
      icon: 'StatusBar',
    },
    {
      id: 'view-divider-1',
      type: 'divider',
    },
    {
      id: 'view-application-look',
      label: 'Application Look',
      type: 'submenu',
      icon: 'ColorBackground',
      children: [
        {
          id: 'view-theme-office-2003',
          label: 'Office 2003',
          type: 'item',
          action: MenuAction.ThemeOffice2003,
          icon: 'Color',
        },
        {
          id: 'view-theme-office-2007',
          label: 'Office 2007',
          type: 'submenu',
          icon: 'ColorBackground',
          children: [
            {
              id: 'view-theme-office-2007-blue',
              label: 'Blue Style',
              type: 'item',
              action: MenuAction.ThemeOffice2007Blue,
              icon: 'Color',
            },
            {
              id: 'view-theme-office-2007-silver',
              label: 'Silver Style',
              type: 'item',
              action: MenuAction.ThemeOffice2007Silver,
              icon: 'Color',
            },
          ],
        },
      ],
    },
    {
      id: 'view-divider-2',
      type: 'divider',
    },
    {
      id: 'view-refresh',
      label: 'Refresh',
      type: 'item',
      action: MenuAction.ViewRefresh,
      shortcut: 'F2',
      icon: 'ArrowClockwise',
    },
  ],
};

/**
 * Tools Menu
 */
const toolsMenu: MenuItem = {
  id: 'tools',
  label: 'Tools',
  type: 'submenu',
  children: [
    {
      id: 'tools-connect',
      label: 'Connect',
      type: 'item',
      action: MenuAction.Connect,
      shortcut: 'Ctrl+C',
      icon: 'PlugConnected',
    },
    {
      id: 'tools-divider-1',
      type: 'divider',
    },
    {
      id: 'tools-change-modbus-id',
      label: 'Change Modbus ID',
      type: 'item',
      action: MenuAction.ChangeModbusId,
      icon: 'NumberSymbol',
    },
    {
      id: 'tools-divider-2',
      type: 'divider',
    },
    {
      id: 'tools-bacnet-tool',
      label: 'Bacnet Tool',
      type: 'item',
      action: MenuAction.BacnetTool,
      icon: 'Wrench',
    },
    {
      id: 'tools-modbus-poll',
      label: 'Modbus Poll',
      type: 'item',
      action: MenuAction.ModbusPoll,
      icon: 'ChartMultiple',
    },
    {
      id: 'tools-register-viewer',
      label: 'Register Viewer',
      type: 'item',
      action: MenuAction.RegisterViewer,
      icon: 'Table',
    },
    {
      id: 'tools-modbus-register-v2',
      label: 'Modbus Register v2 (beta)',
      type: 'item',
      action: MenuAction.ModbusRegisterV2,
      icon: 'TableSimple',
    },
    {
      id: 'tools-registerlist-database-folder',
      label: 'RegisterList Database Folder',
      type: 'item',
      action: MenuAction.RegisterListDatabaseFolder,
      icon: 'FolderDatabase',
    },
    {
      id: 'tools-divider-3',
      type: 'divider',
    },
    {
      id: 'tools-load-firmware-single',
      label: 'Load firmware for a single device',
      type: 'item',
      action: MenuAction.LoadFirmwareSingle,
      shortcut: 'Ctrl+F2',
      icon: 'ArrowUpload',
    },
    {
      id: 'tools-load-firmware-many',
      label: 'Load firmware for many devices',
      type: 'item',
      action: MenuAction.LoadFirmwareMany,
      shortcut: 'Ctrl+M',
      icon: 'ArrowUploadMultiple',
      disabled: true,
    },
    {
      id: 'tools-flash-sn',
      label: 'Flash SN',
      type: 'item',
      action: MenuAction.FlashSN,
      icon: 'Flash',
    },
    {
      id: 'tools-divider-4',
      type: 'divider',
    },
    {
      id: 'tools-psychrometry',
      label: 'Psychrometry',
      type: 'item',
      action: MenuAction.Psychrometry,
      icon: 'Temperature',
    },
    {
      id: 'tools-ph-chart',
      label: 'PH Chart',
      type: 'item',
      action: MenuAction.PhChart,
      icon: 'ChartLine',
    },
    {
      id: 'tools-divider-5',
      type: 'divider',
    },
    {
      id: 'tools-options',
      label: 'Options',
      type: 'item',
      action: MenuAction.Options,
      icon: 'Settings',
    },
    {
      id: 'tools-divider-6',
      type: 'divider',
    },
    {
      id: 'tools-disconnect',
      label: 'Disconnect the serial port',
      type: 'item',
      action: MenuAction.Disconnect,
      shortcut: 'Ctrl+D',
      icon: 'PlugDisconnected',
    },
    {
      id: 'tools-login-my-account',
      label: 'Login my account',
      type: 'item',
      action: MenuAction.LoginMyAccount,
      icon: 'PersonAccounts',
    },
  ],
};

/**
 * Database Menu
 */
const databaseMenu: MenuItem = {
  id: 'database',
  label: 'Database',
  type: 'submenu',
  children: [
    {
      id: 'db-building-config',
      label: 'Building Config Database',
      type: 'item',
      action: MenuAction.BuildingConfigDatabase,
      icon: 'BuildingMultiple',
    },
    {
      id: 'db-all-nodes',
      label: 'All Nodes...',
      type: 'item',
      action: MenuAction.AllNodesDatabase,
      shortcut: 'Ctrl+N',
      icon: 'Database',
    },
    {
      id: 'db-divider-1',
      type: 'divider',
    },
    {
      id: 'db-ioname-config',
      label: 'IONameConfig',
      type: 'item',
      action: MenuAction.IONameConfig,
      icon: 'Settings',
    },
    {
      id: 'db-log-detail',
      label: 'LogDetail',
      type: 'item',
      action: MenuAction.LogDetail,
      icon: 'DocumentText',
    },
  ],
};

/**
 * Control Menu
 */
const controlMenu: MenuItem = {
  id: 'control',
  label: 'Control',
  type: 'submenu',
  children: [
    {
      id: 'control-graphics',
      label: 'Graphics',
      type: 'item',
      action: MenuAction.ControlGraphics,
      shortcut: 'Alt+G',
      icon: 'Image',
    },
    {
      id: 'control-programs',
      label: 'Programs',
      type: 'item',
      action: MenuAction.ControlPrograms,
      shortcut: 'Alt+P',
      icon: 'DeveloperBoard',
    },
    {
      id: 'control-inputs',
      label: 'Inputs',
      type: 'item',
      action: MenuAction.ControlInputs,
      shortcut: 'Alt+I',
      icon: 'Wrench',
    },
    {
      id: 'control-outputs',
      label: 'Outputs',
      type: 'item',
      action: MenuAction.ControlOutputs,
      shortcut: 'Alt+O',
      icon: 'Options',
    },
    {
      id: 'control-variables',
      label: 'Variables',
      type: 'item',
      action: MenuAction.ControlVariables,
      shortcut: 'Alt+V',
      icon: 'CircleMultipleConcentric',
    },
    {
      id: 'control-loops',
      label: 'Loops',
      type: 'item',
      action: MenuAction.ControlLoops,
      shortcut: 'Alt+L',
      icon: 'Flow',
    },
    {
      id: 'control-schedules',
      label: 'Schedules',
      type: 'item',
      action: MenuAction.ControlSchedules,
      shortcut: 'Alt+S',
      icon: 'Calendar',
    },
    {
      id: 'control-holidays',
      label: 'Holidays',
      type: 'item',
      action: MenuAction.ControlHolidays,
      shortcut: 'Alt+H',
      icon: 'CalendarDate',
    },
    {
      id: 'control-trend-logs',
      label: 'Trend Logs',
      type: 'item',
      action: MenuAction.ControlTrendLogs,
      shortcut: 'Alt+T',
      icon: 'ChartMultiple',
    },
    {
      id: 'control-alarms',
      label: 'Alarms',
      type: 'item',
      action: MenuAction.ControlAlarms,
      shortcut: 'Alt+A',
      icon: 'Alert',
    },
    {
      id: 'control-network-panel',
      label: 'Network and Panel',
      type: 'item',
      action: MenuAction.ControlNetworkPanel,
      shortcut: 'Alt+N',
      icon: 'NetworkCheck',
    },
    {
      id: 'control-remote-points',
      label: 'Remote Points',
      type: 'item',
      action: MenuAction.ControlRemotePoints,
      icon: 'List',
    },
    {
      id: 'control-divider-1',
      type: 'divider',
    },
    {
      id: 'control-configuration',
      label: 'Configuration',
      type: 'item',
      action: MenuAction.ControlConfiguration,
      shortcut: 'Alt+E',
      icon: 'Settings',
    },
  ],
};

/**
 * Miscellaneous Menu
 */
const miscMenu: MenuItem = {
  id: 'misc',
  label: 'Miscellaneous',
  type: 'submenu',
  children: [
    {
      id: 'misc-load-descriptors',
      label: 'Load Descriptors',
      type: 'item',
      action: MenuAction.LoadDescriptors,
      icon: 'DocumentText',
    },
    {
      id: 'misc-write-flash',
      label: 'Write into flash',
      type: 'item',
      action: MenuAction.WriteIntoFlash,
      icon: 'Save',
    },
    {
      id: 'misc-gsm-connection',
      label: 'GSM Connection',
      type: 'item',
      action: MenuAction.GSMConnection,
      icon: 'DataConnection',
    },
  ],
};

/**
 * Help Menu
 */
const helpMenu: MenuItem = {
  id: 'help',
  label: 'Help',
  type: 'submenu',
  children: [
    {
      id: 'help-documentation',
      label: 'Documentation',
      type: 'item',
      action: MenuAction.OpenDocumentation,
      shortcut: 'F1',
      icon: 'Book',
    },
    {
      id: 'help-quick-start',
      label: 'Quick Start Guide',
      type: 'item',
      action: MenuAction.OpenQuickStart,
      icon: 'Lightbulb',
    },
    {
      id: 'help-divider-1',
      type: 'divider',
    },
    {
      id: 'help-check-updates',
      label: 'Check for Updates',
      type: 'item',
      action: MenuAction.CheckUpdates,
      icon: 'ArrowDownload',
    },
    {
      id: 'help-divider-2',
      type: 'divider',
    },
    {
      id: 'help-report-bug',
      label: 'Report a Bug',
      type: 'item',
      action: MenuAction.ReportBug,
      icon: 'Bug',
    },
    {
      id: 'help-feedback',
      label: 'Send Feedback',
      type: 'item',
      action: MenuAction.SendFeedback,
      icon: 'Comment',
    },
    {
      id: 'help-divider-3',
      type: 'divider',
    },
    {
      id: 'help-about',
      label: 'About T3000',
      type: 'item',
      action: MenuAction.ShowAbout,
      icon: 'Info',
    },
  ],
};

/**
 * System Menu (System Settings & Developer Tools)
 */
const systemMenu: MenuItem = {
  id: 'system',
  label: 'System',
  type: 'submenu',
  children: [
    {
      id: 'system-sync',
      label: 'Sync Configuration',
      type: 'item',
      action: () => window.location.hash = '#/t3000/system/sync',
      icon: 'ArrowSync',
    },
    {
      id: 'system-settings',
      label: 'Application Settings',
      type: 'item',
      action: () => window.location.hash = '#/t3000/settings',
      icon: 'Settings',
    },
    {
      id: 'system-divider-1',
      type: 'divider',
    },
    {
      id: 'system-files',
      label: 'File Browser',
      type: 'item',
      action: () => window.location.hash = '#/t3000/develop/files',
      icon: 'FolderOpen',
    },
    {
      id: 'system-database',
      label: 'Database',
      type: 'item',
      action: () => window.location.hash = '#/t3000/develop/database',
      icon: 'Database',
    },
    {
      id: 'system-transport',
      label: 'Transport Tester',
      type: 'item',
      action: () => window.location.hash = '#/t3000/develop/transport',
      icon: 'PlugConnected',
    },
    {
      id: 'system-logs',
      label: 'System Logs',
      type: 'item',
      action: () => window.location.hash = '#/t3000/develop/logs',
      icon: 'DocumentText',
    },
  ],
};

/**
 * Top Menu Configuration
 * Export array of all top-level menus
 */
export const topMenuConfig: MenuItem[] = [
  fileMenu,
  toolsMenu,
  viewMenu,
  databaseMenu,
  controlMenu,
  miscMenu,
  helpMenu,
  systemMenu,
];

/**
 * Alias for compatibility
 */
export const menuConfig = topMenuConfig;

/**
 * Get menu item by ID (helper function)
 */
export function getMenuItemById(id: string): MenuItem | undefined {
  for (const menu of topMenuConfig) {
    if (menu.id === id) return menu;
    if (menu.children) {
      const found = menu.children.find((item) => item.id === id);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Get menu items by action (helper function)
 */
export function getMenuItemsByAction(action: MenuAction): MenuItem[] {
  const items: MenuItem[] = [];
  for (const menu of topMenuConfig) {
    if (menu.children) {
      items.push(...menu.children.filter((item) => item.action === action));
    }
  }
  return items;
}
