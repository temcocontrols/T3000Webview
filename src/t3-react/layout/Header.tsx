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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbButton,
  BreadcrumbDivider,
  Avatar,
  Popover,
  PopoverTrigger,
  PopoverSurface,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  DocumentRegular,
  FolderRegular,
  SettingsRegular,
  PersonRegular,
  SignOutRegular,
} from '@fluentui/react-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { menuConfig } from '@t3-react/config/menuConfig';
import { toolbarConfig } from '@t3-react/config/toolbarConfig';
import { useAuthStore } from '@t3-react/store';
import { t3000Routes } from '@t3-react/router/routes';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  menuBar: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 12px',
    gap: '4px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  menuItem: {
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase200,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },
  toolbarContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    gap: '8px',
  },
  toolbarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  breadcrumbContainer: {
    padding: '8px 12px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userName: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
});

export const Header: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  // Get current route for breadcrumb
  const currentRoute = t3000Routes.find((route) => route.path === location.pathname);

  // Handle menu item click
  const handleMenuClick = (action?: () => void) => {
    if (action) {
      action();
    }
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
      {/* Menu Bar */}
      <div className={styles.menuBar}>
        {menuConfig.map((menu) => (
          <Menu key={menu.id}>
            <MenuTrigger>
              <div className={styles.menuItem}>{menu.label}</div>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {menu.items.map((item) => {
                  if (item.divider) {
                    return <MenuDivider key={item.id} />;
                  }

                  return (
                    <MenuItem
                      key={item.id}
                      disabled={item.disabled}
                      onClick={() => handleMenuClick(item.action)}
                    >
                      {item.icon && <item.icon />}
                      {item.label}
                      {item.shortcut && (
                        <span style={{ marginLeft: 'auto', opacity: 0.6 }}>
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
      </div>

      {/* Toolbar */}
      <div className={styles.toolbarContainer}>
        <div className={styles.toolbarSection}>
          <Toolbar>
            {toolbarConfig.map((item, index) => {
              if (item.divider) {
                return <ToolbarDivider key={`divider-${index}`} />;
              }

              const Icon = item.icon;
              return (
                <ToolbarButton
                  key={item.id}
                  icon={Icon ? <Icon /> : undefined}
                  disabled={item.disabled}
                  onClick={() => handleToolbarClick(item.windowId, item.dialog)}
                  title={item.tooltip || item.label}
                >
                  {item.label}
                </ToolbarButton>
              );
            })}
          </Toolbar>
        </div>

        {/* User Section */}
        <div className={styles.userSection}>
          <Popover>
            <PopoverTrigger>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <span className={styles.userName}>{user?.username || 'Guest'}</span>
                <Avatar
                  name={user?.username || 'Guest'}
                  color="brand"
                  size={32}
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

      {/* Breadcrumb */}
      {currentRoute && (
        <div className={styles.breadcrumbContainer}>
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbButton onClick={() => navigate('/t3000')}>
                Home
              </BreadcrumbButton>
            </BreadcrumbItem>
            {currentRoute.path !== '/t3000' && (
              <>
                <BreadcrumbDivider />
                <BreadcrumbItem>
                  <BreadcrumbButton>{currentRoute.title}</BreadcrumbButton>
                </BreadcrumbItem>
              </>
            )}
          </Breadcrumb>
        </div>
      )}
    </div>
  );
};
