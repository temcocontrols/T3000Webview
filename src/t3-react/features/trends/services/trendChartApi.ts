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
  unit?: string;
}

export class TrendChartApiService {
  /**
   * Fetch historical trend data from database
   */
  static async getTrendHistory(request: TrendDataRequest): Promise<TrendDataResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/trendlog/history`, {
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
   */
  static async getRealtimeData(
    serialNumber: number,
    panelId: number,
    points: SpecificPoint[]
  ): Promise<TrendDataPoint[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/trendlog/realtime`, {
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
   * Store realtime data to database
   */
  static async storeRealtimeData(data: TrendDataPoint[]): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/trendlog/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error(`Failed to store realtime data: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error storing realtime data:', error);
      throw error;
    }
  }
}
