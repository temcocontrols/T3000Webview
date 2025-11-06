/**
 * BACnet Inputs API
 * Read and write BACnet input points
 */

import { api } from '../client';
import type { ApiResponse, InputPoint } from '../../types';

/**
 * Get all input points for a device
 */
export async function getInputs(deviceId: string): Promise<ApiResponse<InputPoint[]>> {
  return api.get<InputPoint[]>(`/bacnet/devices/${deviceId}/inputs`, {
    useLocalApi: true,
  });
}

/**
 * Get single input point
 */
export async function getInput(
  deviceId: string,
  pointId: number
): Promise<ApiResponse<InputPoint>> {
  return api.get<InputPoint>(`/bacnet/devices/${deviceId}/inputs/${pointId}`, {
    useLocalApi: true,
  });
}

/**
 * Update input point configuration
 */
export async function updateInput(
  deviceId: string,
  pointId: number,
  data: Partial<InputPoint>
): Promise<ApiResponse<InputPoint>> {
  return api.put<InputPoint>(
    `/bacnet/devices/${deviceId}/inputs/${pointId}`,
    data,
    { useLocalApi: true }
  );
}

/**
 * Read input value (present value)
 */
export async function readInputValue(
  deviceId: string,
  pointId: number
): Promise<ApiResponse<{ value: number; timestamp: Date }>> {
  return api.get<{ value: number; timestamp: Date }>(
    `/bacnet/devices/${deviceId}/inputs/${pointId}/value`,
    { useLocalApi: true }
  );
}

/**
 * Batch read multiple input values
 */
export async function readInputValues(
  deviceId: string,
  pointIds: number[]
): Promise<ApiResponse<Array<{ pointId: number; value: number; timestamp: Date }>>> {
  return api.post<Array<{ pointId: number; value: number; timestamp: Date }>>(
    `/bacnet/devices/${deviceId}/inputs/batch-read`,
    { pointIds },
    { useLocalApi: true }
  );
}

/**
 * Calibrate input point
 */
export async function calibrateInput(
  deviceId: string,
  pointId: number,
  calibrationData: { offset?: number; gain?: number }
): Promise<ApiResponse<InputPoint>> {
  return api.post<InputPoint>(
    `/bacnet/devices/${deviceId}/inputs/${pointId}/calibrate`,
    calibrationData,
    { useLocalApi: true }
  );
}
