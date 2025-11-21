/**
 * Input Refresh API Service
 *
 * Handles input data refresh operations using REFRESH_WEBVIEW_LIST (Action 17)
 * Reads data FROM device (opposite of UPDATE_WEBVIEW_LIST which writes TO device)
 *
 * C++ Reference:
 * - REFRESH_WEBVIEW_LIST = 17
 * - Reads input points from device via BACnet
 * - Updates database with fresh values
 */

import { API_BASE_URL } from '../config/constants';

export interface RefreshInputRequest {
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
 * Input Refresh API Service
 * Implements REFRESH_WEBVIEW_LIST action for input points
 */
export class InputRefreshApiService {
  private static baseUrl = `${API_BASE_URL}/api/t3_device`;

  /**
   * Refresh single input from device
   * POST /api/t3-device/inputs/:serial/refresh
   * @param serialNumber - Device serial number
   * @param index - Input index to refresh
   * @returns Raw data from device (not saved to database yet)
   */
  static async refreshInput(
    serialNumber: number,
    index: number
  ): Promise<RefreshResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/inputs/${serialNumber}/refresh`,
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
        `Failed to refresh input ${index} for device ${serialNumber}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Refresh all inputs from device
   * POST /api/t3-device/inputs/:serial/refresh
   * @param serialNumber - Device serial number
   * @returns Raw data from device (not saved to database yet)
   */
  static async refreshAllInputs(
    serialNumber: number
  ): Promise<RefreshResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/inputs/${serialNumber}/refresh`,
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
        `Failed to refresh all inputs for device ${serialNumber}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Save refreshed data to database
   * POST /api/t3-device/inputs/:serial/save-refreshed
   * @param serialNumber - Device serial number
   * @param items - Array of input data from refresh response
   */
  static async saveRefreshedInputs(
    serialNumber: number,
    items: any[]
  ): Promise<SaveResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/inputs/${serialNumber}/save-refreshed`,
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
        `Failed to save refreshed inputs for device ${serialNumber}:`,
        error
      );
      throw error;
    }
  }
}

export default InputRefreshApiService;
