/**
 * Menu types for top menu bar and toolbar
 */

import { WindowType } from './window';

// Menu item type
export enum MenuItemType {
  Command = 'command',
  Submenu = 'submenu',
  Separator = 'separator',
  Checkbox = 'checkbox',
  Radio = 'radio',
  Item = 'item',              // Single menu item
  Divider = 'divider',        // Menu divider
}

// Menu item
export interface MenuItem {
  id?: string;
  type: MenuItemType | 'submenu' | 'item' | 'divider' | 'separator' | 'checkbox';
  label?: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;          // For checkbox/radio
  children?: MenuItem[];      // For submenu
  action?: MenuAction | (() => void);
  windowType?: WindowType;    // For window navigation
}

// Top menu configuration (7 menus)
export interface TopMenuConfig {
  label: string;
  items: MenuItem[];
}

// Toolbar icon button
export interface ToolbarButton {
  id: string;
  label: string;
  icon: string;
  tooltip: string;
  shortcut?: string;
  windowType?: WindowType;
  dialogType?: string;        // For dialog buttons (Discover, Buildings)
  action?: () => void;
  disabled?: boolean;
}

// Toolbar configuration
export interface ToolbarConfig {
  buttons: ToolbarButton[];
}

// Menu action types
export enum MenuAction {
  // File menu
  NewBuilding = 'new-building',
  Open = 'open',
  Save = 'save',
  SaveAs = 'save-as',
  Load = 'load',
  Import = 'import',
  Export = 'export',
  Print = 'print',
  Exit = 'exit',

  // Tools menu
  Discover = 'discover',
  Buildings = 'buildings',
  Refresh = 'refresh',
  Settings = 'settings',

  // View menu
  ShowLeftPanel = 'show-left-panel',
  ShowStatusBar = 'show-status-bar',
  ZoomIn = 'zoom-in',
  ZoomOut = 'zoom-out',
  ResetZoom = 'reset-zoom',

  // Database menu
  DatabaseManagement = 'database-management',
  BackupDatabase = 'backup-database',
  RestoreDatabase = 'restore-database',

  // Control menu
  ControlSettings = 'control-settings',
  StartControl = 'start-control',
  StopControl = 'stop-control',

  // Help menu
  Help = 'help',
  About = 'about',
  CheckUpdates = 'check-updates',
}
