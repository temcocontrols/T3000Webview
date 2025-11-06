/**
 * API Index
 * Central export point for all API modules
 */

// Core API client
export { api, auth, liveApiClient, localApiClient } from './client';

// Authentication
export * as authApi from './auth';

// Buildings
export * as buildingsApi from './buildings';

// Network
export * as networkApi from './network';

// Devices
export * as devicesApi from './devices';

// BACnet APIs
export * as bacnetInputsApi from './bacnet/inputs';
export * as bacnetOutputsApi from './bacnet/outputs';
export * as bacnetVariablesApi from './bacnet/variables';
export * as bacnetProgramsApi from './bacnet/programs';
export * as bacnetControllersApi from './bacnet/controllers';
export * as bacnetSchedulesApi from './bacnet/schedules';
export * as bacnetTrendsApi from './bacnet/trends';
export * as bacnetAlarmsApi from './bacnet/alarms';
export * as bacnetGraphicsApi from './bacnet/graphics';
export * as bacnetDevicesApi from './bacnet/devices';

// Modbus APIs
export * as modbusDevicesApi from './modbus/devices';
export * as modbusRegistersApi from './modbus/registers';
export * as modbusPollingApi from './modbus/polling';
