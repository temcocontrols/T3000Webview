/**
 * Network API
 * Network scanning, discovery, and connectivity operations
 */

import { api } from './client';
import type { ApiResponse, Protocol } from '../types';

export interface NetworkScanRequest {
  protocol: Protocol;
  startIp?: string;
  endIp?: string;
  port?: number;
  timeout?: number; // milliseconds
}

export interface NetworkScanResult {
  ipAddress: string;
  port: number;
  protocol: Protocol;
  deviceId?: string;
  deviceName?: string;
  productType?: number;
  firmwareVersion?: string;
  online: boolean;
  responseTime?: number; // milliseconds
}

export interface PingRequest {
  host: string;
  timeout?: number;
  count?: number;
}

export interface PingResult {
  host: string;
  online: boolean;
  responseTime?: number; // milliseconds
  packetsent?: number;
  packetReceived?: number;
  packetLoss?: number; // percentage
}

export interface NetworkStatus {
  connected: boolean;
  protocol: Protocol;
  localIp?: string;
  subnet?: string;
  gateway?: string;
  dns?: string;
  activeConnections: number;
  rxPackets: number;
  txPackets: number;
  rxBytes: number;
  txBytes: number;
  errors: number;
}

/**
 * Scan network for devices
 */
export async function scanNetwork(
  request: NetworkScanRequest
): Promise<ApiResponse<NetworkScanResult[]>> {
  return api.post<NetworkScanResult[]>('/network/scan', request, {
    useLocalApi: true, // Network scanning should use local API
    timeout: 60000, // 60 second timeout for scanning
  });
}

/**
 * Ping a host
 */
export async function pingHost(request: PingRequest): Promise<ApiResponse<PingResult>> {
  return api.post<PingResult>('/network/ping', request, {
    useLocalApi: true,
  });
}

/**
 * Get network status
 */
export async function getNetworkStatus(): Promise<ApiResponse<NetworkStatus>> {
  return api.get<NetworkStatus>('/network/status', {
    useLocalApi: true,
  });
}

/**
 * Discover BACnet devices on network
 */
export async function discoverBacnetDevices(
  timeout: number = 10000
): Promise<ApiResponse<NetworkScanResult[]>> {
  return scanNetwork({
    protocol: 'bacnet-ip' as Protocol,
    port: 47808, // BACnet/IP default port
    timeout,
  });
}

/**
 * Discover Modbus devices on network
 */
export async function discoverModbusDevices(
  protocol: 'modbus-tcp' | 'modbus-rtu',
  port: number = 502,
  timeout: number = 5000
): Promise<ApiResponse<NetworkScanResult[]>> {
  return scanNetwork({
    protocol: protocol as Protocol,
    port,
    timeout,
  });
}

/**
 * Test device connectivity
 */
export async function testDeviceConnection(
  ipAddress: string,
  port: number,
  protocol: Protocol
): Promise<ApiResponse<{ connected: boolean; responseTime?: number }>> {
  return api.post<{ connected: boolean; responseTime?: number }>(
    '/network/test-connection',
    { ipAddress, port, protocol },
    { useLocalApi: true }
  );
}
