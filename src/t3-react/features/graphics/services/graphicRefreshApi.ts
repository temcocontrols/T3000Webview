/**
 * Graphics Refresh API Service
 * Handles GET, refresh and save operations for graphics data
 */

import { API_BASE_URL } from '../../../config/constants';

export interface GraphicPoint {
  serialNumber: number;
  graphicId?: string;
  switchNode?: string;
  graphicLabel?: string;
  graphicPictureFile?: string;
  graphicTotalPoint?: string;
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  items: GraphicPoint[];
  count: number;
  timestamp: string;
}

export interface SaveResponse {
  success: boolean;
  message: string;
  savedCount: number;
  timestamp: string;
}

export interface GetGraphicsResponse {
  success: boolean;
  count: number;
  data: GraphicPoint[];
  timestamp: string;
}

export class GraphicRefreshApiService {
  /**
   * Get all graphics for a device from database
   * GET /api/t3_device/graphics/:serial
   */
  static async getGraphics(serialNumber: number): Promise<GetGraphicsResponse> {
    const url = `${API_BASE_URL}/api/t3_device/graphics/${serialNumber}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get graphics: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Refresh all graphics from device
   * POST /api/t3_device/graphics/:serial/refresh
   */
  static async refreshAllGraphics(serialNumber: number): Promise<RefreshResponse> {
    const url = `${API_BASE_URL}/api/t3_device/graphics/${serialNumber}/refresh`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Empty body means refresh all
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to refresh graphics: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Refresh a single graphic from device
   * POST /api/t3_device/graphics/:serial/refresh
   */
  static async refreshSingleGraphic(serialNumber: number, index: number): Promise<RefreshResponse> {
    const url = `${API_BASE_URL}/api/t3_device/graphics/${serialNumber}/refresh`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ index }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to refresh graphic: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Save refreshed graphics data to database
   * POST /api/t3_device/graphics/:serial/save-refreshed
   */
  static async saveRefreshedGraphics(serialNumber: number, items: GraphicPoint[]): Promise<SaveResponse> {
    const url = `${API_BASE_URL}/api/t3_device/graphics/${serialNumber}/save-refreshed`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save graphics: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Load graphics using GET_INITIAL_DATA (Action 1) and save to database
   * POST /api/t3_device/graphics/:serial/load-and-save
   * Temporary solution until Action 17 is implemented in C++
   */
  static async loadAndSaveGraphics(serialNumber: number, viewitem: number = 0): Promise<SaveResponse> {
    const url = `${API_BASE_URL}/api/t3_device/graphics/${serialNumber}/load-and-save`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ viewitem }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to load and save graphics: ${response.status} ${errorText}`);
    }

    return response.json();
  }
}
