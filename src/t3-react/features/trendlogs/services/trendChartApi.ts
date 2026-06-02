/**
 * Trend Chart Services
 *
 * API services for fetching trend data from backend
 */

import { API_BASE_URL } from '../../../config/constants';

export interface TrendDataRequest {
  serial_number: number;
  panel_id: number;
  trendlog_id: string;
  start_time: string;
  end_time: string;
  limit?: number;
  point_types?: string[];
  specific_points?: SpecificPoint[];
}

export interface SpecificPoint {
  point_id: string;
  point_type: string;
  point_index: number;  // 1-based index (IN1=1, IN2=2, etc.)
  panel_id: number;
}

export interface TrendDataResponse {
  data: TrendDataPoint[];
  total_records: number;
}

export interface TrendDataPoint {
  point_id: string;
  point_type: string;
  point_index: number;
  timestamp: string;
  value: number;
  original_value?: number;
  raw_value?: string;
  is_analog?: boolean;
  unit?: string;
  units?: string;
  range_field?: string;
  range?: string;
  digital_analog?: string | number;
  digitalAnalog?: string | number;
}

/**
 * Payload sent to /api/t3_device/trendlog-data/realtime/batch.
 * Must match Rust's CreateTrendlogDataRequest.
 */
export interface RealtimeDataPoint {
  serial_number: number;
  panel_id: number;
  point_id: string;
  point_index: number;
  point_type: string;
  value: string;
  range_field?: string;
  digital_analog?: string;
  units?: string;
  data_source?: string;   // 'REALTIME'
  created_by?: string;    // 'FRONTEND'
  sync_interval?: number; // seconds
}

export class TrendChartApiService {
  /**
   * Fetch historical trend data from database
   */
  static async getTrendHistory(request: TrendDataRequest): Promise<TrendDataResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/t3_device/devices/${request.serial_number}/trendlogs/${request.trendlog_id}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch trend history: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error fetching trend history:', error);
      throw error;
    }
  }

  /**
   * Fetch real-time data for specific points
   * Note: This endpoint doesn't exist in the backend API.
   * Real-time data should come from WebSocket (port 9104) instead.
   * Keeping this for now but it may need to be removed.
   */
  static async getRealtimeData(
    serialNumber: number,
    panelId: number,
    points: SpecificPoint[]
  ): Promise<TrendDataPoint[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/t3_device/trendlog-data/realtime`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serial_number: serialNumber,
          panel_id: panelId,
          points,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch realtime data: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error fetching realtime data:', error);
      throw error;
    }
  }

  /**
   * Call FFI action=15 (LOGGING_DATA) to get live point values directly from the T3000 controller.
   * Mirrors Vue's ffiGetLoggingData / sendPeriodicBatchRequest approach.
   * Returns the flat device_data array extracted from all panels in the response.
   */
  static async callFfiLoggingData(
    panelId: number,
    serialNumber: number,
  ): Promise<any[]> {
    const payload = {
      action: 15,
      msgId: crypto.randomUUID(),
      panelId,
      serialNumber,
      from: 'react_trend_chart',
    };

    const response = await fetch(`${API_BASE_URL}/api/t3000/ffi/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`FFI call failed: ${response.statusText}`);
    }

    const json = await response.json();

    // Response structure: { data: [ { device_data: [...] }, ... ] }
    const items: any[] = [];
    if (Array.isArray(json?.data)) {
      json.data.forEach((device: any) => {
        if (Array.isArray(device?.device_data)) {
          items.push(...device.device_data);
        }
      });
    }
    return items;
  }

  /**
   * Batch-save realtime data points to database.
   * Mirrors Vue's trendlogAPI.saveRealtimeBatch → POST /api/t3_device/trendlog-data/realtime/batch
   * Fire-and-forget: caller should .catch() but not await.
   */
  static async saveRealtimeBatch(points: RealtimeDataPoint[]): Promise<void> {
    if (points.length === 0) return;
    const response = await fetch(`${API_BASE_URL}/api/t3_device/trendlog-data/realtime/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(points),
    });
    if (!response.ok) {
      throw new Error(`Realtime batch save failed: ${response.statusText}`);
    }
  }
}
