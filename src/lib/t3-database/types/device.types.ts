/**
 * Device Type Definitions
 * TypeScript interfaces matching C++ database schema exactly
 * Field names use C++ conventions (Full_Label, Auto_Manual, Range_Field, etc.)
 */

// ============================================================================
// DEVICES Table (Main device registry)
// ============================================================================
export interface Device {
  SerialNumber: number;                // Primary key
  PanelId?: number;
  MainBuilding_Name?: string;
  Building_Name?: string;
  Floor_Name?: string;
  Room_Name?: string;
  Panel_Number?: number;
  Network_Number?: number;
  Product_Name?: string;
  Product_Class_ID?: number;
  Product_ID?: number;
  Screen_Name?: string;
  Bautrate?: number;
  Address?: number;
  Register?: number;
  Function?: number;
  Description?: string;
  High_Units?: string;
  Low_Units?: string;
  Update_Field?: string;
  Status?: string;
  Range_Field?: string;
  Calibration?: string;
  // Network fields
  ip_address?: string;
  port?: number;
  bacnet_mstp_mac_id?: number;
  modbus_address?: number;
  pc_ip_address?: string;
  modbus_port?: number;
  bacnet_ip_port?: number;
  show_label_name?: number;
  connection_type?: number;
}

// ============================================================================
// NETWORK_SETTINGS Table (1:1 with DEVICES)
// ============================================================================
export interface NetworkSettings {
  SerialNumber: number;                // Primary key (1:1 with DEVICES)
  IP_Address?: string;                 // e.g., "192.168.1.100"
  Subnet?: string;                     // e.g., "255.255.255.0"
  Gateway?: string;
  MAC_Address?: string;                // e.g., "00:11:22:33:44:55"
  TCP_Type?: number;                   // 0=DHCP, 1=Static
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// COMMUNICATION_SETTINGS Table (1:1 with DEVICES)
// ============================================================================
export interface CommunicationSettings {
  SerialNumber: number;                // Primary key (1:1 with DEVICES)
  COM0_Config?: number;
  COM1_Config?: number;
  COM2_Config?: number;
  COM_Baudrate0?: number;
  COM_Baudrate1?: number;
  COM_Baudrate2?: number;
  UART_Parity0?: number;
  UART_Parity1?: number;
  UART_Parity2?: number;
  UART_Stopbit0?: number;
  UART_Stopbit1?: number;
  UART_Stopbit2?: number;
  Fix_COM_Config?: number;             // 0=auto, non-0=fixed
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// PROTOCOL_SETTINGS Table (1:1 with DEVICES)
// ============================================================================
export interface ProtocolSettings {
  SerialNumber: number;                // Primary key (1:1 with DEVICES)
  Modbus_ID?: number;
  Modbus_Port?: number;
  MSTP_ID?: number;
  MSTP_Network_Number?: number;
  Max_Master?: number;                 // Max 245
  Object_Instance?: number;            // BACnet
  BBMD_Enable?: number;                // 0=disabled, 1=enabled
  Network_Number?: number;
  Network_Number_Hi?: number;          // High byte
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// TIME_SETTINGS Table (1:1 with DEVICES)
// ============================================================================
export interface TimeSettings {
  SerialNumber: number;                // Primary key (1:1 with DEVICES)
  Time_Zone?: number;                  // Signed short
  Time_Zone_Summer_Daytime?: number;   // DST flag
  Time_Update_Since_1970?: number;     // Unix timestamp
  Enable_SNTP?: number;                // 0=no, 1=disable, 2=enable
  SNTP_Server?: string;                // 30 bytes
  Flag_Time_Sync_PC?: number;          // 0=no sync, 1=sync
  Time_Sync_Auto_Manual?: number;      // 0=SNTP, 1=PC
  Sync_Time_Results?: number;          // 0=failed, 1=success
  Start_Month?: number;                // DST start
  Start_Day?: number;
  End_Month?: number;                  // DST end
  End_Day?: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// DYNDNS_SETTINGS Table (1:1 with DEVICES)
// ============================================================================
export interface DynDnsSettings {
  SerialNumber: number;                // Primary key (1:1 with DEVICES)
  Enable_DynDNS?: number;              // 0=no, 1=disable, 2=enable
  DynDNS_Provider?: number;            // 0=3322.org, 1=dyndns.com, 2=no-ip.com
  DynDNS_User?: string;                // 32 bytes
  DynDNS_Pass?: string;                // 32 bytes
  DynDNS_Domain?: string;              // 32 bytes
  DynDNS_Update_Time?: number;         // Minutes
  Update_DynDNS_Time?: string;         // Timestamp
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// HARDWARE_INFO Table (1:1 with DEVICES)
// ============================================================================
export interface HardwareInfo {
  SerialNumber: number;                // Primary key (1:1 with DEVICES)
  Hardware_Rev?: number;
  Firmware0_Rev_Main?: number;
  Firmware0_Rev_Sub?: number;
  Firmware1_Rev?: number;              // PIC
  Firmware2_Rev?: number;              // C8051
  Firmware3_Rev?: number;              // SM5964
  Bootloader_Rev?: number;
  Mini_Type?: number;
  Panel_Type?: number;
  USB_Mode?: number;                   // 0=device, 1=host
  SD_Exist?: number;                   // 1=no, 2=yes, 3=file system ready
  Zigbee_Exist?: number;
  Zigbee_PanID?: number;
  Special_Flag?: number;               // Bitfield: bit0=PT1K, bit1=PT100
  Max_Var?: number;                    // ESP32 only, ST fixed at 128
  Max_In?: number;                     // ESP32 only, ST fixed at 64
  Max_Out?: number;                    // ESP32 only, ST fixed at 64
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// FEATURE_FLAGS Table (1:1 with DEVICES)
// ============================================================================
export interface FeatureFlags {
  SerialNumber: number;                // Primary key (1:1 with DEVICES)
  User_Name_Enable?: number;           // 0=no, 1=disable, 2=enable
  Customer_Unite_Enable?: number;      // 0=no, 1=enable
  Enable_Panel_Name?: number;          // 0=disabled, 1=enabled
  LCD_Display?: number;                // 0=hide, 1=show
  LCD_Display_Type?: number;
  LCD_Point_Type?: number;
  LCD_Point_Number?: number;
  LCD_BACnet_Instance?: number;
  Enable_Plug_N_Play?: number;
  Refresh_Flash_Timer?: number;
  Reset_Default?: number;              // Write 88=reset defaults, 77=restore
  Debug?: number;
  Webview_JSON_Flash?: number;         // 0=old way, 2=new JSON way
  Write_Flash?: number;                // 0=disabled, non-0=enabled
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// WIFI_SETTINGS Table (1:1 with DEVICES)
// ============================================================================
export interface WifiSettings {
  SerialNumber: number;                // Primary key (1:1 with DEVICES)
  Wifi_Enable?: number;
  IP_Auto_Manual?: number;             // 0=DHCP, 1=static
  IP_Wifi_Status?: number;
  Load_Default?: number;
  Modbus_Port?: number;
  BACnet_Port?: number;
  Software_Version?: number;
  Username?: string;                   // 64 bytes, WiFi SSID
  Password?: string;                   // 32 bytes, WiFi password
  IP_Address?: string;
  Net_Mask?: string;
  Gateway?: string;
  Wifi_MAC?: string;                   // Read-only
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// MISC_SETTINGS Table (1:1 with DEVICES)
// ============================================================================
export interface MiscSettings {
  SerialNumber: number;                // Primary key (1:1 with DEVICES)
  Flag1?: number;                      // Version check
  Flag2?: number;                      // Version check, should be 0x55ff
  Monitor_Analog_Block_0?: number;
  Monitor_Analog_Block_1?: number;
  Monitor_Analog_Block_2?: number;
  Monitor_Analog_Block_3?: number;
  Monitor_Analog_Block_4?: number;
  Monitor_Analog_Block_5?: number;
  Monitor_Analog_Block_6?: number;
  Monitor_Analog_Block_7?: number;
  Monitor_Analog_Block_8?: number;
  Monitor_Analog_Block_9?: number;
  Monitor_Analog_Block_10?: number;
  Monitor_Analog_Block_11?: number;
  Monitor_Digital_Block_0?: number;
  Monitor_Digital_Block_1?: number;
  Monitor_Digital_Block_2?: number;
  Monitor_Digital_Block_3?: number;
  Monitor_Digital_Block_4?: number;
  Monitor_Digital_Block_5?: number;
  Monitor_Digital_Block_6?: number;
  Monitor_Digital_Block_7?: number;
  Monitor_Digital_Block_8?: number;
  Monitor_Digital_Block_9?: number;
  Monitor_Digital_Block_10?: number;
  Monitor_Digital_Block_11?: number;
  Operation_Time_0?: number;
  Operation_Time_1?: number;
  Operation_Time_2?: number;
  Operation_Time_3?: number;
  Operation_Time_4?: number;
  Operation_Time_5?: number;
  Operation_Time_6?: number;
  Operation_Time_7?: number;
  Operation_Time_8?: number;
  Operation_Time_9?: number;
  Operation_Time_10?: number;
  Operation_Time_11?: number;
  Network_Health_Flag?: number;        // 0x55 for network health
  COM_RX_0?: number;
  COM_RX_1?: number;
  COM_RX_2?: number;
  COM_TX_0?: number;
  COM_TX_1?: number;
  COM_TX_2?: number;
  Collision_0?: number;
  Collision_1?: number;
  Collision_2?: number;
  Packet_Error_0?: number;
  Packet_Error_1?: number;
  Packet_Error_2?: number;
  Timeout_0?: number;
  Timeout_1?: number;
  Timeout_2?: number;
  created_at?: string;
  updated_at?: string;
}
