/**
 * Protocol types from C++ PROTOCOL_ constants
 */

// Protocol enum
export enum Protocol {
  BACnetIP = 'bacnet-ip',
  BACnetMSTP = 'bacnet-mstp',
  ModbusRTU = 'modbus-rtu',
  ModbusTCP = 'modbus-tcp',
  Unknown = 'unknown',
}

// Protocol display names
export const PROTOCOL_NAMES: Record<Protocol, string> = {
  [Protocol.BACnetIP]: 'BACnet/IP',
  [Protocol.BACnetMSTP]: 'BACnet MS/TP',
  [Protocol.ModbusRTU]: 'Modbus RTU',
  [Protocol.ModbusTCP]: 'Modbus TCP',
  [Protocol.Unknown]: 'Unknown',
};

// Protocol numeric constants (from C++ for compatibility)
export const PROTOCOL_BACNET_IP = 0;
export const PROTOCOL_BACNET_MSTP = 1;
export const PROTOCOL_MODBUS_RTU = 2;
export const PROTOCOL_MODBUS_TCP = 3;

// Protocol to numeric mapping
export const PROTOCOL_TO_NUMBER: Record<Protocol, number> = {
  [Protocol.BACnetIP]: PROTOCOL_BACNET_IP,
  [Protocol.BACnetMSTP]: PROTOCOL_BACNET_MSTP,
  [Protocol.ModbusRTU]: PROTOCOL_MODBUS_RTU,
  [Protocol.ModbusTCP]: PROTOCOL_MODBUS_TCP,
  [Protocol.Unknown]: -1,
};

// Numeric to protocol mapping
export const NUMBER_TO_PROTOCOL: Record<number, Protocol> = {
  [PROTOCOL_BACNET_IP]: Protocol.BACnetIP,
  [PROTOCOL_BACNET_MSTP]: Protocol.BACnetMSTP,
  [PROTOCOL_MODBUS_RTU]: Protocol.ModbusRTU,
  [PROTOCOL_MODBUS_TCP]: Protocol.ModbusTCP,
};

// Protocol port defaults
export const PROTOCOL_DEFAULT_PORTS: Record<Protocol, number> = {
  [Protocol.BACnetIP]: 47808,
  [Protocol.BACnetMSTP]: 0, // Serial port
  [Protocol.ModbusRTU]: 0,  // Serial port
  [Protocol.ModbusTCP]: 502,
  [Protocol.Unknown]: 0,
};
