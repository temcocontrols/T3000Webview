/**
 * Device API Service
 *
 * Handles all HTTP communication with Rust backend
 * Maps to C++ LoadProductFromDB and related database operations
 *
 * C++ Reference:
 * - LoadProductFromDB() → getAllDevices()
 * - Write to DB → createDevice(), updateDevice()
 * - Network scans → scanDevices()
 * - Status checks → checkDeviceStatus()
 */

import type {
  DeviceInfo,
  DevicesResponse,
  ScanOptions,
} from '../shared/types/device';
import { API_BASE_URL } from '../config/constants';

/**
 * Transform backend device response to match frontend DeviceInfo interface
 * Backend returns: showLabelName, productName (camelCase from serde)
 * Frontend expects: nameShowOnTree (derived from showLabelName or productName)
 */
function transformDeviceData(device: any): DeviceInfo {
  const source = device?.device ?? device ?? {};
  const serialNumber = source.serialNumber ?? source.SerialNumber;
  const showLabelName = source.showLabelName ?? source.Show_Label_Name;
  const productName = source.productName ?? source.Product_Name ?? showLabelName;

  return {
    ...source,
    serialNumber,
    panelNumber: source.panelNumber ?? source.Panel_Number,
    panelId: source.panelId ?? source.PanelId ?? source.panelNumber ?? source.Panel_Number,
    mainBuildingName: source.mainBuildingName ?? source.MainBuilding_Name,
    buildingName: source.buildingName ?? source.Building_Name,
    floorName: source.floorName ?? source.Floor_Name,
    roomName: source.roomName ?? source.Room_Name,
    productName,
    productClassId: source.productClassId ?? source.Product_Class_ID ?? null,
    productId: source.productId ?? source.Product_ID ?? null,
    ipAddress: source.ipAddress ?? source.IP_Address,
    port: source.port ?? source.Port,
    bacnetMstpMacId: source.bacnetMstpMacId ?? source.BACnet_MSTP_MAC_ID,
    modbusAddress: source.modbusAddress ?? source.Modbus_Address,
    pcIpAddress: source.pcIpAddress ?? source.PC_IP_Address,
    modbusPort: source.modbusPort ?? source.Modbus_Port,
    bacnetIpPort: source.bacnetIpPort ?? source.BACnet_IP_Port,
    connectionType: source.connectionType ?? source.Connection_Type,
    showLabelName,
    status: source.status ?? source.Status ?? 'unknown',
    statusHistory: source.statusHistory ?? [false, false, false, false, false],
    protocol: source.protocol ?? 'Native',
    // Compute nameShowOnTree from showLabelName or fallback to productName
    nameShowOnTree: showLabelName || productName || `Device ${serialNumber}`,
    inputCount: device?.inputCount ?? device?.input_count ?? 0,
    outputCount: device?.outputCount ?? device?.output_count ?? 0,
    variableCount: device?.variableCount ?? device?.variable_count ?? 0,
    totalPoints: device?.totalPoints ?? device?.total_points ?? 0,
  };
}

/**
 * Device API Service
 * Implements all device-related API calls
 */
export class DeviceApiService {
  private static baseUrl = `${API_BASE_URL}/api/t3_device`;

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
      // Transform devices to match frontend interface
      const transformedDevices = (data.devices || [])
        .map(transformDeviceData)
        .filter((d: DeviceInfo) => Number.isFinite(d.serialNumber));
      return {
        ...data,
        devices: transformedDevices,
      };
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      throw error;
    }
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
      const data = await response.json();
      return transformDeviceData(data);
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
      const data = await response.json();
      // Backend returns { device: {...}, message: "..." } — extract the nested device object
      const deviceData = data.device ?? data;
      return transformDeviceData(deviceData);
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
