/**
 * DevicePanel — shared device list content.
 *
 * Used in two contexts:
 *   - DeviceDrawer  (mobile: left-side overlay drawer)
 *   - TabletSidebar (tablet: persistent left panel)
 *
 * Shows: "Devices" header + Scan button + scrollable device list.
 * Calls onClose() after a device is selected (lets the mobile drawer close itself).
 */

import React from 'react';
import { makeStyles, mergeClasses, tokens, Spinner } from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  CheckmarkRegular,
  PlugConnectedRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '@t3-react/features/devices/store/deviceTreeStore';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
  },

  /* ── Header ──────────────────────────────────────────── */
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 12px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    gap: '8px',
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: '13px',
    fontWeight: 700,
    color: '#1a1a1a',
  },
  scanBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '5px',
    border: 'none',
    backgroundColor: '#0078d4',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 400,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
    ':hover': { backgroundColor: '#106ebe' },
    ':active': { backgroundColor: '#005a9e' },
  },
  scanBtnDisabled: {
    opacity: 0.65,
    cursor: 'wait',
    fontSize: '10px',
  },

  /* ── List ──────────────────────────────────────────────── */
  list: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: '12px',
  },

  /* Loading */
  loadingState: {
    padding: '28px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    color: tokens.colorNeutralForeground3,
    fontSize: '11px',
  },

  /* Empty */
  emptyState: {
    padding: '28px 16px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground4,
    fontSize: '12px',
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'center',
    color: '#c8c8c8',
  },
  emptyHint: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground4,
    marginTop: '4px',
    lineHeight: '1.5',
  },

  /* Device row */
  deviceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 12px',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'inherit',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    ':last-child': { borderBottom: 'none' },
    ':hover': { backgroundColor: '#f5f5f5' },
    ':active': { backgroundColor: '#ebebeb' },
  },
  deviceItemSelected: {
    backgroundColor: '#f0f8ff',
    ':hover': { backgroundColor: '#e5f3ff' },
    ':active': { backgroundColor: '#daeeff' },
  },

  /* Status dots */
  dotOnline: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#107c10',
    flexShrink: 0,
  },
  dotOffline: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#8a8a8a',
    flexShrink: 0,
  },

  /* Device info */
  deviceInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  deviceName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#1a1a1a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deviceNameSelected: {
    color: '#0078d4',
    fontWeight: 700,
  },
  deviceMeta: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground4,
    marginTop: '1px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  /* Checkmark */
  checkmark: {
    color: '#0078d4',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
});

export interface DevicePanelProps {
  /** Called after device selection — lets the mobile drawer close itself. Omit for tablet persistent panel. */
  onClose?: () => void;
}

export const DevicePanel: React.FC<DevicePanelProps> = ({ onClose }) => {
  const styles = useStyles();

  const devices = useDeviceTreeStore((s) => s.devices);
  const selectedDevice = useDeviceTreeStore((s) => s.selectedDevice);
  const selectDevice = useDeviceTreeStore((s) => s.selectDevice);
  const isLoading = useDeviceTreeStore((s) => s.isLoading);
  const loadDevicesWithSync = useDeviceTreeStore((s) => s.loadDevicesWithSync);

  const handleSelect = (device: typeof devices[number]) => {
    selectDevice(device);
    onClose?.();
  };

  const getDeviceMeta = (device: typeof devices[number]): string => {
    const parts: string[] = [];
    if (device.ipAddress) parts.push(device.ipAddress);
    if (device.panelId != null) parts.push(`Panel ${device.panelId}`);
    return parts.join(' · ');
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>Devices</span>
        <button
          className={mergeClasses(styles.scanBtn, isLoading && styles.scanBtnDisabled)}
          onClick={() => loadDevicesWithSync()}
          disabled={isLoading}
          aria-label="Scan for devices"
        >
          {!isLoading && <ArrowSyncRegular fontSize={12} />}
          {isLoading ? 'Scanning…' : 'Scan'}
        </button>
      </div>

      {/* Device list */}
      <div className={styles.list}>
        {isLoading && devices.length === 0 ? (
          <div className={styles.loadingState}>
            <Spinner size="small" />
            <span>Looking for devices…</span>
          </div>
        ) : devices.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <PlugConnectedRegular />
            </div>
            No devices found.
            <div className={styles.emptyHint}>
              Make sure T3000 is running<br />and connected to the network.
            </div>
          </div>
        ) : (
          devices.map((device) => {
            const isSelected = selectedDevice?.serialNumber === device.serialNumber;
            const isOnline = device.status === 'online';
            const meta = getDeviceMeta(device);

            return (
              <button
                key={device.serialNumber}
                className={mergeClasses(styles.deviceItem, isSelected && styles.deviceItemSelected)}
                onClick={() => handleSelect(device)}
              >
                <div className={isOnline ? styles.dotOnline : styles.dotOffline} />
                <div className={styles.deviceInfo}>
                  <div className={mergeClasses(styles.deviceName, isSelected && styles.deviceNameSelected)}>
                    {device.nameShowOnTree}
                  </div>
                  {meta && <div className={styles.deviceMeta}>{meta}</div>}
                </div>
                {isSelected && (
                  <span className={styles.checkmark}>
                    <CheckmarkRegular fontSize={14} />
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
