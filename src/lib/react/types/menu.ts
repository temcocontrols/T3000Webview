/**
 * Menu types for top menu bar and toolbar
 */

import { WindowType } from './window';
import type { FluentIcon } from '@fluentui/react-icons';

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
  icon?: FluentIcon | string; // Support both component and string name
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;          // For checkbox/radio
  divider?: boolean;          // Is this a divider? (for backwards compatibility)
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
  icon: FluentIcon | string; // Support both component and string name
  tooltip: string;
  shortcut?: string;
  windowId?: number;          // Window ID for navigation
  route?: string;             // Route path
  dialog?: string;            // Dialog name for opening dialogs
  dialogId?: string;          // Dialog ID (alternative name)
  divider?: boolean;          // Is this a divider?
  action?: string | (() => void); // Action identifier or function
  disabled?: boolean;
}

// Toolbar configuration
export interface ToolbarConfig {
  buttons: ToolbarButton[];
}

// Menu action types
export enum MenuAction {
  // File menu
  NewProject = 'new-project',
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
  Connect = 'connect',
  ChangeModbusId = 'change-modbus-id',
  BacnetTool = 'bacnet-tool',
  ModbusPoll = 'modbus-poll',
  RegisterViewer = 'register-viewer',
  ModbusRegisterV2 = 'modbus-register-v2',
  RegisterListDatabaseFolder = 'registerlist-database-folder',
  LoadFirmwareSingle = 'load-firmware-single',
  LoadFirmwareMany = 'load-firmware-many',
  FlashSN = 'flash-sn',
  Psychrometry = 'psychrometry',
  PhChart = 'ph-chart',
  Options = 'options',
  Disconnect = 'disconnect',
  LoginMyAccount = 'login-my-account',
  Discover = 'discover',
  Buildings = 'buildings',
  Refresh = 'refresh',
  Settings = 'settings',

  // View menu
  ShowToolBar = 'show-tool-bar',
  ShowBuildingPane = 'show-building-pane',
  ShowStatusBar = 'show-status-bar',
  ThemeOffice2003 = 'theme-office-2003',
  ThemeOffice2007Blue = 'theme-office-2007-blue',
  ThemeOffice2007Silver = 'theme-office-2007-silver',
  ViewRefresh = 'view-refresh',
  ShowLeftPanel = 'show-left-panel',
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
  OpenDocumentation = 'open-documentation',
  OpenQuickStart = 'open-quick-start',
  ReportBug = 'report-bug',
  SendFeedback = 'send-feedback',
  ShowAbout = 'show-about',
  About = 'about',
  CheckUpdates = 'check-updates',
}
