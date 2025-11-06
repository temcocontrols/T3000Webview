/**
 * BACnet Schedules API
 * Weekly and exception schedule management
 */

import { api } from '../client';
import type { ApiResponse, BACnetWeeklySchedule } from '../../types';

/**
 * Get all schedules for a device
 */
export async function getSchedules(deviceId: string): Promise<ApiResponse<BACnetWeeklySchedule[]>> {
  return api.get<BACnetWeeklySchedule[]>(`/bacnet/devices/${deviceId}/schedules`, {
    useLocalApi: true,
  });
}

/**
 * Get single schedule
 */
export async function getSchedule(
  deviceId: string,
  scheduleId: number
): Promise<ApiResponse<BACnetWeeklySchedule>> {
  return api.get<BACnetWeeklySchedule>(`/bacnet/devices/${deviceId}/schedules/${scheduleId}`, {
    useLocalApi: true,
  });
}

/**
 * Update schedule configuration
 */
export async function updateSchedule(
  deviceId: string,
  scheduleId: number,
  data: Partial<BACnetWeeklySchedule>
): Promise<ApiResponse<BACnetWeeklySchedule>> {
  return api.put<BACnetWeeklySchedule>(
    `/bacnet/devices/${deviceId}/schedules/${scheduleId}`,
    data,
    { useLocalApi: true }
  );
}

/**
 * Upload schedule to device
 */
export async function uploadSchedule(
  deviceId: string,
  scheduleId: number,
  schedule: BACnetWeeklySchedule
): Promise<ApiResponse<{ success: boolean }>> {
  return api.post<{ success: boolean }>(
    `/bacnet/devices/${deviceId}/schedules/${scheduleId}/upload`,
    schedule,
    { useLocalApi: true }
  );
}

/**
 * Download schedule from device
 */
export async function downloadSchedule(
  deviceId: string,
  scheduleId: number
): Promise<ApiResponse<BACnetWeeklySchedule>> {
  return api.get<BACnetWeeklySchedule>(
    `/bacnet/devices/${deviceId}/schedules/${scheduleId}/download`,
    { useLocalApi: true }
  );
}

/**
 * Enable/disable schedule
 */
export async function setScheduleEnabled(
  deviceId: string,
  scheduleId: number,
  enabled: boolean
): Promise<ApiResponse<BACnetWeeklySchedule>> {
  return api.post<BACnetWeeklySchedule>(
    `/bacnet/devices/${deviceId}/schedules/${scheduleId}/${enabled ? 'enable' : 'disable'}`,
    null,
    { useLocalApi: true }
  );
}

/**
 * Copy schedule to another slot
 */
export async function copySchedule(
  deviceId: string,
  sourceScheduleId: number,
  targetScheduleId: number
): Promise<ApiResponse<BACnetWeeklySchedule>> {
  return api.post<BACnetWeeklySchedule>(
    `/bacnet/devices/${deviceId}/schedules/${sourceScheduleId}/copy`,
    { targetScheduleId },
    { useLocalApi: true }
  );
}
