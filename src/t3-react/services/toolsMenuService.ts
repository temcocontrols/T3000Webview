/**
 * Tools Menu Service
 *
 * Implements Tools menu operations matching C++ T3000 functionality
 *
 * C++ Reference (MainFrm.cpp):
 * - OnConnect2() → connect()
 * - OnToolEreaseChangeId() → changeModbusId()
 * - OnDatabaseBacnettool() → openBacnetTool()
 * - OnDatabaseMbpoll() → openModbusPoll()
 * - OnToolRegisterviewer() → openRegisterViewer()
 * - OnWebviewModbusregister() → openModbusRegisterV2()
 * - OnFileExportregiseterslist1() → openRegisterListFolder()
 * - OnToolIsptoolforone() → loadFirmwareSingle()
 * - OnFileBatchburnhex() → loadFirmwareMany()
 * - OnToolFlashsn() → flashSerialNumber()
 * - OnToolsPsychrometry() → openPsychrometry()
 * - OnToolsPhchart() → openPhChart()
 * - OnToolsOption() → openOptions()
 * - OnDisconnectCom() → disconnect()
 * - OnToolsLoginmyaccount() → loginMyAccount()
 */

import { API_BASE_URL } from '../config/constants';

export interface ConnectionInfo {
  port: string;
  protocol: 'MODBUS_RS485' | 'MODBUS_TCPIP' | 'BACNET_IP' | 'BACNET_MSTP';
  baudRate?: number;
  ipAddress?: string;
  connected: boolean;
}

export interface ModbusIdChangeRequest {
  deviceSerialNumber: number;
  oldId: number;
  newId: number;
}

export interface FirmwareUploadRequest {
  deviceSerialNumber: number;
  firmwareFile: File;
  deviceType: string;
}

/**
 * Tools Menu Service
 * Handles all Tools menu operations
 */
export class ToolsMenuService {
  private static baseUrl = `${API_BASE_URL}/api`;

  /**
   * Connect to device/serial port
   * Maps to: CMainFrame::OnConnect2()
   *
   * C++ Implementation:
   * - Opens connection dialog
   * - Connects to serial port or IP
   * - Initializes communication
   */
  static async connect(connectionInfo: ConnectionInfo): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/connection/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionInfo),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to connect: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Connected successfully',
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Disconnect from serial port
   * Maps to: CMainFrame::OnDisconnectCom()
   */
  static async disconnect(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/connection/disconnect`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to disconnect: ${errorText || response.statusText}`);
      }

      return {
        success: true,
        message: 'Disconnected successfully',
      };
    } catch (error) {
      console.error('Failed to disconnect:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Disconnect failed',
      };
    }
  }

  /**
   * Change Modbus ID
   * Maps to: CMainFrame::OnToolEreaseChangeId()
   */
  static async changeModbusId(request: ModbusIdChangeRequest): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/change-modbus-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to change Modbus ID: ${errorText || response.statusText}`);
      }

      return {
        success: true,
        message: `Modbus ID changed from ${request.oldId} to ${request.newId}`,
      };
    } catch (error) {
      console.error('Failed to change Modbus ID:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to change Modbus ID',
      };
    }
  }

  /**
   * Open BACnet Tool
   * Maps to: CMainFrame::OnDatabaseBacnettool()
   */
  static async openBacnetTool(): Promise<{ success: boolean; message: string }> {
    try {
      // Navigate to BACnet tool page or open external tool
      window.open('/tools/bacnet-tool', '_blank');
      return {
        success: true,
        message: 'BACnet Tool opened',
      };
    } catch (error) {
      console.error('Failed to open BACnet Tool:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to open BACnet Tool',
      };
    }
  }

  /**
   * Open Modbus Poll
   * Maps to: CMainFrame::OnDatabaseMbpoll()
   */
  static async openModbusPoll(): Promise<{ success: boolean; message: string }> {
    try {
      window.open('/tools/modbus-poll', '_blank');
      return {
        success: true,
        message: 'Modbus Poll opened',
      };
    } catch (error) {
      console.error('Failed to open Modbus Poll:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to open Modbus Poll',
      };
    }
  }

  /**
   * Open Register Viewer
   * Maps to: CMainFrame::OnToolRegisterviewer()
   */
  static async openRegisterViewer(): Promise<{ success: boolean; message: string }> {
    try {
      window.open('/tools/register-viewer', '_blank');
      return {
        success: true,
        message: 'Register Viewer opened',
      };
    } catch (error) {
      console.error('Failed to open Register Viewer:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to open Register Viewer',
      };
    }
  }

  /**
   * Open Modbus Register v2 (beta)
   * Maps to: CMainFrame::OnWebviewModbusregister()
   */
  static async openModbusRegisterV2(): Promise<{ success: boolean; message: string }> {
    try {
      window.open('/tools/modbus-register-v2', '_blank');
      return {
        success: true,
        message: 'Modbus Register v2 opened',
      };
    } catch (error) {
      console.error('Failed to open Modbus Register v2:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to open Modbus Register v2',
      };
    }
  }

  /**
   * Open RegisterList Database Folder
   * Maps to: CMainFrame::OnFileExportregiseterslist1()
   */
  static async openRegisterListFolder(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/register-list-folder`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to get register list folder path');
      }

      const data = await response.json();
      // In web context, we might trigger a download or open a file browser
      return {
        success: true,
        message: `Register list folder: ${data.path}`,
      };
    } catch (error) {
      console.error('Failed to open register list folder:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to open register list folder',
      };
    }
  }

  /**
   * Load firmware for a single device
   * Maps to: CMainFrame::OnToolIsptoolforone()
   */
  static async loadFirmwareSingle(request: FirmwareUploadRequest): Promise<{ success: boolean; message: string }> {
    try {
      const formData = new FormData();
      formData.append('file', request.firmwareFile);
      formData.append('deviceSerialNumber', request.deviceSerialNumber.toString());
      formData.append('deviceType', request.deviceType);

      const response = await fetch(`${this.baseUrl}/tools/firmware/upload-single`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Firmware upload failed: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Firmware uploaded successfully',
      };
    } catch (error) {
      console.error('Failed to upload firmware:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Firmware upload failed',
      };
    }
  }

  /**
   * Load firmware for many devices (batch)
   * Maps to: CMainFrame::OnFileBatchburnhex()
   * Note: Currently inactive in C++
   */
  static async loadFirmwareMany(firmwareFile: File, deviceSerialNumbers: number[]): Promise<{ success: boolean; message: string }> {
    try {
      const formData = new FormData();
      formData.append('file', firmwareFile);
      formData.append('deviceSerialNumbers', JSON.stringify(deviceSerialNumbers));

      const response = await fetch(`${this.baseUrl}/tools/firmware/upload-batch`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Batch firmware upload failed: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || `Firmware uploaded to ${deviceSerialNumbers.length} devices`,
      };
    } catch (error) {
      console.error('Failed to upload firmware to multiple devices:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Batch firmware upload failed',
      };
    }
  }

  /**
   * Flash Serial Number
   * Maps to: CMainFrame::OnToolFlashsn()
   */
  static async flashSerialNumber(deviceSerialNumber: number, newSerialNumber: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/flash-sn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceSerialNumber,
          newSerialNumber,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to flash serial number: ${errorText || response.statusText}`);
      }

      return {
        success: true,
        message: `Serial number flashed to ${newSerialNumber}`,
      };
    } catch (error) {
      console.error('Failed to flash serial number:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to flash serial number',
      };
    }
  }

  /**
   * Open Psychrometry tool
   * Maps to: CMainFrame::OnToolsPsychrometry()
   */
  static async openPsychrometry(): Promise<{ success: boolean; message: string }> {
    try {
      window.open('/tools/psychrometry', '_blank');
      return {
        success: true,
        message: 'Psychrometry tool opened',
      };
    } catch (error) {
      console.error('Failed to open Psychrometry:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to open Psychrometry',
      };
    }
  }

  /**
   * Open PH Chart
   * Maps to: CMainFrame::OnToolsPhchart()
   */
  static async openPhChart(): Promise<{ success: boolean; message: string }> {
    try {
      window.open('/tools/ph-chart', '_blank');
      return {
        success: true,
        message: 'PH Chart opened',
      };
    } catch (error) {
      console.error('Failed to open PH Chart:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to open PH Chart',
      };
    }
  }

  /**
   * Open Options dialog
   * Maps to: CMainFrame::OnToolsOption()
   */
  static async openOptions(): Promise<{ success: boolean; message: string }> {
    try {
      // Navigate to options page or open options dialog
      window.location.href = '/settings/options';
      return {
        success: true,
        message: 'Options opened',
      };
    } catch (error) {
      console.error('Failed to open Options:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to open Options',
      };
    }
  }

  /**
   * Login my account
   * Maps to: CMainFrame::OnToolsLoginmyaccount()
   */
  static async loginMyAccount(): Promise<{ success: boolean; message: string }> {
    try {
      // Navigate to login page or open login dialog
      window.location.href = '/login';
      return {
        success: true,
        message: 'Login page opened',
      };
    } catch (error) {
      console.error('Failed to open login:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to open login',
      };
    }
  }
}

export default ToolsMenuService;
