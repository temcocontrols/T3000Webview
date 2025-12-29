/**
 * TrendLog Refresh API Service
 *
 * Handles trendlog data refresh operations using GET_WEBVIEW_LIST (Action 17)
 */

import { API_BASE_URL } from '../../../config/constants';

export interface RefreshResponse {
  success: boolean;
  message: string;
  items: any[];
  count: number;
  timestamp: string;
}

export interface SaveResponse {
  success: boolean;
  message: string;
  savedCount: number;
  timestamp: string;
}

export class TrendlogRefreshApiService {
  private static baseUrl = `${API_BASE_URL}/api/t3_device`;

  static async refreshAllTrendlogs(serialNumber: number): Promise<RefreshResponse> {
    const response = await fetch(
      `${this.baseUrl}/trendlogs/${serialNumber}/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    return await response.json();
  }

  static async saveRefreshedTrendlogs(serialNumber: number, items: any[]): Promise<SaveResponse> {
    const response = await fetch(
      `${this.baseUrl}/trendlogs/${serialNumber}/save-refreshed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    return await response.json();
  }

  static async refreshTrendlog(serialNumber: number, index: number): Promise<RefreshResponse> {
    const response = await fetch(
      `${this.baseUrl}/trendlogs/${serialNumber}/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    return await response.json();
  }
}
