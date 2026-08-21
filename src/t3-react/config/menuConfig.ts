/**
 * Top Menu Bar Configuration
 * Based on C++ T3000.rc menu structure
 */

import type { MenuItem } from '@common/react/types/menu';
import { MenuAction } from '@common/react/types/menu';

/**
 * Home Menu — one-click return to the T3000 inputs page.
 * Shown as the first menu in every design mode. Declared at the top so every
 * mode menu set (which references it) can initialize safely.
 */
export const homeMenu: MenuItem = {
  id: 'home',
  label: 'Home',
  type: 'item',
  action: () => {
    window.location.hash = '#/t3000/inputs';
  },
  icon: 'ArrowStepBack',
};

/**
 * Design Hub Back Menu — returns to the Design Hub dashboard.
 * Shown next to Home in every design tool mode. Declared at the top so every
 * mode menu set (which references it) can initialize safely.
 */
export const designHubBackMenu: MenuItem = {
  id: 'design-hub-back',
  label: 'Design Hub',
  type: 'item',
  action: () => {
    window.location.hash = '#/t3000/design';
  },
  icon: 'ArrowStepBack',
};

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
      id: 'tools-export-csv',
      label: 'Export to CSV',
      type: 'item',
      action: MenuAction.ExportToCsv,
      shortcut: 'Ctrl+Shift+E',
      icon: 'ArrowDownload',
    },
    {
      id: 'tools-import-csv',
      label: 'Import from CSV',
      type: 'item',
      action: MenuAction.ImportFromCsv,
      shortcut: 'Ctrl+Shift+I',
      icon: 'ArrowUpload',
    },
    {
      id: 'tools-divider-1b',
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
    {
      id: 'db-divider-2',
      type: 'divider',
    },
    {
      id: 'db-backend-config',
      label: 'Database Configuration',
      type: 'item',
      action: () => window.location.hash = '#/t3000/database/config',
      icon: 'Database',
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
export const helpMenu: MenuItem = {
  id: 'help',
  label: 'Help',
  type: 'submenu',
  children: [
    {
      id: 'help-contents',
      label: 'Contents',
      type: 'item',
      action: MenuAction.HelpContents,
      icon: 'Book',
    },
    {
      id: 'help-version-history',
      label: 'Version History',
      type: 'item',
      action: MenuAction.VersionHistory,
      icon: 'History',
    },
    {
      id: 'help-about-software',
      label: 'About Software',
      type: 'item',
      action: MenuAction.AboutSoftware,
      icon: 'Info',
    },
    {
      id: 'help-check-updates',
      label: 'Check For Updates',
      type: 'item',
      action: MenuAction.CheckUpdates,
      icon: 'ArrowDownload',
    },
    {
      id: 'help-divider-1',
      type: 'divider',
    },
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
  ],
};

/**
 * Developer Menu (Developer & Debugging Tools)
 */
const developerMenu: MenuItem = {
  id: 'developer',
  label: 'Developer',
  type: 'submenu',
  children: [
    {
      id: 'dev-sync',
      label: 'Sync Configuration',
      type: 'item',
      action: () => window.location.hash = '#/t3000/developer/sync',
      icon: 'ArrowSync',
    },
    {
      id: 'dev-settings',
      label: 'Application Settings',
      type: 'item',
      action: () => window.location.hash = '#/t3000/settings',
      icon: 'Settings',
    },
    {
      id: 'dev-divider-1',
      type: 'divider',
    },
    {
      id: 'dev-files',
      label: 'File Browser',
      type: 'item',
      action: () => window.location.hash = '#/t3000/develop/files',
      icon: 'FolderOpen',
    },
    {
      id: 'dev-database',
      label: 'Database Viewer',
      type: 'item',
      action: () => window.location.hash = '#/t3000/develop/database',
      icon: 'Database',
    },
    {
      id: 'dev-transport',
      label: 'Transport Tester',
      type: 'item',
      action: () => window.location.hash = '#/t3000/develop/transport',
      icon: 'PlugConnected',
    },
    {
      id: 'dev-logs',
      label: 'T3000 Logs',
      type: 'item',
      action: () => window.location.hash = '#/t3000/develop/logs',
      icon: 'CalendarDataBar',
    },
    {
      id: 'dev-divider-2',
      type: 'divider',
    },
    {
      id: 'dev-fluentui-v9',
      label: 'FluentUI v9',
      type: 'item',
      action: () => window.location.hash = '#/t3000/developer/fluentui-v9',
      icon: 'WindowDevTools',
    },
  ],
};

/**
 * Haystack Menu
 */
const haystackMenu: MenuItem = {
  id: 'haystack',
  label: 'Haystack',
  type: 'submenu',
  children: [
    {
      id: 'haystack-tag-library',
      label: 'Standard Tags',
      type: 'item',
      action: () => { window.location.hash = '#/t3000/haystack-tags'; },
      icon: 'Tag',
    },
    {
      id: 'haystack-custom-tags',
      label: 'Custom Tags',
      type: 'item',
      action: () => { window.location.hash = '#/t3000/custom-tags'; },
      icon: 'Tag',
    },
    {
      id: 'haystack-auto-tagging',
      label: 'Auto-Tagging',
      type: 'item',
      action: () => { window.location.hash = '#/t3000/auto-tagging'; },
      icon: 'Flash',
    },
  ],
};

/**
 * Simulator mode menus — Tstat10 Simulator / LCD UI editor.
 * Structure defined; editor-specific actions wired later.
 */
const simFileMenu: MenuItem = {
  id: 'sim-file',
  label: 'File',
  type: 'submenu',
  children: [
    { id: 'sim-file-new', label: 'New Screen', type: 'item', action: () => { /* TODO: wire */ }, disabled: true, icon: 'DocumentAdd' },
    { id: 'sim-file-open', label: 'Open...', type: 'item', action: () => { /* TODO: wire */ }, disabled: true, icon: 'FolderOpen' },
    { id: 'sim-file-div1', type: 'divider' },
    { id: 'sim-file-save', label: 'Save', type: 'item', action: () => { /* TODO: wire */ }, shortcut: 'Ctrl+S', disabled: true, icon: 'Save' },
    { id: 'sim-file-export', label: 'Export...', type: 'item', action: () => { /* TODO: wire */ }, disabled: true, icon: 'ArrowDownload' },
  ],
};

const simDesignMenu: MenuItem = {
  id: 'sim-design',
  label: 'Design',
  type: 'submenu',
  children: [
    { id: 'sim-design-screens', label: 'Screens', type: 'item', action: () => { /* TODO: wire */ }, disabled: true, icon: 'Image' },
    { id: 'sim-design-widget', label: 'Add Widget...', type: 'item', action: () => { /* TODO: wire */ }, disabled: true, icon: 'DocumentAdd' },
    { id: 'sim-design-library', label: 'Widget Library', type: 'item', action: () => { /* TODO: wire */ }, disabled: true, icon: 'Toolbox' },
  ],
};

const simulateMenu: MenuItem = {
  id: 'sim-simulate',
  label: 'Simulate',
  type: 'submenu',
  children: [
    { id: 'sim-simulate-run', label: 'Run', type: 'item', action: () => { /* TODO: wire */ }, disabled: true, icon: 'Play' },
    { id: 'sim-simulate-pause', label: 'Pause', type: 'item', action: () => { /* TODO: wire */ }, disabled: true, icon: 'Stop' },
    { id: 'sim-simulate-div1', type: 'divider' },
    {
      id: 'sim-simulate-drift',
      label: 'Toggle Temperature Drift',
      type: 'item',
      action: MenuAction.ToggleDrift,
      icon: 'Temperature',
    },
    {
      id: 'sim-simulate-debug',
      label: 'Toggle Debug Panel',
      type: 'item',
      action: MenuAction.ToggleDebugPanel,
      icon: 'Bug',
    },
    {
      id: 'sim-simulate-reset',
      label: 'Reset Simulator',
      type: 'item',
      action: MenuAction.ResetSimulator,
      icon: 'ArrowReset',
    },
  ],
};

const simViewMenu: MenuItem = {
  id: 'sim-view',
  label: 'View',
  type: 'submenu',
  children: [
    { id: 'sim-view-lcd', label: 'LCD View', type: 'item', action: () => { /* TODO: wire */ }, disabled: true, icon: 'DeveloperBoard' },
    { id: 'sim-view-bezel', label: 'Bezel View', type: 'item', action: () => { /* TODO: wire */ }, disabled: true, icon: 'Image' },
    { id: 'sim-view-div1', type: 'divider' },
    { id: 'sim-view-debug', label: 'Debug Panel', type: 'item', action: () => { /* TODO: wire */ }, disabled: true, icon: 'Bug' },
  ],
};

/**
 * Simulator mode menu set
 */
export const simulatorMenuConfig: MenuItem[] = [
  homeMenu,
  designHubBackMenu,
  simFileMenu,
  simDesignMenu,
  simulateMenu,
  simViewMenu,
  helpMenu,
];

/**
 * AI Assistant Menu
 */
const aiAssistantMenu: MenuItem = {
  id: 'ai-assistant',
  label: 'AI Assistant',
  type: 'submenu',
  children: [
    {
      id: 'ai-chat',
      label: 'Open AI Chat',
      type: 'item',
      action: () => {
        window.dispatchEvent(new CustomEvent('t3-open-ai-chat'));
      },
      icon: 'Chat',
    },
    {
      id: 'ai-divider',
      label: '',
      type: 'divider',
    },
    {
      id: 'ai-mcp-server',
      label: 'MCP Server',
      type: 'item',
      action: () => {
        window.location.hash = '#/t3000/ai-assistant/mcp';
      },
      icon: 'Flash',
    },
    {
      id: 'ai-settings',
      label: 'Settings...',
      type: 'item',
      action: () => {
        window.location.hash = '#/t3000/ai-chat';
      },
      icon: 'Settings',
    },
  ],
};

/**
 * Design Menu — unified entry point for the Design Hub & drawing creation.
 * Hub-only by design: Simulator and EEZ Studio live in the Design Hub and are
 * also exposed as contextual menus on their own pages (see getMenusForPath).
 */
export const designMenu: MenuItem = {
  id: 'design',
  label: 'Design Hub',
  type: 'submenu',
  children: [
    {
      id: 'design-hub',
      label: 'Dashboard',
      type: 'item',
      action: () => {
        window.location.hash = '#/t3000/design';
      },
      icon: 'DataHistogram',
    },
    { id: 'design-divider-0', type: 'divider' },
    {
      id: 'design-new-drawing-title',
      label: 'New Drawing',
      type: 'header',
    },
    {
      id: 'design-new-hvac-schematic',
      label: 'HVAC Schematic',
      type: 'item',
      action: () => {
        window.location.hash = '#/t3000/hvac-designer?type=hvac-schematic';
      },
      icon: 'Flow',
    },
    {
      id: 'design-new-floor-plan',
      label: 'Floor Plan',
      type: 'item',
      action: () => {
        window.location.hash = '#/t3000/hvac-designer?type=floor-plan';
      },
      icon: 'BuildingMultiple',
    },
    {
      id: 'design-new-eez-project',
      label: 'EEZ Project',
      type: 'item',
      action: () => {
        window.location.hash = '#/t3000/eez?type=eez-project';
      },
      icon: 'DocumentText',
    },
    {
      id: 'design-new-lcd-ui',
      label: 'LCD UI (Thermostat)',
      type: 'item',
      action: () => {
        window.location.hash = '#/t3000/tstat10-simulator?type=lcd-ui';
      },
      icon: 'DeveloperBoard',
    },
    {
      id: 'design-new-panel-symbols',
      label: 'Panel Symbols',
      type: 'item',
      action: () => {
        window.location.hash = '#/t3000/hvac-designer?type=panel-symbols';
      },
      icon: 'CircleMultipleConcentric',
    },
    { id: 'design-divider-1', type: 'divider' },
    {
      id: 'design-templates',
      label: 'Templates',
      type: 'item',
      action: () => {
        window.location.hash = '#/t3000/design?tab=templates';
      },
      icon: 'DocumentText',
    },
    {
      id: 'design-libraries',
      label: 'Libraries',
      type: 'item',
      action: () => {
        window.location.hash = '#/t3000/design?tab=libraries';
      },
      icon: 'FolderOpen',
    },
    {
      id: 'design-recent',
      label: 'Recent',
      type: 'item',
      action: () => {
        window.location.hash = '#/t3000/design?tab=recent';
      },
      icon: 'History',
    },
    { id: 'design-divider-2', type: 'divider' },
    {
      id: 'design-import',
      label: 'Import',
      type: 'item',
      action: () => {
        window.location.hash = '#/t3000/design?tab=import';
      },
      icon: 'ArrowUpload',
    },
  ],
};

/**
 * Design Hub mode — New Drawing (top-level create menu)
 */
const designHubNewDrawingMenu: MenuItem = {
  id: 'dh-new',
  label: 'New Drawing',
  type: 'submenu',
  children: [
    { id: 'dh-new-hvac', label: 'HVAC Schematic', type: 'item', action: () => { window.location.hash = '#/t3000/hvac-designer?type=hvac-schematic'; }, icon: 'Flow' },
    { id: 'dh-new-floor', label: 'Floor Plan', type: 'item', action: () => { window.location.hash = '#/t3000/hvac-designer?type=floor-plan'; }, icon: 'BuildingMultiple' },
    { id: 'dh-new-eez', label: 'EEZ Project', type: 'item', action: () => { window.location.hash = '#/t3000/eez?type=eez-project'; }, icon: 'DocumentText' },
    { id: 'dh-new-lcd', label: 'LCD UI (Thermostat)', type: 'item', action: () => { window.location.hash = '#/t3000/tstat10-simulator?type=lcd-ui'; }, icon: 'DeveloperBoard' },
    { id: 'dh-new-symbols', label: 'Panel Symbols', type: 'item', action: () => { window.location.hash = '#/t3000/hvac-designer?type=panel-symbols'; }, icon: 'CircleMultipleConcentric' },
  ],
};

/**
 * Design Hub mode — File menu (management)
 */
const designHubFileMenu: MenuItem = {
  id: 'dh-file',
  label: 'File',
  type: 'submenu',
  children: [
    {
      id: 'dh-file-new-type',
      label: 'New Type...',
      type: 'item',
      action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'new-type' } })),
      icon: 'DocumentAdd',
    },
    { id: 'dh-file-div1', type: 'divider' },
    {
      id: 'dh-file-import',
      label: 'Import Drawing...',
      type: 'item',
      action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'import' } })),
      icon: 'ArrowUpload',
    },
    { id: 'dh-file-div2', type: 'divider' },
    {
      id: 'dh-file-backup',
      label: 'Backup Hub',
      type: 'item',
      action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'backup' } })),
      icon: 'ArrowDownload',
    },
    {
      id: 'dh-file-restore',
      label: 'Restore Hub...',
      type: 'item',
      action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'restore' } })),
      icon: 'ArrowUpload',
    },
  ],
};

/**
 * Design Hub mode — View menu (grid/list, sort, favorites, folders, refresh)
 */
const designHubViewMenu: MenuItem = {
  id: 'dh-view',
  label: 'View',
  type: 'submenu',
  children: [
    { id: 'dh-view-grid', label: 'Grid View', type: 'item', action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'view-grid' } })), icon: 'Table' },
    { id: 'dh-view-list', label: 'List View', type: 'item', action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'view-list' } })), icon: 'List' },
    { id: 'dh-view-div1', type: 'divider' },
    {
      id: 'dh-view-sort-title',
      label: 'Sort by',
      type: 'header',
    },
    { id: 'dh-view-sort-updated', label: 'Updated', type: 'item', action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'sort-updated' } })), icon: 'History' },
    { id: 'dh-view-sort-name', label: 'Name', type: 'item', action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'sort-name' } })), icon: 'DocumentText' },
    { id: 'dh-view-sort-created', label: 'Created', type: 'item', action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'sort-created' } })), icon: 'Calendar' },
    { id: 'dh-view-div2', type: 'divider' },
    { id: 'dh-view-favorites', label: 'Favorites', type: 'item', action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'favorites' } })), icon: 'CheckmarkCircle' },
    { id: 'dh-view-folders', label: 'Folders', type: 'item', action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'folders' } })), icon: 'FolderOpen' },
    { id: 'dh-view-div3', type: 'divider' },
    { id: 'dh-view-refresh', label: 'Refresh', type: 'item', action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'refresh' } })), icon: 'ArrowClockwise' },
  ],
};

/**
 * Design Hub mode — Tools menu (device / cloud / compare)
 */
const designHubToolsMenu: MenuItem = {
  id: 'dh-tools',
  label: 'Tools',
  type: 'submenu',
  children: [
    { id: 'dh-tools-bind', label: 'Bind Device...', type: 'item', action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'bind' } })), icon: 'PlugConnected' },
    { id: 'dh-tools-deploy', label: 'Deploy...', type: 'item', action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'deploy' } })), icon: 'ArrowUpload' },
    { id: 'dh-tools-div1', type: 'divider' },
    { id: 'dh-tools-sync', label: 'Sync to Cloud', type: 'item', action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'sync' } })), icon: 'ArrowSync' },
    { id: 'dh-tools-share', label: 'Share...', type: 'item', action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'share' } })), icon: 'People' },
    { id: 'dh-tools-div2', type: 'divider' },
    { id: 'dh-tools-compare', label: 'Compare Drawings...', type: 'item', action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'compare' } })), icon: 'DataHistogram' },
    { id: 'dh-tools-div3', type: 'divider' },
    { id: 'dh-tools-palette', label: 'Command Palette', type: 'item', shortcut: 'Ctrl+K', action: () => window.dispatchEvent(new CustomEvent('t3-design-action', { detail: { action: 'palette' } })), icon: 'Search' },
  ],
};

/**
 * Design Hub mode menu set — Home + File/View/Tools/Help. The "Design Hub"
 * menu itself is intentionally omitted here (you are already on the hub).
 */
export const designHubMenuConfig: MenuItem[] = [
  homeMenu,
  designHubNewDrawingMenu,
  designHubFileMenu,
  designHubViewMenu,
  designHubToolsMenu,
  helpMenu,
];

/**
 * HVAC Designer mode menus — mirror the page's TopToolbar / ToolsPanel actions.
 * The t3-hvac library is loaded lazily via dynamic import() so importing this
 * config early during boot never triggers the library's internal
 * circular-initialization (S.BaseSymbol ↔ BaseShape).
 */
const hvacNoopEvent = { preventDefault: () => {}, stopPropagation: () => {} } as any;
const hvacCenterEvent = () => {
  const svgArea = document.getElementById('svg-area');
  const rect = svgArea?.getBoundingClientRect();
  return {
    clientX: rect ? rect.left + rect.width / 2 : 400,
    clientY: rect ? rect.top + rect.height / 2 : 300,
    button: 0,
    preventDefault: () => {},
    stopPropagation: () => {},
  } as any;
};
let t3Promise: Promise<{ toolOpt: any; T3Gv: any; DataOpt: any }> | null = null;
function getT3(): Promise<{ toolOpt: any; T3Gv: any; DataOpt: any }> {
  if (!t3Promise) {
    t3Promise = Promise.all([
      import('@/lib/t3-hvac/Event/EvtOpt'),
      import('@/lib/t3-hvac/Data/T3Gv'),
      import('@/lib/t3-hvac/Opt/Data/DataOpt'),
    ]).then(([EvtOptMod, T3GvMod, DataOptMod]: any[]) => ({
      toolOpt: EvtOptMod.default.toolOpt,
      T3Gv: T3GvMod.default,
      DataOpt: DataOptMod.default,
    }));
  }
  return t3Promise;
}
const hvacAct = (run: (t3: { toolOpt: any; T3Gv: any; DataOpt: any }) => void) => () => {
  getT3().then(run).catch(() => {});
};

const hvacFileMenu: MenuItem = {
  id: 'hvac-file',
  label: 'File',
  type: 'submenu',
  children: [
    { id: 'hvac-file-save', label: 'Save', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.SaveAct()), shortcut: 'Ctrl+S', icon: 'Save' },
    { id: 'hvac-file-div1', type: 'divider' },
    { id: 'hvac-file-clear', label: 'Clear', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.ClearAct()), icon: 'Delete' },
    { id: 'hvac-file-div2', type: 'divider' },
    { id: 'hvac-file-add-lib', label: 'Add to Library', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.AddToLibraryAct()), icon: 'DocumentAdd' },
    { id: 'hvac-file-load-lib', label: 'Load Library...', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.LoadLibraryAct()), icon: 'FolderOpen' },
    { id: 'hvac-file-div3', type: 'divider' },
    {
      id: 'hvac-file-background',
      label: 'Background',
      type: 'submenu',
      icon: 'Image',
      children: [
        { id: 'hvac-file-bg-white', label: 'White', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.LibSetBackgroundColorAct('white')) },
        { id: 'hvac-file-bg-gray', label: 'Gray', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.LibSetBackgroundColorAct('gray')) },
        { id: 'hvac-file-bg-black', label: 'Black', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.LibSetBackgroundColorAct('black')) },
        { id: 'hvac-file-bg-custom', label: 'Custom...', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.LibSetBackgroundColorAct('custom')) },
      ],
    },
  ],
};

const hvacEditMenu: MenuItem = {
  id: 'hvac-edit',
  label: 'Edit',
  type: 'submenu',
  children: [
    { id: 'hvac-edit-undo', label: 'Undo', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.UndoAct(hvacNoopEvent)), shortcut: 'Ctrl+Z' },
    { id: 'hvac-edit-redo', label: 'Redo', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.RedoAct(hvacNoopEvent)), shortcut: 'Ctrl+Y' },
    { id: 'hvac-edit-div1', type: 'divider' },
    { id: 'hvac-edit-cut', label: 'Cut', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.CutAct(hvacNoopEvent)), shortcut: 'Ctrl+X' },
    { id: 'hvac-edit-copy', label: 'Copy', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.CopyAct(hvacNoopEvent)), shortcut: 'Ctrl+C', icon: 'DocumentText' },
    { id: 'hvac-edit-duplicate', label: 'Duplicate', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.DuplicateAct(hvacNoopEvent)), icon: 'DocumentAdd' },
    { id: 'hvac-edit-paste', label: 'Paste', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.PasteAct(hvacNoopEvent)), shortcut: 'Ctrl+V', icon: 'ArrowUpload' },
    { id: 'hvac-edit-delete', label: 'Delete', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.DeleteAct(hvacNoopEvent)), shortcut: 'Del', icon: 'Delete' },
    { id: 'hvac-edit-div2', type: 'divider' },
    { id: 'hvac-edit-select-all', label: 'Select All', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.SelectAllObjects()), shortcut: 'Ctrl+A', icon: 'CheckmarkCircle' },
    { id: 'hvac-edit-lock', label: 'Lock', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.LibLockAct(false)) },
    { id: 'hvac-edit-unlock', label: 'Unlock', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.LibUnlockAct(false)) },
  ],
};

const hvacViewMenu: MenuItem = {
  id: 'hvac-view',
  label: 'View',
  type: 'submenu',
  children: [
    { id: 'hvac-view-zoomin', label: 'Zoom In', type: 'item', action: hvacAct(({ T3Gv }) => T3Gv.docUtil?.SetZoomLevel(Math.round((T3Gv.docUtil?.GetZoomFactor() ?? 1) * 100) + 10)) },
    { id: 'hvac-view-zoomout', label: 'Zoom Out', type: 'item', action: hvacAct(({ T3Gv }) => T3Gv.docUtil?.SetZoomLevel(Math.round((T3Gv.docUtil?.GetZoomFactor() ?? 1) * 100) - 10)) },
    { id: 'hvac-view-resetzoom', label: 'Reset Zoom', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.ResetScaleAct(hvacNoopEvent)), icon: 'ArrowReset' },
    { id: 'hvac-view-div1', type: 'divider' },
    { id: 'hvac-view-rulers', label: 'Rulers', type: 'item', action: hvacAct(({ T3Gv, DataOpt }) => { const dc = T3Gv.docUtil?.docConfig; if (dc) { dc.showRulers = !dc.showRulers; T3Gv.docUtil?.UpdateRulerVisibility(); DataOpt.SaveToLocalStorage(); } }), icon: 'Toolbox' },
    { id: 'hvac-view-grid', label: 'Grid', type: 'item', action: hvacAct(({ T3Gv, DataOpt }) => { const dc = T3Gv.docUtil?.docConfig; if (dc) { dc.showGrid = !dc.showGrid; T3Gv.docUtil?.UpdateGridVisibility(); DataOpt.SaveToLocalStorage(); } }), icon: 'Table' },
  ],
};

const hvacInsertMenu: MenuItem = {
  id: 'hvac-insert',
  label: 'Insert',
  type: 'submenu',
  children: [
    {
      id: 'hvac-insert-shape-title',
      label: 'Add Shape',
      type: 'header',
    },
    { id: 'hvac-insert-rect', label: 'Rectangle', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.StampShapeFromToolAct(hvacCenterEvent(), 2, 'Box')), icon: 'DocumentText' },
    { id: 'hvac-insert-oval', label: 'Oval', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.StampShapeFromToolAct(hvacCenterEvent(), 4, 'Oval')), icon: 'CircleMultipleConcentric' },
    { id: 'hvac-insert-circle', label: 'Circle', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.StampShapeFromToolAct(hvacCenterEvent(), 9, 'G_Circle')), icon: 'CircleMultipleConcentric' },
    { id: 'hvac-insert-line', label: 'Line', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.ToolLineAct('line', hvacCenterEvent())), icon: 'Flow' },
    { id: 'hvac-insert-text', label: 'Text', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.StampShapeFromToolAct(hvacCenterEvent(), 'textLabel', 'Text')), icon: 'DocumentText' },
  ],
};

const hvacToolsMenu: MenuItem = {
  id: 'hvac-tools',
  label: 'Tools',
  type: 'submenu',
  children: [
    {
      id: 'hvac-tools-transform-title',
      label: 'Transform',
      type: 'header',
    },
    {
      id: 'hvac-tools-rotate',
      label: 'Rotate',
      type: 'submenu',
      icon: 'ArrowClockwise',
      children: [
        { id: 'hvac-tools-rotate-45', label: '45°', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.RotateAct(hvacNoopEvent, 45)) },
        { id: 'hvac-tools-rotate-90', label: '90°', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.RotateAct(hvacNoopEvent, 90)) },
        { id: 'hvac-tools-rotate-180', label: '180°', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.RotateAct(hvacNoopEvent, 180)) },
        { id: 'hvac-tools-rotate-270', label: '270°', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.RotateAct(hvacNoopEvent, 270)) },
      ],
    },
    {
      id: 'hvac-tools-flip',
      label: 'Flip',
      type: 'submenu',
      icon: 'Flow',
      children: [
        { id: 'hvac-tools-flip-h', label: 'Flip Horizontal', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.ShapeFlipHorizontalAct(hvacNoopEvent)) },
        { id: 'hvac-tools-flip-v', label: 'Flip Vertical', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.ShapeFlipVerticalAct(hvacNoopEvent)) },
      ],
    },
    {
      id: 'hvac-tools-align',
      label: 'Align',
      type: 'submenu',
      icon: 'Table',
      children: [
        { id: 'hvac-tools-align-left', label: 'Align Left', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.ShapeAlignAct('lefts')) },
        { id: 'hvac-tools-align-centerh', label: 'Align Center H', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.ShapeAlignAct('centers')) },
        { id: 'hvac-tools-align-right', label: 'Align Right', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.ShapeAlignAct('rights')) },
        { id: 'hvac-tools-align-top', label: 'Align Top', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.ShapeAlignAct('tops')) },
        { id: 'hvac-tools-align-centerv', label: 'Align Center V', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.ShapeAlignAct('middles')) },
        { id: 'hvac-tools-align-bottom', label: 'Align Bottom', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.ShapeAlignAct('bottoms')) },
      ],
    },
    {
      id: 'hvac-tools-makesame',
      label: 'Make Same',
      type: 'submenu',
      icon: 'DocumentText',
      children: [
        { id: 'hvac-tools-same-width', label: 'Same Width', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.MakeSameSizeAct(hvacNoopEvent, 2)) },
        { id: 'hvac-tools-same-height', label: 'Same Height', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.MakeSameSizeAct(hvacNoopEvent, 1)) },
        { id: 'hvac-tools-same-size', label: 'Same Size', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.MakeSameSizeAct(hvacNoopEvent, 3)) },
      ],
    },
    { id: 'hvac-tools-div1', type: 'divider' },
    { id: 'hvac-tools-group', label: 'Group', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.GroupAct(hvacNoopEvent)), icon: 'CircleMultipleConcentric' },
    { id: 'hvac-tools-ungroup', label: 'Ungroup', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.UnGroupAct(hvacNoopEvent)), icon: 'CircleMultipleConcentric' },
    { id: 'hvac-tools-div2', type: 'divider' },
    { id: 'hvac-tools-front', label: 'Bring to Front', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.ShapeBringToFrontAct(hvacNoopEvent)), icon: 'ArrowUpload' },
    { id: 'hvac-tools-back', label: 'Send to Back', type: 'item', action: hvacAct(({ toolOpt }) => toolOpt.ShapeSendToBackAct(hvacNoopEvent)), icon: 'ArrowDownload' },
  ],
};

/**
 * HVAC Designer mode menu set
 */
export const hvacMenuConfig: MenuItem[] = [
  homeMenu,
  designHubBackMenu,
  hvacFileMenu,
  hvacEditMenu,
  hvacViewMenu,
  hvacInsertMenu,
  hvacToolsMenu,
  helpMenu,
];

/**
 * EEZ Studio top-level menus — mirrors Electron's native menu (File/Edit/View/Help)
 * These actions post messages into the EEZ Studio iframe/page shell.
 * Shown at the top menu bar only while the EEZ Studio page (/t3000/eez) is open.
 */
export const eezFileMenu: MenuItem = {
  id: 'eez-file',
  label: 'File',
  type: 'submenu',
  icon: 'Folder',
  children: [
    { id: 'eez-file-new', label: 'New Project...', type: 'item', action: MenuAction.EezNewProject, shortcut: 'Ctrl+N', icon: 'DocumentAdd' },
    { id: 'eez-file-add-instr', label: 'Add Instrument...', type: 'item', action: MenuAction.EezAddInstrument, shortcut: 'Ctrl+Alt+N', icon: 'Add' },
    { id: 'eez-file-new-window', label: 'New Window', type: 'item', action: MenuAction.EezNewWindow, shortcut: 'Ctrl+Shift+N', icon: 'WindowNew' },
    { id: 'eez-file-div1', type: 'divider' },
    { id: 'eez-file-open', label: 'Open...', type: 'item', action: MenuAction.EezOpen, shortcut: 'Ctrl+O', icon: 'FolderOpen' },
    { id: 'eez-file-open-recent', label: 'Open Recent', type: 'submenu', icon: 'History', children: [] }, // populated dynamically
    { id: 'eez-file-div2', type: 'divider' },
    { id: 'eez-file-reload', label: 'Reload Project', type: 'item', action: MenuAction.EezReloadProject, icon: 'ArrowSync' },
    { id: 'eez-file-div3', type: 'divider' },
    { id: 'eez-file-import-instr', label: 'Import Instrument Definition...', type: 'item', action: MenuAction.EezImportInstrumentDef, icon: 'ArrowImport' },
    { id: 'eez-file-div4', type: 'divider' },
    { id: 'eez-file-save', label: 'Save', type: 'item', action: MenuAction.EezSave, shortcut: 'Ctrl+S', icon: 'Save' },
    { id: 'eez-file-saveas', label: 'Save As...', type: 'item', action: MenuAction.EezSaveAs, shortcut: 'Ctrl+Shift+S', icon: 'SaveAs' },
    { id: 'eez-file-div5', type: 'divider' },
    { id: 'eez-file-check', label: 'Check', type: 'item', action: MenuAction.EezCheck, shortcut: 'Ctrl+K', icon: 'Checkmark' },
    { id: 'eez-file-build', label: 'Build', type: 'item', action: MenuAction.EezBuild, shortcut: 'Ctrl+B', icon: 'Wrench' },
    { id: 'eez-file-build-ext', label: 'Build Extensions', type: 'item', action: MenuAction.EezBuildExtensions, icon: 'PuzzlePiece' },
    { id: 'eez-file-build-install-ext', label: 'Build and Install Extensions', type: 'item', action: MenuAction.EezBuildInstallExtensions, icon: 'PuzzlePiece' },
  ],
};

export const eezEditMenu: MenuItem = {
  id: 'eez-edit',
  label: 'Edit',
  type: 'submenu',
  icon: 'Edit',
  children: [
    { id: 'eez-edit-undo', label: 'Undo', type: 'item', action: MenuAction.EezUndo, shortcut: 'Ctrl+Z', icon: 'ArrowUndo' },
    { id: 'eez-edit-redo', label: 'Redo', type: 'item', action: MenuAction.EezRedo, shortcut: 'Ctrl+Y', icon: 'ArrowRedo' },
    { id: 'eez-edit-div1', type: 'divider' },
    { id: 'eez-edit-cut', label: 'Cut', type: 'item', action: MenuAction.EezCut, shortcut: 'Ctrl+X', icon: 'Cut' },
    { id: 'eez-edit-copy', label: 'Copy', type: 'item', action: MenuAction.EezCopy, shortcut: 'Ctrl+C', icon: 'Copy' },
    { id: 'eez-edit-paste', label: 'Paste', type: 'item', action: MenuAction.EezPaste, shortcut: 'Ctrl+V', icon: 'ClipboardPaste' },
    { id: 'eez-edit-delete', label: 'Delete', type: 'item', action: MenuAction.EezDelete, shortcut: 'Del', icon: 'Delete' },
    { id: 'eez-edit-div2', type: 'divider' },
    { id: 'eez-edit-selectall', label: 'Select All', type: 'item', action: MenuAction.EezSelectAll, shortcut: 'Ctrl+A', icon: 'SelectAllOn' },
    { id: 'eez-edit-div3', type: 'divider' },
    { id: 'eez-edit-find', label: 'Find Project Component', type: 'item', action: MenuAction.EezFindComponent, shortcut: 'Ctrl+Shift+F', icon: 'Search' },
  ],
};

export const eezViewMenu: MenuItem = {
  id: 'eez-view',
  label: 'View',
  type: 'submenu',
  icon: 'Eye',
  children: [
    { id: 'eez-view-home', label: 'Home', type: 'item', action: MenuAction.EezHome, icon: 'Home' },
    { id: 'eez-view-history', label: 'History', type: 'item', action: MenuAction.EezHistory, icon: 'History' },
    { id: 'eez-view-shortcuts', label: 'Shortcuts and Groups', type: 'item', action: MenuAction.EezShortcuts, icon: 'LinkSquare' },
    { id: 'eez-view-notebooks', label: 'Notebooks', type: 'item', action: MenuAction.EezNotebooks, icon: 'Notebook' },
    { id: 'eez-view-extensions', label: 'Extensions', type: 'item', action: MenuAction.EezExtensions, icon: 'PuzzlePiece' },
    { id: 'eez-view-settings', label: 'Settings', type: 'item', action: MenuAction.EezSettings, icon: 'Settings' },
    { id: 'eez-view-div1', type: 'divider' },
    { id: 'eez-view-scrapbook', label: 'Scrapbook for Project Editor', type: 'item', action: MenuAction.EezScrapbook, icon: 'Collections' },
    { id: 'eez-view-div2', type: 'divider' },
    { id: 'eez-view-fullscreen', label: 'Toggle Full Screen', type: 'item', action: MenuAction.EezToggleFullScreen, shortcut: 'F11', icon: 'FullScreenMaximize' },
    { id: 'eez-view-devtools', label: 'Toggle Developer Tools', type: 'item', action: MenuAction.EezToggleDevTools, shortcut: 'Ctrl+Shift+I', icon: 'WindowDevTools' },
    { id: 'eez-view-theme', label: 'Switch Theme', type: 'item', action: MenuAction.EezSwitchTheme, shortcut: 'Ctrl+Shift+T', icon: 'DarkTheme' },
    { id: 'eez-view-div3', type: 'divider' },
    { id: 'eez-view-zoomin', label: 'Zoom In', type: 'item', action: MenuAction.EezZoomIn, icon: 'ZoomIn' },
    { id: 'eez-view-zoomout', label: 'Zoom Out', type: 'item', action: MenuAction.EezZoomOut, icon: 'ZoomOut' },
    { id: 'eez-view-resetzoom', label: 'Reset Zoom', type: 'item', action: MenuAction.EezResetZoom, icon: 'ZoomFit' },
    { id: 'eez-view-div4', type: 'divider' },
    { id: 'eez-view-components', label: 'Show/Hide Components Palette', type: 'item', action: MenuAction.EezToggleComponentsPalette, icon: 'PanelRight' },
    { id: 'eez-view-resetlayout', label: 'Reset Layout', type: 'item', action: MenuAction.EezResetLayout, icon: 'LayoutRowFour' },
    { id: 'eez-view-div5', type: 'divider' },
    { id: 'eez-view-nexttab', label: 'Next Tab', type: 'item', action: MenuAction.EezNextTab, shortcut: 'Ctrl+Tab', icon: 'TabDesktopArrowRight' },
    { id: 'eez-view-prevtab', label: 'Previous Tab', type: 'item', action: MenuAction.EezPreviousTab, shortcut: 'Ctrl+Shift+Tab', icon: 'TabDesktopArrowLeft' },
    { id: 'eez-view-div6', type: 'divider' },
    { id: 'eez-view-reload', label: 'Reload', type: 'item', action: MenuAction.EezReload, shortcut: 'Ctrl+R', icon: 'ArrowClockwise' },
  ],
};

export const eezHelpMenu: MenuItem = {
  id: 'eez-help',
  label: 'Help',
  type: 'submenu',
  icon: 'QuestionCircle',
  children: [
    { id: 'eez-help-docs', label: 'Documentation', type: 'item', action: MenuAction.EezDocumentation, shortcut: 'F1', icon: 'Book' },
    { id: 'eez-help-div1', type: 'divider' },
    { id: 'eez-help-about', label: 'About EEZ Studio', type: 'item', action: MenuAction.EezAbout, icon: 'Info' },
  ],
};

/**
 * EEZ Studio mode menu set — Home + Design Hub back + File/Edit/View/Help (top level).
 */
export const eezMenuConfig: MenuItem[] = [homeMenu, designHubBackMenu, eezFileMenu, eezEditMenu, eezViewMenu, eezHelpMenu];

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
  developerMenu,
  haystackMenu,
  aiAssistantMenu,
  designMenu,
];

/**
 * Alias for compatibility
 */
export const menuConfig = topMenuConfig;

/**
 * Mode-based menu resolution.
 * Returns the menu set to show for a given route path:
 *  - /t3000/design            → Design Hub menus
 *  - /t3000/hvac-designer     → HVAC editor menus
 *  - /t3000/eez               → EEZ Studio File/Edit/View/Help (top level)
 *  - /t3000/tstat10-simulator → Simulator menus
 *  - everything else          → T3000 menus
 */
export function getMenusForPath(pathname: string): MenuItem[] {
  if (pathname.startsWith('/t3000/design')) return designHubMenuConfig;
  if (pathname.startsWith('/t3000/hvac-designer')) return hvacMenuConfig;
  if (pathname.startsWith('/t3000/eez')) return eezMenuConfig;
  if (pathname.startsWith('/t3000/tstat10-simulator')) return simulatorMenuConfig;
  return topMenuConfig;
}

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
