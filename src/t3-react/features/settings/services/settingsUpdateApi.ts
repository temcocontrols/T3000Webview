/**
 * Settings Update API Service
 *
 * Handles device settings update operations via FFI interface
 * Uses Action 16 (UPDATE_WEBVIEW_LIST) to send settings to device
 *
 * Update Flow:
 * 1. User modifies settings in SettingsPage
 * 2. Frontend calls updateDeviceSettings()
 * 3. Settings serialized to 400-byte array
 * 4. FFI call to device with action=16, entry_type=98
 * 5. Device receives and applies settings
 * 6. Database optionally updated after success
 *
 * @module settingsUpdateApi
 */

import LogUtil from '../../../../lib/t3-hvac/Util/LogUtil';
import type { DeviceSettings } from './settingsRefreshApi';
import { SettingsRefreshApi } from './settingsRefreshApi';

/**
 * FFI request payload for settings update
 */
interface FFIUpdateRequest {
  serial_number: number;
  entry_type: number;      // 98 for READ_SETTING_COMMAND
  action: number;           // 16 for UPDATE_WEBVIEW_LIST
  entry_index: number;      // Always 0 for settings
  data: {
    All: number[];          // 400-byte array
  };
}

/**
 * Settings update response
 */
interface SettingsUpdateResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export class SettingsUpdateApi {
  private static readonly FFI_ENDPOINT = 'http://localhost:9103/api/t3000/ffi/call';
  private static readonly ENTRY_TYPE_SETTINGS = 98;   // READ_SETTING_COMMAND
  private static readonly ACTION_UPDATE = 16;          // UPDATE_WEBVIEW_LIST

  /**
   * Update device settings via FFI
   *
   * Serializes settings object to 400-byte array and sends to device
   * using FFI Action 16 (UPDATE_WEBVIEW_LIST)
   *
   * @param settings - Settings object to update
   * @returns Promise resolving to update result
   *
   * @example
   * ```typescript
   * const updatedSettings = {
   *   ...currentSettings,
   *   ip_addr: '192.168.1.100',
   *   panel_name: 'New Panel Name'
   * };
   * const result = await SettingsUpdateApi.updateDeviceSettings(updatedSettings);
   * if (result.success) {
   *   console.log('Settings updated successfully');
   * }
   * ```
   */
  static async updateDeviceSettings(settings: DeviceSettings): Promise<SettingsUpdateResponse> {
    try {
      LogUtil.Info('[SettingsUpdateApi] Updating device settings', {
        serialNumber: settings.serialNumber,
        panel_name: settings.panel_name,
        ip_addr: settings.ip_addr,
      });

      // Serialize settings to 400-byte array
      const serializedData = SettingsRefreshApi.serializeSettingsData(settings);

      LogUtil.Debug('[SettingsUpdateApi] Serialized data length:', serializedData.length);
      LogUtil.Debug('[SettingsUpdateApi] First 50 bytes:', serializedData.slice(0, 50));

      // Construct FFI request
      const ffiRequest: FFIUpdateRequest = {
        serial_number: settings.serialNumber,
        entry_type: this.ENTRY_TYPE_SETTINGS,
        action: this.ACTION_UPDATE,
        entry_index: 0,  // Settings always at index 0
        data: {
          All: serializedData,
        },
      };

      // Send to device via FFI
      const response = await fetch(this.FFI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ffiRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FFI request failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      LogUtil.Info('[SettingsUpdateApi] Settings updated successfully', result);

      return {
        success: true,
        message: 'Settings updated successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      LogUtil.Error('[SettingsUpdateApi] Failed to update settings:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update specific setting fields
   *
   * Convenience method to update individual fields without requiring
   * full settings object. Useful for partial updates.
   *
   * @param serialNumber - Device serial number
   * @param currentSettings - Current full settings object
   * @param updates - Partial settings to update
   * @returns Promise resolving to update result
   *
   * @example
   * ```typescript
   * await SettingsUpdateApi.updateSettingsFields(
   *   12345,
   *   currentSettings,
   *   { ip_addr: '192.168.1.200', subnet: '255.255.255.0' }
   * );
   * ```
   */
  static async updateSettingsFields(
    serialNumber: number,
    currentSettings: DeviceSettings,
    updates: Partial<DeviceSettings>
  ): Promise<SettingsUpdateResponse> {
    const updatedSettings: DeviceSettings = {
      ...currentSettings,
      ...updates,
      serialNumber, // Ensure serial number is correct
      lastUpdated: new Date().toISOString(),
    };

    return this.updateDeviceSettings(updatedSettings);
  }

  /**
   * Validate settings before update
   *
   * Performs basic validation on settings values to catch
   * common errors before sending to device
   *
   * @param settings - Settings to validate
   * @returns Validation result with error messages if invalid
   */
  static validateSettings(settings: DeviceSettings): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate IP addresses
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(settings.ip_addr)) {
      errors.push('Invalid IP address format');
    }
    if (!ipRegex.test(settings.subnet)) {
      errors.push('Invalid subnet mask format');
    }
    if (!ipRegex.test(settings.gate_addr)) {
      errors.push('Invalid gateway address format');
    }

    // Validate MAC address
    const macRegex = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i;
    if (!macRegex.test(settings.mac_addr)) {
      errors.push('Invalid MAC address format (expected XX:XX:XX:XX:XX:XX)');
    }

    // Validate panel name length
    if (settings.panel_name.length > 20) {
      errors.push('Panel name too long (max 20 characters)');
    }

    // Validate SNTP server length
    if (settings.sntp_server.length > 30) {
      errors.push('SNTP server name too long (max 30 characters)');
    }

    // Validate DynDNS fields length
    if (settings.dyndns_user.length > 20) {
      errors.push('DynDNS username too long (max 20 characters)');
    }
    if (settings.dyndns_pass.length > 20) {
      errors.push('DynDNS password too long (max 20 characters)');
    }
    if (settings.dyndns_domain.length > 30) {
      errors.push('DynDNS domain too long (max 30 characters)');
    }

    // Validate numeric ranges
    if (settings.panel_number < 0 || settings.panel_number > 255) {
      errors.push('Panel number must be between 0-255');
    }
    if (settings.network_number < 0 || settings.network_number > 255) {
      errors.push('Network number must be between 0-255');
    }
    if (settings.mstp_id < 0 || settings.mstp_id > 127) {
      errors.push('MSTP ID must be between 0-127');
    }
    if (settings.max_master < 0 || settings.max_master > 127) {
      errors.push('Max master must be between 0-127');
    }
    if (settings.modbus_id < 1 || settings.modbus_id > 247) {
      errors.push('Modbus ID must be between 1-247');
    }

    // Validate time zone (-12 to +14 hours in minutes)
    if (settings.time_zone < -720 || settings.time_zone > 840) {
      errors.push('Time zone must be between -12:00 and +14:00');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
