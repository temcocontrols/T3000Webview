/**
 * File Menu Service
 *
 * Implements File menu operations matching C++ T3000 functionality
 *
 * C++ Reference (MainFrm.cpp):
 * - OnFileNewproject() → newProject()
 * - SaveConfigFile() → saveAs()
 * - OnLoadConfigFile() → loadFile()
 * - ImportDataBaseForFirstRun() → importData()
 */

import { API_BASE_URL } from '../config/constants';

export interface ProjectInfo {
  name: string;
  path?: string;
  createdAt?: string;
}

export interface ConfigFileMetadata {
  fileName: string;
  filePath: string;
  deviceType: string;
  protocol: string;
  fileExtension: 'prog' | 'txt' | 'ini';
}

/**
 * File Menu Service
 * Handles all File menu operations
 */
export class FileMenuService {
  private static baseUrl = `${API_BASE_URL}/api`;

  /**
   * Create a new project
   * Maps to: CMainFrame::OnFileNewproject()
   *
   * C++ Implementation:
   * - Prompts user for project name
   * - Creates new project database
   * - Checks for existing DeviceDatabase.mdb
   * - Copies resource database if needed
   */
  static async newProject(projectName: string): Promise<{ success: boolean; message: string; project?: ProjectInfo }> {
    try {
      // Validate project name
      const trimmedName = projectName.trim();
      if (!trimmedName) {
        return {
          success: false,
          message: 'Project name cannot be empty',
        };
      }

      // Call backend to create new project
      const response = await fetch(`${this.baseUrl}/file/project/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create project: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: `Project "${trimmedName}" created successfully`,
        project: data.project,
      };
    } catch (error) {
      console.error('Failed to create new project:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Save configuration file (Save As)
   * Maps to: CMainFrame::SaveConfigFile()
   *
   * C++ Implementation:
   * - Opens file dialog (*.prog for BACnet, *.txt for Tstat, *.ini for CO2/HUM)
   * - Reads all data from device
   * - Saves to selected file
   *
   * Protocol-specific behavior:
   * - BACNET_IP/MSTP: .prog file
   * - MODBUS T3 devices: .prog file
   * - Tstat devices: .txt file
   * - CO2/HUM devices: .ini file
   */
  static async saveAs(
    deviceSerialNumber: number,
    fileName: string,
    deviceType: string,
    protocol: string
  ): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      // Determine file extension based on device type
      let fileExtension: 'prog' | 'txt' | 'ini' = 'prog';

      if (deviceType.includes('TSTAT') || deviceType.includes('PM5E')) {
        fileExtension = 'txt';
      } else if (deviceType.includes('CO2') || deviceType.includes('HUM')) {
        fileExtension = 'ini';
      }

      // Ensure fileName has correct extension
      const baseName = fileName.replace(/\.(prog|txt|ini)$/i, '');
      const fullFileName = `${baseName}.${fileExtension}`;

      const response = await fetch(`${this.baseUrl}/file/save-as`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceSerialNumber,
          fileName: fullFileName,
          deviceType,
          protocol,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save file: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: `Configuration saved to ${fullFileName}`,
        filePath: data.filePath,
      };
    } catch (error) {
      console.error('Failed to save configuration file:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Load configuration file
   * Maps to: CMainFrame::OnLoadConfigFile()
   *
   * C++ Implementation:
   * - Opens file dialog based on protocol/device type
   * - Loads file and writes to device
   * - Creates thread to handle write operation
   *
   * Supported file types:
   * - BACnet devices: *.prog
   * - Modbus T3 devices: *.prog
   * - Tstat devices: *.txt
   * - CO2/HUM devices: *.ini
   */
  static async loadFile(
    deviceSerialNumber: number,
    file: File
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!['prog', 'txt', 'ini'].includes(fileExtension || '')) {
        return {
          success: false,
          message: 'Invalid file type. Supported types: .prog, .txt, .ini',
        };
      }

      // Create FormData to upload file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('deviceSerialNumber', deviceSerialNumber.toString());

      const response = await fetch(`${this.baseUrl}/file/load`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to load file: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || `Configuration loaded from ${file.name}`,
      };
    } catch (error) {
      console.error('Failed to load configuration file:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Import data from database file
   * Maps to: CMainFrame::ImportDataBaseForFirstRun()
   *
   * C++ Implementation:
   * - Checks file version from registry
   * - Imports database if version differs
   * - Updates registry with current version
   */
  static async importData(file: File): Promise<{ success: boolean; message: string }> {
    try {
      // Validate file type (typically .mdb or .db)
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!['mdb', 'db', 'sqlite', 'json'].includes(fileExtension || '')) {
        return {
          success: false,
          message: 'Invalid database file type. Supported types: .mdb, .db, .sqlite, .json',
        };
      }

      // Create FormData to upload database file
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/file/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to import data: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || `Data imported successfully from ${file.name}`,
      };
    } catch (error) {
      console.error('Failed to import data:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Exit application
   * Note: In web context, this would typically close the current tab/window
   * or redirect to a logout/home page
   */
  static async exit(): Promise<void> {
    try {
      // Perform any cleanup operations
      await fetch(`${this.baseUrl}/session/cleanup`, {
        method: 'POST',
      }).catch(() => {
        // Ignore errors during cleanup
      });

      // In a web app, we can't force close the window for security reasons
      // Instead, redirect to home or show a message
      // window.close() only works for windows opened by script

      // Option 1: Redirect to home/login
      // window.location.href = '/';

      // Option 2: Clear session and show logout message
      // (Implementation depends on your auth system)

    } catch (error) {
      console.error('Error during exit cleanup:', error);
    }
  }

  /**
   * Helper: Show file picker dialog
   * Returns selected file or null if cancelled
   */
  static async showFileDialog(accept: string): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;

      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        resolve(file || null);
      };

      input.oncancel = () => {
        resolve(null);
      };

      input.click();
    });
  }

  /**
   * Helper: Show save file dialog (using HTML5 File System Access API if available)
   * Falls back to download if not supported
   */
  static async showSaveDialog(
    suggestedName: string,
    types: { description: string; accept: Record<string, string[]> }[]
  ): Promise<string | null> {
    try {
      // Check if File System Access API is available
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types,
        });
        return handle.name;
      } else {
        // Fallback: return suggested name (will trigger download)
        return suggestedName;
      }
    } catch (error) {
      // User cancelled or error occurred
      console.log('Save dialog cancelled or error:', error);
      return null;
    }
  }
}

export default FileMenuService;
