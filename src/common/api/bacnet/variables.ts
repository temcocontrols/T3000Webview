/**
 * BACnet Variables API
 * Read and write BACnet variable points
 */

import { api } from '../client';
import type { ApiResponse, VariablePoint } from '../../types';

/**
 * Get all variable points for a device
 */
export async function getVariables(deviceId: string): Promise<ApiResponse<VariablePoint[]>> {
  return api.get<VariablePoint[]>(`/bacnet/devices/${deviceId}/variables`, {
    useLocalApi: true,
  });
}

/**
 * Get single variable point
 */
export async function getVariable(
  deviceId: string,
  pointId: number
): Promise<ApiResponse<VariablePoint>> {
  return api.get<VariablePoint>(`/bacnet/devices/${deviceId}/variables/${pointId}`, {
    useLocalApi: true,
  });
}

/**
 * Update variable point configuration
 */
export async function updateVariable(
  deviceId: string,
  pointId: number,
  data: Partial<VariablePoint>
): Promise<ApiResponse<VariablePoint>> {
  return api.put<VariablePoint>(
    `/bacnet/devices/${deviceId}/variables/${pointId}`,
    data,
    { useLocalApi: true }
  );
}

/**
 * Write variable value
 */
export async function writeVariableValue(
  deviceId: string,
  pointId: number,
  value: number
): Promise<ApiResponse<{ success: boolean; value: number }>> {
  return api.post<{ success: boolean; value: number }>(
    `/bacnet/devices/${deviceId}/variables/${pointId}/write`,
    { value },
    { useLocalApi: true }
  );
}

/**
 * Read variable value
 */
export async function readVariableValue(
  deviceId: string,
  pointId: number
): Promise<ApiResponse<{ value: number; timestamp: Date }>> {
  return api.get<{ value: number; timestamp: Date }>(
    `/bacnet/devices/${deviceId}/variables/${pointId}/value`,
    { useLocalApi: true }
  );
}

/**
 * Batch read multiple variable values
 */
export async function readVariableValues(
  deviceId: string,
  pointIds: number[]
): Promise<ApiResponse<Array<{ pointId: number; value: number; timestamp: Date }>>> {
  return api.post<Array<{ pointId: number; value: number; timestamp: Date }>>(
    `/bacnet/devices/${deviceId}/variables/batch-read`,
    { pointIds },
    { useLocalApi: true }
  );
}

/**
 * Batch write multiple variable values
 */
export async function writeVariableValues(
  deviceId: string,
  writes: Array<{ pointId: number; value: number }>
): Promise<ApiResponse<Array<{ pointId: number; success: boolean; value: number }>>> {
  return api.post<Array<{ pointId: number; success: boolean; value: number }>>(
    `/bacnet/devices/${deviceId}/variables/batch-write`,
    { writes },
    { useLocalApi: true }
  );
}
