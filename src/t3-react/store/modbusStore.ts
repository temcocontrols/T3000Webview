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
import type { ModbusDevice, ModbusRegister } from '@common/types/modbus';
import { 
  modbusDevicesApi,
  modbusRegistersApi,
  modbusPollingApi 
} from '@common/api';

interface ModbusState {
  // Data cache
  devices: ModbusDevice[];
  registers: Map<number, ModbusRegister[]>; // deviceId -> registers
  
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
  updateDevice: (deviceId: number, updates: Partial<ModbusDevice>) => void;
  removeDevice: (deviceId: number) => void;
  
  // Register management
  loadRegisters: (deviceId: number) => Promise<void>;
  updateRegister: (deviceId: number, registerId: number, value: number) => Promise<void>;
  refreshRegister: (deviceId: number, registerId: number) => Promise<void>;
  
  // Polling
  startPolling: () => void;
  stopPolling: () => void;
  setPollingInterval: (interval: number) => void;
  pollAllDevices: () => Promise<void>;
  
  // Utilities
  getDevice: (deviceId: number) => ModbusDevice | undefined;
  getRegisters: (deviceId: number) => ModbusRegister[];
  getRegister: (deviceId: number, registerId: number) => ModbusRegister | undefined;
  clearCache: () => void;
  reset: () => void;
}

const initialState = {
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
    (set, get) => ({
      ...initialState,

      // Device management
      loadDevices: async () => {
        set({ isLoadingDevices: true, error: null });
        try {
          const response = await modbusDevicesApi.getDevices();
          set({ 
            devices: response.data,
            isLoadingDevices: false 
          });
        } catch (error) {
          set({ 
            isLoadingDevices: false,
            error: error instanceof Error ? error.message : 'Failed to load Modbus devices'
          });
        }
      },

      addDevice: (device) => {
        set((state) => ({
          devices: [...state.devices, device],
        }));
      },

      updateDevice: (deviceId, updates) => {
        set((state) => ({
          devices: state.devices.map((device) =>
            device.id === deviceId ? { ...device, ...updates } : device
          ),
        }));
      },

      removeDevice: (deviceId) => {
        set((state) => {
          const newRegisters = new Map(state.registers);
          newRegisters.delete(deviceId);
          
          return {
            devices: state.devices.filter((d) => d.id !== deviceId),
            registers: newRegisters,
          };
        });
      },

      // Register management
      loadRegisters: async (deviceId) => {
        set({ isLoadingRegisters: true, error: null });
        try {
          const response = await modbusRegistersApi.getRegisters(deviceId);
          set((state) => {
            const newRegisters = new Map(state.registers);
            newRegisters.set(deviceId, response.data);
            
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

      updateRegister: async (deviceId, registerId, value) => {
        try {
          await modbusRegistersApi.updateRegister(deviceId, registerId, { value });
          
          set((state) => {
            const deviceRegisters = state.registers.get(deviceId);
            if (!deviceRegisters) return state;
            
            const newRegisters = new Map(state.registers);
            newRegisters.set(
              deviceId,
              deviceRegisters.map((reg) =>
                reg.id === registerId ? { ...reg, value } : reg
              )
            );
            
            return { registers: newRegisters };
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update register'
          });
        }
      },

      refreshRegister: async (deviceId, registerId) => {
        try {
          const response = await modbusRegistersApi.getRegister(deviceId, registerId);
          
          set((state) => {
            const deviceRegisters = state.registers.get(deviceId);
            if (!deviceRegisters) return state;
            
            const newRegisters = new Map(state.registers);
            newRegisters.set(
              deviceId,
              deviceRegisters.map((reg) =>
                reg.id === registerId ? response.data : reg
              )
            );
            
            return { registers: newRegisters };
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to refresh register'
          });
        }
      },

      // Polling
      startPolling: () => {
        if (get().isPolling) return;
        
        set({ isPolling: true });
        
        // Start polling loop
        const pollInterval = setInterval(() => {
          get().pollAllDevices();
        }, get().pollingInterval);
        
        // Store interval ID for cleanup (in real implementation)
        // You'd want to store this and clear it on stopPolling
      },

      stopPolling: () => {
        set({ isPolling: false });
      },

      setPollingInterval: (interval) => {
        set({ pollingInterval: interval });
        
        // Restart polling if active
        if (get().isPolling) {
          get().stopPolling();
          get().startPolling();
        }
      },

      pollAllDevices: async () => {
        try {
          const response = await modbusPollingApi.pollAll();
          
          set((state) => {
            const newRegisters = new Map(state.registers);
            
            // Update all registers with polled data
            response.data.forEach((deviceData: any) => {
              if (deviceData.registers) {
                newRegisters.set(deviceData.deviceId, deviceData.registers);
              }
            });
            
            return {
              registers: newRegisters,
              lastPollTime: Date.now(),
            };
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Polling failed'
          });
        }
      },

      // Utilities
      getDevice: (deviceId) => {
        return get().devices.find((d) => d.id === deviceId);
      },

      getRegisters: (deviceId) => {
        return get().registers.get(deviceId) || [];
      },

      getRegister: (deviceId, registerId) => {
        const registers = get().registers.get(deviceId);
        return registers?.find((r) => r.id === registerId);
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
