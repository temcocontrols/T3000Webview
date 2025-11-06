/**
 * Modbus Registers API
 * Read and write Modbus registers
 */

import { api } from '../client';
import type { ApiResponse, ModbusRegister } from '../../types';

export interface ModbusReadRequest {
  startAddress: number;
  count: number;
  registerType: 'holding' | 'input' | 'coil' | 'discrete';
}

export interface ModbusWriteRequest {
  address: number;
  value: number | boolean | number[];
  registerType: 'holding' | 'coil';
}

export interface ModbusRegisterValue {
  address: number;
  value: number | boolean;
  timestamp: Date;
  quality: 'good' | 'bad' | 'uncertain';
}

/**
 * Get all register definitions for a device
 */
export async function getRegisters(deviceId: string): Promise<ApiResponse<ModbusRegister[]>> {
  return api.get<ModbusRegister[]>(`/modbus/devices/${deviceId}/registers`, {
    useLocalApi: true,
  });
}

/**
 * Add register definition
 */
export async function addRegister(
  deviceId: string,
  register: Omit<ModbusRegister, 'id'>
): Promise<ApiResponse<ModbusRegister>> {
  return api.post<ModbusRegister>(`/modbus/devices/${deviceId}/registers`, register, {
    useLocalApi: true,
  });
}

/**
 * Update register definition
 */
export async function updateRegister(
  deviceId: string,
  registerId: string,
  updates: Partial<ModbusRegister>
): Promise<ApiResponse<ModbusRegister>> {
  return api.put<ModbusRegister>(
    `/modbus/devices/${deviceId}/registers/${registerId}`,
    updates,
    { useLocalApi: true }
  );
}

/**
 * Delete register definition
 */
export async function deleteRegister(deviceId: string, registerId: string): Promise<ApiResponse<void>> {
  return api.delete<void>(`/modbus/devices/${deviceId}/registers/${registerId}`, {
    useLocalApi: true,
  });
}

/**
 * Read holding registers
 */
export async function readHoldingRegisters(
  deviceId: string,
  startAddress: number,
  count: number
): Promise<ApiResponse<ModbusRegisterValue[]>> {
  return api.post<ModbusRegisterValue[]>(
    `/modbus/devices/${deviceId}/read-holding`,
    { startAddress, count },
    { useLocalApi: true }
  );
}

/**
 * Read input registers
 */
export async function readInputRegisters(
  deviceId: string,
  startAddress: number,
  count: number
): Promise<ApiResponse<ModbusRegisterValue[]>> {
  return api.post<ModbusRegisterValue[]>(
    `/modbus/devices/${deviceId}/read-input`,
    { startAddress, count },
    { useLocalApi: true }
  );
}

/**
 * Read coils
 */
export async function readCoils(
  deviceId: string,
  startAddress: number,
  count: number
): Promise<ApiResponse<ModbusRegisterValue[]>> {
  return api.post<ModbusRegisterValue[]>(
    `/modbus/devices/${deviceId}/read-coils`,
    { startAddress, count },
    { useLocalApi: true }
  );
}

/**
 * Read discrete inputs
 */
export async function readDiscreteInputs(
  deviceId: string,
  startAddress: number,
  count: number
): Promise<ApiResponse<ModbusRegisterValue[]>> {
  return api.post<ModbusRegisterValue[]>(
    `/modbus/devices/${deviceId}/read-discrete`,
    { startAddress, count },
    { useLocalApi: true }
  );
}

/**
 * Write single holding register
 */
export async function writeSingleRegister(
  deviceId: string,
  address: number,
  value: number
): Promise<ApiResponse<{ success: boolean; address: number; value: number }>> {
  return api.post<{ success: boolean; address: number; value: number }>(
    `/modbus/devices/${deviceId}/write-single`,
    { address, value },
    { useLocalApi: true }
  );
}

/**
 * Write multiple holding registers
 */
export async function writeMultipleRegisters(
  deviceId: string,
  startAddress: number,
  values: number[]
): Promise<ApiResponse<{ success: boolean; startAddress: number; count: number }>> {
  return api.post<{ success: boolean; startAddress: number; count: number }>(
    `/modbus/devices/${deviceId}/write-multiple`,
    { startAddress, values },
    { useLocalApi: true }
  );
}

/**
 * Write single coil
 */
export async function writeSingleCoil(
  deviceId: string,
  address: number,
  value: boolean
): Promise<ApiResponse<{ success: boolean; address: number; value: boolean }>> {
  return api.post<{ success: boolean; address: number; value: boolean }>(
    `/modbus/devices/${deviceId}/write-coil`,
    { address, value },
    { useLocalApi: true }
  );
}

/**
 * Write multiple coils
 */
export async function writeMultipleCoils(
  deviceId: string,
  startAddress: number,
  values: boolean[]
): Promise<ApiResponse<{ success: boolean; startAddress: number; count: number }>> {
  return api.post<{ success: boolean; startAddress: number; count: number }>(
    `/modbus/devices/${deviceId}/write-multiple-coils`,
    { startAddress, values },
    { useLocalApi: true }
  );
}

/**
 * Batch read multiple register types
 */
export async function batchRead(
  deviceId: string,
  requests: ModbusReadRequest[]
): Promise<ApiResponse<Array<{ request: ModbusReadRequest; values: ModbusRegisterValue[] }>>> {
  return api.post<Array<{ request: ModbusReadRequest; values: ModbusRegisterValue[] }>>(
    `/modbus/devices/${deviceId}/batch-read`,
    { requests },
    { useLocalApi: true }
  );
}

/**
 * Batch write multiple registers
 */
export async function batchWrite(
  deviceId: string,
  writes: ModbusWriteRequest[]
): Promise<ApiResponse<Array<{ request: ModbusWriteRequest; success: boolean }>>> {
  return api.post<Array<{ request: ModbusWriteRequest; success: boolean }>>(
    `/modbus/devices/${deviceId}/batch-write`,
    { writes },
    { useLocalApi: true }
  );
}
