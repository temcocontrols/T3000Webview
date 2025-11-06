/**
 * BACnet Alarms API
 * Alarm data retrieval and management
 */

import { api } from '../client';
import type { ApiResponse, AlarmData, AlarmRecord, AlarmFilter } from '../../types';

/**
 * Get all alarm configurations for a device
 */
export async function getAlarmConfigs(deviceId: string): Promise<ApiResponse<AlarmData[]>> {
  return api.get<AlarmData[]>(`/bacnet/devices/${deviceId}/alarms/config`, {
    useLocalApi: true,
  });
}

/**
 * Get single alarm configuration
 */
export async function getAlarmConfig(
  deviceId: string,
  alarmId: number
): Promise<ApiResponse<AlarmData>> {
  return api.get<AlarmData>(`/bacnet/devices/${deviceId}/alarms/config/${alarmId}`, {
    useLocalApi: true,
  });
}

/**
 * Update alarm configuration
 */
export async function updateAlarmConfig(
  deviceId: string,
  alarmId: number,
  data: Partial<AlarmData>
): Promise<ApiResponse<AlarmData>> {
  return api.put<AlarmData>(
    `/bacnet/devices/${deviceId}/alarms/config/${alarmId}`,
    data,
    { useLocalApi: true }
  );
}

/**
 * Get alarm records (alarm log)
 */
export async function getAlarmRecords(
  deviceId: string,
  filters?: AlarmFilter
): Promise<ApiResponse<AlarmRecord[]>> {
  return api.get<AlarmRecord[]>(
    `/bacnet/devices/${deviceId}/alarms/records`,
    {
      params: filters,
      useLocalApi: true,
    }
  );
}

/**
 * Get active alarms
 */
export async function getActiveAlarms(
  deviceId: string
): Promise<ApiResponse<AlarmRecord[]>> {
  return api.get<AlarmRecord[]>(
    `/bacnet/devices/${deviceId}/alarms/active`,
    { useLocalApi: true }
  );
}

/**
 * Acknowledge alarm
 */
export async function acknowledgeAlarm(
  deviceId: string,
  alarmId: number,
  recordId: string
): Promise<ApiResponse<AlarmRecord>> {
  return api.post<AlarmRecord>(
    `/bacnet/devices/${deviceId}/alarms/${alarmId}/acknowledge`,
    { recordId },
    { useLocalApi: true }
  );
}

/**
 * Clear alarm
 */
export async function clearAlarm(
  deviceId: string,
  alarmId: number,
  recordId: string
): Promise<ApiResponse<AlarmRecord>> {
  return api.post<AlarmRecord>(
    `/bacnet/devices/${deviceId}/alarms/${alarmId}/clear`,
    { recordId },
    { useLocalApi: true }
  );
}

/**
 * Enable/disable alarm
 */
export async function setAlarmEnabled(
  deviceId: string,
  alarmId: number,
  enabled: boolean
): Promise<ApiResponse<AlarmData>> {
  return api.post<AlarmData>(
    `/bacnet/devices/${deviceId}/alarms/${alarmId}/${enabled ? 'enable' : 'disable'}`,
    null,
    { useLocalApi: true }
  );
}

/**
 * Clear all alarms for device
 */
export async function clearAllAlarms(
  deviceId: string
): Promise<ApiResponse<{ cleared: number }>> {
  return api.post<{ cleared: number }>(
    `/bacnet/devices/${deviceId}/alarms/clear-all`,
    null,
    { useLocalApi: true }
  );
}

/**
 * Get alarm summary statistics
 */
export async function getAlarmSummary(
  deviceId: string
): Promise<ApiResponse<{
  total: number;
  active: number;
  acknowledged: number;
  unacknowledged: number;
  byPriority: Record<number, number>;
}>> {
  return api.get<{
    total: number;
    active: number;
    acknowledged: number;
    unacknowledged: number;
    byPriority: Record<number, number>;
  }>(
    `/bacnet/devices/${deviceId}/alarms/summary`,
    { useLocalApi: true }
  );
}
