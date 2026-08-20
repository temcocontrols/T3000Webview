/**
 * Header Component
 *
 * Top application header with:
 * - Menu bar
 * - Toolbar (icon buttons)
 * - Breadcrumb navigation
 * - User profile
 */

import React, { useEffect } from 'react';
import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuDivider,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  Avatar,
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Tooltip,
  makeStyles,
} from '@fluentui/react-components';
import {
  SettingsRegular,
  PersonRegular,
  SignOutRegular,
  SaveRegular,
  FolderRegular,
  DeleteRegular,
  InfoRegular,
  FolderOpenRegular,
  ArrowUploadRegular,
  ArrowDownloadRegular,
  PrintRegular,
  SearchRegular,
  BuildingMultipleRegular,
  ClockRegular,
  ArchiveRegular,
  DatabaseRegular,
  ArrowCounterclockwiseRegular,
  ArrowClockwiseRegular,
  ArrowSyncRegular,
  ArrowResetRegular,
  CheckmarkCircleRegular,
  Wifi1Regular,
  PeopleRegular,
  ShieldRegular,
  DocumentTextRegular,
  WrenchRegular,
  BookRegular,
  LightbulbRegular,
  BugRegular,
  CommentRegular,
  PlayRegular,
  StopRegular,
  PowerRegular,
  AlertRegular,
  FullScreenMaximizeRegular,
  PanelLeftRegular,
  PlugConnectedRegular,
  PlugDisconnectedRegular,
  ShareScreenStartRegular,
  DocumentAddRegular,
  NumberSymbolRegular,
  ChartMultipleRegular,
  TableRegular,
  TableSimpleRegular,
  FlashRegular,
  TemperatureRegular,
  LineHorizontal3Regular,
  PersonAccountsRegular,
  ColorBackgroundRegular,
  ColorRegular,
  ToolboxRegular,
  CodeRegular,
  DataHistogramRegular,
  CalendarRegular,
  CalendarDateRegular,
  DataLineRegular,
  RemoteRegular,
  OptionsRegular,
  DeveloperBoardRegular,
  CircleMultipleConcentricRegular,
  FlowRegular,
  ImageRegular,
  ListRegular,
  NetworkCheckRegular,
  HistoryRegular,
  CalendarDataBar28Regular,
  TagRegular,
} from '@fluentui/react-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { menuConfig } from '@t3-react/config/menuConfig';
import { MenuAction } from '@common/react/types/menu';
import type { MenuItem as MenuItemConfig } from '@common/react/types/menu';
import { toolbarConfig } from '@t3-react/config/toolbarConfig';
import { useAuthStore, useStatusBarStore } from '@t3-react/store';
import { useUIStore } from '@t3-react/store/uiStore';
import { useChatStore } from '@t3-react/store/chatStore';
import { t3000Routes } from '@t3-react/app/router/routes';
import { ThemeSelector, useTheme } from '@t3-react/theme';
import { devVersion } from '@common/vue/T3000/Hvac/Data/T3Data';
import { useFileMenu } from '@t3-react/shared/hooks/useFileMenu';
import { useToolsMenu } from '@t3-react/shared/hooks/useToolsMenu';
import { useViewMenu } from '@t3-react/shared/hooks/useViewMenu';
import { useDatabaseMenu } from '@t3-react/shared/hooks/useDatabaseMenu';
import { useControlMenu } from '@t3-react/shared/hooks/useControlMenu';
import { useMiscellaneousMenu } from '@t3-react/shared/hooks/useMiscellaneousMenu';
import { useHelpMenu } from '@t3-react/shared/hooks/useHelpMenu';
import { useDeviceData } from '@t3-react/shared/hooks/useDeviceData';
import { useCsvOperations } from '@t3-react/shared/context/CsvOperationsContext';
import type { DeviceInfo } from '@t3-react/shared/types/device';
import { LogUtil } from '@/lib/t3-hvac';

// Routes whose page handles the global "Refresh Data" toolbar action via
// usePageRefresh. Other pages get a "no refreshable data" status message.
const REFRESHABLE_PATHS = [
  '/t3000/inputs', '/t3000/outputs', '/t3000/variables', '/t3000/programs',
  '/t3000/schedules', '/t3000/holidays', '/t3000/pidloops', '/t3000/graphics',
  '/t3000/trendlogs', '/t3000/alarms', '/t3000/settings', '/t3000/network',
  '/t3000/array', '/t3000/tables', '/t3000/users', '/t3000/custom-units',
  '/t3000/discover', '/t3000/buildings',
];

const useStyles = makeStyles({
  header: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--t3-color-header-background)',
    borderBottom: '1px solid #c4c8ca',
    position: 'relative',
    zIndex: 100,
  },
  menuBar: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 12px',
    gap: '4px',
    backgroundColor: 'var(--t3-color-header-background)',
    borderBottom: '1px solid var(--t3-color-header-border)',
    minHeight: '32px',
  },
  menuItem: {
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 'var(--t3-font-size-body)',
    color: 'var(--t3-color-header-text)',
    '&:hover': {
      backgroundColor: 'var(--t3-color-primary-hover)',
      borderRadius: 'var(--t3-border-radius)',
    },
  },
  menuShortcut: {
    opacity: 0.6,
    fontSize: '10px', // Smaller font for shortcuts
    fontWeight: '400',
    color: 'var(--t3-color-text-secondary)',
    whiteSpace: 'nowrap',
  },
  menuBarRight: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  toolbarContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '2px 4px',
    minHeight: '44px',
    gap: '0px',
    backgroundColor: '#f0f0f0',
    borderBottom: '1px solid var(--t3-color-border)',
  },
  toolbarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    // backgroundColor: 'red',
    marginLeft: '8px',
  },
  toolbarIconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    padding: '2px',
    border: 'none',
    borderRadius: '3px',
    background: 'transparent',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: 'rgba(0,0,0,0.08)',
    },
  },
  toolbarIconBtnActive: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    padding: '2px',
    border: '1px solid #0078d4',
    borderRadius: '3px',
    background: 'rgba(0,120,212,0.08)',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: 'rgba(0,120,212,0.15)',
    },
  },
  toolbarIconImg: {
    width: '28px',
    height: '28px',
    display: 'block',
    imageRendering: 'pixelated',
  },
  toolbarDivider: {
    width: '1px',
    height: '28px',
    backgroundColor: '#c8c8c8',
    margin: '0 3px',
    flexShrink: 0,
  },
  activeToolbarButton: {
    color: '#0078d4 !important',
    '& svg': {
      color: '#0078d4 !important',
    },
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userName: {
    fontSize: 'var(--t3-font-size-body)',
    fontWeight: 'var(--t3-font-weight-semibold)',
    color: 'var(--t3-color-header-text)',
  },
  userAvatar: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  chatToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: 'var(--t3-color-header-text)',
    marginRight: '4px',
    '&:hover': {
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
  },
  menuPopover: {
    minWidth: '300px',
  },
  menuItemWide: {
    minWidth: '300px',
  },
  wideTooltipContent: {
    maxWidth: '500px !important',
    width: 'auto !important',
    whiteSpace: 'normal !important',

    // background bubble
    '& .fui-Tooltip__surface': {
      maxWidth: '500px !important',
      width: 'auto !important',
    },
  },
});

interface HeaderProps {
  showToolbar?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ showToolbar = true }) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { theme } = useTheme();
  const { selectedDevice, getDeviceById } = useDeviceData();

  // File menu handlers
  const { handlers: fileHandlers, state: fileState } = useFileMenu(
    (message) => {
      // Show success notification
      // TODO: Show toast notification
    },
    (error) => {
      // Show error notification
      console.error('❌ File operation error:', error);
      // TODO: Show error toast
    }
  );

  // Tools menu handlers
  const { handlers: toolsHandlers, state: toolsState } = useToolsMenu(
    (message) => {
      // Show success notification
      // TODO: Show toast notification
    },
    (error) => {
      // Show error notification
      // TODO: Show error toast
    }
  );

  // View menu handlers
  const { handlers: viewHandlers, viewState } = useViewMenu();

  // Database menu handlers
  const { handlers: databaseHandlers } = useDatabaseMenu();

  // Control menu handlers
  const { handlers: controlHandlers } = useControlMenu();

  // Miscellaneous menu handlers
  const { handlers: miscHandlers } = useMiscellaneousMenu();

  // Help menu handlers
  const { handlers: helpHandlers } = useHelpMenu();

  // CSV operations (global context — Export/Import to CSV)
  const { triggerExport, triggerImport, isExportAvailable, isImportAvailable } = useCsvOperations();

  // console.log('🎯 Header rendering...', { location: location.pathname, user, toolbarConfig });

  // Helper function to convert TreeNode to DeviceInfo
  const convertTreeNodeToDeviceInfo = (node: any): DeviceInfo => ({
    serialNumber: node.id,
    productName: node.label,
    nameShowOnTree: node.label,
    protocol: node.data?.protocol || 'MODBUS',
    parentId: node.data?.parentId || 0,
    buildingName: node.data?.buildingName || '',
    mainSubName: node.data?.mainSubName || '',
    screenName: node.data?.screenName || '',
    stationNumber: node.data?.stationNumber || 0,
    portNumber: node.data?.portNumber || 0,
    onlineStatus: node.data?.onlineStatus || 0,
  });

  // Handle menu item clicks
  const handleMenuClick = (action?: MenuAction | (() => void)) => {
    if (!action) return;
    if (typeof action === 'function') {
      action();
    } else {

      // Handle specific menu actions
      switch (action) {
        case MenuAction.NewProject:
          fileHandlers.handleNewProject();
          break;
        case MenuAction.SaveAs:
          if (selectedDevice) {
            const deviceInfo = convertTreeNodeToDeviceInfo(selectedDevice);
            fileHandlers.handleSaveAs(deviceInfo);
          } else {
            console.warn('No device selected for Save As operation');
            // TODO: Show notification to select a device
          }
          break;
        case MenuAction.Load:
          if (selectedDevice) {
            const deviceInfo = convertTreeNodeToDeviceInfo(selectedDevice);
            fileHandlers.handleLoadFile(deviceInfo);
          } else {
            console.warn('No device selected for Load operation');
            // TODO: Show notification to select a device
          }
          break;
        case MenuAction.Import:
          fileHandlers.handleImport();
          break;
        case MenuAction.Exit:
          fileHandlers.handleExit();
          break;

        // Tools menu
        case MenuAction.Connect:
          toolsHandlers.handleConnect();
          break;
        case MenuAction.ExportToCsv:
          triggerExport();
          break;
        case MenuAction.ImportFromCsv:
          triggerImport();
          break;
        case MenuAction.Disconnect:
          toolsHandlers.handleDisconnect();
          break;
        case MenuAction.ChangeModbusId:
          if (selectedDevice) {
            const deviceInfo = convertTreeNodeToDeviceInfo(selectedDevice);
            toolsHandlers.handleChangeModbusId(deviceInfo);
          } else {
            console.warn('No device selected for Change Modbus ID');
          }
          break;
        case MenuAction.BacnetTool:
          toolsHandlers.handleBacnetTool();
          break;
        case MenuAction.ModbusPoll:
          toolsHandlers.handleModbusPoll();
          break;
        case MenuAction.RegisterViewer:
          toolsHandlers.handleRegisterViewer();
          break;
        case MenuAction.ModbusRegisterV2:
          toolsHandlers.handleModbusRegisterV2();
          break;
        case MenuAction.RegisterListDatabaseFolder:
          toolsHandlers.handleRegisterListFolder();
          break;
        case MenuAction.LoadFirmwareSingle:
          if (selectedDevice) {
            const deviceInfo = convertTreeNodeToDeviceInfo(selectedDevice);
            toolsHandlers.handleLoadFirmwareSingle(deviceInfo);
          } else {
            console.warn('No device selected for firmware upload');
          }
          break;
        case MenuAction.LoadFirmwareMany:
          toolsHandlers.handleLoadFirmwareMany();
          break;
        case MenuAction.FlashSN:
          if (selectedDevice) {
            const deviceInfo = convertTreeNodeToDeviceInfo(selectedDevice);
            toolsHandlers.handleFlashSN(deviceInfo);
          } else {
            console.warn('No device selected for Flash SN');
          }
          break;
        case MenuAction.Psychrometry:
          toolsHandlers.handlePsychrometry();
          break;
        case MenuAction.PhChart:
          toolsHandlers.handlePhChart();
          break;
        case MenuAction.Options:
          toolsHandlers.handleOptions();
          break;
        case MenuAction.LoginMyAccount:
          toolsHandlers.handleLoginMyAccount();
          break;

        // View menu
        case MenuAction.ShowToolBar:
          viewHandlers.handleShowToolBar();
          break;
        case MenuAction.ShowBuildingPane:
          viewHandlers.handleShowBuildingPane();
          break;
        case MenuAction.ShowStatusBar:
          viewHandlers.handleShowStatusBar();
          break;
        case MenuAction.ThemeOffice2003:
          viewHandlers.handleThemeOffice2003();
          break;
        case MenuAction.ThemeOffice2007Blue:
          viewHandlers.handleThemeOffice2007Blue();
          break;
        case MenuAction.ThemeOffice2007Silver:
          viewHandlers.handleThemeOffice2007Silver();
          break;
        case MenuAction.ViewRefresh:
          viewHandlers.handleRefresh();
          break;

        // Database menu
        case MenuAction.BuildingConfigDatabase:
          databaseHandlers.handleBuildingConfigDatabase();
          break;
        case MenuAction.AllNodesDatabase:
          databaseHandlers.handleAllNodesDatabase();
          break;
        case MenuAction.IONameConfig:
          databaseHandlers.handleIONameConfig();
          break;
        case MenuAction.LogDetail:
          databaseHandlers.handleLogDetail();
          break;

        // Control menu
        case MenuAction.ControlGraphics:
          controlHandlers.handleGraphics();
          break;
        case MenuAction.ControlPrograms:
          controlHandlers.handlePrograms();
          break;
        case MenuAction.ControlInputs:
          controlHandlers.handleInputs();
          break;
        case MenuAction.ControlOutputs:
          controlHandlers.handleOutputs();
          break;
        case MenuAction.ControlVariables:
          controlHandlers.handleVariables();
          break;
        case MenuAction.ControlLoops:
          controlHandlers.handleLoops();
          break;
        case MenuAction.ControlSchedules:
          controlHandlers.handleSchedules();
          break;
        case MenuAction.ControlHolidays:
          controlHandlers.handleHolidays();
          break;
        case MenuAction.ControlTrendLogs:
          controlHandlers.handleTrendLogs();
          break;
        case MenuAction.ControlAlarms:
          controlHandlers.handleAlarms();
          break;
        case MenuAction.ControlNetworkPanel:
          controlHandlers.handleNetworkPanel();
          break;
        case MenuAction.ControlRemotePoints:
          controlHandlers.handleRemotePoints();
          break;
        case MenuAction.ControlConfiguration:
          controlHandlers.handleConfiguration();
          break;

        // Miscellaneous menu
        case MenuAction.LoadDescriptors:
          miscHandlers.handleLoadDescriptors();
          break;
        case MenuAction.WriteIntoFlash:
          miscHandlers.handleWriteIntoFlash();
          break;
        case MenuAction.GSMConnection:
          miscHandlers.handleGSMConnection();
          break;

        // Help menu
        case MenuAction.HelpContents:
          helpHandlers.handleContents();
          break;
        case MenuAction.VersionHistory:
          helpHandlers.handleVersionHistory();
          break;
        case MenuAction.AboutSoftware:
          helpHandlers.handleAboutSoftware();
          break;
        case MenuAction.CheckUpdates:
          helpHandlers.handleCheckUpdates();
          break;

        case MenuAction.OpenDocumentation:
          navigate('/t3000/documentation');
          break;
        case MenuAction.OpenQuickStart:
          navigate('/t3000/documentation'); // Will open to quick start section
          break;

        // ── EEZ Studio menu actions ──
        // Navigation
        case MenuAction.EezOpenStudio:
          navigate('/t3000/eez');
          break;
        // All other EEZ actions send a postMessage into the EEZ Studio content
        case MenuAction.EezNewProject:
          handleEezAction('new-project');
          break;
        case MenuAction.EezAddInstrument:
          handleEezAction('add-instrument');
          break;
        case MenuAction.EezNewWindow:
          handleEezAction('new-window');
          break;
        case MenuAction.EezOpen:
          handleEezAction('open');
          break;
        case MenuAction.EezReloadProject:
          handleEezAction('reload-project');
          break;
        case MenuAction.EezImportInstrumentDef:
          handleEezAction('import-instrument-def');
          break;
        case MenuAction.EezSave:
          handleEezAction('save');
          break;
        case MenuAction.EezSaveAs:
          handleEezAction('save-as');
          break;
        case MenuAction.EezCheck:
          handleEezAction('check');
          break;
        case MenuAction.EezBuild:
          handleEezAction('build');
          break;
        case MenuAction.EezBuildExtensions:
          handleEezAction('build-extensions');
          break;
        case MenuAction.EezBuildInstallExtensions:
          handleEezAction('build-and-install-extensions');
          break;
        case MenuAction.EezCloseWindow:
          handleEezAction('close-window');
          break;
        case MenuAction.EezExit:
          handleEezAction('exit');
          break;
        // Edit
        case MenuAction.EezUndo:
          handleEezAction('undo');
          break;
        case MenuAction.EezRedo:
          handleEezAction('redo');
          break;
        case MenuAction.EezCut:
          handleEezAction('cut');
          break;
        case MenuAction.EezCopy:
          handleEezAction('copy');
          break;
        case MenuAction.EezPaste:
          handleEezAction('paste');
          break;
        case MenuAction.EezDelete:
          handleEezAction('delete');
          break;
        case MenuAction.EezSelectAll:
          handleEezAction('select-all');
          break;
        case MenuAction.EezFindComponent:
          handleEezAction('find-project-component');
          break;
        // View
        case MenuAction.EezHome:
          handleEezAction('openTab-home');
          break;
        case MenuAction.EezHistory:
          handleEezAction('openTab-history');
          break;
        case MenuAction.EezShortcuts:
          handleEezAction('openTab-shortcutsAndGroups');
          break;
        case MenuAction.EezNotebooks:
          handleEezAction('openTab-homeSection_notebooks');
          break;
        case MenuAction.EezExtensions:
          handleEezAction('openTab-extensions');
          break;
        case MenuAction.EezSettings:
          handleEezAction('openTab-settings');
          break;
        case MenuAction.EezScrapbook:
          handleEezAction('showScrapbookManager');
          break;
        case MenuAction.EezToggleFullScreen:
          handleEezAction('toggle-fullscreen');
          break;
        case MenuAction.EezToggleDevTools:
          handleEezAction('toggle-devtools');
          break;
        case MenuAction.EezSwitchTheme:
          handleEezAction('switch-theme');
          break;
        case MenuAction.EezZoomIn:
          handleEezAction('zoom-in');
          break;
        case MenuAction.EezZoomOut:
          handleEezAction('zoom-out');
          break;
        case MenuAction.EezResetZoom:
          handleEezAction('reset-zoom');
          break;
        case MenuAction.EezToggleComponentsPalette:
          handleEezAction('toggle-components-palette');
          break;
        case MenuAction.EezResetLayout:
          handleEezAction('reset-layout');
          break;
        case MenuAction.EezNextTab:
          handleEezAction('show-next-tab');
          break;
        case MenuAction.EezPreviousTab:
          handleEezAction('show-previous-tab');
          break;
        case MenuAction.EezReload:
          handleEezAction('reload');
          break;
        // Help
        case MenuAction.EezDocumentation:
          handleEezAction('show-documentation-browser');
          break;
        case MenuAction.EezAbout:
          handleEezAction('show-about-box');
          break;
        // Add other menu actions as needed
        default:
          break;
      }
    }
  };

  // Get icon component for menu items
  const getIconComponent = (icon?: string) => {
    if (!icon) return null;
    const iconMap: Record<string, React.ComponentType> = {
      'Save': SaveRegular,
      'SaveAs': SaveRegular, // Use Save icon for SaveAs
      'DocumentAdd': DocumentAddRegular,
      'FolderOpen': FolderOpenRegular,
      'ArrowUpload': ArrowUploadRegular,
      'ArrowDownload': ArrowDownloadRegular,
      'Print': PrintRegular,
      'Search': SearchRegular,
      'BuildingMultiple': BuildingMultipleRegular,
      'Clock': ClockRegular,
      'Archive': ArchiveRegular,
      'Database': DatabaseRegular,
      'ArrowCounterclockwise': ArrowCounterclockwiseRegular,
      'ArrowClockwise': ArrowClockwiseRegular,
      'ArrowSync': ArrowSyncRegular,
      'ArrowReset': ArrowResetRegular,
      'CheckmarkCircle': CheckmarkCircleRegular,
      'Settings': SettingsRegular,
      'Delete': DeleteRegular,
      'Wifi': Wifi1Regular,
      'People': PeopleRegular,
      'Shield': ShieldRegular,
      'DocumentText': DocumentTextRegular,
      'Wrench': WrenchRegular,
      'Book': BookRegular,
      'Lightbulb': LightbulbRegular,
      'Bug': BugRegular,
      'Comment': CommentRegular,
      'Info': InfoRegular,
      'Play': PlayRegular,
      'Stop': StopRegular,
      'Power': PowerRegular,
      'PowerOff': PowerRegular,
      'Alert': AlertRegular,
      'AlertCheck': AlertRegular,
      'AlertOff': AlertRegular,
      'RecordStart': PlayRegular,
      'RecordStop': StopRegular,
      'FullScreen': FullScreenMaximizeRegular,
      'TreeView': PanelLeftRegular,
      'ToolbarSettings': SettingsRegular,
      'StatusBar': PanelLeftRegular,
      'PlugConnected': PlugConnectedRegular,
      'PlugDisconnected': PlugDisconnectedRegular,
      'DataConnection': PlugConnectedRegular,
      'Network': ShareScreenStartRegular,
      'SignOut': SignOutRegular,
      'NumberSymbol': NumberSymbolRegular,
      'ChartMultiple': ChartMultipleRegular,
      'Table': TableRegular,
      'TableSimple': TableSimpleRegular,
      'FolderDatabase': DatabaseRegular,
      'ArrowUploadMultiple': ArrowUploadRegular,
      'Flash': FlashRegular,
      'Temperature': TemperatureRegular,
      'ChartLine': DataLineRegular,
      'PersonAccounts': PersonAccountsRegular,
      'ColorBackground': ColorBackgroundRegular,
      'Color': ColorRegular,
      'Toolbox': ToolboxRegular,
      'Code': CodeRegular,
      'DataHistogram': DataHistogramRegular,
      'Calendar': CalendarRegular,
      'CalendarEvent': CalendarDateRegular,
      'CalendarDate': CalendarDateRegular,
      'Remote': RemoteRegular,
      'Options': OptionsRegular,
      'DeveloperBoard': DeveloperBoardRegular,
      'CircleMultipleConcentric': CircleMultipleConcentricRegular,
      'Flow': FlowRegular,
      'Image': ImageRegular,
      'List': ListRegular,
      'NetworkCheck': NetworkCheckRegular,
      'History': HistoryRegular,
      'CalendarDataBar': CalendarDataBar28Regular,
      'Tag': TagRegular,
    };
    return iconMap[icon];
  };

  // Handle toolbar button click
  const handleToolbarClick = (item: any) => {


    if (item.windowId !== undefined) {
      // Navigate to window by windowId
      const route = t3000Routes.find((r) => r.windowId === item.windowId);
      if (route) {
        navigate(route.path);
      }
    } else if (item.action === 'refresh') {
      // Silent per-page refresh — dispatch an event the ACTIVE page listens to
      // (usePageRefresh) instead of reloading the whole SPA (no flash). The page
      // handler updates the bottom status bar itself. Non-data pages get a hint.
      const hash = window.location.hash.replace(/^#/, '');
      const status = useStatusBarStore.getState();
      if (REFRESHABLE_PATHS.some((p) => hash.startsWith(p))) {
        status.setMessage('Refreshing current page...', 'info');
        window.dispatchEvent(new CustomEvent('t3-page-refresh'));
        // Safety net: if no page posted its own status (e.g. DB-only pages that
        // refresh silently), clear the "Refreshing..." placeholder.
        window.setTimeout(() => {
          const s = useStatusBarStore.getState();
          if (s.message === 'Refreshing current page...') {
            s.setMessage('Refreshed', 'success');
          }
        }, 2000);
      } else {
        status.setMessage('No refreshable data on this page', 'info');
      }
    } else {
      LogUtil.Warn('Unhandled toolbar action:', item);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Listen for "Open AI Chat" menu event
  const setChatMode = useUIStore((s) => s.setChatMode);
  useEffect(() => {
    const handler = () => {
      if (window.location.hash.includes('/ai-chat')) {
        const prev = useChatStore.getState().previousPageHash?.replace(/^#/, '') || '/t3000/dashboard';
        navigate(prev.startsWith('/') ? prev : `/${prev}`);
      }
      setChatMode('sidebar');
    };
    window.addEventListener('t3-open-ai-chat', handler);
    return () => window.removeEventListener('t3-open-ai-chat', handler);
  }, [setChatMode, navigate]);

  // ── EEZ Studio menu action handler ──
  // Sends a message into the EEZ Studio iframe/content to trigger the action.
  // Falls back to navigating to the EEZ Studio tab first if not already there.
  const handleEezAction = (channel: string) => {
    // Post to the EEZ Studio content window
    window.postMessage({ source: 't3000-menu', action: channel }, window.location.origin);
    // Also try dispatching a custom event as fallback
    window.dispatchEvent(new CustomEvent('eez-studio-action', { detail: channel }));
  };

  // ── Recursive menu item renderer ──
  // Supports nested submenus by rendering a Fluent UI <Menu> for items with type 'submenu'.
  const renderMenuItem = (item: MenuItemConfig, parentMenuId: string): React.ReactNode => {
    if (item.type === 'divider') {
      return <MenuDivider key={item.id} />;
    }

    const IconComponent = typeof item.icon === 'string'
      ? getIconComponent(item.icon)
      : item.icon;

    // Nested submenu
    if (item.type === 'submenu' && item.children && item.children.length > 0) {
      return (
        <Menu key={item.id}>
          <MenuTrigger disableButtonEnhancement>
            <MenuItem
              icon={IconComponent ? <IconComponent /> : undefined}
              style={{
                fontSize: 'var(--t3-font-size-small)',
                padding: '8px 16px',
                minHeight: '32px',
                justifyContent: 'space-between',
              }}
            >
              {item.label}
            </MenuItem>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {item.children.map((child) => renderMenuItem(child, item.id!))}
            </MenuList>
          </MenuPopover>
        </Menu>
      );
    }

    // Regular item
    return (
      <MenuItem
        key={item.id}
        onClick={() => handleMenuClick(item.action)}
        disabled={
          item.action === MenuAction.ExportToCsv ? !isExportAvailable :
            item.action === MenuAction.ImportFromCsv ? !isImportAvailable :
              item.disabled
        }
        icon={IconComponent ? <IconComponent /> : undefined}
        className={parentMenuId === 'tools' ? styles.menuItemWide : undefined}
        style={{
          fontSize: 'var(--t3-font-size-small)',
          padding: '8px 16px',
          minHeight: '32px',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: '24px'
        }}>
          <span>{item.label}</span>
          {item.shortcut && (
            <span className={styles.menuShortcut}>{item.shortcut}</span>
          )}
        </div>
      </MenuItem>
    );
  };

  return (
    <div className={styles.header}>
      {/* Row 1: Menu Bar with File, Edit, View, Tools, Help */}
      <div className={styles.menuBar}>
        {menuConfig.map((menu) => (
          <Menu key={menu.id}>
            <MenuTrigger>
              <div className={styles.menuItem}>{menu.label}</div>
            </MenuTrigger>
            <MenuPopover className={menu.id === 'tools' ? styles.menuPopover : undefined}>
              <MenuList>
                {menu.children?.map((item) => renderMenuItem(item, menu.id))}
              </MenuList>
            </MenuPopover>
          </Menu>
        ))}

        {/* Theme Selector and User Avatar on right side of menu bar */}
        <div className={styles.menuBarRight}>
          <span style={{ fontSize: '12px', color: 'var(--t3-color-header-text)', marginRight: '8px' }}>
            {devVersion.value}
          </span>
          {/* <ThemeSelector appearance="subtle" size="small" /> */}

          <Popover>
            <PopoverTrigger>
              <div className={styles.userAvatar}>
                <span className={styles.userName}>{user?.username || 'T3000'}</span>
                <Avatar
                  name={user?.username || 'T3000'}
                  color="brand"
                  size={28}
                />
              </div>
            </PopoverTrigger>
            <PopoverSurface>
              <Menu>
                <MenuList>
                  <MenuItem
                    icon={<PersonRegular />}
                    style={{
                      fontSize: 'var(--t3-font-size-small)',
                      padding: '8px 16px',
                      minHeight: '32px',
                    }}
                  >
                    Profile
                  </MenuItem>
                  <MenuItem
                    icon={<SettingsRegular />}
                    style={{
                      fontSize: 'var(--t3-font-size-small)',
                      padding: '8px 16px',
                      minHeight: '32px',
                    }}
                  >
                    Settings
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem
                    icon={<SignOutRegular />}
                    onClick={handleLogout}
                    style={{
                      fontSize: 'var(--t3-font-size-small)',
                      padding: '8px 16px',
                      minHeight: '32px',
                    }}
                  >
                    Logout
                  </MenuItem>
                </MenuList>
              </Menu>
            </PopoverSurface>
          </Popover>
        </div>
      </div>

      {/* Row 2: Toolbar with icon-only buttons + hover tooltips */}
      {showToolbar && (
        <div className={styles.toolbarContainer}>
          <div className={styles.toolbarSection}>
            {toolbarConfig.map((item, index) => {
              if (item.divider) {
                return <div key={`divider-${index}`} className={styles.toolbarDivider} />;
              }

              // Map toolbar id to SVG icon filename
              const svgId = item.id.replace('toolbar-', '');
              const svgSrc = `/assets/t3icon/toolbar/${svgId}.svg`;

              const isActive = !!(item.route && location.pathname === item.route);

              return (
                <Tooltip
                  key={item.id}
                  //content={<div style={{ width: '500px' }}>{item.tooltip || item.label} <br /> {item.description}</div>}
                  content={{
                    children: (
                      <>
                        {item.tooltip || item.label}
                        <br />
                        {item.description}
                      </>
                    ),
                    className: styles.wideTooltipContent,
                  }}
                  relationship="description"
                  positioning="below-end"
                >
                  <button
                    className={isActive ? styles.toolbarIconBtnActive : styles.toolbarIconBtn}
                    disabled={item.disabled}
                    onClick={() => handleToolbarClick(item)}
                    aria-label={item.label}
                    type="button"
                  >
                    <img
                      src={svgSrc}
                      alt={item.label}
                      className={styles.toolbarIconImg}
                    />
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
