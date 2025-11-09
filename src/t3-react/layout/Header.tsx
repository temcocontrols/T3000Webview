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
} from '@fluentui/react-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { toolbarConfig } from '@t3-react/config/toolbarConfig';
import { useAuthStore } from '@t3-react/store';
import { t3000Routes } from '@t3-react/router/routes';
import { getIconComponent } from '@t3-react/utils/iconMapper';
import { ThemeSelector, useTheme } from '@t3-react/theme';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--t3-color-header-background)',
    borderBottom: '1px solid var(--t3-color-header-border)',
    height: 'var(--t3-header-height)',
  },
  toolbarContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    height: '100%',
    gap: '16px',
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
      {/* Simplified Toolbar - Azure Portal Style */}
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
                  style={{ color: theme.colors.headerText }}
                >
                  {item.label}
                </ToolbarButton>
              );
            })}
          </Toolbar>
        </div>

        {/* User Section */}
        <div className={styles.userSection}>
          <ThemeSelector appearance="subtle" size="small" />

          <Popover>
            <PopoverTrigger>
              <div className={styles.userAvatar}>
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
    </div>
  );
};
