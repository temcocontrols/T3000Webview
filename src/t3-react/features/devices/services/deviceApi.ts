/**
 * Device API Service
 *
 * Handles all HTTP communication with Rust backend
 * Maps to C++ LoadProductFromDB and related database operations
 *
 * C++ Reference:
 * - LoadProductFromDB() �?getAllDevices()
 * - Write to DB �?createDevice(), updateDevice()
 * - Network scans �?scanDevices()
 * - Status checks �?checkDeviceStatus()
 */

import type {
  DeviceInfo,
  DevicesResponse,
  ScanOptions,
} from '../../../types/device';

const API_BASE_URL = '/api/t3_device';

/**
 * Device API Service
 * Implements all device-related API calls
 */
export class DeviceApiService {
  private static baseUrl = API_BASE_URL;

  /**
   * Get all devices from database
   * Maps to C++ LoadProductFromDB()
   */
  static async getAllDevices(): Promise<DevicesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/devices`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON response but got ${contentType || 'unknown'}: ${text.substring(0, 100)}`);
      }

      const data = await response.json();

      // Transform API response to match frontend interface
      // C++ shows: Show_Label_Name (if not empty) OR Product_Name
      const devices = data.devices.map((device: any) => ({
        ...device,
        // Map display name with proper fallback (matches C++ logic)
        nameShowOnTree: (device.showLabelName?.trim() && device.showLabelName.trim() !== '')
          ? device.showLabelName.trim()
          : (device.productName || 'Unknown Device'),

        // Ensure productClassId has default (0 = unknown device)
        productClassId: device.productClassId ?? 0,

        // Infer protocol from connection type and port info
        protocol: this.inferProtocol(device),

        // Map status string to DeviceStatus type
        status: this.mapStatus(device.status),

        // Initialize status history
        statusHistory: [device.status === 'Online'],
      }));

      return {
        devices,
        total: data.total,
        message: data.message
      };
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      throw error;
    }
  }

  /**
   * Infer protocol from device connection information
   */
  private static inferProtocol(device: any): 'BACnet' | 'Modbus' | 'Native' {
    // Check for BACnet indicators
    if (device.bacnetIpPort && device.bacnetIpPort !== 0) {
      return 'BACnet';
    }
    if (device.bacnetMstpMacId !== null && device.bacnetMstpMacId !== undefined) {
      return 'BACnet';
    }

    // Check for Modbus indicators
    if (device.modbusPort && device.modbusPort !== 0) {
      return 'Modbus';
    }
    if (device.modbusAddress !== null && device.modbusAddress !== undefined) {
      return 'Modbus';
    }

    // Default to Native (Temco protocol)
    return 'Native';
  }

  /**
   * Map status string to DeviceStatus type
   */
  private static mapStatus(status: string | undefined): 'online' | 'offline' | 'unknown' {
    if (!status) return 'unknown';
    const statusLower = status.toLowerCase();
    if (statusLower === 'online') return 'online';
    if (statusLower === 'offline') return 'offline';
    return 'unknown';
  }

  /**
   * Get single device by serial number
   */
  static async getDeviceById(serialNumber: number): Promise<DeviceInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/devices/${serialNumber}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch device ${serialNumber}:`, error);
      throw error;
    }
  }

  /**
   * Create new device
   * Maps to C++ database INSERT operations
   */
  static async createDevice(device: Partial<DeviceInfo>): Promise<DeviceInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(device),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to create device:', error);
      throw error;
    }
  }

  /**
   * Update existing device
   * Maps to C++ database UPDATE operations
   */
  static async updateDevice(
    serialNumber: number,
    updates: Partial<DeviceInfo>
  ): Promise<DeviceInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/devices/${serialNumber}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to update device ${serialNumber}:`, error);
      throw error;
    }
  }

  /**
   * Delete device
   * Maps to C++ database DELETE operations
   */
  static async deleteDevice(serialNumber: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/devices/${serialNumber}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to delete device ${serialNumber}:`, error);
      throw error;
    }
  }

  /**
   * Scan for devices on network
   * Maps to C++ network scanning threads
   */
  static async scanDevices(options: ScanOptions = {}): Promise<DeviceInfo[]> {
    try {
      const queryParams = new URLSearchParams();
      if (options.protocol) queryParams.append('protocol', options.protocol);
      if (options.ipRange) queryParams.append('ipRange', options.ipRange);
      if (options.comPort) queryParams.append('comPort', options.comPort.toString());
      if (options.timeout) queryParams.append('timeout', options.timeout.toString());

      const response = await fetch(`${this.baseUrl}/devices/scan?${queryParams}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to scan for devices:', error);
      throw error;
    }
  }

  /**
   * Check device online status
   * Maps to C++ m_pCheck_net_device_online thread
   */
  static async checkDeviceStatus(serialNumber: number): Promise<{
    status: 'online' | 'offline';
    responseTime?: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/devices/${serialNumber}/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to check device ${serialNumber} status:`, error);
      throw error;
    }
  }

  /**
   * Connect to device
   * Opens communication channel
   */
  static async connectDevice(serialNumber: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/devices/${serialNumber}/connect`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to connect to device ${serialNumber}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from device
   * Closes communication channel
   */
  static async disconnectDevice(serialNumber: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/devices/${serialNumber}/disconnect`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to disconnect from device ${serialNumber}:`, error);
      throw error;
    }
  }
}

export default DeviceApiService;
