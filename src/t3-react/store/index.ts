/**
 * Store Index - Central export for all Zustand stores
 *
 * Re-exports all stores and selectors for easy importing
 */

// Device Store
export { useDeviceStore, deviceSelectors } from './deviceStore';
export type { DeviceState } from './deviceStore';

// Tree Store
export { useTreeStore, treeSelectors } from './treeStore';
export type { TreeState } from './treeStore';

// BACnet Store
export { useBacnetStore, bacnetSelectors } from './bacnetStore';
export type { BacnetState } from './bacnetStore';

// UI Store
export { useUIStore, uiSelectors } from './uiStore';
export type { UiState } from './uiStore';

// Modbus Store
export { useModbusStore, modbusSelectors } from './modbusStore';
export type { ModbusState } from './modbusStore';

// Alarm Store
export { useAlarmStore, alarmSelectors } from './alarmStore';
export type { AlarmState } from './alarmStore';

// Trend Store
export { useTrendStore, trendSelectors } from './trendStore';
export type { TrendState } from './trendStore';

// Auth Store
export { useAuthStore, authSelectors } from './authStore';
export type { AuthState } from './authStore';

// Status Bar Store
export { useStatusBarStore } from './statusBarStore';
export type { StatusBarState } from './statusBarStore';

// Device Tree Store
export { useDeviceTreeStore } from './deviceTreeStore';
export type { default as DeviceTreeState } from './deviceTreeStore';
