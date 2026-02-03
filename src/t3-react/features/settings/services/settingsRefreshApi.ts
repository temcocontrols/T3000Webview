/**
 * Settings Refresh API
 *
 * Handles reading device settings using GET_WEBVIEW_LIST (Action 17)
 * with READ_SETTING_COMMAND entry type.
 *
 * Architecture:
 * - Uses T3Transport FFI to call GET_WEBVIEW_LIST
 * - Reads Str_Setting_Info structure (400 bytes)
 * - Parses settings data into typed JavaScript objects
 * - Saves to database for offline access
 */

import { T3Transport } from '../../../../lib/t3-transport/core/T3Transport';
import { T3Database } from '../../../../lib/t3-database';
import { API_BASE_URL } from '../../../config/constants';
import LogUtil from '../../../../lib/t3-hvac/Util/LogUtil';

/**
 * Settings data structure matching C++ Str_Setting_Info
 * Based on T3000-Source/T3000/ud_str.h structure definition
 */
export interface DeviceSettings {
  // Network Settings
  ip_addr: string;              // IP address (e.g., "192.168.1.100")
  subnet: string;               // Subnet mask (e.g., "255.255.255.0")
  gate_addr: string;            // Gateway address
  mac_addr: string;             // MAC address (e.g., "00:1A:2B:3C:4D:5E")
  tcp_type: number;             // 0=DHCP, 1=STATIC

  // Device Info
  mini_type: number;            // Device type
  panel_type: number;           // Panel type
  panel_name: string;           // Panel name (max 20 chars)
  en_panel_name: number;        // Enable panel name
  panel_number: number;         // Panel number
  n_serial_number: number;      // Serial number
  object_instance: number;      // BACnet object instance

  // Communication Settings
  com0_config: number;          // COM0 configuration
  com1_config: number;          // COM1 configuration
  com2_config: number;          // COM2 configuration
  com_baudrate0: number;        // COM0 baud rate
  com_baudrate1: number;        // COM1 baud rate
  com_baudrate2: number;        // COM2 baud rate
  uart_parity: number[];        // UART parity [3]
  uart_stopbit: number[];       // UART stop bits [3]

  // Protocol Settings
  network_number: number;       // Network number
  network_number_hi: number;    // Network number high byte
  mstp_network_number: number;  // MSTP network number
  mstp_id: number;              // MSTP ID
  max_master: number;           // Max master value
  modbus_port: number;          // Modbus port
  modbus_id: number;            // Modbus ID
  BBMD_EN: number;              // BBMD enable

  // Time Settings
  time_zone: number;            // Time zone offset (signed short)
  time_update_since_1970: number; // Unix timestamp
  en_sntp: number;              // Enable SNTP
  sntp_server: string;          // SNTP server address
  time_zone_summer_daytime: number; // Daylight saving time
  time_sync_auto_manual: number;    // Auto/manual time sync
  start_month: number;          // DST start month
  start_day: number;            // DST start day
  end_month: number;            // DST end month
  end_day: number;              // DST end day

  // DynDNS Settings
  en_dyndns: number;            // 0=no, 1=disable, 2=enable
  dyndns_provider: number;      // DynDNS provider
  dyndns_user: string;          // DynDNS username
  dyndns_pass: string;          // DynDNS password
  dyndns_domain: string;        // DynDNS domain
  dyndns_update_time: number;   // Update interval (minutes)

  // Hardware/Features
  debug: number;                // Debug flag
  en_plug_n_play: number;       // Enable plug and play
  refresh_flash_timer: number;  // Flash refresh timer
  user_name: number;            // 0=no, 1=disable, 2=enable
  custmer_unite: number;        // Customer units
  usb_mode: number;             // 0=device, 1=host
  sd_exist: number;             // SD card: 1=no, 2=yes
  zegbee_exsit: number;         // Zigbee exists
  zigbee_panid: number;         // Zigbee PAN ID
  LCD_Display: number;          // LCD display: 1=on, 0=off
  special_flag: number;         // Special flags
  webview_json_flash: number;   // Webview JSON flash
  max_var: number;              // Max variables (ESP32 only)
  max_in: number;               // Max inputs (ESP32 only)
  max_out: number;              // Max outputs (ESP32 only)
  fix_com_config: number;       // Fixed COM config

  // Metadata
  serialNumber: number;         // Device serial number
  lastUpdated: string;          // ISO timestamp
}

export interface RefreshResult {
  success: boolean;
  message: string;
  data?: DeviceSettings;
  timestamp: string;
}

/**
 * Settings Refresh API
 */
export class SettingsRefreshApi {

  /**
   * Refresh device settings from device using GET_WEBVIEW_LIST (Action 17)
   *
   * Uses READ_SETTING_COMMAND to read Str_Setting_Info structure (400 bytes)
   * from device and parse into typed JavaScript object
   *
   * @param serialNumber - Device serial number
   * @returns Refresh result with parsed settings data
   */
  static async refreshFromDevice(serialNumber: number): Promise<RefreshResult> {
    const timestamp = new Date().toISOString();

    try {
      LogUtil.Debug(`[SettingsRefreshApi] Refreshing settings for device ${serialNumber}`);

      // Initialize T3Transport with FFI
      const transport = new T3Transport({
        apiBaseUrl: `${API_BASE_URL}/api`
      });

      await transport.connect('ffi');

      // Call Action 17: GET_WEBVIEW_LIST with READ_SETTING_COMMAND (entryType = 98)
      // Returns single Str_Setting_Info structure (400 bytes)
      const response = await transport.getDeviceSettings(serialNumber);

      await transport.disconnect();

      if (!response || !response.data) {
        throw new Error('No data received from device');
      }

      LogUtil.Debug('[SettingsRefreshApi] Raw response:', JSON.stringify(response).substring(0, 500));

      // Parse response data
      const settings = this.parseSettingsData(response.data, serialNumber, timestamp);

      // Save to database
      await this.saveToDatabase(settings);

      return {
        success: true,
        message: 'Settings refreshed successfully',
        data: settings,
        timestamp,
      };

    } catch (error) {
      LogUtil.Error(`[SettingsRefreshApi] Refresh failed:`, error);
      return {
        success: false,
        message: `Failed to refresh settings: ${error instanceof Error ? error.message : String(error)}`,
        timestamp,
      };
    }
  }

  /**
   * Load settings from database (cached data)
   *
   * @param serialNumber - Device serial number
   * @returns Settings data or undefined if not found
   */
  static async loadFromDB(serialNumber: number): Promise<DeviceSettings | undefined> {
    try {
      // For now, return undefined to force fresh device read
      // TODO: Implement proper database caching when NETWORK_SETTINGS table schema is defined
      LogUtil.Debug(`[SettingsRefreshApi] Database caching not yet implemented for settings`);
      return undefined;
    } catch (error) {
      LogUtil.Error('[SettingsRefreshApi] Failed to load from database:', error);
      return undefined;
    }
  }

  /**
   * Parse raw device data into DeviceSettings object
   *
   * Converts byte arrays to readable formats:
   * - IP addresses: [192,168,1,100] → "192.168.1.100"
   * - MAC address: [0x00,0x1A,0x2B,0x3C,0x4D,0x5E] → "00:1A:2B:3C:4D:5E"
   * - Strings: byte arrays → UTF-8 strings
   *
   * @param rawData - Raw response data from device
   * @param serialNumber - Device serial number
   * @param timestamp - Refresh timestamp
   * @returns Parsed settings object
   */
  private static parseSettingsData(rawData: any, serialNumber: number, timestamp: string): DeviceSettings {
    // Helper: Convert byte array to IP string
    const bytesToIP = (bytes: number[]): string => {
      return bytes.slice(0, 4).join('.');
    };

    // Helper: Convert byte array to MAC string
    const bytesToMAC = (bytes: number[]): string => {
      return bytes.slice(0, 6).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
    };

    // Helper: Convert byte array to string
    const bytesToString = (bytes: number[]): string => {
      return String.fromCharCode(...bytes.filter(b => b !== 0));
    };

    // TODO: Update this parsing logic based on actual response structure
    // For now, assume response.data contains the parsed fields
    const data = rawData.device_data?.[0] || rawData;

    return {
      // Network Settings
      ip_addr: Array.isArray(data.ip_addr) ? bytesToIP(data.ip_addr) : data.ip_addr || '0.0.0.0',
      subnet: Array.isArray(data.subnet) ? bytesToIP(data.subnet) : data.subnet || '255.255.255.0',
      gate_addr: Array.isArray(data.gate_addr) ? bytesToIP(data.gate_addr) : data.gate_addr || '0.0.0.0',
      mac_addr: Array.isArray(data.mac_addr) ? bytesToMAC(data.mac_addr) : data.mac_addr || '00:00:00:00:00:00',
      tcp_type: data.tcp_type ?? 0,

      // Device Info
      mini_type: data.mini_type ?? 0,
      panel_type: data.panel_type ?? 0,
      panel_name: Array.isArray(data.panel_name) ? bytesToString(data.panel_name) : data.panel_name || '',
      en_panel_name: data.en_panel_name ?? 0,
      panel_number: data.panel_number ?? 0,
      n_serial_number: data.n_serial_number ?? serialNumber,
      object_instance: data.object_instance ?? 0,

      // Communication Settings
      com0_config: data.com0_config ?? 0,
      com1_config: data.com1_config ?? 0,
      com2_config: data.com2_config ?? 0,
      com_baudrate0: data.com_baudrate0 ?? 0,
      com_baudrate1: data.com_baudrate1 ?? 0,
      com_baudrate2: data.com_baudrate2 ?? 0,
      uart_parity: data.uart_parity || [0, 0, 0],
      uart_stopbit: data.uart_stopbit || [0, 0, 0],

      // Protocol Settings
      network_number: data.network_number ?? 0,
      network_number_hi: data.network_number_hi ?? 0,
      mstp_network_number: data.mstp_network_number ?? 0,
      mstp_id: data.mstp_id ?? 0,
      max_master: data.max_master ?? 127,
      modbus_port: data.modbus_port ?? 502,
      modbus_id: data.modbus_id ?? 1,
      BBMD_EN: data.BBMD_EN ?? 0,

      // Time Settings
      time_zone: data.time_zone ?? 0,
      time_update_since_1970: data.time_update_since_1970 ?? 0,
      en_sntp: data.en_sntp ?? 0,
      sntp_server: Array.isArray(data.sntp_server) ? bytesToString(data.sntp_server) : data.sntp_server || '',
      time_zone_summer_daytime: data.time_zone_summer_daytime ?? 0,
      time_sync_auto_manual: data.time_sync_auto_manual ?? 0,
      start_month: data.start_month ?? 3,
      start_day: data.start_day ?? 10,
      end_month: data.end_month ?? 11,
      end_day: data.end_day ?? 3,

      // DynDNS Settings
      en_dyndns: data.en_dyndns ?? 0,
      dyndns_provider: data.dyndns_provider ?? 0,
      dyndns_user: Array.isArray(data.dyndns_user) ? bytesToString(data.dyndns_user) : data.dyndns_user || '',
      dyndns_pass: Array.isArray(data.dyndns_pass) ? bytesToString(data.dyndns_pass) : data.dyndns_pass || '',
      dyndns_domain: Array.isArray(data.dyndns_domain) ? bytesToString(data.dyndns_domain) : data.dyndns_domain || '',
      dyndns_update_time: data.dyndns_update_time ?? 60,

      // Hardware/Features
      debug: data.debug ?? 0,
      en_plug_n_play: data.en_plug_n_play ?? 0,
      refresh_flash_timer: data.refresh_flash_timer ?? 0,
      user_name: data.user_name ?? 0,
      custmer_unite: data.custmer_unite ?? 0,
      usb_mode: data.usb_mode ?? 0,
      sd_exist: data.sd_exist ?? 1,
      zegbee_exsit: data.zegbee_exsit ?? 0,
      zigbee_panid: data.zigbee_panid ?? 0,
      LCD_Display: data.LCD_Display ?? 1,
      special_flag: data.special_flag ?? 0,
      webview_json_flash: data.webview_json_flash ?? 0,
      max_var: data.max_var ?? 0,
      max_in: data.max_in ?? 0,
      max_out: data.max_out ?? 0,
      fix_com_config: data.fix_com_config ?? 0,

      // Metadata
      serialNumber,
      lastUpdated: timestamp,
    };
  }

  /**
   * Save settings to database
   *
   * Upserts into NETWORK_SETTINGS table
   *
   * @param settings - Settings data to save
   */
  private static async saveToDatabase(settings: DeviceSettings): Promise<void> {
    try {
      // For now, skip database save - settings will be read fresh from device each time
      // TODO: Implement proper database caching when NETWORK_SETTINGS table schema is defined
      LogUtil.Debug(`[SettingsRefreshApi] Database caching not yet implemented for settings (device ${settings.n_serial_number})`);
    } catch (error) {
      LogUtil.Error('[SettingsRefreshApi] Failed to save to database:', error);
      // Don't throw - this is not critical for functionality
    }
  }
}
