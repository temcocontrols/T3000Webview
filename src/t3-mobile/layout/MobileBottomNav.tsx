/**
 * MobileBottomNav — bottom tab bar for phones (< 768px).
 * 5 primary destinations; highlights active route.
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import {
  HomeRegular,
  HomeFilled,
  PlugConnectedRegular,
  PlugConnectedFilled,
  SlideGridRegular,
  SlideGridFilled,
  SettingsRegular,
  SettingsFilled,
  AppsListRegular,
  AppsListFilled,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: '56px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    flexShrink: 0,
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    gap: '2px',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    padding: '4px 0',
    color: tokens.colorNeutralForeground3,
    fontSize: '10px',
    fontFamily: 'inherit',
    ':active': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  tabActive: {
    color: tokens.colorBrandForeground1,
  },
  icon: {
    fontSize: '22px',
    lineHeight: 1,
  },
});

interface Tab {
  label: string;
  path: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

const TABS: Tab[] = [
  { label: 'Home',     path: '/t3000',           icon: <HomeRegular />,          activeIcon: <HomeFilled /> },
  { label: 'Devices',  path: '/t3000/inputs',     icon: <PlugConnectedRegular />, activeIcon: <PlugConnectedFilled /> },
  { label: 'Screens',  path: '/t3000/screens',    icon: <SlideGridRegular />,     activeIcon: <SlideGridFilled /> },
  { label: 'More',     path: '/t3000/dashboard',  icon: <AppsListRegular />,      activeIcon: <AppsListFilled /> },
  { label: 'Settings', path: '/t3000/settings',   icon: <SettingsRegular />,      activeIcon: <SettingsFilled /> },
];

export const MobileBottomNav: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => {
        const isActive = pathname === tab.path || (tab.path !== '/t3000' && pathname.startsWith(tab.path));
        return (
          <button
            key={tab.path}
            className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <span className={styles.icon}>{isActive ? tab.activeIcon : tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
};
