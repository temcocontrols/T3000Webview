/**
 * Database Backend Configuration API Client
 * Calls the /api/database/backend/* endpoints
 */

import { API_BASE_URL } from '../../../config/constants';

const BASE = `${API_BASE_URL}/api/database/backend`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BackendType = 'sqlite' | 'postgres' | 'mysql' | 'mssql';

export interface BackendConfigResponse {
  id: number;
  backend_type: BackendType;
  is_active: boolean;
  host: string | null;
  port: number | null;
  instance: string | null;
  database_name: string | null;
  username: string | null;
  has_password: boolean;
  connection_url: string | null;
  extra_options: string | null;
  updated_at: string | null;
}

export interface SaveBackendConfigRequest {
  backend_type: BackendType;
  host?: string;
  port?: number;
  instance?: string;
  database_name?: string;
  username?: string;
  password?: string;
  connection_url?: string;
  extra_options?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latency_ms?: number;
}

export interface DiscoveredInstance {
  server_name: string;
  instance_name: string;
  ip_address: string;
  port: number | null;
  version: string | null;
}

export interface BackendStatus {
  active_backend: BackendType;
  connected: boolean;
  table_count: number | null;
  message: string;
}

export interface InitSchemaResult {
  success: boolean;
  tables_created: number;
  message: string;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `HTTP ${response.status}`);
  }
  return response.json();
}

/** Get all backend configurations */
export async function getConfigs(): Promise<BackendConfigResponse[]> {
  const res = await fetch(`${BASE}/config`);
  return handleResponse<BackendConfigResponse[]>(res);
}

/** Save (create/update) a backend configuration */
export async function saveConfig(req: SaveBackendConfigRequest): Promise<BackendConfigResponse> {
  const res = await fetch(`${BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return handleResponse<BackendConfigResponse>(res);
}

/** Test a connection without persisting */
export async function testConnection(req: SaveBackendConfigRequest): Promise<TestConnectionResult> {
  const res = await fetch(`${BASE}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return handleResponse<TestConnectionResult>(res);
}

/** Scan LAN for SQL Server instances (UDP 1434) */
export async function scanNetwork(): Promise<DiscoveredInstance[]> {
  const res = await fetch(`${BASE}/scan`);
  return handleResponse<DiscoveredInstance[]>(res);
}

/** Get current backend status */
export async function getStatus(): Promise<BackendStatus> {
  const res = await fetch(`${BASE}/status`);
  return handleResponse<BackendStatus>(res);
}

/** Switch the active backend (requires restart) */
export async function switchBackend(backendType: BackendType): Promise<{ message: string }> {
  const res = await fetch(`${BASE}/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ backend_type: backendType }),
  });
  return handleResponse<{ message: string }>(res);
}

/** Initialize schema on the remote database */
export async function initSchema(backendType: BackendType): Promise<InitSchemaResult> {
  const res = await fetch(`${BASE}/init-schema`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ backend_type: backendType }),
  });
  return handleResponse<InitSchemaResult>(res);
}
