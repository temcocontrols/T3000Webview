/**
 * Modbus Devices API
 * Modbus device discovery and management
 */

import { api } from '../client';
import type { ApiResponse, TreeNode } from '../../types';

export interface ModbusDeviceInfo {
  id: string;
  name: string;
  address: number; // Modbus slave address (1-247)
  ipAddress?: string; // For Modbus TCP
  port?: number; // For Modbus TCP
  serialPort?: string; // For Modbus RTU
  baudRate?: number; // For Modbus RTU
  parity?: 'none' | 'even' | 'odd';
  stopBits?: 1 | 2;
  dataBits?: 7 | 8;
  protocol: 'modbus-tcp' | 'modbus-rtu';
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  online: boolean;
}

/**
 * Discover Modbus devices on network/serial
 */
export async function discoverDevices(
  protocol: 'modbus-tcp' | 'modbus-rtu',
  config?: {
    startAddress?: number;
    endAddress?: number;
    ipRange?: { start: string; end: string };
    port?: number;
    serialPort?: string;
    baudRate?: number;
  }
): Promise<ApiResponse<TreeNode[]>> {
  return api.post<TreeNode[]>(
    '/modbus/discover',
    { protocol, ...config },
    { useLocalApi: true, timeout: 60000 }
  );
}

/**
 * Get Modbus device information
 */
export async function getDeviceInfo(deviceId: string): Promise<ApiResponse<ModbusDeviceInfo>> {
  return api.get<ModbusDeviceInfo>(`/modbus/devices/${deviceId}/info`, {
    useLocalApi: true,
  });
}

/**
 * Add Modbus device
 */
export async function addDevice(
  deviceInfo: Omit<ModbusDeviceInfo, 'id' | 'online'>
): Promise<ApiResponse<TreeNode>> {
  return api.post<TreeNode>('/modbus/devices', deviceInfo, {
    useLocalApi: true,
  });
}

/**
 * Update Modbus device configuration
 */
export async function updateDevice(
  deviceId: string,
  updates: Partial<ModbusDeviceInfo>
): Promise<ApiResponse<ModbusDeviceInfo>> {
  return api.put<ModbusDeviceInfo>(`/modbus/devices/${deviceId}`, updates, {
    useLocalApi: true,
  });
}

/**
 * Delete Modbus device
 */
export async function deleteDevice(deviceId: string): Promise<ApiResponse<void>> {
  return api.delete<void>(`/modbus/devices/${deviceId}`, {
    useLocalApi: true,
  });
}

/**
 * Test Modbus device connection
 */
export async function testConnection(
  deviceId: string
): Promise<ApiResponse<{ online: boolean; responseTime?: number }>> {
  return api.post<{ online: boolean; responseTime?: number }>(
    `/modbus/devices/${deviceId}/test`,
    null,
    { useLocalApi: true }
  );
}

/**
 * Get Modbus device status
 */
export async function getDeviceStatus(
  deviceId: string
): Promise<ApiResponse<{ online: boolean; lastSeen?: Date; errors?: number }>> {
  return api.get<{ online: boolean; lastSeen?: Date; errors?: number }>(
    `/modbus/devices/${deviceId}/status`,
    { useLocalApi: true }
  );
}
