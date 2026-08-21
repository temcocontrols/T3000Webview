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
const helpMenu: MenuItem = {
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
 * Simulator Menu
 * Contextual — shown in the top menu bar only when the Tstat10 Simulator
 * page (/t3000/tstat10-simulator) is open.
 */
export const simulatorMenu: MenuItem = {
  id: 'simulator',
  label: 'Simulator',
  type: 'submenu',
  children: [
    {
      id: 'simulator-tstat10',
      label: 'Tstat10 Simulator',
      type: 'item',
      action: () => window.location.hash = '#/t3000/tstat10-simulator',
      shortcut: 'Alt+M',
      icon: 'Board',
    },
    {
      id: 'simulator-divider-1',
      type: 'divider',
    },
    {
      id: 'simulator-toggle-drift',
      label: 'Toggle Temperature Drift',
      type: 'item',
      action: MenuAction.ToggleDrift,
      icon: 'Temperature',
    },
    {
      id: 'simulator-toggle-debug',
      label: 'Toggle Debug Panel',
      type: 'item',
      action: MenuAction.ToggleDebugPanel,
      icon: 'Bug',
    },
    {
      id: 'simulator-reset',
      label: 'Reset Simulator',
      type: 'item',
      action: MenuAction.ResetSimulator,
      icon: 'ArrowReset',
    },
  ],
};

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
 * also exposed as contextual menus on their own pages (see Header).
 */
const designMenu: MenuItem = {
  id: 'design',
  label: 'Design',
  type: 'submenu',
  children: [
    {
      id: 'design-hub',
      label: 'Design Hub',
      type: 'item',
      action: () => {
        window.location.hash = '#/t3000/design';
      },
      icon: 'BuildingMultiple',
    },
    {
      id: 'design-new-drawing',
      label: 'New Drawing',
      type: 'submenu',
      icon: 'DocumentAdd',
      children: [
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
      ],
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
    {
      id: 'design-manage-types',
      label: 'Manage Types',
      type: 'item',
      action: () => {
        window.location.hash = '#/t3000/design?tab=types';
      },
      icon: 'Tag',
    },
  ],
};

/**
 * EEZ Studio Menu — mirrors Electron's native menu (File/Edit/View/Help)
 * These actions post messages into the EEZ Studio iframe/page shell.
 * Contextual — shown in the top menu bar only when the EEZ Studio page
 * (/t3000/eez) is open.
 */
export const eezStudioMenu: MenuItem = {
  id: 'eez-studio',
  label: 'EEZ Studio',
  type: 'submenu',
  children: [
    // ── Launch EEZ Studio page ──
    {
      id: 'eez-open-studio',
      label: 'Open EEZ Studio',
      type: 'item',
      action: MenuAction.EezOpenStudio,
      shortcut: 'Ctrl+E',
      icon: 'WindowNew',
    },
    { id: 'eez-divider-launch', type: 'divider' },
    // ── File ──
    {
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
        { id: 'eez-file-reload', label: 'Reload Project', type: 'item', action: MenuAction.EezReloadProject, disabled: true, icon: 'ArrowSync' },
        { id: 'eez-file-div3', type: 'divider' },
        { id: 'eez-file-import-instr', label: 'Import Instrument Definition...', type: 'item', action: MenuAction.EezImportInstrumentDef, icon: 'ArrowImport' },
        { id: 'eez-file-div4', type: 'divider' },
        { id: 'eez-file-save', label: 'Save', type: 'item', action: MenuAction.EezSave, shortcut: 'Ctrl+S', disabled: true, icon: 'Save' },
        { id: 'eez-file-saveas', label: 'Save As...', type: 'item', action: MenuAction.EezSaveAs, shortcut: 'Ctrl+Shift+S', disabled: true, icon: 'SaveAs' },
        { id: 'eez-file-div5', type: 'divider' },
        { id: 'eez-file-check', label: 'Check', type: 'item', action: MenuAction.EezCheck, shortcut: 'Ctrl+K', disabled: true, icon: 'Checkmark' },
        { id: 'eez-file-build', label: 'Build', type: 'item', action: MenuAction.EezBuild, shortcut: 'Ctrl+B', disabled: true, icon: 'Wrench' },
        { id: 'eez-file-build-ext', label: 'Build Extensions', type: 'item', action: MenuAction.EezBuildExtensions, disabled: true, icon: 'PuzzlePiece' },
        { id: 'eez-file-build-install-ext', label: 'Build and Install Extensions', type: 'item', action: MenuAction.EezBuildInstallExtensions, disabled: true, icon: 'PuzzlePiece' },
      ],
    },
    { id: 'eez-divider-a', type: 'divider' },
    // ── Edit ──
    {
      id: 'eez-edit',
      label: 'Edit',
      type: 'submenu',
      icon: 'Edit',
      children: [
        { id: 'eez-edit-undo', label: 'Undo', type: 'item', action: MenuAction.EezUndo, shortcut: 'Ctrl+Z', disabled: true, icon: 'ArrowUndo' },
        { id: 'eez-edit-redo', label: 'Redo', type: 'item', action: MenuAction.EezRedo, shortcut: 'Ctrl+Y', disabled: true, icon: 'ArrowRedo' },
        { id: 'eez-edit-div1', type: 'divider' },
        { id: 'eez-edit-cut', label: 'Cut', type: 'item', action: MenuAction.EezCut, shortcut: 'Ctrl+X', disabled: true, icon: 'Cut' },
        { id: 'eez-edit-copy', label: 'Copy', type: 'item', action: MenuAction.EezCopy, shortcut: 'Ctrl+C', disabled: true, icon: 'Copy' },
        { id: 'eez-edit-paste', label: 'Paste', type: 'item', action: MenuAction.EezPaste, shortcut: 'Ctrl+V', disabled: true, icon: 'ClipboardPaste' },
        { id: 'eez-edit-delete', label: 'Delete', type: 'item', action: MenuAction.EezDelete, shortcut: 'Del', disabled: true, icon: 'Delete' },
        { id: 'eez-edit-div2', type: 'divider' },
        { id: 'eez-edit-selectall', label: 'Select All', type: 'item', action: MenuAction.EezSelectAll, shortcut: 'Ctrl+A', disabled: true, icon: 'SelectAllOn' },
        { id: 'eez-edit-div3', type: 'divider' },
        { id: 'eez-edit-find', label: 'Find Project Component', type: 'item', action: MenuAction.EezFindComponent, shortcut: 'Ctrl+Shift+F', disabled: true, icon: 'Search' },
      ],
    },
    { id: 'eez-divider-b', type: 'divider' },
    // ── View ──
    {
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
        { id: 'eez-view-components', label: 'Show/Hide Components Palette', type: 'item', action: MenuAction.EezToggleComponentsPalette, disabled: true, icon: 'PanelRight' },
        { id: 'eez-view-resetlayout', label: 'Reset Layout', type: 'item', action: MenuAction.EezResetLayout, disabled: true, icon: 'LayoutRowFour' },
        { id: 'eez-view-div5', type: 'divider' },
        { id: 'eez-view-nexttab', label: 'Next Tab', type: 'item', action: MenuAction.EezNextTab, shortcut: 'Ctrl+Tab', icon: 'TabDesktopArrowRight' },
        { id: 'eez-view-prevtab', label: 'Previous Tab', type: 'item', action: MenuAction.EezPreviousTab, shortcut: 'Ctrl+Shift+Tab', icon: 'TabDesktopArrowLeft' },
        { id: 'eez-view-div6', type: 'divider' },
        { id: 'eez-view-reload', label: 'Reload', type: 'item', action: MenuAction.EezReload, shortcut: 'Ctrl+R', icon: 'ArrowClockwise' },
      ],
    },
    { id: 'eez-divider-c', type: 'divider' },
    // ── Help ──
    {
      id: 'eez-help',
      label: 'Help',
      type: 'submenu',
      icon: 'QuestionCircle',
      children: [
        { id: 'eez-help-docs', label: 'Documentation', type: 'item', action: MenuAction.EezDocumentation, shortcut: 'F1', icon: 'Book' },
        { id: 'eez-help-div1', type: 'divider' },
        { id: 'eez-help-about', label: 'About EEZ Studio', type: 'item', action: MenuAction.EezAbout, icon: 'Info' },
      ],
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
