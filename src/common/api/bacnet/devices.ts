/**
 * BACnet Devices API
 * BACnet device discovery and management
 */

import { api } from '../client';
import type { ApiResponse, DeviceInfo, TreeNode } from '../../types';

export interface BacnetDeviceInfo extends DeviceInfo {
  objectIdentifier: number;
  modelName: string;
  vendorName: string;
  vendorIdentifier: number;
  segmentationSupported: string;
  maxApduLength: number;
  apduTimeout: number;
  numberOfApduRetries: number;
  deviceAddressBinding?: Array<{
    deviceIdentifier: number;
    networkNumber: number;
    macAddress: string;
  }>;
}

/**
 * Discover BACnet devices on network
 */
export async function discoverDevices(): Promise<ApiResponse<TreeNode[]>> {
  return api.post<TreeNode[]>(
    '/bacnet/discover',
    null,
    { useLocalApi: true, timeout: 30000 }
  );
}

/**
 * Get BACnet device information
 */
export async function getDeviceInfo(deviceId: string): Promise<ApiResponse<BacnetDeviceInfo>> {
  return api.get<BacnetDeviceInfo>(`/bacnet/devices/${deviceId}/info`, {
    useLocalApi: true,
  });
}

/**
 * Read device object property
 */
export async function readDeviceProperty(
  deviceId: string,
  propertyId: string
): Promise<ApiResponse<{ value: any; type: string }>> {
  return api.get<{ value: any; type: string }>(
    `/bacnet/devices/${deviceId}/properties/${propertyId}`,
    { useLocalApi: true }
  );
}

/**
 * Write device object property
 */
export async function writeDeviceProperty(
  deviceId: string,
  propertyId: string,
  value: any
): Promise<ApiResponse<{ success: boolean }>> {
  return api.post<{ success: boolean }>(
    `/bacnet/devices/${deviceId}/properties/${propertyId}`,
    { value },
    { useLocalApi: true }
  );
}

/**
 * Synchronize device time
 */
export async function syncDeviceTime(
  deviceId: string,
  dateTime?: Date
): Promise<ApiResponse<{ success: boolean; deviceTime: Date }>> {
  return api.post<{ success: boolean; deviceTime: Date }>(
    `/bacnet/devices/${deviceId}/sync-time`,
    { dateTime: dateTime?.toISOString() || new Date().toISOString() },
    { useLocalApi: true }
  );
}

/**
 * Reboot device
 */
export async function rebootDevice(
  deviceId: string,
  password?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return api.post<{ success: boolean }>(
    `/bacnet/devices/${deviceId}/reboot`,
    { password },
    { useLocalApi: true }
  );
}

/**
 * Backup device configuration
 */
export async function backupDevice(
  deviceId: string
): Promise<ApiResponse<{ backupData: string; timestamp: Date }>> {
  return api.post<{ backupData: string; timestamp: Date }>(
    `/bacnet/devices/${deviceId}/backup`,
    null,
    { useLocalApi: true, timeout: 60000 }
  );
}

/**
 * Restore device configuration
 */
export async function restoreDevice(
  deviceId: string,
  backupData: string
): Promise<ApiResponse<{ success: boolean }>> {
  return api.post<{ success: boolean }>(
    `/bacnet/devices/${deviceId}/restore`,
    { backupData },
    { useLocalApi: true, timeout: 60000 }
  );
}

/**
 * Get device object list
 */
export async function getDeviceObjectList(
  deviceId: string
): Promise<ApiResponse<Array<{ type: string; instance: number; name: string }>>> {
  return api.get<Array<{ type: string; instance: number; name: string }>>(
    `/bacnet/devices/${deviceId}/objects`,
    { useLocalApi: true }
  );
}
