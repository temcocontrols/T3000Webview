/**
 * Device list helpers shared by device-selector dropdowns (Auto-Tagging Run,
 * FDD Analysis). They mirror how the left device tree builds its list: real
 * display names (nameShowOnTree), online devices grouped by building, and a
 * trailing Offline group.
 */

import type { DeviceInfo, DeviceStatus } from '../types/device';

/** Real display name for a device (like the device tree). */
export const deviceListName = (d: DeviceInfo): string => {
  const real = (d.nameShowOnTree || d.productName || '').trim();
  return real && real !== 'Unknown' && real !== '(Unknown)'
    ? real
    : `Device ${d.serialNumber}`;
};

/** Dropdown option label: "<serial>-<real name>", e.g. "237219-Fandu144-BB-Test487". */
export const deviceOptionLabel = (d: DeviceInfo): string =>
  `${d.serialNumber}-${deviceListName(d)}`;

/** Only devices with a meaningful name (same rule as the device tree). */
export const hasDeviceTreeName = (d: DeviceInfo): boolean => {
  const real = (d.nameShowOnTree || d.productName || '').trim();
  return !!real && real !== 'Unknown' && real !== '(Unknown)';
};

export interface DeviceDropdownGroup {
  label: string;
  devices: DeviceInfo[];
}

/**
 * Group devices like the left device tree: online devices grouped by building,
 * then a trailing "Offline" group. `statuses` is the tree store's runtime
 * online/offline map; falls back to the persisted isOnline flag.
 */
export const groupDevicesForDropdown = (
  devices: DeviceInfo[],
  statuses?: Map<number, DeviceStatus>
): DeviceDropdownGroup[] => {
  const onlineByBuilding = new Map<string, DeviceInfo[]>();
  const offline: DeviceInfo[] = [];
  for (const d of devices) {
    const online = statuses
      ? statuses.get(d.serialNumber) === 'online'
      : !!d.isOnline;
    if (online) {
      const b = d.mainBuildingName || d.buildingName || 'Default_Building';
      if (!onlineByBuilding.has(b)) onlineByBuilding.set(b, []);
      onlineByBuilding.get(b)!.push(d);
    } else {
      offline.push(d);
    }
  }
  const groups: DeviceDropdownGroup[] = [];
  for (const b of [...onlineByBuilding.keys()].sort((a, b2) => a.localeCompare(b2))) {
    groups.push({ label: `${b} (${onlineByBuilding.get(b)!.length})`, devices: onlineByBuilding.get(b)! });
  }
  if (offline.length > 0) {
    groups.push({ label: `Offline (${offline.length})`, devices: offline });
  }
  return groups;
};
