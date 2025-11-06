/**
 * BACnet Programs API
 * Read and write BACnet program code and control
 */

import { api } from '../client';
import type { ApiResponse, ProgramData } from '../../types';

/**
 * Get all programs for a device
 */
export async function getPrograms(deviceId: string): Promise<ApiResponse<ProgramData[]>> {
  return api.get<ProgramData[]>(`/bacnet/devices/${deviceId}/programs`, {
    useLocalApi: true,
  });
}

/**
 * Get single program
 */
export async function getProgram(
  deviceId: string,
  programId: number
): Promise<ApiResponse<ProgramData>> {
  return api.get<ProgramData>(`/bacnet/devices/${deviceId}/programs/${programId}`, {
    useLocalApi: true,
  });
}

/**
 * Update program configuration
 */
export async function updateProgram(
  deviceId: string,
  programId: number,
  data: Partial<ProgramData>
): Promise<ApiResponse<ProgramData>> {
  return api.put<ProgramData>(
    `/bacnet/devices/${deviceId}/programs/${programId}`,
    data,
    { useLocalApi: true }
  );
}

/**
 * Upload program code to device
 */
export async function uploadProgramCode(
  deviceId: string,
  programId: number,
  code: string
): Promise<ApiResponse<{ success: boolean; compilationErrors?: string[] }>> {
  return api.post<{ success: boolean; compilationErrors?: string[] }>(
    `/bacnet/devices/${deviceId}/programs/${programId}/upload`,
    { code },
    { useLocalApi: true }
  );
}

/**
 * Download program code from device
 */
export async function downloadProgramCode(
  deviceId: string,
  programId: number
): Promise<ApiResponse<{ code: string }>> {
  return api.get<{ code: string }>(
    `/bacnet/devices/${deviceId}/programs/${programId}/download`,
    { useLocalApi: true }
  );
}

/**
 * Start program execution
 */
export async function startProgram(
  deviceId: string,
  programId: number
): Promise<ApiResponse<{ running: boolean }>> {
  return api.post<{ running: boolean }>(
    `/bacnet/devices/${deviceId}/programs/${programId}/start`,
    null,
    { useLocalApi: true }
  );
}

/**
 * Stop program execution
 */
export async function stopProgram(
  deviceId: string,
  programId: number
): Promise<ApiResponse<{ running: boolean }>> {
  return api.post<{ running: boolean }>(
    `/bacnet/devices/${deviceId}/programs/${programId}/stop`,
    null,
    { useLocalApi: true }
  );
}

/**
 * Get program execution status
 */
export async function getProgramStatus(
  deviceId: string,
  programId: number
): Promise<ApiResponse<{ running: boolean; lastRunTime?: Date; errors?: string[] }>> {
  return api.get<{ running: boolean; lastRunTime?: Date; errors?: string[] }>(
    `/bacnet/devices/${deviceId}/programs/${programId}/status`,
    { useLocalApi: true }
  );
}

/**
 * Compile program code
 */
export async function compileProgram(
  deviceId: string,
  programId: number,
  code: string
): Promise<ApiResponse<{ success: boolean; errors?: string[]; warnings?: string[] }>> {
  return api.post<{ success: boolean; errors?: string[]; warnings?: string[] }>(
    `/bacnet/devices/${deviceId}/programs/${programId}/compile`,
    { code },
    { useLocalApi: true }
  );
}
