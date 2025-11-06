/**
 * useModbusApi Hook
 * 
 * Provides convenient access to Modbus operations
 * Wraps modbusStore and API calls
 */

import { useCallback } from 'react';
import { useModbusStore, modbusSelectors } from '@t3-react/store';
import type { ModbusDevice, ModbusRegister } from '@common/types/modbus';

export function useModbusApi() {
  // State selectors
  const devices = useModbusStore(modbusSelectors.devices);
  const isPolling = useModbusStore(modbusSelectors.isPolling);
  const pollingInterval = useModbusStore(modbusSelectors.pollingInterval);
  const isLoading = useModbusStore(modbusSelectors.isLoading);

  const isLoadingDevices = useModbusStore((state) => state.isLoadingDevices);
  const isLoadingRegisters = useModbusStore((state) => state.isLoadingRegisters);
  const lastPollTime = useModbusStore((state) => state.lastPollTime);
  const error = useModbusStore((state) => state.error);

  // Actions - Device management
  const loadDevices = useModbusStore((state) => state.loadDevices);
  const addDevice = useModbusStore((state) => state.addDevice);
  const updateDevice = useModbusStore((state) => state.updateDevice);
  const removeDevice = useModbusStore((state) => state.removeDevice);

  // Actions - Register management
  const loadRegisters = useModbusStore((state) => state.loadRegisters);
  const updateRegister = useModbusStore((state) => state.updateRegister);
  const refreshRegister = useModbusStore((state) => state.refreshRegister);

  // Actions - Polling
  const startPolling = useModbusStore((state) => state.startPolling);
  const stopPolling = useModbusStore((state) => state.stopPolling);
  const setPollingInterval = useModbusStore((state) => state.setPollingInterval);
  const pollAllDevices = useModbusStore((state) => state.pollAllDevices);

  // Utilities
  const getDevice = useModbusStore((state) => state.getDevice);
  const getRegisters = useModbusStore((state) => state.getRegisters);
  const getRegister = useModbusStore((state) => state.getRegister);
  const clearCache = useModbusStore((state) => state.clearCache);

  // Helper functions
  const getDeviceById = useCallback(
    (deviceId: number): ModbusDevice | undefined => {
      return getDevice(deviceId);
    },
    [getDevice]
  );

  const getRegistersByDevice = useCallback(
    (deviceId: number): ModbusRegister[] => {
      return getRegisters(deviceId);
    },
    [getRegisters]
  );

  const getRegisterById = useCallback(
    (deviceId: number, registerId: number): ModbusRegister | undefined => {
      return getRegister(deviceId, registerId);
    },
    [getRegister]
  );

  const loadDeviceData = useCallback(
    async (deviceId: number) => {
      await loadRegisters(deviceId);
    },
    [loadRegisters]
  );

  const loadAllDeviceData = useCallback(
    async (deviceIds: number[]) => {
      await Promise.all(deviceIds.map((id) => loadRegisters(id)));
    },
    [loadRegisters]
  );

  const writeRegister = useCallback(
    async (deviceId: number, registerId: number, value: number) => {
      await updateRegister(deviceId, registerId, value);
    },
    [updateRegister]
  );

  const writeMultipleRegisters = useCallback(
    async (deviceId: number, updates: Array<{ registerId: number; value: number }>) => {
      await Promise.all(
        updates.map(({ registerId, value }) =>
          updateRegister(deviceId, registerId, value)
        )
      );
    },
    [updateRegister]
  );

  const togglePolling = useCallback(() => {
    if (isPolling) {
      stopPolling();
    } else {
      startPolling();
    }
  }, [isPolling, startPolling, stopPolling]);

  const getPollingStatus = useCallback(() => {
    return {
      isPolling,
      interval: pollingInterval,
      lastPollTime: lastPollTime ? new Date(lastPollTime) : null,
    };
  }, [isPolling, pollingInterval, lastPollTime]);

  return {
    // State
    devices,
    isPolling,
    pollingInterval,
    lastPollTime,
    isLoading,
    isLoadingDevices,
    isLoadingRegisters,
    error,

    // Device management
    loadDevices,
    addDevice,
    updateDevice,
    removeDevice,
    getDeviceById,

    // Register management
    loadRegisters,
    loadDeviceData,
    loadAllDeviceData,
    updateRegister,
    writeRegister,
    writeMultipleRegisters,
    refreshRegister,
    getRegistersByDevice,
    getRegisterById,

    // Polling
    startPolling,
    stopPolling,
    togglePolling,
    setPollingInterval,
    pollAllDevices,
    getPollingStatus,

    // Utilities
    clearCache,
  };
}
