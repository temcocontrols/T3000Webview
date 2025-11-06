/**
 * Modbus Polling API
 * Configure and manage Modbus register polling
 */

import { api } from '../client';
import type { ApiResponse, ModbusPollingConfig } from '../../types';

export interface PollingGroup {
  id: string;
  name: string;
  deviceId: string;
  enabled: boolean;
  interval: number; // milliseconds
  registers: Array<{
    address: number;
    count: number;
    registerType: 'holding' | 'input' | 'coil' | 'discrete';
  }>;
  lastPollTime?: Date;
  successCount: number;
  errorCount: number;
}

export interface PollingStatistics {
  totalPolls: number;
  successfulPolls: number;
  failedPolls: number;
  averageResponseTime: number; // milliseconds
  lastPollTime?: Date;
  errorRate: number; // percentage
}

/**
 * Get polling configuration for a device
 */
export async function getPollingConfig(deviceId: string): Promise<ApiResponse<ModbusPollingConfig>> {
  return api.get<ModbusPollingConfig>(`/modbus/devices/${deviceId}/polling/config`, {
    useLocalApi: true,
  });
}

/**
 * Update polling configuration
 */
export async function updatePollingConfig(
  deviceId: string,
  config: Partial<ModbusPollingConfig>
): Promise<ApiResponse<ModbusPollingConfig>> {
  return api.put<ModbusPollingConfig>(
    `/modbus/devices/${deviceId}/polling/config`,
    config,
    { useLocalApi: true }
  );
}

/**
 * Get all polling groups for a device
 */
export async function getPollingGroups(deviceId: string): Promise<ApiResponse<PollingGroup[]>> {
  return api.get<PollingGroup[]>(`/modbus/devices/${deviceId}/polling/groups`, {
    useLocalApi: true,
  });
}

/**
 * Create polling group
 */
export async function createPollingGroup(
  deviceId: string,
  group: Omit<PollingGroup, 'id' | 'lastPollTime' | 'successCount' | 'errorCount'>
): Promise<ApiResponse<PollingGroup>> {
  return api.post<PollingGroup>(`/modbus/devices/${deviceId}/polling/groups`, group, {
    useLocalApi: true,
  });
}

/**
 * Update polling group
 */
export async function updatePollingGroup(
  deviceId: string,
  groupId: string,
  updates: Partial<PollingGroup>
): Promise<ApiResponse<PollingGroup>> {
  return api.put<PollingGroup>(
    `/modbus/devices/${deviceId}/polling/groups/${groupId}`,
    updates,
    { useLocalApi: true }
  );
}

/**
 * Delete polling group
 */
export async function deletePollingGroup(
  deviceId: string,
  groupId: string
): Promise<ApiResponse<void>> {
  return api.delete<void>(`/modbus/devices/${deviceId}/polling/groups/${groupId}`, {
    useLocalApi: true,
  });
}

/**
 * Start polling for a device
 */
export async function startPolling(deviceId: string): Promise<ApiResponse<{ started: boolean }>> {
  return api.post<{ started: boolean }>(`/modbus/devices/${deviceId}/polling/start`, null, {
    useLocalApi: true,
  });
}

/**
 * Stop polling for a device
 */
export async function stopPolling(deviceId: string): Promise<ApiResponse<{ stopped: boolean }>> {
  return api.post<{ stopped: boolean }>(`/modbus/devices/${deviceId}/polling/stop`, null, {
    useLocalApi: true,
  });
}

/**
 * Start polling for specific group
 */
export async function startPollingGroup(
  deviceId: string,
  groupId: string
): Promise<ApiResponse<{ started: boolean }>> {
  return api.post<{ started: boolean }>(
    `/modbus/devices/${deviceId}/polling/groups/${groupId}/start`,
    null,
    { useLocalApi: true }
  );
}

/**
 * Stop polling for specific group
 */
export async function stopPollingGroup(
  deviceId: string,
  groupId: string
): Promise<ApiResponse<{ stopped: boolean }>> {
  return api.post<{ stopped: boolean }>(
    `/modbus/devices/${deviceId}/polling/groups/${groupId}/stop`,
    null,
    { useLocalApi: true }
  );
}

/**
 * Get polling statistics
 */
export async function getPollingStatistics(
  deviceId: string,
  groupId?: string
): Promise<ApiResponse<PollingStatistics>> {
  const url = groupId
    ? `/modbus/devices/${deviceId}/polling/groups/${groupId}/statistics`
    : `/modbus/devices/${deviceId}/polling/statistics`;

  return api.get<PollingStatistics>(url, {
    useLocalApi: true,
  });
}

/**
 * Reset polling statistics
 */
export async function resetPollingStatistics(
  deviceId: string,
  groupId?: string
): Promise<ApiResponse<{ reset: boolean }>> {
  const url = groupId
    ? `/modbus/devices/${deviceId}/polling/groups/${groupId}/reset-statistics`
    : `/modbus/devices/${deviceId}/polling/reset-statistics`;

  return api.post<{ reset: boolean }>(url, null, {
    useLocalApi: true,
  });
}

/**
 * Trigger immediate poll (bypass interval)
 */
export async function triggerPoll(
  deviceId: string,
  groupId?: string
): Promise<ApiResponse<{ polled: boolean; values?: any[] }>> {
  const url = groupId
    ? `/modbus/devices/${deviceId}/polling/groups/${groupId}/poll-now`
    : `/modbus/devices/${deviceId}/polling/poll-now`;

  return api.post<{ polled: boolean; values?: any[] }>(url, null, {
    useLocalApi: true,
  });
}
