/**
 * Devices API
 * General device management operations
 */

import { api } from './client';
import type { ApiResponse, TreeNode, DeviceInfo, DeviceStatus } from '../types';

export interface DeviceListRequest {
  buildingId?: string;
  protocol?: string;
  status?: DeviceStatus;
  productType?: number;
}

export interface AddDeviceRequest {
  name: string;
  ipAddress: string;
  port: number;
  protocol: string;
  serialNumber?: string;
  buildingId?: string;
  parentId?: string; // Parent node in tree
}

export interface UpdateDeviceRequest {
  id: string;
  name?: string;
  ipAddress?: string;
  port?: number;
  buildingId?: string;
  parentId?: string;
}

/**
 * Get device tree structure
 */
export async function getDeviceTree(buildingId?: string): Promise<ApiResponse<TreeNode[]>> {
  return api.get<TreeNode[]>('/devices/tree', {
    params: buildingId ? { buildingId } : undefined,
    useLocalApi: true,
  });
}

/**
 * Get all devices
 */
export async function getDevices(filters?: DeviceListRequest): Promise<ApiResponse<TreeNode[]>> {
  return api.get<TreeNode[]>('/devices', {
    params: filters,
    useLocalApi: true,
  });
}

/**
 * Get device by ID
 */
export async function getDeviceById(id: string): Promise<ApiResponse<TreeNode>> {
  return api.get<TreeNode>(`/devices/${id}`, {
    useLocalApi: true,
  });
}

/**
 * Get device information
 */
export async function getDeviceInfo(id: string): Promise<ApiResponse<DeviceInfo>> {
  return api.get<DeviceInfo>(`/devices/${id}/info`, {
    useLocalApi: true,
  });
}

/**
 * Add new device
 */
export async function addDevice(data: AddDeviceRequest): Promise<ApiResponse<TreeNode>> {
  return api.post<TreeNode>('/devices', data, {
    useLocalApi: true,
  });
}

/**
 * Update device
 */
export async function updateDevice(data: UpdateDeviceRequest): Promise<ApiResponse<TreeNode>> {
  const { id, ...updateData } = data;
  return api.put<TreeNode>(`/devices/${id}`, updateData, {
    useLocalApi: true,
  });
}

/**
 * Delete device
 */
export async function deleteDevice(id: string): Promise<ApiResponse<void>> {
  return api.delete<void>(`/devices/${id}`, {
    useLocalApi: true,
  });
}

/**
 * Rename device
 */
export async function renameDevice(id: string, name: string): Promise<ApiResponse<TreeNode>> {
  return api.patch<TreeNode>(`/devices/${id}/rename`, { name }, {
    useLocalApi: true,
  });
}

/**
 * Connect to device
 */
export async function connectDevice(id: string): Promise<ApiResponse<{ connected: boolean }>> {
  return api.post<{ connected: boolean }>(`/devices/${id}/connect`, null, {
    useLocalApi: true,
  });
}

/**
 * Disconnect from device
 */
export async function disconnectDevice(id: string): Promise<ApiResponse<void>> {
  return api.post<void>(`/devices/${id}/disconnect`, null, {
    useLocalApi: true,
  });
}

/**
 * Refresh device data
 */
export async function refreshDevice(id: string): Promise<ApiResponse<TreeNode>> {
  return api.post<TreeNode>(`/devices/${id}/refresh`, null, {
    useLocalApi: true,
  });
}

/**
 * Get device connection status
 */
export async function getDeviceStatus(id: string): Promise<ApiResponse<DeviceStatus>> {
  return api.get<DeviceStatus>(`/devices/${id}/status`, {
    useLocalApi: true,
  });
}
