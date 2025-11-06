/**
 * BACnet Trends API
 * Trend log data collection and retrieval
 */

import { api } from '../client';
import type { ApiResponse, TrendLogData, TrendDataPoint } from '../../types';

/**
 * Get all trend logs for a device
 */
export async function getTrendLogs(deviceId: string): Promise<ApiResponse<TrendLogData[]>> {
  return api.get<TrendLogData[]>(`/bacnet/devices/${deviceId}/trends`, {
    useLocalApi: true,
  });
}

/**
 * Get single trend log
 */
export async function getTrendLog(
  deviceId: string,
  trendId: number
): Promise<ApiResponse<TrendLogData>> {
  return api.get<TrendLogData>(`/bacnet/devices/${deviceId}/trends/${trendId}`, {
    useLocalApi: true,
  });
}

/**
 * Update trend log configuration
 */
export async function updateTrendLog(
  deviceId: string,
  trendId: number,
  data: Partial<TrendLogData>
): Promise<ApiResponse<TrendLogData>> {
  return api.put<TrendLogData>(
    `/bacnet/devices/${deviceId}/trends/${trendId}`,
    data,
    { useLocalApi: true }
  );
}

/**
 * Get trend data points
 */
export async function getTrendData(
  deviceId: string,
  trendId: number,
  startTime?: Date,
  endTime?: Date,
  limit?: number
): Promise<ApiResponse<TrendDataPoint[]>> {
  return api.get<TrendDataPoint[]>(
    `/bacnet/devices/${deviceId}/trends/${trendId}/data`,
    {
      params: {
        startTime: startTime?.toISOString(),
        endTime: endTime?.toISOString(),
        limit,
      },
      useLocalApi: true,
    }
  );
}

/**
 * Clear trend log data
 */
export async function clearTrendLog(
  deviceId: string,
  trendId: number
): Promise<ApiResponse<{ success: boolean }>> {
  return api.post<{ success: boolean }>(
    `/bacnet/devices/${deviceId}/trends/${trendId}/clear`,
    null,
    { useLocalApi: true }
  );
}

/**
 * Enable/disable trend logging
 */
export async function setTrendLogEnabled(
  deviceId: string,
  trendId: number,
  enabled: boolean
): Promise<ApiResponse<TrendLogData>> {
  return api.post<TrendLogData>(
    `/bacnet/devices/${deviceId}/trends/${trendId}/${enabled ? 'enable' : 'disable'}`,
    null,
    { useLocalApi: true }
  );
}

/**
 * Export trend data to CSV
 */
export async function exportTrendData(
  deviceId: string,
  trendId: number,
  startTime?: Date,
  endTime?: Date
): Promise<ApiResponse<{ csv: string; filename: string }>> {
  return api.post<{ csv: string; filename: string }>(
    `/bacnet/devices/${deviceId}/trends/${trendId}/export`,
    {
      startTime: startTime?.toISOString(),
      endTime: endTime?.toISOString(),
    },
    { useLocalApi: true }
  );
}

/**
 * Start trend logging
 */
export async function startTrendLogging(
  deviceId: string,
  trendId: number
): Promise<ApiResponse<TrendLogData>> {
  return api.post<TrendLogData>(
    `/bacnet/devices/${deviceId}/trends/${trendId}/start`,
    null,
    { useLocalApi: true }
  );
}

/**
 * Stop trend logging
 */
export async function stopTrendLogging(
  deviceId: string,
  trendId: number
): Promise<ApiResponse<TrendLogData>> {
  return api.post<TrendLogData>(
    `/bacnet/devices/${deviceId}/trends/${trendId}/stop`,
    null,
    { useLocalApi: true }
  );
}
