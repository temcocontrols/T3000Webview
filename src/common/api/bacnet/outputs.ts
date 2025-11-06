/**
 * BACnet Outputs API
 * Read and write BACnet output points
 */

import { api } from '../client';
import type { ApiResponse, OutputPoint } from '../../types';

/**
 * Get all output points for a device
 */
export async function getOutputs(deviceId: string): Promise<ApiResponse<OutputPoint[]>> {
  return api.get<OutputPoint[]>(`/bacnet/devices/${deviceId}/outputs`, {
    useLocalApi: true,
  });
}

/**
 * Get single output point
 */
export async function getOutput(
  deviceId: string,
  pointId: number
): Promise<ApiResponse<OutputPoint>> {
  return api.get<OutputPoint>(`/bacnet/devices/${deviceId}/outputs/${pointId}`, {
    useLocalApi: true,
  });
}

/**
 * Update output point configuration
 */
export async function updateOutput(
  deviceId: string,
  pointId: number,
  data: Partial<OutputPoint>
): Promise<ApiResponse<OutputPoint>> {
  return api.put<OutputPoint>(
    `/bacnet/devices/${deviceId}/outputs/${pointId}`,
    data,
    { useLocalApi: true }
  );
}

/**
 * Write output value (present value)
 */
export async function writeOutputValue(
  deviceId: string,
  pointId: number,
  value: number,
  priority?: number
): Promise<ApiResponse<{ success: boolean; value: number }>> {
  return api.post<{ success: boolean; value: number }>(
    `/bacnet/devices/${deviceId}/outputs/${pointId}/write`,
    { value, priority },
    { useLocalApi: true }
  );
}

/**
 * Read output value (present value)
 */
export async function readOutputValue(
  deviceId: string,
  pointId: number
): Promise<ApiResponse<{ value: number; timestamp: Date }>> {
  return api.get<{ value: number; timestamp: Date }>(
    `/bacnet/devices/${deviceId}/outputs/${pointId}/value`,
    { useLocalApi: true }
  );
}

/**
 * Batch write multiple output values
 */
export async function writeOutputValues(
  deviceId: string,
  writes: Array<{ pointId: number; value: number; priority?: number }>
): Promise<ApiResponse<Array<{ pointId: number; success: boolean; value: number }>>> {
  return api.post<Array<{ pointId: number; success: boolean; value: number }>>(
    `/bacnet/devices/${deviceId}/outputs/batch-write`,
    { writes },
    { useLocalApi: true }
  );
}

/**
 * Release output (clear priority)
 */
export async function releaseOutput(
  deviceId: string,
  pointId: number,
  priority: number
): Promise<ApiResponse<{ success: boolean }>> {
  return api.post<{ success: boolean }>(
    `/bacnet/devices/${deviceId}/outputs/${pointId}/release`,
    { priority },
    { useLocalApi: true }
  );
}

/**
 * Set output to auto mode
 */
export async function setOutputAuto(
  deviceId: string,
  pointId: number
): Promise<ApiResponse<OutputPoint>> {
  return api.post<OutputPoint>(
    `/bacnet/devices/${deviceId}/outputs/${pointId}/auto`,
    null,
    { useLocalApi: true }
  );
}

/**
 * Set output to manual mode
 */
export async function setOutputManual(
  deviceId: string,
  pointId: number,
  value: number
): Promise<ApiResponse<OutputPoint>> {
  return api.post<OutputPoint>(
    `/bacnet/devices/${deviceId}/outputs/${pointId}/manual`,
    { value },
    { useLocalApi: true }
  );
}
