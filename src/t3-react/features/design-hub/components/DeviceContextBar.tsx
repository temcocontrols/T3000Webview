/**
 * Design Hub — Device Context Bar
 * Shows the currently selected device and device-scoped drawing stats.
 */
import React, { useEffect, useState } from 'react';
import { Tooltip } from '@fluentui/react-components';
import {
  BoardRegular,
  ChevronDownRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { useDesignHubStore } from '../store/designHubStore';
import { DevicePickerDrawer } from './DevicePickerDrawer';
import styles from '../pages/DesignHubPage.module.css';

export const DeviceContextBar: React.FC = () => {
  const devices = useDeviceTreeStore((s) => s.devices);
  const isLoadingDevices = useDeviceTreeStore((s) => s.isLoading);
  const fetchDevices = useDeviceTreeStore((s) => s.fetchDevices);
  const selectedDevice = useDeviceTreeStore((s) => s.selectedDevice);
  const projects = useDesignHubStore((s) => s.projects);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Make sure the device list is loaded so a device is selected by default
  // (same default-selection logic as the device tree: last used, else first online).
  useEffect(() => {
    if (devices.length === 0 && !isLoadingDevices) {
      fetchDevices();
    }
  }, [devices.length, isLoadingDevices, fetchDevices]);

  const onThisDevice = projects.filter(
    (p) => p.serialNumber && p.serialNumber === selectedDevice?.serialNumber
  ).length;
  const deployed = projects.filter((p) => p.status === 'deployed').length;
  const unbound = projects.filter((p) => !p.serialNumber).length;

  const building = selectedDevice?.buildingName || undefined;

  return (
    <div className={styles.deviceBar}>
      <button className={styles.deviceChip} onClick={() => setPickerOpen(true)}>
        <div className={selectedDevice ? styles.deviceChipIcon : styles.deviceChipIconNone}>
          <BoardRegular style={{ fontSize: 18 }} />
        </div>
        <div>
          <div className={styles.deviceChipName}>
            {selectedDevice?.nameShowOnTree || 'No device selected'}
          </div>
          <div className={styles.deviceChipMeta}>
            {selectedDevice
              ? `SN ${selectedDevice.serialNumber}${building ? ` · ${building}` : ''}`
              : 'Click to choose a device'}
          </div>
        </div>
        <span className={styles.deviceChipChevron}>
          <ChevronDownRegular style={{ fontSize: 14 }} />
        </span>
      </button>

      <div className={styles.deviceStats}>
        <Tooltip
          content={`Drawings bound to the selected device${selectedDevice ? ` (${selectedDevice.nameShowOnTree})` : ''}`}
          relationship="label"
        >
          <div className={styles.deviceStat}>
            <div className={styles.deviceStatValue}>{onThisDevice}</div>
            <div className={styles.deviceStatLabel}>On this device</div>
          </div>
        </Tooltip>
        <Tooltip content="Drawings deployed to a device" relationship="label">
          <div className={styles.deviceStat}>
            <div className={styles.deviceStatValue}>{deployed}</div>
            <div className={styles.deviceStatLabel}>Deployed</div>
          </div>
        </Tooltip>
        <Tooltip content="Drawings not bound to any device yet" relationship="label">
          <div className={styles.deviceStat}>
            <div className={styles.deviceStatValue}>{unbound}</div>
            <div className={styles.deviceStatLabel}>Unbound</div>
          </div>
        </Tooltip>
      </div>

      <DevicePickerDrawer open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </div>
  );
};
