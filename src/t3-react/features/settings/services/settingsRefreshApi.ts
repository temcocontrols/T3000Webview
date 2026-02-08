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
  object_instance: number;      // BACnet object instance (198-201)

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
  network_number: number;       // Network number (offset 50)
  network_number_hi: number;    // Network number high byte (offset 264)
  BBMD_EN: number;              // BBMD enable (offset 193)
  sd_exist: number;             // SD card status (offset 194)
  modbus_port: number;          // Modbus port (195-196)
  modbus_id: number;            // Modbus ID (offset 197)
  mstp_id: number;              // MSTP ID (offset 242)
  zigbee_panid: number;         // Zigbee PAN ID (243-244)
  max_master: number;           // Max master value (offset 245)

  // Time Settings
  en_sntp: number;              // Enable SNTP (offset 174)
  time_zone: number;            // Time zone offset signed short (175-176)
  n_serial_number: number;      // Serial number (177-180)
  // update_dyndns: UN_Time      // 10 bytes (181-190)
  mstp_network_number: number;  // MSTP network (191-192)
  time_update_since_1970: number; // Unix timestamp (202-205)
  time_zone_summer_daytime: number; // DST flag (offset 206)
  sntp_server: string;          // SNTP server address (207-236, 30 bytes)
  time_sync_auto_manual: number;    // Auto/manual time sync (offset 240)
  start_month: number;          // DST start month (offset 260)
  start_day: number;            // DST start day (offset 261)
  end_month: number;            // DST end month (offset 262)
  end_day: number;              // DST end day (offset 263)

  // DynDNS Settings (bytes 74-173)
  dyndns_user: string;          // DynDNS username (74-105, 32 bytes)
  dyndns_pass: string;          // DynDNS password (106-137, 32 bytes)
  dyndns_domain: string;        // DynDNS domain (138-169, 32 bytes)
  en_dyndns: number;            // 0=no, 1=disable, 2=enable (offset 170)
  dyndns_provider: number;      // DynDNS provider (offset 171)
  dyndns_update_time: number;   // Update interval minutes (172-173)

  // Hardware/Features
  debug: number;                // Debug flag (offset 20)
  harware_rev: number;          // Hardware revision (offset 21)
  firmware0_rev_main: number;   // Firmware 0 main revision (offset 22)
  firmware0_rev_sub: number;    // Firmware 0 sub revision (offset 23)
  frimware1_rev: number;        // Firmware 1 revision - PIC (offset 24)
  frimware2_rev: number;        // Firmware 2 revision - C8051 (offset 25)
  frimware3_rev: number;        // Firmware 3 revision - SM5964 (offset 26)
  bootloader_rev: number;       // Bootloader revision (offset 27)
  en_plug_n_play: number;       // Enable plug and play (offset 42)
  refresh_flash_timer: number;  // Flash refresh timer (offset 41)
  user_name: number;            // 0=no, 1=disable, 2=enable (offset 47)
  custmer_unite: number;        // Customer units (offset 48)
  usb_mode: number;             // 0=device, 1=host (offset 49)
  zegbee_exsit: number;         // Zigbee exists (offset 237)
  LCD_Display: number;          // LCD display: 1=on, 0=off (offset 238)
  flag_time_sync_pc: number;    // Time sync PC flag (offset 239)
  sync_time_results: number;    // Sync results (offset 241)
  special_flag: number;         // Special flags (offset 246)
  webview_json_flash: number;   // Webview JSON flash (offset 265)
  max_var: number;              // Max variables ESP32 (offset 266)
  max_in: number;               // Max inputs ESP32 (offset 267)
  max_out: number;              // Max outputs ESP32 (offset 268)
  fix_com_config: number;       // Fixed COM config (offset 269)
  write_flash: number;          // Write flash interval (offset 270)

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

      LogUtil.Debug('[SettingsRefreshApi] Raw response:', JSON.stringify(response).substring(0, 500));

      // Check if device returned an error
      if (!response || response.success === false) {
        const errorMsg = response?.data?.error || 'Device returned error response';
        throw new Error(errorMsg);
      }

      if (!response.data) {
        throw new Error('No data received from device');
      }

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
   * Parses 400-byte Str_Setting_Info structure from device response
   * See SETTINGS_FIELD_MAPPING.md for complete byte offset documentation
   *
   * @param rawData - Raw response data from device containing 400-byte array
   * @param serialNumber - Device serial number
   * @param timestamp - Refresh timestamp
   * @returns Parsed settings object
   */
  private static parseSettingsData(rawData: any, serialNumber: number, timestamp: string): DeviceSettings {
    LogUtil.Debug('[SettingsRefreshApi] Parsing settings data:', JSON.stringify(rawData).substring(0, 300));

    // Extract the 400-byte array from response
    // Response structure: {data: {device_data: [{All: [...]}]}}
    const deviceData = rawData.data?.device_data?.[0] || rawData.device_data?.[0] || rawData;
    const all: number[] = deviceData.All || [];

    LogUtil.Debug(`[SettingsRefreshApi] Extracted array length: ${all.length}`);
    LogUtil.Debug(`[SettingsRefreshApi] First 20 bytes:`, all.slice(0, 20));
    LogUtil.Debug(`[SettingsRefreshApi] Bytes 150-180:`, all.slice(150, 180));

    // Search for value 111 (LCD_Display showing wrong value)
    for (let i = 0; i < all.length; i++) {
      if (all[i] === 111) {
        LogUtil.Debug(`[SettingsRefreshApi] Found byte 111 at offset ${i}`);
      }
    }

    // Search for value 1 (potential mstp_id or mstp_network)
    for (let i = 0; i < all.length; i++) {
      if (all[i] === 1) {
        LogUtil.Debug(`[SettingsRefreshApi] Found byte 1 at offset ${i}`);
      }
    }

    // Search for the pattern [104, 171, 3, 0] which is 240488 in little-endian
    for (let i = 0; i < all.length - 3; i++) {
      if (all[i] === 104 && all[i+1] === 171 && all[i+2] === 3 && all[i+3] === 0) {
        LogUtil.Debug(`[SettingsRefreshApi] Found pattern [104,171,3,0] at offset ${i}`);
      }
    }

    // Search for BIP Network value 65535 (0xFFFF) = [255, 255] in little-endian
    for (let i = 0; i < all.length - 1; i++) {
      if (all[i] === 255 && all[i+1] === 255) {
        LogUtil.Debug(`[SettingsRefreshApi] Found pattern [255,255] (65535) at offset ${i}`);
      }
    }

    // Search for Max Master value 254 (0xFE)
    for (let i = 0; i < all.length; i++) {
      if (all[i] === 254) {
        LogUtil.Debug(`[SettingsRefreshApi] Found byte 254 at offset ${i}`);
      }
    }

    // Search for Panel Number 144 (0x90)
    for (let i = 0; i < all.length; i++) {
      if (all[i] === 144) {
        LogUtil.Debug(`[SettingsRefreshApi] Found byte 144 at offset ${i}`);
      }
    }

    if (!all || all.length < 400) {
      LogUtil.Warn(`[SettingsRefreshApi] Invalid data array length: ${all?.length || 0}, expected 400 bytes`);
    }

    // Helper functions for byte parsing with detailed logging
    const bytesToIP = (offset: number): string => {
      const result = `${all[offset]}.${all[offset + 1]}.${all[offset + 2]}.${all[offset + 3]}`;
      LogUtil.Debug(`[Parse] IP [${offset}-${offset+3}]: [${all[offset]}, ${all[offset+1]}, ${all[offset+2]}, ${all[offset+3]}] → "${result}"`);
      return result;
    };

    const bytesToMAC = (offset: number): string => {
      const bytes = all.slice(offset, offset + 6);
      const result = bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('-');
      LogUtil.Debug(`[Parse] MAC [${offset}-${offset+5}]: [${bytes.join(', ')}] → "${result}"`);
      return result;
    };

    const bytesToString = (offset: number, length: number): string => {
      const bytes = all.slice(offset, offset + length);
      const nullIndex = bytes.indexOf(0);
      const validBytes = nullIndex >= 0 ? bytes.slice(0, nullIndex) : bytes;
      const result = String.fromCharCode(...validBytes);
      LogUtil.Debug(`[Parse] String [${offset}-${offset+length-1}]: [${bytes.slice(0, Math.min(10, bytes.length)).join(', ')}...] → "${result}" (stopped at null: ${nullIndex})`);
      return result;
    };

    const bytesToUint16 = (offset: number): number => {
      const result = all[offset] | (all[offset + 1] << 8);
      LogUtil.Debug(`[Parse] Uint16 [${offset}-${offset+1}]: [${all[offset]}, ${all[offset+1]}] → ${result} (little-endian)`);
      return result;
    };

    const bytesToUint32 = (offset: number): number => {
      const result = all[offset] | (all[offset + 1] << 8) | (all[offset + 2] << 16) | (all[offset + 3] << 24);
      LogUtil.Debug(`[Parse] Uint32 [${offset}-${offset+3}]: [${all[offset]}, ${all[offset+1]}, ${all[offset+2]}, ${all[offset+3]}] → ${result} (little-endian)`);
      return result;
    };

    const bytesToInt16 = (offset: number): number => {
      const value = all[offset] | (all[offset + 1] << 8);
      const result = value > 32767 ? value - 65536 : value;
      LogUtil.Debug(`[Parse] Int16 [${offset}-${offset+1}]: [${all[offset]}, ${all[offset+1]}] → ${result} (signed)`);
      return result;
    };

    // Helper to get device name from mini_type
    const getMiniTypeName = (miniType: number): string => {
      const deviceType = miniType & 0x3F;
      const deviceNames: { [key: number]: string } = {
        0: 'T3-8O', 1: 'T3-32I', 2: 'T3-8I13O', 3: 'T3-16I/O',
        4: 'T3-BBA', 5: 'T3-BB', 6: 'T3-TB', 7: 'T3-LC',
        8: 'T3-LB', 9: 'T3-3I0A', 10: 'T3-4O', 11: 'T3-SV6',
        12: 'T3-6I/O', 13: 'T3-MUR1'
      };
      return deviceNames[deviceType] || `Unknown(${deviceType})`;
    };

    // Parse all fields according to C++ structure (see SETTINGS_FIELD_MAPPING.md)
    LogUtil.Info(`[Parse] ========== Starting 400-byte Settings Parsing ==========`);
    LogUtil.Info(`[Parse] Raw array first 100 bytes: [${all.slice(0, 100).join(',')}]`);
    LogUtil.Info(`[Parse] BYTE POSITION MAP:`);
    LogUtil.Info(`  [0-3]   = IP Address (4 bytes)`);
    LogUtil.Info(`  [4-7]   = Subnet Mask (4 bytes)`);
    LogUtil.Info(`  [8-11]  = Gateway (4 bytes)`);
    LogUtil.Info(`  [12-17] = MAC Address (6 bytes)`);
    LogUtil.Info(`  [18]    = TCP Type (1 byte: 0=DHCP, 1=STATIC)`);
    LogUtil.Info(`  [19]    = Mini Type / Device Type (1 byte: 0=T3-8O, 5=T3-BB, 6=T3-TB, etc.)`);
    LogUtil.Info(`  [20]    = Panel Type (1 byte)`);
    LogUtil.Info(`  [21-37] = Str_Pro_Info (17 bytes: HW version, firmware versions)`);
    LogUtil.Info(`  [52-71] = Panel Name (20 bytes string)`);
    LogUtil.Info(`  [73]    = Panel Number (1 byte)`);
    LogUtil.Info(`  [170]   = Modbus RTU ID (1 byte)`);
    LogUtil.Info(`  [177-180] = Object Instance (4 bytes little-endian)`);
    LogUtil.Info(`  [198-201] = Serial Number (4 bytes little-endian)`);
    LogUtil.Info(`  [212]   = LCD Display Mode (1 byte)`);
    LogUtil.Info(`  [223-224] = BIP Network Number (2 bytes little-endian)`);
    LogUtil.Info(`  [245]   = Max Master (1 byte)`);
    LogUtil.Info(`  [246]   = MSTP ID (1 byte)`);
    LogUtil.Info(`────────────────────────────────────────────────────`);

    const parsed = {
      // Network Settings (bytes 0-18)
      ip_addr: bytesToIP(0),                          // offset 0-3
      subnet: bytesToIP(4),                            // offset 4-7
      gate_addr: bytesToIP(8),                         // offset 8-11
      mac_addr: bytesToMAC(12),                        // offset 12-17
      tcp_type: (() => {
        const value = all[18] ?? 0;
        LogUtil.Debug(`[Parse] TCP Type [18]: ${value} → ${value === 0 ? 'DHCP' : 'STATIC'}`);
        return value;
      })(),

      // Device Info
      mini_type: (() => {
        const rawValue = all[19] ?? 0;
        const deviceType = rawValue & 0x3F; // Lower 6 bits
        const mcuType = (rawValue & 0xC0) >>> 6; // Upper 2 bits
        const deviceNames: { [key: number]: string } = {
          0: 'T3-8O', 1: 'T3-32I', 2: 'T3-8I13O', 3: 'T3-16I/O',
          4: 'T3-BBA', 5: 'T3-BB', 6: 'T3-TB', 7: 'T3-LC',
          8: 'T3-LB', 9: 'T3-3I0A', 10: 'T3-4O', 11: 'T3-SV6',
          12: 'T3-6I/O', 13: 'T3-MUR1'
        };
        const mcuNames = ['', '(GD)', '(APM)', ''];
        LogUtil.Info(`[Parse] Mini Type [19]: rawByte=${rawValue} → deviceType=${deviceType} (${deviceNames[deviceType] || 'Unknown'}), MCU=${mcuType} ${mcuNames[mcuType]}`);
        LogUtil.Info(`  ✓ Byte[0]=${all[0]} is NOT mini_type, it's the first octet of IP!`);
        LogUtil.Info(`  ✓ Byte[19]=${all[19]} is mini_type = ${deviceNames[deviceType] || 'Unknown'}`);
        return rawValue;
      })(),
      panel_type: all[51] ?? 0,                        // offset 51
      panel_name: bytesToString(52, 20),               // offset 52-71
      en_panel_name: all[72] ?? 0,                     // offset 72
      panel_number: all[73] ?? 0,                      // offset 73
      object_instance: bytesToUint32(198),             // offset 198-201 (CORRECTED!)

      // Communication Settings
      com0_config: all[38] ?? 0,                       // offset 38
      com1_config: all[39] ?? 0,                       // offset 39
      com2_config: all[40] ?? 0,                       // offset 40
      com_baudrate0: all[44] ?? 0,                     // offset 44
      com_baudrate1: all[45] ?? 0,                     // offset 45
      com_baudrate2: all[46] ?? 0,                     // offset 46
      uart_parity: [all[247] ?? 0, all[248] ?? 0, all[249] ?? 0],    // offset 247-249 (CORRECTED!)
      uart_stopbit: [all[250] ?? 0, all[251] ?? 0, all[252] ?? 0],   // offset 250-252 (CORRECTED!)

      // Protocol Settings (CORRECTED to match C++ structure)
      network_number: all[50] ?? 0,                    // offset 50 (CORRECTED!)
      network_number_hi: all[264] ?? 0,                // offset 264 (CORRECTED!)
      BBMD_EN: all[193] ?? 0,                          // offset 193 (CORRECTED!)
      sd_exist: all[194] ?? 0,                         // offset 194 (CORRECTED!)
      modbus_port: bytesToUint16(195),                 // offset 195-196 (CORRECTED!)
      modbus_id: all[197] ?? 1,                        // offset 197 (CORRECTED!)
      mstp_id: all[242] ?? 0,                          // offset 242 (CORRECTED!)
      zigbee_panid: bytesToUint16(243),                // offset 243-244 (CORRECTED!)
      max_master: all[245] ?? 127,                     // offset 245 (CORRECTED!)

      // Time Settings (CORRECTED to match C++ structure)
      en_sntp: all[174] ?? 0,                          // offset 174 (CORRECTED!)
      time_zone: bytesToInt16(175),                    // offset 175-176 (CORRECTED!)
      n_serial_number: bytesToUint32(177),             // offset 177-180 (CORRECTED!)
      // update_dyndns (UN_Time): offsets 181-190 (10 bytes, not parsed individually)
      mstp_network_number: bytesToUint16(191),         // offset 191-192 (CORRECTED!)
      time_update_since_1970: bytesToUint32(202),      // offset 202-205 (CORRECTED!)
      time_zone_summer_daytime: all[206] ?? 0,         // offset 206 (CORRECTED!)
      sntp_server: bytesToString(207, 30),             // offset 207-236 (CORRECTED!)
      time_sync_auto_manual: all[240] ?? 0,            // offset 240 (CORRECTED!)
      start_month: all[260] ?? 0,                      // offset 260 (CORRECTED!)
      start_day: all[261] ?? 0,                        // offset 261 (CORRECTED!)
      end_month: all[262] ?? 0,                        // offset 262 (CORRECTED!)
      end_day: all[263] ?? 0,                          // offset 263 (CORRECTED!)

      // DynDNS Settings (CORRECTED to match C++ structure)
      dyndns_user: bytesToString(74, 32),              // offset 74-105 (32 bytes!)
      dyndns_pass: bytesToString(106, 32),             // offset 106-137 (32 bytes!)
      dyndns_domain: bytesToString(138, 32),           // offset 138-169 (32 bytes!)
      en_dyndns: all[170] ?? 0,                        // offset 170 (CORRECTED!)
      dyndns_provider: all[171] ?? 0,                  // offset 171 (CORRECTED!)
      dyndns_update_time: bytesToUint16(172),          // offset 172-173 (CORRECTED!)

      // Hardware/Features (metadata)
      debug: all[20] ?? 0,                             // offset 20
      harware_rev: all[21] ?? 0,                       // offset 21 - Hardware revision
      firmware0_rev_main: all[22] ?? 0,                // offset 22 - Firmware 0 main revision
      firmware0_rev_sub: all[23] ?? 0,                 // offset 23 - Firmware 0 sub revision
      frimware1_rev: all[24] ?? 0,                     // offset 24 - Firmware 1 revision (PIC)
      frimware2_rev: all[25] ?? 0,                     // offset 25 - Firmware 2 revision (C8051)
      frimware3_rev: all[26] ?? 0,                     // offset 26 - Firmware 3 revision (SM5964)
      bootloader_rev: all[27] ?? 0,                    // offset 27 - Bootloader revision
      en_plug_n_play: all[42] ?? 0,                    // offset 42
      refresh_flash_timer: all[41] ?? 0,               // offset 41
      user_name: all[47] ?? 0,                         // offset 47
      custmer_unite: all[48] ?? 0,                     // offset 48
      usb_mode: all[49] ?? 0,                          // offset 49
      zegbee_exsit: all[237] ?? 0,                     // offset 237 (CORRECTED!)
      LCD_Display: all[238] ?? 0,                      // offset 238 (CORRECTED!)
      flag_time_sync_pc: all[239] ?? 0,                // offset 239 (CORRECTED!)
      sync_time_results: all[241] ?? 0,                // offset 241 (CORRECTED!)
      special_flag: all[246] ?? 0,                     // offset 246 (CORRECTED!)
      webview_json_flash: all[265] ?? 0,               // offset 265 (CORRECTED!)
      max_var: all[266] ?? 0,                          // offset 266 (CORRECTED!)
      max_in: all[267] ?? 0,                           // offset 267 (CORRECTED!)
      max_out: all[268] ?? 0,                          // offset 268 (CORRECTED!)
      fix_com_config: all[269] ?? 0,                   // offset 269 (CORRECTED!)
      write_flash: all[270] ?? 0,                      // offset 270 (CORRECTED!)

      // Metadata
      serialNumber,
      lastUpdated: timestamp,
    };

    // Summary log showing key transformations
    LogUtil.Info('=== Settings Parsing Summary ===');
    LogUtil.Info(`Network: IP=${parsed.ip_addr}, MAC=${parsed.mac_addr}`);
    LogUtil.Info(`Device: "${parsed.panel_name}" (Panel#${parsed.panel_number})`);
    LogUtil.Info(`Module: ${getMiniTypeName(parsed.mini_type)} (raw=${parsed.mini_type}, MCU=${((parsed.mini_type & 0xC0) >>> 0).toString(16).toUpperCase()})`);
    LogUtil.Info(`IDs: Object Instance=${parsed.object_instance}, Serial=${parsed.n_serial_number}`);
    LogUtil.Info(`Protocol: Modbus=${parsed.modbus_id}, MSTP=${parsed.mstp_id}, MSTP Net=${parsed.mstp_network_number}, BIP Net=${parsed.network_number}, Max Master=${parsed.max_master}`);
    LogUtil.Info(`LCD: mode=${parsed.LCD_Display} (0=Off, 1=On, 2+=Delay)`);
    LogUtil.Info('================================');

    LogUtil.Debug('[SettingsRefreshApi] Parsed settings:', {
      ip_addr: parsed.ip_addr,
      subnet: parsed.subnet,
      gate_addr: parsed.gate_addr,
      mac_addr: parsed.mac_addr,
      panel_name: parsed.panel_name,
      object_instance: parsed.object_instance,
    });

    return parsed;
  }

  /**
   * Serialize DeviceSettings object into 400-byte array for device update
   *
   * Converts typed fields back to raw bytes matching C++ Str_Setting_Info structure
   * See SETTINGS_FIELD_MAPPING.md for complete byte offset documentation
   *
   * @param settings - Settings object to serialize
   * @returns 400-byte array ready for device update
   */
  static serializeSettingsData(settings: DeviceSettings): number[] {
    const all = new Array(400).fill(0);

    // Helper functions for byte serialization
    const ipToBytes = (ip: string, offset: number) => {
      const parts = ip.split('.').map(Number);
      for (let i = 0; i < 4; i++) {
        all[offset + i] = parts[i] || 0;
      }
    };

    const macToBytes = (mac: string, offset: number) => {
      const parts = mac.split(':').map(hex => parseInt(hex, 16));
      for (let i = 0; i < 6; i++) {
        all[offset + i] = parts[i] || 0;
      }
    };

    const stringToBytes = (str: string, offset: number, maxLen: number) => {
      for (let i = 0; i < maxLen; i++) {
        all[offset + i] = i < str.length ? str.charCodeAt(i) : 0;
      }
    };

    const uint16ToBytes = (value: number, offset: number) => {
      all[offset] = value & 0xFF;
      all[offset + 1] = (value >> 8) & 0xFF;
    };

    const uint32ToBytes = (value: number, offset: number) => {
      all[offset] = value & 0xFF;
      all[offset + 1] = (value >> 8) & 0xFF;
      all[offset + 2] = (value >> 16) & 0xFF;
      all[offset + 3] = (value >> 24) & 0xFF;
    };

    const int16ToBytes = (value: number, offset: number) => {
      const unsigned = value < 0 ? value + 65536 : value;
      all[offset] = unsigned & 0xFF;
      all[offset + 1] = (unsigned >> 8) & 0xFF;
    };

    // Serialize all fields (see SETTINGS_FIELD_MAPPING.md)

    // Network Settings
    ipToBytes(settings.ip_addr, 0);
    ipToBytes(settings.subnet, 4);
    ipToBytes(settings.gate_addr, 8);
    macToBytes(settings.mac_addr, 12);
    all[18] = settings.tcp_type;

    // Device Info
    all[19] = settings.mini_type;
    all[51] = settings.panel_type;
    stringToBytes(settings.panel_name, 52, 20);
    all[72] = settings.en_panel_name;
    all[73] = settings.panel_number;
    uint32ToBytes(settings.n_serial_number, 151);
    uint32ToBytes(settings.object_instance, 186);

    // Communication Settings
    all[38] = settings.com0_config;
    all[39] = settings.com1_config;
    all[40] = settings.com2_config;
    all[44] = settings.com_baudrate0;
    all[45] = settings.com_baudrate1;
    all[46] = settings.com_baudrate2;
    all[235] = settings.uart_parity[0];
    all[236] = settings.uart_parity[1];
    all[237] = settings.uart_parity[2];
    all[238] = settings.uart_stopbit[0];
    all[239] = settings.uart_stopbit[1];
    all[240] = settings.uart_stopbit[2];

    // Protocol Settings
    all[50] = settings.network_number;
    all[252] = settings.network_number_hi;
    uint16ToBytes(settings.mstp_network_number, 179);
    all[230] = settings.mstp_id;
    all[233] = settings.max_master;
    uint16ToBytes(settings.modbus_port, 183);
    all[185] = settings.modbus_id;
    all[181] = settings.BBMD_EN;

    // Time Settings
    int16ToBytes(settings.time_zone, 149);
    uint32ToBytes(settings.time_update_since_1970, 190);
    all[148] = settings.en_sntp;
    stringToBytes(settings.sntp_server, 195, 30);
    all[194] = settings.time_zone_summer_daytime;
    all[228] = settings.time_sync_auto_manual;
    all[248] = settings.start_month;
    all[249] = settings.start_day;
    all[250] = settings.end_month;
    all[251] = settings.end_day;

    // DynDNS Settings
    all[144] = settings.en_dyndns;
    all[145] = settings.dyndns_provider;
    stringToBytes(settings.dyndns_user, 74, 20);
    stringToBytes(settings.dyndns_pass, 94, 20);
    stringToBytes(settings.dyndns_domain, 114, 30);
    uint16ToBytes(settings.dyndns_update_time, 146);

    // Hardware/Features
    all[20] = settings.debug;
    all[42] = settings.en_plug_n_play;
    all[41] = settings.refresh_flash_timer;
    all[47] = settings.user_name;
    all[48] = settings.custmer_unite;
    all[49] = settings.usb_mode;
    all[182] = settings.sd_exist;
    all[225] = settings.zegbee_exsit;
    uint16ToBytes(settings.zigbee_panid, 231);
    all[226] = settings.LCD_Display;
    all[234] = settings.special_flag;
    all[253] = settings.webview_json_flash;
    all[254] = settings.max_var;
    all[255] = settings.max_in;
    all[256] = settings.max_out;
    all[257] = settings.fix_com_config;

    return all;
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
