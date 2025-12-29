/**
 * Variable Refresh API Service
 *
 * Handles variable data refresh operations using GET_WEBVIEW_LIST (Action 17)
 * Reads data FROM device (opposite of UPDATE_WEBVIEW_LIST which writes TO device)
 *
 * C++ Reference:
 * - GET_WEBVIEW_LIST = 17
 * - Reads variable points from device via BACnet
 * - Updates database with fresh values
 */

import { API_BASE_URL } from '../../../config/constants';

export interface RefreshVariableRequest {
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
 * Variable Refresh API Service
 * Implements GET_WEBVIEW_LIST action for variable points
 */
export class VariableRefreshApiService {
  private static baseUrl = `${API_BASE_URL}/api/t3_device`;

  /**
   * Refresh single variable from device
   * POST /api/t3-device/variables/:serial/refresh
   * @param serialNumber - Device serial number
   * @param index - Variable index to refresh
   * @returns Raw data from device (not saved to database yet)
   */
  static async refreshVariable(
    serialNumber: number,
    index: number
  ): Promise<RefreshResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/variables/${serialNumber}/refresh`,
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
        `Failed to refresh variable ${index} for device ${serialNumber}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Refresh all variables from device
   * POST /api/t3-device/variables/:serial/refresh
   * @param serialNumber - Device serial number
   * @returns Raw data from device (not saved to database yet)
   */
  static async refreshAllVariables(
    serialNumber: number
  ): Promise<RefreshResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/variables/${serialNumber}/refresh`,
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
        `Failed to refresh all variables for device ${serialNumber}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Save refreshed data to database
   * POST /api/t3-device/variables/:serial/save-refreshed
   * @param serialNumber - Device serial number
   * @param items - Array of variable data from refresh response
   */
  static async saveRefreshedVariables(
    serialNumber: number,
    items: any[]
  ): Promise<SaveResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/variables/${serialNumber}/save-refreshed`,
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
        `Failed to save refreshed variables for device ${serialNumber}:`,
        error
      );
      throw error;
    }
  }
}

export default VariableRefreshApiService;
