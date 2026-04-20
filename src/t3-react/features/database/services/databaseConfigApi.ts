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
  backend_type: BackendType;
  is_active: boolean;
  host: string | null;
  port: number | null;
  instance: string | null;
  database_name: string | null;
  username: string | null;
  password_set: boolean;
  connection_url: string | null;
  extra_options: unknown | null;
  role: string | null;
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
  message?: string;
  error?: string;
  latency_ms?: number;
  db_exists?: boolean;
}

export interface DiscoveredInstance {
  host: string;
  instance: string | null;
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
  executed: number;
  total_statements: number;
  errors: string[];
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
export async function saveConfig(req: SaveBackendConfigRequest): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return handleResponse<{ success: boolean; message: string }>(res);
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

const VALID_BACKENDS: BackendType[] = ['sqlite', 'postgres', 'mysql', 'mssql'];

/** Get current backend status */
export async function getStatus(): Promise<BackendStatus> {
  const res = await fetch(`${BASE}/status`);
  const data = await handleResponse<{ success: boolean; active_backend: string; connected: boolean; table_count: number | null; host: string | null; database_name: string | null }>(res);
  return {
    active_backend: (VALID_BACKENDS.includes(data.active_backend as BackendType)
      ? data.active_backend : 'sqlite') as BackendType,
    connected: data.connected,
    table_count: data.table_count,
    message: data.connected ? 'Connected' : 'Not connected',
  };
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
// Server/Client INI Config API
// ---------------------------------------------------------------------------

export interface IniConfig {
  enabled: boolean;
  role: string;
  ini_path: string;
}

export interface ServerDbStatus {
  enabled: boolean;
  role: string;
  server_connected: boolean;
  mssql_pool_active: boolean;
  local_config_available: boolean;
  hostname: string;
}

/** Read current [ServerDatabase] settings from setting.ini */
export async function getIniConfig(): Promise<IniConfig> {
  const res = await fetch(`${BASE}/ini`);
  return handleResponse<IniConfig>(res);
}

/** Update [ServerDatabase] section in setting.ini (restart required) */
export async function saveIniConfig(config: { enabled: boolean; role: string }): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE}/ini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return handleResponse<{ success: boolean; message: string }>(res);
}

/** Get current server DB runtime status */
export async function getServerDbStatus(): Promise<ServerDbStatus> {
  const res = await fetch(`${API_BASE_URL}/api/database/server/status`);
  return handleResponse<ServerDbStatus>(res);
}

// ---------------------------------------------------------------------------
// Server/Client Registry API
// ---------------------------------------------------------------------------

export interface RegistryEntry {
  id: number;
  hostname: string;
  ip_address: string;
  role: string;
  is_self: boolean;
  status: string;
  last_seen: string;
  db_backend: string | null;
  table_count: number | null;
  version: string | null;
}

/** Get all registered PCs from the server/client registry */
export async function getRegistry(): Promise<RegistryEntry[]> {
  const res = await fetch(`${API_BASE_URL}/api/database/server/registry`);
  const data = await handleResponse<{ success: boolean; entries: RegistryEntry[]; count: number }>(res);
  return data.entries;
}
