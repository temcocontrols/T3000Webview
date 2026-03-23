/**
 * SideNavContent 鈥?pure navigation link list used by:
 *   - MobileNavDrawer (bottom sheet / overlay on phones)
 *   - TabletSidebar   (persistent panel on tablets)
 *
 * Device selection has been moved to DevicePickerSheet (triggered from AppBar).
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { makeStyles, mergeClasses } from '@fluentui/react-components';
import {
  HomeRegular,
  HomeFilled,
  AppsListRegular,
  AppsListFilled,
  PlugConnectedRegular,
  PlugConnectedFilled,
  SlideGridRegular,
  SlideGridFilled,
  TableRegular,
  CodeRegular,
  AlertRegular,
  SettingsRegular,
  SettingsFilled,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
    overflowY: 'auto',
  },

  /* Nav list*/
  navSection: {
    flex: 1,
    padding: '8px 0',
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 14px',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 400,
    color: '#424242',
    borderLeft: '3px solid transparent',
    borderRadius: 0,
    fontFamily: 'inherit',
    ':hover': {
      backgroundColor: 'rgba(0,0,0,0.04)',
    },
    ':active': {
      backgroundColor: 'rgba(0,0,0,0.07)',
    },
  },
  navItemActive: {
    backgroundColor: 'rgba(0,120,212,0.08)',
    borderLeftColor: '#0078d4',
    color: '#0078d4',
    fontWeight: 600,
    ':hover': {
      backgroundColor: 'rgba(0,120,212,0.12)',
    },
  },
  navIcon: {
    fontSize: '15px',
    width: '18px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
});

interface NavItemDef {
  label: string;
  path: string;
  exact?: boolean;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

const NAV_ITEMS: NavItemDef[] = [
  { label: 'Home',      path: '/t3000',            exact: true, icon: <HomeRegular />,          activeIcon: <HomeFilled /> },
  { label: 'Dashboard', path: '/t3000/dashboard',               icon: <AppsListRegular />,       activeIcon: <AppsListFilled /> },
  { label: 'Inputs',    path: '/t3000/inputs',                  icon: <PlugConnectedRegular />,  activeIcon: <PlugConnectedFilled /> },
  { label: 'Outputs',   path: '/t3000/outputs',                 icon: <SlideGridRegular />,      activeIcon: <SlideGridFilled /> },
  { label: 'Variables', path: '/t3000/variables',               icon: <TableRegular />,          activeIcon: <TableRegular /> },
  { label: 'Programs',  path: '/t3000/programs',                icon: <CodeRegular />,           activeIcon: <CodeRegular /> },
  { label: 'Alarms',    path: '/t3000/alarms',                  icon: <AlertRegular />,          activeIcon: <AlertRegular /> },
  { label: 'Settings',  path: '/t3000/settings',                icon: <SettingsRegular />,       activeIcon: <SettingsFilled /> },
];

export interface SideNavContentProps {
  /** Called after a nav item is tapped 鈥?used by mobile drawer to close itself */
  onNavigate?: () => void;
}

export const SideNavContent: React.FC<SideNavContentProps> = ({ onNavigate }) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (item: NavItemDef): boolean =>
    item.exact
      ? pathname === item.path
      : pathname === item.path || pathname.startsWith(item.path + '/');

  const handleClick = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <div className={styles.root}>
      <nav className={styles.navSection}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.path}
              className={mergeClasses(styles.navItem, active && styles.navItemActive)}
              onClick={() => handleClick(item.path)}
            >
              <span className={styles.navIcon}>
                {active ? item.activeIcon : item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

