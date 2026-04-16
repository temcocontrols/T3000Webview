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
  const data = await handleResponse<{ success: boolean; backends: BackendConfigResponse[] }>(res);
  return data.backends;
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
  const data = await handleResponse<{ success: boolean; instances: DiscoveredInstance[] }>(res);
  return data.instances;
}

/** Get current backend status */
export async function getStatus(): Promise<BackendStatus> {
  const res = await fetch(`${BASE}/status`);
  const data = await handleResponse<{ success: boolean; active_backend: string; connected: boolean; table_count: number | null; host: string | null; database_name: string | null }>(res);
  return {
    active_backend: data.active_backend as BackendType,
    connected: data.connected,
    table_count: data.table_count,
    message: data.connected ? 'Connected' : 'Not connected',
  };
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

// ---------------------------------------------------------------------------
// Multi-PC INI Config API
// ---------------------------------------------------------------------------

export interface IniConfig {
  enabled: boolean;
  role: string;
  store_logs: boolean;
  ini_path: string;
}

export interface CentralDbStatus {
  enabled: boolean;
  role: string;
  store_logs: boolean;
  central_connected: boolean;
  mssql_pool_active: boolean;
  local_config_available: boolean;
  hostname: string;
}

/** Read current [CentralDatabase] settings from setting.ini */
export async function getIniConfig(): Promise<IniConfig> {
  const res = await fetch(`${BASE}/ini`);
  return handleResponse<IniConfig>(res);
}

/** Update [CentralDatabase] section in setting.ini (restart required) */
export async function saveIniConfig(config: { enabled: boolean; role: string; store_logs: boolean }): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE}/ini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return handleResponse<{ success: boolean; message: string }>(res);
}

/** Get current central DB runtime status */
export async function getCentralDbStatus(): Promise<CentralDbStatus> {
  const res = await fetch(`${API_BASE_URL}/api/database/central/status`);
  return handleResponse<CentralDbStatus>(res);
}
