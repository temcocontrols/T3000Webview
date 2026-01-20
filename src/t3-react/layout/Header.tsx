/**
 * Header Component
 *
 * Top application header with:
 * - Menu bar
 * - Toolbar (icon buttons)
 * - Breadcrumb navigation
 * - User profile
 */

import React from 'react';
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
} from '@fluentui/react-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { menuConfig } from '@t3-react/config/menuConfig';
import { MenuAction } from '@common/react/types/menu';
import { toolbarConfig } from '@t3-react/config/toolbarConfig';
import { useAuthStore } from '@t3-react/store';
import { t3000Routes } from '@t3-react/app/router/routes';
import { ThemeSelector, useTheme } from '@t3-react/theme';
import { devVersion } from '@common/vue/T3000/Hvac/Data/T3Data';
import { useFileMenu } from '@t3-react/shared/hooks/useFileMenu';
import { useToolsMenu } from '@t3-react/shared/hooks/useToolsMenu';
import { useViewMenu } from '@t3-react/shared/hooks/useViewMenu';
import { useDeviceData } from '@t3-react/shared/hooks/useDeviceData';
import type { DeviceInfo } from '@t3-react/shared/types/device';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--t3-color-header-background)',
    borderBottom: '1px solid var(--t3-color-header-border)',
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
    justifyContent: 'flex-start', // Align left
    padding: '2px 8px', // All padding 8px
    minHeight: '36px', // Reduced from 48px
    gap: '4px', // Small gap
    backgroundColor: '#fff', // White background
    borderBottom: '1px solid var(--t3-color-border)',
  },
  toolbarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0px', // No gap between toolbar items
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
  menuPopover: {
    minWidth: '300px',
  },
  menuItemWide: {
    minWidth: '300px',
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
      console.log('✅ File operation success:', message);
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
      console.log('✅ Tools operation success:', message);
      // TODO: Show toast notification
    },
    (error) => {
      // Show error notification
      console.error('❌ Tools operation error:', error);
      // TODO: Show error toast
    }
  );

  // View menu handlers
  const { handlers: viewHandlers, viewState } = useViewMenu();

  console.log('🎯 Header rendering...', { location: location.pathname, user, toolbarConfig });

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
      console.log('Menu action:', action);

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

        case MenuAction.OpenDocumentation:
          navigate('/t3000/documentation');
          break;
        case MenuAction.OpenQuickStart:
          navigate('/t3000/documentation'); // Will open to quick start section
          break;
        // Add other menu actions as needed
        default:
          console.log('Unhandled menu action:', action);
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
      'DocumentAdd': DocumentAddRegular,
      'NumberSymbol': NumberSymbolRegular,
      'ChartMultiple': ChartMultipleRegular,
      'Table': TableRegular,
      'TableSimple': TableSimpleRegular,
      'FolderDatabase': DatabaseRegular,
      'ArrowUploadMultiple': ArrowUploadRegular,
      'Flash': FlashRegular,
      'Temperature': TemperatureRegular,
      'ChartLine': LineHorizontal3Regular,
      'PersonAccounts': PersonAccountsRegular,
    };
    return iconMap[icon];
  };

  // Handle toolbar button click
  const handleToolbarClick = (item: any) => {
    console.log('Toolbar button clicked:', item);

    if (item.windowId !== undefined) {
      // Navigate to window by windowId
      const route = t3000Routes.find((r) => r.windowId === item.windowId);
      if (route) {
        navigate(route.path);
      }
    } else if (item.action === 'refresh') {
      // Refresh current page
      window.location.reload();
    } else {
      console.warn('Unhandled toolbar action:', item);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
                {menu.children?.map((item) => {
                  if (item.type === 'divider') {
                    return <MenuDivider key={item.id} />;
                  }
                  // Handle icon: could be a string or FluentIcon component
                  const IconComponent = typeof item.icon === 'string'
                    ? getIconComponent(item.icon)
                    : item.icon;
                  return (
                    <MenuItem
                      key={item.id}
                      onClick={() => handleMenuClick(item.action)}
                      disabled={item.disabled}
                      icon={IconComponent ? <IconComponent /> : undefined}
                      className={menu.id === 'tools' ? styles.menuItemWide : undefined}
                      style={{
                        fontSize: 'var(--t3-font-size-small)', // 12px for dropdown items
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
                          <span className={styles.menuShortcut}>
                            {item.shortcut}
                          </span>
                        )}
                      </div>
                    </MenuItem>
                  );
                })}
              </MenuList>
            </MenuPopover>
          </Menu>
        ))}

        {/* Theme Selector and User Avatar on right side of menu bar */}
        <div className={styles.menuBarRight}>
          <span style={{ fontSize: '12px', color: 'var(--t3-color-header-text)', marginRight: '8px' }}>
            {devVersion.value}
          </span>
          <ThemeSelector appearance="subtle" size="small" />

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

      {/* Row 2: Toolbar with icon buttons */}
      {showToolbar && (
      <div className={styles.toolbarContainer}>
        <div className={styles.toolbarSection}>
          <Toolbar>
            {toolbarConfig.map((item, index) => {
              if (item.divider) {
                return <ToolbarDivider key={`divider-${index}`} />;
              }

              // Get icon component (handle both FluentIcon and string)
              const IconComponent = typeof item.icon === 'string'
                ? getIconComponent(item.icon)
                : item.icon;

              // Check if this button is active (current route matches)
              const isActive = item.route && location.pathname === item.route;

              return (
                <ToolbarButton
                  key={item.id}
                  appearance="subtle"
                  icon={IconComponent ? <IconComponent /> : undefined}
                  disabled={item.disabled}
                  onClick={() => handleToolbarClick(item)}
                  title={item.tooltip || item.label}
                  className={isActive ? styles.activeToolbarButton : ''}
                  style={{
                    color: theme.colors.text,
                    fontSize: '11px', // Smaller font
                    fontWeight: '400', // Thinner/normal weight
                    padding: '1px 4px', // Even smaller padding
                    minHeight: '24px', // Smaller height
                    minWidth: 'auto', // Remove minimum width
                  }}
                >
                  {item.label}
                </ToolbarButton>
              );
            })}
          </Toolbar>
        </div>
      </div>
      )}
    </div>
  );
};
