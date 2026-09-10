/**
 * Design Hub — Device Picker Drawer
 * Slide-in panel listing all devices from the device tree so the user can
 * change the active device that scopes the Design Hub (drawings, stats, deploy).
 * Selecting a device reuses the device-tree store (persists t3.lastSelectedDevice).
 */
import React, { useMemo, useState } from 'react';
import {
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Button,
  Spinner,
} from '@fluentui/react-components';
import {
  DismissRegular,
  Desktop20Regular,
  Dismiss20Regular,
  CaretDown16Regular,
  CaretRight16Regular,
} from '@fluentui/react-icons';
import type { DeviceInfo } from '../../../shared/types/device';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import styles from '../pages/DesignHubPage.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

const DeviceRow: React.FC<{
  d: DeviceInfo;
  active: boolean;
  offline: boolean;
  onSelect: (d: DeviceInfo) => void;
}> = ({ d, active, offline, onSelect }) => (
  <div
    className={`${styles.devicePickerItem} ${active ? styles.devicePickerItemActive : ''}`}
    onClick={() => onSelect(d)}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') onSelect(d);
    }}
  >
    <span className={`${styles.devicePickerItemIcon} ${offline ? styles.devicePickerItemIconOffline : ''}`}>
      {offline ? (
        <Dismiss20Regular style={{ fontSize: 16 }} />
      ) : (
        <Desktop20Regular style={{ fontSize: 16 }} />
      )}
    </span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className={styles.devicePickerName}>
        {d.nameShowOnTree || d.productName || `SN ${d.serialNumber}`}
      </div>
      <div className={styles.devicePickerMeta}>
        SN {d.serialNumber}
        {d.ipAddress ? ` · ${d.ipAddress}` : ''}
      </div>
    </div>
    {active && (
      <span style={{ color: '#0078d4', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
        Selected
      </span>
    )}
  </div>
);

export const DevicePickerDrawer: React.FC<Props> = ({ open, onClose }) => {
  const devices = useDeviceTreeStore((s) => s.devices);
  const isLoading = useDeviceTreeStore((s) => s.isLoading);
  const loadError = useDeviceTreeStore((s) => s.error);
  const fetchDevices = useDeviceTreeStore((s) => s.fetchDevices);
  const selectedDevice = useDeviceTreeStore((s) => s.selectedDevice);
  const deviceStatuses = useDeviceTreeStore((s) => s.deviceStatuses);
  const selectDevice = useDeviceTreeStore((s) => s.selectDevice);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showOffline, setShowOffline] = useState(false);

  // Same list rules as the T3000 device tree: drop unknown devices, show only
  // ONLINE devices under their building groups, and hide OFFLINE/unknown devices
  // behind a collapsible "Show N offline" group (collapsed by default).
  const { map: onlineGroupMap, keys: onlineGroupKeys, offline: offlineList } = useMemo(() => {
    const isUnknown = (d: DeviceInfo) => {
      const n = (d.nameShowOnTree || '').trim();
      return !n || n === 'Unknown' || n === '(Unknown)';
    };
    const isOnline = (d: DeviceInfo) => deviceStatuses.get(d.serialNumber) === 'online';

    const known = devices.filter((d) => !isUnknown(d));
    const online = known.filter(isOnline);
    const offline = known.filter((d) => !isOnline(d));

    // Group online devices by building.
    const map = new Map<string, DeviceInfo[]>();
    for (const d of online) {
      // Devices with no building assigned are grouped under a friendly
      // "Unassigned" header (display-only; the device tree uses "Default_Building").
      const b = d.mainBuildingName || d.buildingName || 'Unassigned';
      if (!map.has(b)) map.set(b, []);
      map.get(b)!.push(d);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.nameShowOnTree.localeCompare(b.nameShowOnTree));
    }
    const keys = [...map.keys()].sort((a, b) => a.localeCompare(b));
    offline.sort((a, b) => a.nameShowOnTree.localeCompare(b.nameShowOnTree));
    return { map, keys, offline };
  }, [devices, deviceStatuses]);

  // Empty set = "all buildings expanded" (default). First toggle materializes it.
  const isExpanded = (b: string) => expanded.size === 0 || expanded.has(b);
  const toggleGroup = (b: string) => {
    setExpanded((prev) => {
      const next = new Set(prev.size === 0 ? onlineGroupKeys : prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  };

  const handleSelect = (d: DeviceInfo) => {
    selectDevice(d);
    onClose();
  };

  return (
    <Drawer
      type="overlay"
      position="start"
      size="small"
      open={open}
      onOpenChange={(_, data) => {
        if (data.open === false) onClose();
      }}
    >
      <DrawerHeader style={{ padding: '10px 12px 8px' }}>
        <DrawerHeaderTitle
          action={
            <Button appearance="subtle" icon={<DismissRegular />} onClick={onClose} />
          }
        >
          <span className={styles.devicePickerTitle}>Select Device</span>
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#b9c6d6 transparent',
          padding: '6px 12px 16px 8px',
        }}
      >
        {isLoading ? (
          <div className={styles.devicePickerLoading}>
            <Spinner size="tiny" label="Loading devices…" labelPosition="after" />
          </div>
        ) : loadError ? (
          <div className={styles.devicePickerError}>
            <div style={{ fontWeight: 600 }}>Failed to load devices</div>
            <div className={styles.devicePickerErrorMsg}>{loadError}</div>
            <Button
              size="small"
              appearance="primary"
              onClick={() => fetchDevices()}
              style={{ marginTop: 8, alignSelf: 'flex-start' }}
            >
              Retry
            </Button>
          </div>
        ) : devices.length === 0 || (onlineGroupKeys.length === 0 && offlineList.length === 0) ? (
          <div className={styles.devicePickerEmpty}>
            No devices found. Add a device in the device tree first, then pick it here.
          </div>
        ) : (
          <div className={styles.devicePickerList}>
            {/* ONLINE devices — grouped by building */}
            {onlineGroupKeys.map((b) => (
              <div key={b}>
                <div className={styles.devicePickerGroupHeader} onClick={() => toggleGroup(b)}>
                  {isExpanded(b) ? (
                    <CaretDown16Regular style={{ color: '#5f7891' }} />
                  ) : (
                    <CaretRight16Regular style={{ color: '#5f7891' }} />
                  )}
                  <span>{b}</span>
                  <span className={styles.devicePickerGroupCount}>{onlineGroupMap.get(b)!.length}</span>
                </div>
                {isExpanded(b) &&
                  onlineGroupMap.get(b)!.map((d) => (
                    <DeviceRow
                      key={d.serialNumber}
                      d={d}
                      active={selectedDevice?.serialNumber === d.serialNumber}
                      offline={false}
                      onSelect={handleSelect}
                    />
                  ))}
              </div>
            ))}

            {/* OFFLINE / unknown devices — hidden behind a collapsible group */}
            {offlineList.length > 0 && (
              <div>
                <div
                  className={styles.devicePickerGroupHeader}
                  onClick={() => setShowOffline((v) => !v)}
                >
                  {showOffline ? (
                    <CaretDown16Regular style={{ color: '#5f7891' }} />
                  ) : (
                    <CaretRight16Regular style={{ color: '#5f7891' }} />
                  )}
                  <span>{showOffline ? 'Hide offline devices' : `Show ${offlineList.length} offline`}</span>
                  <span className={styles.devicePickerGroupCount}>{offlineList.length}</span>
                </div>
                {showOffline &&
                  offlineList.map((d) => (
                    <DeviceRow
                      key={d.serialNumber}
                      d={d}
                      active={selectedDevice?.serialNumber === d.serialNumber}
                      offline
                      onSelect={handleSelect}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </DrawerBody>
    </Drawer>
  );
};

export default DevicePickerDrawer;
