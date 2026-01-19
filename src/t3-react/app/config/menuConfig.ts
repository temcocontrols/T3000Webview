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
 * Tools Menu
 */
const toolsMenu: MenuItem = {
  id: 'tools',
  label: 'Tools',
  type: 'submenu',
  children: [
    {
      id: 'tools-discover',
      label: 'Discover Devices',
      type: 'item',
      action: MenuAction.DiscoverDevices,
      icon: 'Search',
    },
    {
      id: 'tools-buildings',
      label: 'Buildings',
      type: 'item',
      action: MenuAction.ManageBuildings,
      icon: 'BuildingMultiple',
    },
    {
      id: 'tools-divider-1',
      type: 'divider',
    },
    {
      id: 'tools-sync-time',
      label: 'Sync Time',
      type: 'item',
      action: MenuAction.SyncTime,
      icon: 'Clock',
    },
    {
      id: 'tools-backup',
      label: 'Backup Device',
      type: 'item',
      action: MenuAction.BackupDevice,
      icon: 'Archive',
    },
    {
      id: 'tools-restore',
      label: 'Restore Device',
      type: 'item',
      action: MenuAction.RestoreDevice,
      icon: 'ArrowCounterclockwise',
    },
    {
      id: 'tools-divider-2',
      type: 'divider',
    },
    {
      id: 'tools-firmware-update',
      label: 'Firmware Update',
      type: 'item',
      action: MenuAction.FirmwareUpdate,
      icon: 'ArrowUpload',
    },
    {
      id: 'tools-reboot',
      label: 'Reboot Device',
      type: 'item',
      action: MenuAction.RebootDevice,
      icon: 'ArrowClockwise',
    },
    {
      id: 'tools-divider-3',
      type: 'divider',
    },
    {
      id: 'tools-options',
      label: 'Options',
      type: 'item',
      action: MenuAction.OpenOptions,
      icon: 'Settings',
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
      id: 'view-refresh',
      label: 'Refresh',
      type: 'item',
      action: MenuAction.Refresh,
      shortcut: 'F5',
      icon: 'ArrowClockwise',
    },
    {
      id: 'view-divider-1',
      type: 'divider',
    },
    {
      id: 'view-tree-panel',
      label: 'Show Tree Panel',
      type: 'checkbox',
      action: MenuAction.ToggleTreePanel,
      checked: true,
      icon: 'TreeView',
    },
    {
      id: 'view-toolbar',
      label: 'Show Toolbar',
      type: 'checkbox',
      action: MenuAction.ToggleToolbar,
      checked: true,
      icon: 'ToolbarSettings',
    },
    {
      id: 'view-status-bar',
      label: 'Show Status Bar',
      type: 'checkbox',
      action: MenuAction.ToggleStatusBar,
      checked: true,
      icon: 'StatusBar',
    },
    {
      id: 'view-divider-2',
      type: 'divider',
    },
    {
      id: 'view-full-screen',
      label: 'Full Screen',
      type: 'item',
      action: MenuAction.ToggleFullScreen,
      shortcut: 'F11',
      icon: 'FullScreen',
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
      id: 'db-upload',
      label: 'Upload to Device',
      type: 'item',
      action: MenuAction.UploadToDevice,
      icon: 'ArrowUpload',
    },
    {
      id: 'db-download',
      label: 'Download from Device',
      type: 'item',
      action: MenuAction.DownloadFromDevice,
      icon: 'ArrowDownload',
    },
    {
      id: 'db-divider-1',
      type: 'divider',
    },
    {
      id: 'db-clear',
      label: 'Clear Database',
      type: 'item',
      action: MenuAction.ClearDatabase,
      icon: 'Delete',
    },
    {
      id: 'db-reset',
      label: 'Reset to Defaults',
      type: 'item',
      action: MenuAction.ResetToDefaults,
      icon: 'ArrowReset',
    },
    {
      id: 'db-divider-2',
      type: 'divider',
    },
    {
      id: 'db-verify',
      label: 'Verify Database',
      type: 'item',
      action: MenuAction.VerifyDatabase,
      icon: 'CheckmarkCircle',
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
      id: 'control-enable-all',
      label: 'Enable All Outputs',
      type: 'item',
      action: MenuAction.EnableAllOutputs,
      icon: 'Power',
    },
    {
      id: 'control-disable-all',
      label: 'Disable All Outputs',
      type: 'item',
      action: MenuAction.DisableAllOutputs,
      icon: 'PowerOff',
    },
    {
      id: 'control-divider-1',
      type: 'divider',
    },
    {
      id: 'control-start-programs',
      label: 'Start All Programs',
      type: 'item',
      action: MenuAction.StartAllPrograms,
      icon: 'Play',
    },
    {
      id: 'control-stop-programs',
      label: 'Stop All Programs',
      type: 'item',
      action: MenuAction.StopAllPrograms,
      icon: 'Stop',
    },
    {
      id: 'control-divider-2',
      type: 'divider',
    },
    {
      id: 'control-start-logging',
      label: 'Start Trend Logging',
      type: 'item',
      action: MenuAction.StartTrendLogging,
      icon: 'RecordStart',
    },
    {
      id: 'control-stop-logging',
      label: 'Stop Trend Logging',
      type: 'item',
      action: MenuAction.StopTrendLogging,
      icon: 'RecordStop',
    },
    {
      id: 'control-divider-3',
      type: 'divider',
    },
    {
      id: 'control-acknowledge-alarms',
      label: 'Acknowledge All Alarms',
      type: 'item',
      action: MenuAction.AcknowledgeAllAlarms,
      icon: 'AlertCheck',
    },
    {
      id: 'control-clear-alarms',
      label: 'Clear All Alarms',
      type: 'item',
      action: MenuAction.ClearAllAlarms,
      icon: 'AlertOff',
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
      id: 'misc-network-settings',
      label: 'Network Settings',
      type: 'item',
      action: MenuAction.NetworkSettings,
      icon: 'Wifi',
    },
    {
      id: 'misc-modbus-config',
      label: 'Modbus Configuration',
      type: 'item',
      action: MenuAction.ModbusConfig,
      icon: 'DataConnection',
    },
    {
      id: 'misc-bacnet-config',
      label: 'BACnet Configuration',
      type: 'item',
      action: MenuAction.BacnetConfig,
      icon: 'Network',
    },
    {
      id: 'misc-divider-1',
      type: 'divider',
    },
    {
      id: 'misc-user-management',
      label: 'User Management',
      type: 'item',
      action: MenuAction.UserManagement,
      icon: 'People',
    },
    {
      id: 'misc-permissions',
      label: 'Permissions',
      type: 'item',
      action: MenuAction.ManagePermissions,
      icon: 'Shield',
    },
    {
      id: 'misc-divider-2',
      type: 'divider',
    },
    {
      id: 'misc-logs',
      label: 'View Logs',
      type: 'item',
      action: MenuAction.ViewLogs,
      icon: 'DocumentText',
    },
    {
      id: 'misc-diagnostics',
      label: 'Diagnostics',
      type: 'item',
      action: MenuAction.OpenDiagnostics,
      icon: 'Wrench',
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
