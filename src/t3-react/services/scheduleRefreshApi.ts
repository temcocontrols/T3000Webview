/**
 * Schedule Refresh API Service
 *
 * Handles schedule data refresh operations using REFRESH_WEBVIEW_LIST (Action 17)
 */

import { API_BASE_URL } from '../config/constants';

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

export class ScheduleRefreshApiService {
  private static baseUrl = `${API_BASE_URL}/api/t3_device`;

  static async refreshAllSchedules(serialNumber: number): Promise<RefreshResponse> {
    const response = await fetch(
      `${this.baseUrl}/schedules/${serialNumber}/refresh`,
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

  static async saveRefreshedSchedules(serialNumber: number, items: any[]): Promise<SaveResponse> {
    const response = await fetch(
      `${this.baseUrl}/schedules/${serialNumber}/save-refreshed`,
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
}

export default ScheduleRefreshApiService;
