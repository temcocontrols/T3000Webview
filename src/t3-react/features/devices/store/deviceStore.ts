/**
 * Device Store - Manages selected device and device list
 *
 * Responsibilities:
 * - Track currently selected device
 * - Store list of all devices
 * - Device selection logic
 * - Device loading from API
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { TreeNode } from '@common/react/types/device';
import { DeviceStatus } from '@common/react/types/device';
import { api } from '@/shared/api/client';

export interface DeviceState {
  // State
  selectedDevice: TreeNode | null;
  devices: TreeNode[];
  isLoading: boolean;
  error: string | null;

  // Device selection
  setSelectedDevice: (device: TreeNode | null) => void;
  selectDeviceById: (deviceId: string) => void;
  clearSelection: () => void;

  // Device list management
  loadDevices: () => Promise<void>;
  addDevice: (device: TreeNode) => void;
  updateDevice: (deviceId: string, updates: Partial<TreeNode>) => void;
  removeDevice: (deviceId: string) => void;

  // Utilities
  getDeviceById: (deviceId: string) => TreeNode | undefined;
  isDeviceOnline: (deviceId: string) => boolean;
  getDeviceCount: () => number;
  reset: () => void;
}

const initialState = {
  selectedDevice: null,
  devices: [],
  isLoading: false,
  error: null,
};

export const useDeviceStore = create<DeviceState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Device selection
        setSelectedDevice: (device) => {
          set({ selectedDevice: device, error: null });
        },

        selectDeviceById: (deviceId) => {
          const device = get().devices.find((d) => d.id === deviceId);
          if (device) {
            set({ selectedDevice: device, error: null });
          } else {
            set({ error: `Device with ID ${deviceId} not found` });
          }
        },

        clearSelection: () => {
          set({ selectedDevice: null });
        },

        // Device list management
        loadDevices: async () => {
          set({ isLoading: true, error: null });
          try {
            const response = await devicesApi.getDeviceTree();
            set({
              devices: response.data || [],
              isLoading: false,
              error: null
            });
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to load devices'
            });
          }
        },

        addDevice: (device) => {
          set((state) => ({
            devices: [...state.devices, device],
          }));
        },

        updateDevice: (deviceId, updates) => {
          set((state) => {
            const devices = state.devices.map((device) =>
              device.id === deviceId ? { ...device, ...updates } : device
            );

            // Update selectedDevice if it's the one being updated
            const selectedDevice = state.selectedDevice?.id === deviceId
              ? { ...state.selectedDevice, ...updates }
              : state.selectedDevice;

            return { devices, selectedDevice };
          });
        },

        removeDevice: (deviceId) => {
          set((state) => {
            const devices = state.devices.filter((d) => d.id !== deviceId);
            const selectedDevice = state.selectedDevice?.id === deviceId
              ? null
              : state.selectedDevice;

            return { devices, selectedDevice };
          });
        },

        // Utilities
        getDeviceById: (deviceId) => {
          return get().devices.find((d) => d.id === deviceId);
        },

        isDeviceOnline: (deviceId) => {
          const device = get().getDeviceById(deviceId);
          return device?.deviceInfo?.status === DeviceStatus.Online;
        },

        getDeviceCount: () => {
          return get().devices.length;
        },

        reset: () => {
          set(initialState);
        },
      }),
      {
        name: 't3000-device-store',
        partialize: (state) => ({
          selectedDevice: state.selectedDevice,
          // Don't persist devices list - reload from server
        }),
      }
    ),
    {
      name: 'DeviceStore',
    }
  )
);

// Selectors for common queries
export const deviceSelectors = {
  selectedDevice: (state: DeviceState) => state.selectedDevice,
  selectedDeviceId: (state: DeviceState) => state.selectedDevice?.id,
  devices: (state: DeviceState) => state.devices,
  isLoading: (state: DeviceState) => state.isLoading,
  error: (state: DeviceState) => state.error,
  hasSelection: (state: DeviceState) => state.selectedDevice !== null,
  onlineDevices: (state: DeviceState) => state.devices.filter(d => d.deviceInfo?.status === DeviceStatus.Online),
  offlineDevices: (state: DeviceState) => state.devices.filter(d => d.deviceInfo?.status !== DeviceStatus.Online),
};
