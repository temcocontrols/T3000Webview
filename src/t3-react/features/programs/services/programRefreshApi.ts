/**
 * Program Refresh API Service
 *
 * Handles program data refresh operations using REFRESH_WEBVIEW_LIST (Action 17)
 * Reads data FROM device (opposite of UPDATE_WEBVIEW_LIST which writes TO device)
 */

import { API_BASE_URL } from '../../../config/constants';

export interface RefreshProgramRequest {
  index?: number; // Optional: omit for refresh all, include for single item
}

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

/**
 * Program Refresh API Service
 * Implements REFRESH_WEBVIEW_LIST action for program points
 */
export class ProgramRefreshApiService {
  private static baseUrl = `${API_BASE_URL}/api/t3_device`;

  /**
   * Refresh single program from device
   * POST /api/t3_device/programs/:serial/refresh
   * @param serialNumber - Device serial number
   * @param index - Program index to refresh
   * @returns Raw data from device (not saved to database yet)
   */
  static async refreshProgram(
    serialNumber: number,
    index: number
  ): Promise<RefreshResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/programs/${serialNumber}/refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ index }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Failed to refresh program ${index} for device ${serialNumber}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Refresh all programs from device
   * POST /api/t3_device/programs/:serial/refresh
   * @param serialNumber - Device serial number
   * @returns Raw data from device (not saved to database yet)
   */
  static async refreshAllPrograms(
    serialNumber: number
  ): Promise<RefreshResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/programs/${serialNumber}/refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}), // Empty body = refresh all
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Failed to refresh all programs for device ${serialNumber}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Save refreshed data to database
   * POST /api/t3_device/programs/:serial/save-refreshed
   * @param serialNumber - Device serial number
   * @param items - Array of program data from refresh response
   */
  static async saveRefreshedPrograms(
    serialNumber: number,
    items: any[]
  ): Promise<SaveResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/programs/${serialNumber}/save-refreshed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Failed to save refreshed programs for device ${serialNumber}:`,
        error
      );
      throw error;
    }
  }
}

export default ProgramRefreshApiService;
