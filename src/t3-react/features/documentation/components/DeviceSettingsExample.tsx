/**
 * Device Settings Example Component
 * Shows interactive demo data with mapping table
 */

import React, { useState } from 'react';
import styles from './DeviceSettingsExample.module.css';

// Sample 400-byte data from device
const SAMPLE_DATA = [192,168,0,144,255,255,255,0,192,168,0,0,0,14,198,242,224,195,0,5,0,29,68,2,22,48,1,73,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,9,6,9,0,0,0,255,74,70,97,110,100,117,49,52,52,45,66,66,0,64,244,115,0,88,182,21,0,1,144,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,3,32,3,104,171,3,0,32,106,0,32,177,37,0,8,93,17,1,0,0,1,246,1,1,104,171,3,0,88,210,199,104,0,110,122,46,112,111,111,108,46,110,116,112,46,111,114,103,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,1,1,0,0,0,0,254,1,0,0,0,0,0,0,0,0,0,0,0,0,0,3,14,0,7,255,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

interface MappingRow {
  offset: number;
  size: number;
  field: string;
  format: string;
  cppField: string;
  frontField: string;
  example: string;
  parseCode: string;
}

const MAPPING_TABLE: MappingRow[] = [
  {
    offset: 0,
    size: 4,
    field: 'IP Address',
    format: 'IPv4',
    cppField: 'uint8_t ip_addr[4]',
    frontField: 'ipAddress',
    example: '192.168.0.144',
    parseCode: `const ip = \`\${data[0]}.\${data[1]}.\${data[2]}.\${data[3]}\`;
// Result: "192.168.0.144"`
  },
  {
    offset: 4,
    size: 4,
    field: 'Subnet Mask',
    format: 'IPv4',
    cppField: 'uint8_t subnet[4]',
    frontField: 'subnet',
    example: '255.255.255.0',
    parseCode: `const subnet = \`\${data[4]}.\${data[5]}.\${data[6]}.\${data[7]}\`;
// Result: "255.255.255.0"`
  },
  {
    offset: 8,
    size: 4,
    field: 'Gateway',
    format: 'IPv4',
    cppField: 'uint8_t gate_addr[4]',
    frontField: 'gateway',
    example: '192.168.0.0',
    parseCode: `const gateway = \`\${data[8]}.\${data[9]}.\${data[10]}.\${data[11]}\`;
// Result: "192.168.0.0"`
  },
  {
    offset: 12,
    size: 6,
    field: 'MAC Address',
    format: 'Hex',
    cppField: 'uint8_t mac_addr[6]',
    frontField: 'macAddress',
    example: '00:0E:C6:F2:E0:C3',
    parseCode: `const mac = [12, 13, 14, 15, 16, 17]
  .map(i => data[i].toString(16).padStart(2, '0').toUpperCase())
  .join(':');
// Result: "00:0E:C6:F2:E0:C3"`
  },
  {
    offset: 18,
    size: 1,
    field: 'TCP Type',
    format: 'Enum',
    cppField: 'uint8_t tcp_type',
    frontField: 'tcpType',
    example: 'DHCP',
    parseCode: `const tcpType = data[18] === 0 ? 'DHCP' : 'Static';
// Result: "DHCP" (data[18] = 0)`
  },
  {
    offset: 19,
    size: 1,
    field: 'Mini Type',
    format: 'Uint8',
    cppField: 'uint8_t mini_type',
    frontField: 'miniType',
    example: '5',
    parseCode: `const miniType = data[19];
// Result: 5`
  },
  {
    offset: 20,
    size: 1,
    field: 'Debug',
    format: 'Uint8',
    cppField: 'uint8_t debug',
    frontField: 'debug',
    example: '0',
    parseCode: `const debug = data[20];
// Result: 0`
  },
  {
    offset: 21,
    size: 17,
    field: 'Pro Info',
    format: 'Struct',
    cppField: 'Str_Pro_Info pro_info',
    frontField: 'proInfo',
    example: '[Structure]',
    parseCode: `// Str_Pro_Info is a 17-byte structure
// Contains protocol information
const proInfo = data.slice(21, 38);
// Result: 17-byte structure`
  },
  {
    offset: 38,
    size: 1,
    field: 'COM0 Config',
    format: 'Uint8',
    cppField: 'uint8_t com0_config',
    frontField: 'com0Config',
    example: '1',
    parseCode: `const com0Config = data[38];
// Result: 1`
  },
  {
    offset: 39,
    size: 1,
    field: 'COM1 Config',
    format: 'Uint8',
    cppField: 'uint8_t com1_config',
    frontField: 'com1Config',
    example: '0',
    parseCode: `const com1Config = data[39];
// Result: 0`
  },
  {
    offset: 40,
    size: 1,
    field: 'COM2 Config',
    format: 'Uint8',
    cppField: 'uint8_t com2_config',
    frontField: 'com2Config',
    example: '0',
    parseCode: `const com2Config = data[40];
// Result: 0`
  },
  {
    offset: 41,
    size: 1,
    field: 'Refresh Flash Timer',
    format: 'Uint8',
    cppField: 'uint8_t refresh_flash_timer',
    frontField: 'refreshFlashTimer',
    example: '0',
    parseCode: `const refreshFlashTimer = data[41];
// Result: 0`
  },
  {
    offset: 42,
    size: 1,
    field: 'Enable Plug N Play',
    format: 'Uint8',
    cppField: 'uint8_t en_plug_n_play',
    frontField: 'enPlugNPlay',
    example: '1',
    parseCode: `const enPlugNPlay = data[42];
// Result: 1`
  },
  {
    offset: 43,
    size: 1,
    field: 'Reset Default',
    format: 'Uint8',
    cppField: 'uint8_t reset_default',
    frontField: 'resetDefault',
    example: '0',
    parseCode: `const resetDefault = data[43];
// Write 88 to reset, 77 to blink
// Result: 0`
  },
  {
    offset: 44,
    size: 1,
    field: 'COM0 Baudrate',
    format: 'Index',
    cppField: 'uint8_t com_baudrate0',
    frontField: 'com0Baudrate',
    example: '19200',
    parseCode: `const baudRates = [9600, 19200, 38400, 57600, 115200];
const com0Baudrate = baudRates[data[44]] || 9600;
// Result: 19200 (data[44] = 1)`
  },
  {
    offset: 45,
    size: 1,
    field: 'COM1 Baudrate',
    format: 'Index',
    cppField: 'uint8_t com_baudrate1',
    frontField: 'com1Baudrate',
    example: '38400',
    parseCode: `const baudRates = [9600, 19200, 38400, 57600, 115200];
const com1Baudrate = baudRates[data[45]] || 9600;
// Result: 38400 (data[45] = 2)`
  },
  {
    offset: 46,
    size: 1,
    field: 'COM2 Baudrate',
    format: 'Index',
    cppField: 'uint8_t com_baudrate2',
    frontField: 'com2Baudrate',
    example: '19200',
    parseCode: `const baudRates = [9600, 19200, 38400, 57600, 115200];
const com2Baudrate = baudRates[data[46]] || 9600;
// Result: 19200 (data[46] = 1)`
  },
  {
    offset: 47,
    size: 1,
    field: 'User Name',
    format: 'Enum',
    cppField: 'uint8_t user_name',
    frontField: 'userName',
    example: 'Disabled',
    parseCode: `const userName = data[47] === 0 ? 'No' :
  data[47] === 1 ? 'Disabled' : 'Enabled';
// Result: "Disabled"`
  },
  {
    offset: 48,
    size: 1,
    field: 'Customer Unite',
    format: 'Uint8',
    cppField: 'uint8_t custmer_unite',
    frontField: 'customerUnite',
    example: '0',
    parseCode: `const customerUnite = data[48];
// Result: 0`
  },
  {
    offset: 49,
    size: 1,
    field: 'USB Mode',
    format: 'Enum',
    cppField: 'uint8_t usb_mode',
    frontField: 'usbMode',
    example: 'Device',
    parseCode: `const usbMode = data[49] === 0 ? 'Device' : 'Host';
// Result: "Device"`
  },
  {
    offset: 50,
    size: 1,
    field: 'Network Number',
    format: 'Uint8',
    cppField: 'uint8_t network_number',
    frontField: 'networkNumber',
    example: '255',
    parseCode: `const networkNumber = data[50];
// Result: 255`
  },
  {
    offset: 51,
    size: 1,
    field: 'Panel Type',
    format: 'Uint8',
    cppField: 'uint8_t panel_type',
    frontField: 'panelType',
    example: '74',
    parseCode: `const panelType = data[51];
// Result: 74`
  },
  {
    offset: 52,
    size: 20,
    field: 'Panel Name',
    format: 'String',
    cppField: 'char panel_name[20]',
    frontField: 'panelName',
    example: 'Fandu144-BB',
    parseCode: `const bytes = [];
for (let i = 0; i < 20; i++) {
  const byte = data[52 + i];
  if (byte === 0) break;
  bytes.push(byte);
}
const panelName = String.fromCharCode(...bytes);
// Result: "Fandu144-BB"`
  },
  {
    offset: 72,
    size: 1,
    field: 'Enable Panel Name',
    format: 'Uint8',
    cppField: 'uint8_t en_panel_name',
    frontField: 'enPanelName',
    example: '0',
    parseCode: `const enPanelName = data[72];
// Result: 0`
  },
  {
    offset: 73,
    size: 1,
    field: 'Panel Number',
    format: 'Uint8',
    cppField: 'uint8_t panel_number',
    frontField: 'panelNumber',
    example: '144',
    parseCode: `const panelNumber = data[73];
// Result: 144`
  },
  {
    offset: 74,
    size: 32,
    field: 'DynDNS User',
    format: 'String',
    cppField: 'char dyndns_user[32]',
    frontField: 'dyndnsUser',
    example: '',
    parseCode: `const bytes = [];
for (let i = 0; i < 32; i++) {
  const byte = data[74 + i];
  if (byte === 0) break;
  bytes.push(byte);
}
const dyndnsUser = String.fromCharCode(...bytes);
// Result: ""`
  },
  {
    offset: 106,
    size: 32,
    field: 'DynDNS Password',
    format: 'String',
    cppField: 'char dyndns_pass[32]',
    frontField: 'dyndnsPass',
    example: '',
    parseCode: `const bytes = [];
for (let i = 0; i < 32; i++) {
  const byte = data[106 + i];
  if (byte === 0) break;
  bytes.push(byte);
}
const dyndnsPass = String.fromCharCode(...bytes);
// Result: ""`
  },
  {
    offset: 138,
    size: 32,
    field: 'DynDNS Domain',
    format: 'String',
    cppField: 'char dyndns_domain[32]',
    frontField: 'dyndnsDomain',
    example: '',
    parseCode: `const bytes = [];
for (let i = 0; i < 32; i++) {
  const byte = data[138 + i];
  if (byte === 0) break;
  bytes.push(byte);
}
const dyndnsDomain = String.fromCharCode(...bytes);
// Result: ""`
  },
  {
    offset: 170,
    size: 1,
    field: 'Enable DynDNS',
    format: 'Enum',
    cppField: 'uint8_t en_dyndns',
    frontField: 'enDyndns',
    example: 'No',
    parseCode: `const enDyndns = data[170] === 0 ? 'No' :
  data[170] === 1 ? 'Disabled' : 'Enabled';
// Result: "No"`
  },
  {
    offset: 171,
    size: 1,
    field: 'DynDNS Provider',
    format: 'Enum',
    cppField: 'uint8_t dyndns_provider',
    frontField: 'dyndnsProvider',
    example: 'www.3322.org',
    parseCode: `const providers = ['www.3322.org', 'www.dyndns.com', 'www.no-ip.com'];
const dyndnsProvider = providers[data[171]] || providers[0];
// Result: "www.3322.org"`
  },
  {
    offset: 172,
    size: 2,
    field: 'DynDNS Update Time',
    format: 'Uint16 LE',
    cppField: 'uint16_t dyndns_update_time',
    frontField: 'dyndnsUpdateTime',
    example: '0',
    parseCode: `const dyndnsUpdateTime = data[172] | (data[173] << 8);
// Result: 0 (minutes)`
  },
  {
    offset: 174,
    size: 1,
    field: 'Enable SNTP',
    format: 'Enum',
    cppField: 'uint8_t en_sntp',
    frontField: 'enSntp',
    example: 'No',
    parseCode: `const enSntp = data[174] === 0 ? 'No' : 'Disabled';
// Result: "No"`
  },
  {
    offset: 175,
    size: 2,
    field: 'Time Zone',
    format: 'Int16 LE',
    cppField: 'signed short time_zone',
    frontField: 'timeZone',
    example: '0',
    parseCode: `const timeZone = data[175] | (data[176] << 8);
// Signed 16-bit value
// Result: 0`
  },
  {
    offset: 177,
    size: 4,
    field: 'Serial Number',
    format: 'Uint32 LE',
    cppField: 'unsigned int n_serial_number',
    frontField: 'serialNumber',
    example: '1581674',
    parseCode: `const serialNumber =
  data[177] |
  (data[178] << 8) |
  (data[179] << 16) |
  (data[180] << 24);
// Result: 1581674 (little-endian)`
  },
  {
    offset: 181,
    size: 10,
    field: 'Update DynDNS Time',
    format: 'Struct',
    cppField: 'UN_Time update_dyndns',
    frontField: 'updateDyndns',
    example: '[Time struct]',
    parseCode: `// UN_Time is a 10-byte time structure
const updateDyndns = data.slice(181, 191);
// Result: Time structure`
  },
  {
    offset: 191,
    size: 2,
    field: 'MSTP Network Number',
    format: 'Uint16 LE',
    cppField: 'uint16_t mstp_network_number',
    frontField: 'mstpNetworkNumber',
    example: '0',
    parseCode: `const mstpNetworkNumber = data[191] | (data[192] << 8);
// Result: 0`
  },
  {
    offset: 193,
    size: 1,
    field: 'BBMD Enable',
    format: 'Uint8',
    cppField: 'unsigned char BBMD_EN',
    frontField: 'bbmdEn',
    example: '0',
    parseCode: `const bbmdEn = data[193];
// Result: 0`
  },
  {
    offset: 194,
    size: 1,
    field: 'SD Exist',
    format: 'Uint8',
    cppField: 'unsigned char sd_exist',
    frontField: 'sdExist',
    example: '0',
    parseCode: `const sdExist = data[194];
// Result: 0`
  },
  {
    offset: 195,
    size: 2,
    field: 'Modbus Port',
    format: 'Uint16 LE',
    cppField: 'unsigned short modbus_port',
    frontField: 'modbusPort',
    example: '502',
    parseCode: `const modbusPort = data[195] | (data[196] << 8);
// Result: 502`
  },
  {
    offset: 197,
    size: 1,
    field: 'Modbus ID',
    format: 'Uint8',
    cppField: 'unsigned char modbus_id',
    frontField: 'modbusId',
    example: '1',
    parseCode: `const modbusId = data[197];
// Result: 1`
  },
  {
    offset: 198,
    size: 4,
    field: 'Object Instance',
    format: 'Uint32 LE',
    cppField: 'unsigned int object_instance',
    frontField: 'objectInstance',
    example: '0',
    parseCode: `const objectInstance =
  data[198] |
  (data[199] << 8) |
  (data[200] << 16) |
  (data[201] << 24);
// Result: 0`
  },
  {
    offset: 202,
    size: 4,
    field: 'Time Update Since 1970',
    format: 'Uint32 LE',
    cppField: 'unsigned int time_update_since_1970',
    frontField: 'timeUpdateSince1970',
    example: '0',
    parseCode: `const timeUpdateSince1970 =
  data[202] |
  (data[203] << 8) |
  (data[204] << 16) |
  (data[205] << 24);
// Unix timestamp
// Result: 0`
  },
  {
    offset: 206,
    size: 1,
    field: 'Time Zone Summer Daytime',
    format: 'Uint8',
    cppField: 'unsigned char time_zone_summer_daytime',
    frontField: 'timeZoneSummerDaytime',
    example: '0',
    parseCode: `const timeZoneSummerDaytime = data[206];
// Result: 0`
  },
  {
    offset: 207,
    size: 30,
    field: 'SNTP Server',
    format: 'String',
    cppField: 'char sntp_server[30]',
    frontField: 'sntpServer',
    example: 'nz.pool.ntp.org',
    parseCode: `const bytes = [];
for (let i = 0; i < 30; i++) {
  const byte = data[207 + i];
  if (byte === 0) break;
  bytes.push(byte);
}
const sntpServer = String.fromCharCode(...bytes);
// Result: "nz.pool.ntp.org"`
  },
  {
    offset: 237,
    size: 1,
    field: 'Zigbee Exist',
    format: 'Uint8',
    cppField: 'unsigned char zegbee_exsit',
    frontField: 'zigbeeExist',
    example: '0',
    parseCode: `const zigbeeExist = data[237];
// Result: 0`
  },
  {
    offset: 238,
    size: 1,
    field: 'LCD Display',
    format: 'Boolean',
    cppField: 'unsigned char LCD_Display',
    frontField: 'lcdDisplay',
    example: 'Off',
    parseCode: `const lcdDisplay = data[238] === 1 ? 'On' : 'Off';
// Result: "Off" (data[238] = 0)`
  },
  {
    offset: 239,
    size: 1,
    field: 'Flag Time Sync PC',
    format: 'Boolean',
    cppField: 'unsigned char flag_time_sync_pc',
    frontField: 'flagTimeSyncPc',
    example: 'No',
    parseCode: `const flagTimeSyncPc = data[239] === 1 ? 'Yes' : 'No';
// Result: "No"`
  },
  {
    offset: 240,
    size: 1,
    field: 'Time Sync Auto/Manual',
    format: 'Enum',
    cppField: 'unsigned char time_sync_auto_manual',
    frontField: 'timeSyncAutoManual',
    example: 'Server',
    parseCode: `const timeSyncAutoManual = data[240] === 0 ? 'Server' : 'PC';
// 0: Server sync, 1: PC sync
// Result: "Server"`
  },
  {
    offset: 241,
    size: 1,
    field: 'Sync Time Results',
    format: 'Enum',
    cppField: 'unsigned char sync_time_results',
    frontField: 'syncTimeResults',
    example: 'Failed',
    parseCode: `const syncTimeResults = data[241] === 1 ? 'Success' : 'Failed';
// Result: "Failed"`
  },
  {
    offset: 242,
    size: 1,
    field: 'MSTP ID',
    format: 'Uint8',
    cppField: 'unsigned char mstp_id',
    frontField: 'mstpId',
    example: '0',
    parseCode: `const mstpId = data[242];
// Result: 0`
  },
  {
    offset: 243,
    size: 2,
    field: 'Zigbee PAN ID',
    format: 'Uint16 LE',
    cppField: 'unsigned short zigbee_panid',
    frontField: 'zigbeePanid',
    example: '0',
    parseCode: `const zigbeePanid = data[243] | (data[244] << 8);
// Result: 0`
  },
  {
    offset: 245,
    size: 1,
    field: 'Max Master',
    format: 'Uint8',
    cppField: 'unsigned char max_master',
    frontField: 'maxMaster',
    example: '3',
    parseCode: `const maxMaster = data[245];
// Max master value (up to 245)
// Result: 3`
  },
  {
    offset: 246,
    size: 1,
    field: 'Special Flag',
    format: 'Bitfield',
    cppField: 'unsigned char special_flag',
    frontField: 'specialFlag',
    example: 'PT1K=No, PT100=No',
    parseCode: `const specialFlag = data[246];
// bit 0: PT1K sensor support
// bit 1: PT100 support
const pt1k = (specialFlag & 0x01) ? 'Yes' : 'No';
const pt100 = (specialFlag & 0x02) ? 'Yes' : 'No';
// Result: "PT1K=No, PT100=No"`
  },
  {
    offset: 247,
    size: 3,
    field: 'UART Parity',
    format: 'Array',
    cppField: 'unsigned char uart_parity[3]',
    frontField: 'uartParity',
    example: '[0, 0, 0]',
    parseCode: `const uartParity = [data[247], data[248], data[249]];
// Parity for 3 UARTs
// Result: [0, 0, 0]`
  },
  {
    offset: 250,
    size: 3,
    field: 'UART Stop Bit',
    format: 'Array',
    cppField: 'unsigned char uart_stopbit[3]',
    frontField: 'uartStopbit',
    example: '[0, 0, 0]',
    parseCode: `const uartStopbit = [data[250], data[251], data[252]];
// Stop bits for 3 UARTs
// Result: [0, 0, 0]`
  },
  {
    offset: 253,
    size: 7,
    field: 'Display LCD',
    format: 'Struct',
    cppField: 'lcdconfig display_lcd',
    frontField: 'displayLcd',
    example: '[LCD config]',
    parseCode: `// lcdconfig is a 7-byte union structure
const displayLcd = data.slice(253, 260);
// Result: LCD configuration`
  },
  {
    offset: 260,
    size: 1,
    field: 'Start Month',
    format: 'Uint8',
    cppField: 'unsigned char start_month',
    frontField: 'startMonth',
    example: '0',
    parseCode: `const startMonth = data[260];
// Result: 0`
  },
  {
    offset: 261,
    size: 1,
    field: 'Start Day',
    format: 'Uint8',
    cppField: 'unsigned char start_day',
    frontField: 'startDay',
    example: '0',
    parseCode: `const startDay = data[261];
// Result: 0`
  },
  {
    offset: 262,
    size: 1,
    field: 'End Month',
    format: 'Uint8',
    cppField: 'unsigned char end_month',
    frontField: 'endMonth',
    example: '0',
    parseCode: `const endMonth = data[262];
// Result: 0`
  },
  {
    offset: 263,
    size: 1,
    field: 'End Day',
    format: 'Uint8',
    cppField: 'unsigned char end_day',
    frontField: 'endDay',
    example: '0',
    parseCode: `const endDay = data[263];
// Result: 0`
  },
  {
    offset: 264,
    size: 1,
    field: 'Network Number Hi',
    format: 'Uint8',
    cppField: 'unsigned char network_number_hi',
    frontField: 'networkNumberHi',
    example: '0',
    parseCode: `const networkNumberHi = data[264];
// Result: 0`
  },
  {
    offset: 265,
    size: 1,
    field: 'Webview JSON Flash',
    format: 'Uint8',
    cppField: 'unsigned char webview_json_flash',
    frontField: 'webviewJsonFlash',
    example: '0',
    parseCode: `const webviewJsonFlash = data[265];
// Result: 0`
  },
  {
    offset: 266,
    size: 1,
    field: 'Max Var',
    format: 'Uint8',
    cppField: 'unsigned char max_var',
    frontField: 'maxVar',
    example: '0',
    parseCode: `const maxVar = data[266];
// Result: 0`
  },
  {
    offset: 267,
    size: 1,
    field: 'Max In',
    format: 'Uint8',
    cppField: 'unsigned char max_in',
    frontField: 'maxIn',
    example: '0',
    parseCode: `const maxIn = data[267];
// Result: 0`
  },
  {
    offset: 268,
    size: 1,
    field: 'Max Out',
    format: 'Uint8',
    cppField: 'unsigned char max_out',
    frontField: 'maxOut',
    example: '0',
    parseCode: `const maxOut = data[268];
// Result: 0`
  },
  {
    offset: 269,
    size: 1,
    field: 'Fix COM Config',
    format: 'Uint8',
    cppField: 'unsigned char fix_com_config',
    frontField: 'fixComConfig',
    example: '0',
    parseCode: `const fixComConfig = data[269];
// Result: 0`
  },
  {
    offset: 270,
    size: 1,
    field: 'Write Flash',
    format: 'Uint8',
    cppField: 'unsigned char write_flash',
    frontField: 'writeFlash',
    example: '0',
    parseCode: `const writeFlash = data[270];
// Result: 0`
  },
];

export const DeviceSettingsExample: React.FC = () => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [highlightedRow, setHighlightedRow] = useState<number | null>(null);

  const toggleRow = (offset: number) => {
    setExpandedRow(expandedRow === offset ? null : offset);
  };

  const toggleHighlight = (offset: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setHighlightedRow(highlightedRow === offset ? null : offset);
  };

  const getActualValue = (row: MappingRow): string => {
    const { offset, size, format } = row;

    if (format === 'IPv4') {
      return `${SAMPLE_DATA[offset]}.${SAMPLE_DATA[offset + 1]}.${SAMPLE_DATA[offset + 2]}.${SAMPLE_DATA[offset + 3]}`;
    }

    if (format === 'Hex' && size === 6) {
      return Array.from({length: 6}, (_, i) =>
        SAMPLE_DATA[offset + i].toString(16).padStart(2, '0').toUpperCase()
      ).join(':');
    }

    if (format === 'String') {
      const bytes = [];
      for (let i = 0; i < size; i++) {
        const byte = SAMPLE_DATA[offset + i];
        if (byte === 0) break;
        bytes.push(byte);
      }
      return String.fromCharCode(...bytes);
    }

    if (format === 'Enum') {
      return SAMPLE_DATA[offset] === 0 ? 'DHCP' : 'Static';
    }

    if (format === 'Index') {
      const baudRates = [9600, 19200, 38400, 57600, 115200];
      return baudRates[SAMPLE_DATA[offset]]?.toString() || '9600';
    }

    if (format === 'Uint32 LE') {
      return (
        SAMPLE_DATA[offset] |
        (SAMPLE_DATA[offset + 1] << 8) |
        (SAMPLE_DATA[offset + 2] << 16) |
        (SAMPLE_DATA[offset + 3] << 24)
      ).toString();
    }

    if (format === 'Uint16 LE') {
      return (SAMPLE_DATA[offset] | (SAMPLE_DATA[offset + 1] << 8)).toString();
    }

    if (format === 'Boolean') {
      return SAMPLE_DATA[offset] === 1 ? 'On' : 'Off';
    }

    return SAMPLE_DATA[offset].toString();
  };

  const getRawBytes = (row: MappingRow): string => {
    const bytes = [];
    for (let i = 0; i < row.size; i++) {
      bytes.push(SAMPLE_DATA[row.offset + i]);
    }
    return `[${bytes.join(', ')}]`;
  };

  // Get tooltip for specific field values
  const getValueTooltip = (row: MappingRow): string | undefined => {
    // Mini Type (byte 19) - show module name mapping
    if (row.offset === 19 && row.field === 'Mini Type') {
      const miniType = SAMPLE_DATA[19];
      const moduleNames: { [key: number]: string } = {
        0: 'CM5',
        1: 'T3-BB (Asix)', 2: 'T3-LB (Asix)', 3: 'T3-TB (Asix)', 4: 'T3-TB (Asix)',
        5: 'T3-BB', 6: 'T3-LB', 7: 'T3-TB', 8: 'T3-Nano',
        9: 'TSTAT10', 11: 'T3-OEM', 12: 'T3-TB-11I',
        13: 'T3-FAN-MODULE', 14: 'T3-OEM-12I', 15: 'T3-AIRLAB',
        16: 'T3-ESP-TRANSDUCER', 17: 'T3-ESP-TSTAT9', 18: 'T3-ESP-SAUTER',
        19: 'T3-RMC', 21: 'T3-ESP-LW', 22: 'T3-NG2',
        26: 'T3-3IIC', 43: 'T322AI', 44: 'T38AI8AO6DO',
      };
      const moduleName = moduleNames[miniType];
      if (moduleName) {
        return `Mini Type (Byte 19) - Module Number Mapping

Current Value: ${miniType} = ${moduleName}

All Module Type Mappings:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Value | Constant              | Product Name        | Description
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  0   | PRODUCT_CM5           | CM5                 | Original CM5 controller
  1   | BIG_MINIPANEL         | T3-BB (Asix)        | BACnet Building Controller (Asix)
  2   | SMALL_MINIPANEL       | T3-LB (Asix)        | LON Building Controller (Asix)
  3   | TINY_MINIPANEL        | T3-TB (Asix)        | Tiny Building Controller (Asix)
  4   | TINY_EX_MINIPANEL     | T3-TB (Asix)        | Tiny Building Controller Ext (Asix)
  5   | MINIPANELARM          | T3-BB               | BACnet Building Controller (ARM)
  6   | MINIPANELARM_LB       | T3-LB               | LON Building Controller (ARM)
  7   | MINIPANELARM_TB       | T3-TB               | Tiny Building Controller (ARM)
  8   | MINIPANELARM_NB       | T3-Nano             | Nano Building Controller
  9   | T3_TSTAT10            | TSTAT10             | Thermostat
  11  | T3_OEM                | T3-OEM              | OEM Controller
  12  | T3_TB_11I             | T3-TB-11I           | Tiny Building Controller w/11 inputs
  13  | T3_FAN_MODULE         | T3-FAN-MODULE       | Fan control module
  14  | T3_OEM_12I            | T3-OEM-12I          | OEM Controller w/12 inputs
  15  | T3_AIRLAB             | T3-AIRLAB           | Air quality lab controller
  16  | T3_ESP_TRANSDUCER     | T3-ESP-TRANSDUCER   | ESP32-based transducer
  17  | T3_ESP_TSTAT9         | T3-ESP-TSTAT9       | ESP32-based thermostat
  18  | T3_ESP_SAUTER         | T3-ESP-SAUTER       | ESP32-based Sauter integration
  19  | T3_ESP_RMC            | T3-RMC              | Room Management Controller
  21  | T3_ESP_LW             | T3-ESP-LW           | ESP32-based lighting controller
  22  | T3_NG2_TYPE2          | T3-NG2              | Next-gen controller type 2
  26  | T3_3IIC               | T3-3IIC             | 3-channel IIC controller
  43  | PID_T322AI            | T322AI              | 22-channel analog input
  44  | T38AI8AO6DO           | T38AI8AO6DO         | 8 AI, 8 AO, 6 DO controller

Reference: T3000-Source/T3000/global_define.h
           T3000-Source/T3000/BacnetSetting.cpp::Getminitypename()`;
      }
    }
    return undefined;
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Device Settings Example</h2>
      <p className={styles.description}>
        This example shows how to parse the 400-byte device settings array. Click on any row to see the parsing details.
      </p>

      {/* Raw Data Display */}
      <h3>Full 400-Byte Array</h3>
      <div className={styles.rawDataSection}>
        <div className={styles.rawData}>
          [{SAMPLE_DATA.map((byte, index) => {
            const highlightedField = highlightedRow !== null
              ? MAPPING_TABLE.find(row => row.offset === highlightedRow)
              : null;
            const isHighlighted = highlightedField &&
              index >= highlightedField.offset &&
              index < highlightedField.offset + highlightedField.size;

            return (
              <span
                key={index}
                className={isHighlighted ? styles.highlighted : ''}
              >
                {byte}{index < SAMPLE_DATA.length - 1 ? ', ' : ''}
              </span>
            );
          })}]
        </div>
      </div>

      {/* Mapping Table */}
      <div className={styles.tableSection}>
        <h3>Field Mapping Table</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Offset</th>
              <th>Size</th>
              <th>Field</th>
              <th>Format</th>
              <th>C++ Field</th>
              <th>Frontend Field</th>
              <th>Value</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {MAPPING_TABLE.map((row) => (
              <React.Fragment key={row.offset}>
                <tr
                  className={expandedRow === row.offset ? styles.rowExpanded : ''}
                  onClick={() => toggleRow(row.offset)}
                  style={{ cursor: 'pointer' }}
                >
                  <td><code>{row.offset}</code></td>
                  <td>{row.size}</td>
                  <td><strong>{row.field}</strong></td>
                  <td><span className={styles.format}>{row.format}</span></td>
                  <td><code className={styles.codeSmall}>{row.cppField}</code></td>
                  <td><code className={styles.codeSmall}>{row.frontField}</code></td>
                  <td>
                    {getValueTooltip(row) ? (
                      <div className={styles.tooltipWrapper}>
                        <strong className={styles.tooltipValue}>
                          {getActualValue(row)}
                        </strong>
                        <div className={styles.tooltipContent}>
                          {getValueTooltip(row)}
                        </div>
                      </div>
                    ) : (
                      <strong>{getActualValue(row)}</strong>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className={styles.actionButton}
                        onClick={(e) => { e.stopPropagation(); toggleRow(row.offset); }}
                        title="Expand details"
                      >
                        {expandedRow === row.offset ? '−' : '+'}
                      </button>
                      <button
                        className={`${styles.actionButton} ${highlightedRow === row.offset ? styles.highlighted : ''}`}
                        onClick={(e) => toggleHighlight(row.offset, e)}
                        title="Highlight bytes in array"
                      >
                        ⊙
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedRow === row.offset && (
                  <tr className={styles.detailsRow}>
                    <td colSpan={8}>
                      <div className={styles.details}>
                        <div className={styles.detailSection}>
                          <h4>Raw Bytes (Offset {row.offset})</h4>
                          <code className={styles.rawBytes}>{getRawBytes(row)}</code>
                        </div>
                        <div className={styles.detailSection}>
                          <h4>Parsing Code</h4>
                          <pre className={styles.parseCode}>{row.parseCode}</pre>
                        </div>
                        <div className={styles.detailSection}>
                          <h4>Parsed Result</h4>
                          <div className={styles.result}>
                            <code>{getActualValue(row)}</code>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
