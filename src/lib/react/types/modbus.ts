/**
 * Modbus data types for Modbus devices
 */

// Modbus function codes
export enum ModbusFunctionCode {
  ReadCoils = 1,
  ReadDiscreteInputs = 2,
  ReadHoldingRegisters = 3,
  ReadInputRegisters = 4,
  WriteSingleCoil = 5,
  WriteSingleRegister = 6,
  WriteMultipleCoils = 15,
  WriteMultipleRegisters = 16,
}

// Modbus register type
export enum ModbusRegisterType {
  Coil = 'coil',                     // Read/Write bit
  DiscreteInput = 'discrete-input',  // Read-only bit
  HoldingRegister = 'holding',       // Read/Write 16-bit
  InputRegister = 'input',           // Read-only 16-bit
}

// Modbus data type
export enum ModbusDataType {
  Int16 = 'int16',
  UInt16 = 'uint16',
  Int32 = 'int32',
  UInt32 = 'uint32',
  Float32 = 'float32',
  Boolean = 'boolean',
  String = 'string',
}

// Modbus register
export interface ModbusRegister {
  address: number;
  type: ModbusRegisterType;
  dataType: ModbusDataType;
  value: number | boolean | string;
  description?: string;
  units?: string;
  scale?: number;
  offset?: number;
  readOnly?: boolean;
  lastRead?: Date;
}

// Modbus device
export interface ModbusDevice {
  id: string;
  name: string;
  address: number;               // Modbus slave address (1-247)
  ipAddress?: string;            // For Modbus TCP
  port?: number;                 // For Modbus TCP
  serialPort?: string;           // For Modbus RTU
  baudRate?: number;             // For Modbus RTU
  parity?: 'none' | 'even' | 'odd';
  stopBits?: 1 | 2;
  dataBits?: 7 | 8;
  registers: ModbusRegister[];
  status: 'online' | 'offline' | 'error';
  lastSeen?: Date;
  errorCount?: number;
}

// Modbus polling configuration
export interface ModbusPollingConfig {
  deviceId: string;
  enabled: boolean;
  interval: number;              // milliseconds
  registers: ModbusRegisterRange[];
  retryCount?: number;
  timeout?: number;              // milliseconds
}

// Modbus register range (for batch reading)
export interface ModbusRegisterRange {
  startAddress: number;
  count: number;
  type: ModbusRegisterType;
  priority?: number;             // Lower = higher priority
}

// Modbus read request
export interface ModbusReadRequest {
  deviceAddress: number;
  functionCode: ModbusFunctionCode;
  startAddress: number;
  quantity: number;
}

// Modbus write request
export interface ModbusWriteRequest {
  deviceAddress: number;
  functionCode: ModbusFunctionCode;
  address: number;
  value: number | number[] | boolean | boolean[];
}

// Modbus response
export interface ModbusResponse {
  success: boolean;
  data?: number[] | boolean[];
  error?: string;
  errorCode?: number;
  timestamp: Date;
}

// Modbus register map (for configuration)
export interface ModbusRegisterMap {
  name: string;
  description?: string;
  registers: ModbusRegisterDefinition[];
}

// Modbus register definition
export interface ModbusRegisterDefinition {
  name: string;
  address: number;
  type: ModbusRegisterType;
  dataType: ModbusDataType;
  description?: string;
  units?: string;
  scale?: number;
  offset?: number;
  minValue?: number;
  maxValue?: number;
  readOnly?: boolean;
  enum?: Record<number, string>;  // For enum values
}
