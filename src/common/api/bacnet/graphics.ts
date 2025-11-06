/**
 * BACnet Graphics API
 * Graphics screen management and control
 */

import { api } from '../client';
import type { ApiResponse, GraphicsData } from '../../types';

/**
 * Get all graphics screens for a device
 */
export async function getGraphics(deviceId: string): Promise<ApiResponse<GraphicsData[]>> {
  return api.get<GraphicsData[]>(`/bacnet/devices/${deviceId}/graphics`, {
    useLocalApi: true,
  });
}

/**
 * Get single graphics screen
 */
export async function getGraphic(
  deviceId: string,
  graphicId: number
): Promise<ApiResponse<GraphicsData>> {
  return api.get<GraphicsData>(`/bacnet/devices/${deviceId}/graphics/${graphicId}`, {
    useLocalApi: true,
  });
}

/**
 * Update graphics screen configuration
 */
export async function updateGraphic(
  deviceId: string,
  graphicId: number,
  data: Partial<GraphicsData>
): Promise<ApiResponse<GraphicsData>> {
  return api.put<GraphicsData>(
    `/bacnet/devices/${deviceId}/graphics/${graphicId}`,
    data,
    { useLocalApi: true }
  );
}

/**
 * Upload graphics screen to device
 */
export async function uploadGraphic(
  deviceId: string,
  graphicId: number,
  graphicData: GraphicsData
): Promise<ApiResponse<{ success: boolean }>> {
  return api.post<{ success: boolean }>(
    `/bacnet/devices/${deviceId}/graphics/${graphicId}/upload`,
    graphicData,
    { useLocalApi: true }
  );
}

/**
 * Download graphics screen from device
 */
export async function downloadGraphic(
  deviceId: string,
  graphicId: number
): Promise<ApiResponse<GraphicsData>> {
  return api.get<GraphicsData>(
    `/bacnet/devices/${deviceId}/graphics/${graphicId}/download`,
    { useLocalApi: true }
  );
}

/**
 * Delete graphics screen
 */
export async function deleteGraphic(
  deviceId: string,
  graphicId: number
): Promise<ApiResponse<void>> {
  return api.delete<void>(
    `/bacnet/devices/${deviceId}/graphics/${graphicId}`,
    { useLocalApi: true }
  );
}

/**
 * Copy graphics screen to another slot
 */
export async function copyGraphic(
  deviceId: string,
  sourceGraphicId: number,
  targetGraphicId: number
): Promise<ApiResponse<GraphicsData>> {
  return api.post<GraphicsData>(
    `/bacnet/devices/${deviceId}/graphics/${sourceGraphicId}/copy`,
    { targetGraphicId },
    { useLocalApi: true }
  );
}

/**
 * Export graphics screen as image
 */
export async function exportGraphicImage(
  deviceId: string,
  graphicId: number,
  format: 'png' | 'svg' | 'jpg' = 'png'
): Promise<ApiResponse<{ imageData: string; format: string }>> {
  return api.post<{ imageData: string; format: string }>(
    `/bacnet/devices/${deviceId}/graphics/${graphicId}/export`,
    { format },
    { useLocalApi: true }
  );
}
