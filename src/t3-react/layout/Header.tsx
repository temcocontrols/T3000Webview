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
} from '@fluentui/react-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { menuConfig } from '@t3-react/config/menuConfig';
import { MenuAction } from '@common/react/types/menu';
import { toolbarConfig } from '@t3-react/config/toolbarConfig';
import { useAuthStore } from '@t3-react/store';
import { t3000Routes } from '@t3-react/router/routes';
import { ThemeSelector, useTheme } from '@t3-react/theme';

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
    marginLeft: 'auto',
    opacity: 0.7,
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
    justifyContent: 'space-between',
    padding: '8px 16px',
    minHeight: '48px',
    gap: '16px',
    backgroundColor: 'var(--t3-color-background-secondary)',
    borderBottom: '1px solid var(--t3-color-border)',
  },
  toolbarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
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
});

export const Header: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { theme } = useTheme();

  console.log('🎯 Header rendering...', { location: location.pathname, user, toolbarConfig });

  // Handle menu item clicks
  const handleMenuClick = (action?: MenuAction | (() => void)) => {
    if (!action) return;
    if (typeof action === 'function') {
      action();
    } else {
      console.log('Menu action:', action);
    }
  };

  // Get icon component for menu items
  const getIconComponent = (icon?: string) => {
    if (!icon) return null;
    const icons = {
      'save': SaveRegular,
      'folder': FolderRegular,
      'delete': DeleteRegular,
      'settings': SettingsRegular,
      'info': InfoRegular,
    };
    return icons[icon as keyof typeof icons];
  };

  // Handle toolbar button click
  const handleToolbarClick = (windowId?: number, dialog?: string) => {
    if (windowId) {
      // Navigate to window
      const route = t3000Routes.find((r) => r.windowId === windowId);
      if (route) {
        navigate(route.path);
      }
    } else if (dialog) {
      // Open dialog (implement dialog logic)
      console.log('Open dialog:', dialog);
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
            <MenuPopover>
              <MenuList>
                {menu.children?.map((item) => {
                  if (item.divider) {
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
                    >
                      {IconComponent && <IconComponent />}
                      {item.label}
                      {item.shortcut && (
                        <span className={styles.menuShortcut}>
                          {item.shortcut}
                        </span>
                      )}
                    </MenuItem>
                  );
                })}
              </MenuList>
            </MenuPopover>
          </Menu>
        ))}

        {/* Theme Selector and User Avatar on right side of menu bar */}
        <div className={styles.menuBarRight}>
          <ThemeSelector appearance="subtle" size="small" />

          <Popover>
            <PopoverTrigger>
              <div className={styles.userAvatar}>
                <span className={styles.userName}>{user?.username || 'Guest'}</span>
                <Avatar
                  name={user?.username || 'Guest'}
                  color="brand"
                  size={28}
                />
              </div>
            </PopoverTrigger>
            <PopoverSurface>
              <Menu>
                <MenuList>
                  <MenuItem icon={<PersonRegular />}>Profile</MenuItem>
                  <MenuItem icon={<SettingsRegular />}>Settings</MenuItem>
                  <MenuDivider />
                  <MenuItem icon={<SignOutRegular />} onClick={handleLogout}>
                    Logout
                  </MenuItem>
                </MenuList>
              </Menu>
            </PopoverSurface>
          </Popover>
        </div>
      </div>

      {/* Row 2: Toolbar with icon buttons */}
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

              return (
                <ToolbarButton
                  key={item.id}
                  appearance="subtle"
                  icon={IconComponent ? <IconComponent /> : undefined}
                  disabled={item.disabled}
                  onClick={() => handleToolbarClick(item.windowId, item.dialog)}
                  title={item.tooltip || item.label}
                  style={{ color: theme.colors.text }}
                >
                  {item.label}
                </ToolbarButton>
              );
            })}
          </Toolbar>
        </div>
      </div>
    </div>
  );
};
