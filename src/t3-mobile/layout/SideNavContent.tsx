/**
 * SideNavContent — shared navigation menu used by:
 *   - MobileNavDrawer (overlay, < 768px)
 *   - TabletSidebar   (persistent, 768–1024px)
 *
 * Design: GitHub / Notion style light sidebar
 *   Active item  → blue left border + light blue bg + blue text
 *   Inactive     → gray text, subtle hover
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { makeStyles, mergeClasses, tokens, Spinner } from '@fluentui/react-components';
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
  ChevronDownRegular,
  ChevronUpRegular,
  CheckmarkRegular,
  ArrowSyncRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '@t3-react/features/devices/store/deviceTreeStore';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
    overflowY: 'auto',
  },

  /* ── Header ─────────────────────────────────────────── */
  header: {
    padding: '20px 16px 14px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
  appTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0078d4',
    letterSpacing: '-0.3px',
    marginBottom: '10px',
    display: 'block',
  },
  /* ── Device picker trigger ────────────────────────────── */
  deviceTrigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 8px',
    borderRadius: '6px',
    backgroundColor: '#f0f8ff',
    border: '1px solid #c8e0f8',
    width: '100%',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background-color 0.15s',
    ':hover': {
      backgroundColor: '#daeeff',
    },
    ':active': {
      backgroundColor: '#c5e3fa',
    },
  },
  deviceTriggerOpen: {
    backgroundColor: '#daeeff',
    border: '1px solid #0078d4',
  },
  onlineDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#107c10',
    flexShrink: 0,
  },
  offlineDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#8a8a8a',
    flexShrink: 0,
  },
  deviceLabel: {
    flex: 1,
    fontSize: '12px',
    fontWeight: 600,
    color: '#0078d4',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  },
  noDeviceLabel: {
    flex: 1,
    fontSize: '12px',
    fontWeight: 400,
    color: tokens.colorNeutralForeground4,
    fontStyle: 'italic',
    textAlign: 'left',
  },
  chevron: {
    color: '#0078d4',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },

  /* ── Device picker dropdown ─────────────────────────── */
  pickerList: {
    marginTop: '4px',
    borderRadius: '6px',
    border: '1px solid #c8e0f8',
    backgroundColor: '#ffffff',
    boxShadow: tokens.shadow4,
    overflow: 'hidden',
    maxHeight: '220px',
    overflowY: 'auto',
  },
  pickerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 10px',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'inherit',
    fontSize: '13px',
    color: '#424242',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    ':last-child': { borderBottom: 'none' },
    ':hover': { backgroundColor: '#f0f8ff' },
    ':active': { backgroundColor: '#daeeff' },
  },
  pickerItemSelected: {
    backgroundColor: '#f0f8ff',
    color: '#0078d4',
    fontWeight: 600,
  },
  pickerItemName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  pickerCheckmark: {
    color: '#0078d4',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  pickerEmpty: {
    padding: '10px',
    fontSize: '12px',
    color: tokens.colorNeutralForeground4,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  pickerLoadingRow: {
    padding: '14px 10px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerScanButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 10px',
    borderRadius: '4px',
    border: '1px solid #0078d4',
    backgroundColor: 'transparent',
    color: '#0078d4',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    ':hover': { backgroundColor: '#f0f8ff' },
    ':active': { backgroundColor: '#daeeff' },
  },

  /* ── Nav list ────────────────────────────────────────── */
  navSection: {
    flex: 1,
    padding: '8px 0',
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 16px',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: 400,
    color: '#424242',
    borderLeft: '3px solid transparent',
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
    fontSize: '18px',
    width: '20px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },

  /* ── Footer ──────────────────────────────────────────── */
  footer: {
    padding: '12px 16px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: '11px',
    color: tokens.colorNeutralForeground4,
    flexShrink: 0,
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
  /** Called after a nav item is tapped — used by mobile drawer to close itself */
  onNavigate?: () => void;
}

export const SideNavContent: React.FC<SideNavContentProps> = ({ onNavigate }) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const selectedDevice = useDeviceTreeStore((s) => s.selectedDevice);
  const devices = useDeviceTreeStore((s) => s.devices);
  const selectDevice = useDeviceTreeStore((s) => s.selectDevice);
  const fetchDevices = useDeviceTreeStore((s) => s.fetchDevices);
  const loadDevicesWithSync = useDeviceTreeStore((s) => s.loadDevicesWithSync);
  const isLoading = useDeviceTreeStore((s) => s.isLoading);

  const [pickerOpen, setPickerOpen] = useState(false);

  // On mount: load from DB; if empty, sync from C++ T3000 app
  useEffect(() => {
    const init = async () => {
      await fetchDevices();
      if (useDeviceTreeStore.getState().devices.length === 0) {
        await loadDevicesWithSync();
      }
    };
    init();
  }, []);

  // Close picker on route change
  useEffect(() => { setPickerOpen(false); }, [pathname]);

  const isActive = (item: NavItemDef): boolean =>
    item.exact
      ? pathname === item.path
      : pathname === item.path || pathname.startsWith(item.path + '/');

  const handleClick = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const handlePickDevice = (device: typeof devices[number]) => {
    selectDevice(device);
    setPickerOpen(false);
  };

  return (
    <div className={styles.root}>
      {/* Header — app title + device picker */}
      <div className={styles.header}>
        <span className={styles.appTitle}>T3000</span>

        {/* Trigger button */}
        <button
          className={mergeClasses(styles.deviceTrigger, pickerOpen && styles.deviceTriggerOpen)}
          onClick={() => setPickerOpen((v) => !v)}
          aria-label="Select device"
        >
          <div className={selectedDevice ? styles.onlineDot : styles.offlineDot} />
          {selectedDevice ? (
            <span className={styles.deviceLabel}>{selectedDevice.nameShowOnTree}</span>
          ) : (
            <span className={styles.noDeviceLabel}>No device selected</span>
          )}
          <span className={styles.chevron}>
            {pickerOpen ? <ChevronUpRegular fontSize={12} /> : <ChevronDownRegular fontSize={12} />}
          </span>
        </button>

        {/* Inline picker dropdown */}
        {pickerOpen && (
          <div className={styles.pickerList}>
            {devices.length === 0 ? (
              isLoading ? (
                <div className={styles.pickerLoadingRow}>
                  <Spinner size="tiny" label="Loading devices..." />
                </div>
              ) : (
                <div className={styles.pickerEmpty}>
                  <span>No devices found</span>
                  <button
                    className={styles.pickerScanButton}
                    onClick={() => loadDevicesWithSync()}
                  >
                    <ArrowSyncRegular fontSize={13} /> Scan for devices
                  </button>
                </div>
              )
            ) : (
              devices.map((device) => {
                const isSelected = selectedDevice?.serialNumber === device.serialNumber;
                return (
                  <button
                    key={device.serialNumber}
                    className={mergeClasses(styles.pickerItem, isSelected && styles.pickerItemSelected)}
                    onClick={() => handlePickDevice(device)}
                  >
                    <div className={styles.onlineDot} />
                    <span className={styles.pickerItemName}>{device.nameShowOnTree}</span>
                    {isSelected && (
                      <span className={styles.pickerCheckmark}>
                        <CheckmarkRegular fontSize={14} />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Navigation items */}
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

      {/* Footer */}
      <div className={styles.footer}>T3000 Webview v9</div>
    </div>
  );
};
