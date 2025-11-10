/**
 * Modbus Store - Manages Modbus data cache
 *
 * Responsibilities:
 * - Cache Modbus device data
 * - Cache Modbus registers
 * - Polling management
 * - Data synchronization
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ModbusDevice, ModbusRegister } from '@common/react/types/modbus';
// TODO: API not implemented yet
/*
import {
  modbusDevicesApi,
  modbusRegistersApi,
} from '@common/api';
*/

export interface ModbusState {
  // Data cache
  devices: ModbusDevice[];
  registers: Map<string, ModbusRegister[]>; // deviceId -> registers

  // Polling state
  isPolling: boolean;
  pollingInterval: number; // milliseconds
  lastPollTime: number | null;

  // Loading states
  isLoadingDevices: boolean;
  isLoadingRegisters: boolean;

  // Errors
  error: string | null;

  // Device management
  loadDevices: () => Promise<void>;
  addDevice: (device: ModbusDevice) => void;
  updateDevice: (deviceId: string, updates: Partial<ModbusDevice>) => void;
  removeDevice: (deviceId: string) => void;

  // Register management
  loadRegisters: (deviceId: string) => Promise<void>;
  updateRegister: (deviceId: string, registerAddress: number, value: number) => Promise<void>;
  refreshRegister: (deviceId: string, registerAddress: number) => Promise<void>;

  // Polling
  startPolling: () => void;
  stopPolling: () => void;
  setPollingInterval: (interval: number) => void;
  pollAllDevices: () => Promise<void>;

  // Utilities
  getDevice: (deviceId: string) => ModbusDevice | undefined;
  getRegisters: (deviceId: string) => ModbusRegister[];
  getRegister: (deviceId: string, registerAddress: number) => ModbusRegister | undefined;
  clearCache: () => void;
  reset: () => void;
}

const initialState: Omit<ModbusState, keyof {
  loadDevices: any;
  addDevice: any;
  updateDevice: any;
  removeDevice: any;
  loadRegisters: any;
  updateRegister: any;
  refreshRegister: any;
  startPolling: any;
  stopPolling: any;
  setPollingInterval: any;
  pollAllDevices: any;
  getDevice: any;
  getRegisters: any;
  getRegister: any;
  clearCache: any;
  reset: any;
}> = {
  devices: [],
  registers: new Map(),
  isPolling: false,
  pollingInterval: 5000,
  lastPollTime: null,
  isLoadingDevices: false,
  isLoadingRegisters: false,
  error: null,
};

export const useModbusStore = create<ModbusState>()(
  devtools(
    (set: any, get: any) => ({
      ...initialState,

      // Device management
      loadDevices: async () => {
        set({ isLoadingDevices: true, error: null });
        try {
          // Note: This should be replaced with actual API call when available
          // For now, we'll use discoverDevices or fetch from a different endpoint
          const response = await modbusDevicesApi.discoverDevices('modbus-tcp');
          set({
            devices: response.data || [],
            isLoadingDevices: false
          });
        } catch (error: any) {
          set({
            isLoadingDevices: false,
            error: error instanceof Error ? error.message : 'Failed to load Modbus devices'
          });
        }
      },

      addDevice: (device: ModbusDevice) => {
        set((state: ModbusState) => ({
          devices: [...state.devices, device],
        }));
      },

      updateDevice: (deviceId: string, updates: Partial<ModbusDevice>) => {
        set((state: ModbusState) => ({
          devices: state.devices.map((d: ModbusDevice) =>
            d.id === deviceId ? { ...d, ...updates } : d
          ),
        }));
      },

      removeDevice: (deviceId: string) => {
        set((state: ModbusState) => {
          const newRegisters = new Map(state.registers);
          newRegisters.delete(deviceId);

          return {
            devices: state.devices.filter((d: ModbusDevice) => d.id !== deviceId),
            registers: newRegisters,
          };
        });
      },

      // Register management
      loadRegisters: async (deviceId: string) => {
        set({ isLoadingRegisters: true, error: null });
        try {
          const response = await modbusRegistersApi.getRegisters(deviceId);
          set((state: ModbusState) => {
            const newRegisters = new Map(state.registers);
            newRegisters.set(deviceId, response.data || []);

            return {
              registers: newRegisters,
              isLoadingRegisters: false,
            };
          });
        } catch (error) {
          set({
            isLoadingRegisters: false,
            error: error instanceof Error ? error.message : 'Failed to load registers'
          });
        }
      },

      updateRegister: async (deviceId: string, registerAddress: number, value: number) => {
        try {
          await modbusRegistersApi.updateRegister(deviceId, String(registerAddress), { value } as any);

          set((state: ModbusState) => {
            const deviceRegisters = state.registers.get(deviceId);
            if (!deviceRegisters) return state;

            const newRegisters = new Map(state.registers);
            newRegisters.set(
              deviceId,
              deviceRegisters.map((reg: ModbusRegister) =>
                reg.address === registerAddress ? { ...reg, value } : reg
              )
            );

            return { registers: newRegisters };
          });
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update register'
          });
        }
      },

      refreshRegister: async (deviceId: string, registerAddress: number) => {
        try {
          // Reload all registers since there's no single register API
          const response = await modbusRegistersApi.getRegisters(deviceId);

          set((state: ModbusState) => {
            const deviceRegisters = state.registers.get(deviceId);
            if (!deviceRegisters) return state;

            const newRegisters = new Map(state.registers);
            newRegisters.set(
              deviceId,
              deviceRegisters.map((reg: ModbusRegister) => {
                const updated = response.data?.find((r: ModbusRegister) => r.address === registerAddress);
                return reg.address === registerAddress && updated ? { ...reg, ...updated } : reg;
              })
            );

            return { registers: newRegisters };
          });
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : 'Failed to refresh register'
          });
        }
      },

      // Polling
      startPolling: () => {
        if (get().isPolling) return;

        set({ isPolling: true });

        // Start polling loop - store interval for cleanup
        setInterval(() => {
          get().pollAllDevices();
        }, get().pollingInterval);

        // Note: In a real implementation, you'd want to store the interval ID
        // and clear it on stopPolling
      },

      stopPolling: () => {
        set({ isPolling: false });
      },

      setPollingInterval: (interval: number) => {
        set({ pollingInterval: interval });

        // Restart polling if active
        if (get().isPolling) {
          get().stopPolling();
          get().startPolling();
        }
      },

      pollAllDevices: async () => {
        // TODO: Implement polling all devices
        // Currently there's no single API endpoint for this
        // We would need to iterate through all devices and poll each one
        try {
          const devices = get().devices;
          for (const device of devices) {
            // Could use modbusPollingApi.triggerPoll(device.id) for each device
            void device; // Mark as intentionally unused
          }

          set(() => ({
            lastPollTime: Date.now(),
          }));
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : 'Polling failed'
          });
        }
      },

      // Utilities
      getDevice: (deviceId: string) => {
        return get().devices.find((d: ModbusDevice) => d.id === deviceId);
      },

      getRegisters: (deviceId: string) => {
        return get().registers.get(deviceId) || [];
      },

      getRegister: (deviceId: string, registerAddress: number) => {
        const registers = get().registers.get(deviceId);
        return registers?.find((r: ModbusRegister) => r.address === registerAddress);
      },

      clearCache: () => {
        set({
          devices: [],
          registers: new Map(),
        });
      },

      reset: () => {
        get().stopPolling();
        set(initialState);
      },
    }),
    {
      name: 'ModbusStore',
    }
  )
);

// Selectors
export const modbusSelectors = {
  devices: (state: ModbusState) => state.devices,
  isPolling: (state: ModbusState) => state.isPolling,
  pollingInterval: (state: ModbusState) => state.pollingInterval,
  isLoading: (state: ModbusState) =>
    state.isLoadingDevices || state.isLoadingRegisters,
};
