/**
 * useDeviceData Hook
 *
 * Provides easy access to device selection and device list
 * Wraps deviceStore with convenient selectors
 */

import { useCallback } from 'react';
import { useDeviceStore, deviceSelectors } from '@t3-react/store';
import type { TreeNode } from '@common/types/tree';

export function useDeviceData() {
  // State selectors
  const selectedDevice = useDeviceStore(deviceSelectors.selectedDevice);
  const devices = useDeviceStore(deviceSelectors.devices);
  const isLoading = useDeviceStore(deviceSelectors.isLoading);
  const error = useDeviceStore(deviceSelectors.error);
  const hasSelection = useDeviceStore(deviceSelectors.hasSelection);
  const onlineDevices = useDeviceStore(deviceSelectors.onlineDevices);
  const offlineDevices = useDeviceStore(deviceSelectors.offlineDevices);

  // Actions
  const setSelectedDevice = useDeviceStore((state) => state.setSelectedDevice);
  const selectDeviceById = useDeviceStore((state) => state.selectDeviceById);
  const clearSelection = useDeviceStore((state) => state.clearSelection);
  const loadDevices = useDeviceStore((state) => state.loadDevices);
  const addDevice = useDeviceStore((state) => state.addDevice);
  const updateDevice = useDeviceStore((state) => state.updateDevice);
  const removeDevice = useDeviceStore((state) => state.removeDevice);

  // Utility functions from store
  const getDeviceById = useDeviceStore((state) => state.getDeviceById);
  const isDeviceOnline = useDeviceStore((state) => state.isDeviceOnline);
  const getDeviceCount = useDeviceStore((state) => state.getDeviceCount);

  // Computed values
  const selectedDeviceId = selectedDevice?.id;
  const selectedDeviceName = selectedDevice?.label;
  const deviceCount = devices.length;
  const onlineCount = onlineDevices.length;
  const offlineCount = offlineDevices.length;

  // Helper functions
  const isSelected = useCallback(
    (deviceId: number) => selectedDeviceId === deviceId,
    [selectedDeviceId]
  );

  const selectDevice = useCallback(
    (device: TreeNode) => {
      setSelectedDevice(device);
    },
    [setSelectedDevice]
  );

  const refreshDevices = useCallback(async () => {
    await loadDevices();
  }, [loadDevices]);

  return {
    // State
    selectedDevice,
    selectedDeviceId,
    selectedDeviceName,
    devices,
    onlineDevices,
    offlineDevices,
    isLoading,
    error,
    hasSelection,

    // Counts
    deviceCount,
    onlineCount,
    offlineCount,

    // Actions
    selectDevice,
    selectDeviceById,
    clearSelection,
    loadDevices,
    refreshDevices,
    addDevice,
    updateDevice,
    removeDevice,

    // Utilities
    isSelected,
    getDeviceById,
    isDeviceOnline,
    getDeviceCount,
  };
}
