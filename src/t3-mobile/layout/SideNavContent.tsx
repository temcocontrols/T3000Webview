/**
 * SideNavContent — pure navigation link list used by:
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
  DeskMultipleRegular,
  WrenchRegular,
  OptionsRegular,
  CircleMultipleConcentricRegular,
  DeveloperBoardRegular,
  FlowRegular,
  ImageRegular,
  CalendarRegular,
  CalendarFilled,
  CalendarDateRegular,
  ChartMultipleRegular,
  AlertRegular,
  AlertFilled,
  ListRegular,
  NetworkCheckRegular,
  BuildingMultipleRegular,
  SearchRegular,
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

  navSection: {
    flex: 1,
    padding: '4px 0 16px',
    overflowY: 'auto',
  },

  sectionLabel: {
    padding: '12px 14px 3px',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#8a8886',
    userSelect: 'none',
    marginTop: '4px',
    borderTop: '1px solid #edebe9',
    ':first-child': {
      borderTop: 'none',
      marginTop: 0,
    },
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
  type: 'item';
  label: string;
  path: string;
  exact?: boolean;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

interface NavSectionDef {
  type: 'section';
  label: string;
}

type NavEntry = NavItemDef | NavSectionDef;

const NAV_ENTRIES: NavEntry[] = [
  { type: 'item', label: 'Home',       path: '/t3000',           exact: true, icon: <HomeRegular />,                      activeIcon: <HomeFilled /> },
  { type: 'item', label: 'Dashboard',  path: '/t3000/dashboard',              icon: <DeskMultipleRegular />,              activeIcon: <DeskMultipleRegular /> },

  { type: 'section', label: 'Monitoring' },
  { type: 'item', label: 'Inputs',     path: '/t3000/inputs',                 icon: <WrenchRegular />,                    activeIcon: <WrenchRegular /> },
  { type: 'item', label: 'Outputs',    path: '/t3000/outputs',                icon: <OptionsRegular />,                   activeIcon: <OptionsRegular /> },
  { type: 'item', label: 'Variables',  path: '/t3000/variables',              icon: <CircleMultipleConcentricRegular />,  activeIcon: <CircleMultipleConcentricRegular /> },
  { type: 'item', label: 'Trend Logs', path: '/t3000/trendlogs',              icon: <ChartMultipleRegular />,             activeIcon: <ChartMultipleRegular /> },
  { type: 'item', label: 'Alarms',     path: '/t3000/alarms',                 icon: <AlertRegular />,                     activeIcon: <AlertFilled /> },

  { type: 'section', label: 'Control' },
  { type: 'item', label: 'Programs',   path: '/t3000/programs',               icon: <DeveloperBoardRegular />,            activeIcon: <DeveloperBoardRegular /> },
  { type: 'item', label: 'PID Loops',  path: '/t3000/pidloops',               icon: <FlowRegular />,                      activeIcon: <FlowRegular /> },
  { type: 'item', label: 'Schedules',  path: '/t3000/schedules',              icon: <CalendarRegular />,                  activeIcon: <CalendarFilled /> },
  { type: 'item', label: 'Holidays',   path: '/t3000/holidays',               icon: <CalendarDateRegular />,              activeIcon: <CalendarDateRegular /> },

  { type: 'section', label: 'View' },
  { type: 'item', label: 'Graphics',   path: '/t3000/graphics',               icon: <ImageRegular />,                     activeIcon: <ImageRegular /> },
  { type: 'item', label: 'Array',      path: '/t3000/array',                  icon: <ListRegular />,                      activeIcon: <ListRegular /> },

  { type: 'section', label: 'System' },
  { type: 'item', label: 'Network',    path: '/t3000/network',                icon: <NetworkCheckRegular />,              activeIcon: <NetworkCheckRegular /> },
  { type: 'item', label: 'Buildings',  path: '/t3000/buildings',              icon: <BuildingMultipleRegular />,          activeIcon: <BuildingMultipleRegular /> },
  { type: 'item', label: 'Discover',   path: '/t3000/discover',               icon: <SearchRegular />,                    activeIcon: <SearchRegular /> },
  { type: 'item', label: 'Settings',   path: '/t3000/settings',               icon: <SettingsRegular />,                  activeIcon: <SettingsFilled /> },
];

export interface SideNavContentProps {
  /** Called after a nav item is tapped — used by mobile drawer to close itself */
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
        {NAV_ENTRIES.map((entry, idx) => {
          if (entry.type === 'section') {
            return (
              <div key={`section-${idx}`} className={styles.sectionLabel}>
                {entry.label}
              </div>
            );
          }
          const active = isActive(entry);
          return (
            <button
              key={entry.path}
              className={mergeClasses(styles.navItem, active && styles.navItemActive)}
              onClick={() => handleClick(entry.path)}
            >
              <span className={styles.navIcon}>
                {active ? entry.activeIcon : entry.icon}
              </span>
              {entry.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

