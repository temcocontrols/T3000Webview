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
    cppField: 'reg.ip_addr[4]',
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
    cppField: 'reg.subnet[4]',
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
    cppField: 'reg.gate_addr[4]',
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
    cppField: 'reg.mac_addr[6]',
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
    cppField: 'reg.tcp_type',
    frontField: 'tcpType',
    example: 'DHCP',
    parseCode: `const tcpType = data[18] === 0 ? 'DHCP' : 'Static';
// Result: "DHCP" (data[18] = 0)`
  },
  {
    offset: 44,
    size: 1,
    field: 'COM0 Baudrate',
    format: 'Index',
    cppField: 'reg.com_baudrate0',
    frontField: 'com0.baudrate',
    example: '19200',
    parseCode: `const baudRates = [9600, 19200, 38400, 57600, 115200];
const com0Baudrate = baudRates[data[44]] || 9600;
// Result: 19200 (data[44] = 1)`
  },
  {
    offset: 52,
    size: 20,
    field: 'Panel Name',
    format: 'String',
    cppField: 'reg.panel_name[20]',
    frontField: 'panelName',
    example: 'Fandu144-BB',
    parseCode: `const bytes = [];
for (let i = 0; i < 20; i++) {
  const byte = data[52 + i];
  if (byte === 0) break; // Null terminator
  bytes.push(byte);
}
const panelName = String.fromCharCode(...bytes);
// Result: "Fandu144-BB"`
  },
  {
    offset: 73,
    size: 1,
    field: 'Panel Number',
    format: 'Uint8',
    cppField: 'reg.panel_number',
    frontField: 'panelNumber',
    example: '144',
    parseCode: `const panelNumber = data[73];
// Result: 144`
  },
  {
    offset: 181,
    size: 4,
    field: 'Serial Number',
    format: 'Uint32 LE',
    cppField: 'reg.n_serial_number',
    frontField: 'serialNumber',
    example: '1581674',
    parseCode: `const serialNumber =
  data[181] |
  (data[182] << 8) |
  (data[183] << 16) |
  (data[184] << 24);
// Result: 1581674 (little-endian)`
  },
  {
    offset: 194,
    size: 2,
    field: 'Modbus Port',
    format: 'Uint16 LE',
    cppField: 'reg.modbus_port',
    frontField: 'modbusPort',
    example: '502',
    parseCode: `const modbusPort = data[194] | (data[195] << 8);
// Result: 502`
  },
  {
    offset: 196,
    size: 1,
    field: 'Modbus ID',
    format: 'Uint8',
    cppField: 'reg.modbus_id',
    frontField: 'modbusId',
    example: '1',
    parseCode: `const modbusId = data[196];
// Result: 1`
  },
  {
    offset: 208,
    size: 30,
    field: 'SNTP Server',
    format: 'String',
    cppField: 'reg.sntp_server[30]',
    frontField: 'sntpServer',
    example: 'nz.pool.ntp.org',
    parseCode: `const bytes = [];
for (let i = 0; i < 30; i++) {
  const byte = data[208 + i];
  if (byte === 0) break;
  bytes.push(byte);
}
const sntpServer = String.fromCharCode(...bytes);
// Result: "nz.pool.ntp.org"`
  },
  {
    offset: 239,
    size: 1,
    field: 'LCD Display',
    format: 'Boolean',
    cppField: 'reg.LCD_Display',
    frontField: 'lcdDisplay',
    example: 'Off',
    parseCode: `const lcdDisplay = data[239] === 1;
// Result: false (data[239] = 0, LCD off)`
  },
];

export const DeviceSettingsExample: React.FC = () => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const toggleRow = (offset: number) => {
    setExpandedRow(expandedRow === offset ? null : offset);
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

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Device Settings Example</h2>
      <p className={styles.description}>
        This example shows how to parse the 400-byte device settings array. Click on any row to see the parsing details.
      </p>

      {/* Raw Data Display */}
      <div className={styles.rawDataSection}>
        <h3>Full 400-Byte Array</h3>
        <div className={styles.rawData}>
          [{SAMPLE_DATA.join(', ')}]
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
                  <td><strong>{getActualValue(row)}</strong></td>
                  <td>
                    <button
                      className={styles.actionButton}
                      onClick={() => toggleRow(row.offset)}
                    >
                      {expandedRow === row.offset ? '▼' : '▶'}
                    </button>
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
