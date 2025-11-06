/**
 * BACnet Controllers API
 * PID loop configuration and control
 */

import { api } from '../client';
import type { ApiResponse, ControllerData } from '../../types';

/**
 * Get all controllers/PID loops for a device
 */
export async function getControllers(deviceId: string): Promise<ApiResponse<ControllerData[]>> {
  return api.get<ControllerData[]>(`/bacnet/devices/${deviceId}/controllers`, {
    useLocalApi: true,
  });
}

/**
 * Get single controller
 */
export async function getController(
  deviceId: string,
  controllerId: number
): Promise<ApiResponse<ControllerData>> {
  return api.get<ControllerData>(`/bacnet/devices/${deviceId}/controllers/${controllerId}`, {
    useLocalApi: true,
  });
}

/**
 * Update controller configuration
 */
export async function updateController(
  deviceId: string,
  controllerId: number,
  data: Partial<ControllerData>
): Promise<ApiResponse<ControllerData>> {
  return api.put<ControllerData>(
    `/bacnet/devices/${deviceId}/controllers/${controllerId}`,
    data,
    { useLocalApi: true }
  );
}

/**
 * Update PID parameters
 */
export async function updatePidParameters(
  deviceId: string,
  controllerId: number,
  params: { setpoint?: number; p?: number; i?: number; d?: number }
): Promise<ApiResponse<ControllerData>> {
  return api.patch<ControllerData>(
    `/bacnet/devices/${deviceId}/controllers/${controllerId}/pid`,
    params,
    { useLocalApi: true }
  );
}

/**
 * Enable/disable controller
 */
export async function setControllerEnabled(
  deviceId: string,
  controllerId: number,
  enabled: boolean
): Promise<ApiResponse<ControllerData>> {
  return api.post<ControllerData>(
    `/bacnet/devices/${deviceId}/controllers/${controllerId}/${enabled ? 'enable' : 'disable'}`,
    null,
    { useLocalApi: true }
  );
}

/**
 * Set controller to auto mode
 */
export async function setControllerAuto(
  deviceId: string,
  controllerId: number
): Promise<ApiResponse<ControllerData>> {
  return api.post<ControllerData>(
    `/bacnet/devices/${deviceId}/controllers/${controllerId}/auto`,
    null,
    { useLocalApi: true }
  );
}

/**
 * Set controller to manual mode
 */
export async function setControllerManual(
  deviceId: string,
  controllerId: number,
  outputValue: number
): Promise<ApiResponse<ControllerData>> {
  return api.post<ControllerData>(
    `/bacnet/devices/${deviceId}/controllers/${controllerId}/manual`,
    { outputValue },
    { useLocalApi: true }
  );
}

/**
 * Auto-tune PID parameters
 */
export async function autoTunePid(
  deviceId: string,
  controllerId: number
): Promise<ApiResponse<{ p: number; i: number; d: number }>> {
  return api.post<{ p: number; i: number; d: number }>(
    `/bacnet/devices/${deviceId}/controllers/${controllerId}/auto-tune`,
    null,
    { useLocalApi: true, timeout: 120000 } // 2 minute timeout for auto-tuning
  );
}
