/**
 * Store Index - Central export for all Zustand stores
 *
 * Re-exports all stores and selectors for easy importing
 */

// Device Stores (from features/devices)
export { useDeviceStore, deviceSelectors } from '../features/devices/store/deviceStore';
export type { DeviceState } from '../features/devices/store/deviceStore';

export { useDeviceTreeStore } from '../features/devices/store/deviceTreeStore';
export type { default as DeviceTreeState } from '../features/devices/store/deviceTreeStore';

// Tree Store (shared navigation)
export { useTreeStore, treeSelectors } from './treeStore';
export type { TreeState } from './treeStore';

// BACnet Store (from features/bacnet)
export { useBacnetStore, bacnetSelectors } from '../features/bacnet/store/bacnetStore';
export type { BacnetState } from '../features/bacnet/store/bacnetStore';

// Modbus Store (from features/modbus)
export { useModbusStore, modbusSelectors } from '../features/modbus/store/modbusStore';
export type { ModbusState } from '../features/modbus/store/modbusStore';

// Alarm Store (from features/alarms)
export { useAlarmStore, alarmSelectors } from '../features/alarms/store/alarmStore';
export type { AlarmState } from '../features/alarms/store/alarmStore';

// Trend Store (from features/trendlogs)
export { useTrendStore, trendSelectors } from '../features/trendlogs/store/trendStore';
export type { TrendState } from '../features/trendlogs/store/trendStore';

// Global UI Stores (remain in store/)
export { useUIStore, uiSelectors } from './uiStore';
export type { UiState } from './uiStore';

export { useAuthStore, authSelectors } from './authStore';
export type { AuthState } from './authStore';

export { useStatusBarStore } from './statusBarStore';
export type { StatusBarState } from './statusBarStore';
