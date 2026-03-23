/**
 * DevicePickerSheet — bottom sheet for selecting a T3000 device.
 *
 * Opened by tapping the device name chip in MobileAppBar.
 *
 * Design (iOS-style bottom sheet):
 *   - Slides up from bottom, covers ~72% of the screen
 *   - Rounded top corners + drag handle pill
 *   - Header: "Select Device" title + × close button
 *   - "Scan for Devices" refresh action bar
 *   - Scrollable device list:
 *       status dot (green=online, gray=offline/unknown)
 *       device name + IP/panel meta
 *       checkmark for the currently selected device
 *   - Loading state: spinner centred in list
 *   - Empty state: icon + hint text
 */

import React, { useEffect } from 'react';
import { makeStyles, mergeClasses, tokens, Spinner } from '@fluentui/react-components';
import {
  DismissRegular,
  ArrowSyncRegular,
  CheckmarkRegular,
  PlugConnectedRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '@t3-react/features/devices/store/deviceTreeStore';

const useStyles = makeStyles({
  /* ── Backdrop ─────────────────────────────────────────── */
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 400,
    transition: 'opacity 0.25s ease',
  },
  backdropHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },

  /* ── Sheet ────────────────────────────────────────────── */
  sheet: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '72vh',
    backgroundColor: '#ffffff',
    borderRadius: '16px 16px 0 0',
    boxShadow: tokens.shadow28,
    zIndex: 401,
    display: 'flex',
    flexDirection: 'column',
    transform: 'translateY(0)',
    transition: 'transform 0.25s ease',
  },
  sheetHidden: {
    transform: 'translateY(100%)',
  },

  /* ── Drag handle ──────────────────────────────────────── */
  handle: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '7px',
    paddingBottom: '4px',
    flexShrink: 0,
  },
  handlePill: {
    width: '28px',
    height: '3px',
    borderRadius: '2px',
    backgroundColor: '#d0d0d0',
  },

  /* ── Header ───────────────────────────────────────────── */
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '2px 12px 8px',
    gap: '8px',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#1a1a1a',
    flexShrink: 0,
  },
  headerSpacer: {
    flex: 1,
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
    marginRight: '4px',
    ':hover': { backgroundColor: '#106ebe' },
    ':active': { backgroundColor: '#005a9e' },
  },
  scanBtnDisabled: {
    opacity: 0.65,
    cursor: 'wait',
    fontSize: '10px',
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#f0f0f0',
    cursor: 'pointer',
    color: '#424242',
    fontFamily: 'inherit',
    flexShrink: 0,
    ':hover': { backgroundColor: '#e0e0e0' },
    ':active': { backgroundColor: '#d0d0d0' },
  },

  /* ── Dividers ─────────────────────────────────────────── */
  divider: {
    height: '1px',
    backgroundColor: tokens.colorNeutralStroke2,
    flexShrink: 0,
  },

  /* ── Device list ──────────────────────────────────────── */
  list: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: '20px',
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

  checkmark: {
    color: '#0078d4',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
});

export interface DevicePickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevicePickerSheet: React.FC<DevicePickerSheetProps> = ({ isOpen, onClose }) => {
  const styles = useStyles();

  const devices = useDeviceTreeStore((s) => s.devices);
  const selectedDevice = useDeviceTreeStore((s) => s.selectedDevice);
  const selectDevice = useDeviceTreeStore((s) => s.selectDevice);
  const isLoading = useDeviceTreeStore((s) => s.isLoading);
  const loadDevicesWithSync = useDeviceTreeStore((s) => s.loadDevicesWithSync);

  // Prevent background scroll while sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSelect = (device: typeof devices[number]) => {
    selectDevice(device);
    onClose();
  };

  // Build a short meta line — IP and panel only (productName excluded to avoid repeating the device name)
  const getDeviceMeta = (device: typeof devices[number]): string => {
    const parts: string[] = [];
    if (device.ipAddress) parts.push(device.ipAddress);
    if (device.panelId != null) parts.push(`Panel ${device.panelId}`);
    return parts.join(' · ');
  };

  return (
    <>
      {/* Dimmed backdrop */}
      <div
        className={mergeClasses(styles.backdrop, !isOpen && styles.backdropHidden)}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        className={mergeClasses(styles.sheet, !isOpen && styles.sheetHidden)}
        role="dialog"
        aria-modal="true"
        aria-label="Select device"
      >
        {/* Drag handle pill */}
        <div className={styles.handle}>
          <div className={styles.handlePill} />
        </div>

        {/* Header: title + scan button + close */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>Select Device</span>
          <div className={styles.headerSpacer} />
          <button
            onClick={() => loadDevicesWithSync()}
            disabled={isLoading}
            aria-label="Scan for devices"
          >
            {isLoading ? null : <ArrowSyncRegular fontSize={12} />}
            {isLoading ? 'Scanning...' : 'Scan'}
          </button>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close device picker"
          >
            <DismissRegular fontSize={14} />
          </button>
        </div>

        <div className={styles.divider} />

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
    </>
  );
};
