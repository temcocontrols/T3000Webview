/**
 * Sync Health API client
 * Talks to GET /api/sync/health  and  GET|POST /api/sync/event-log
 */

import { API_BASE_URL } from '../../../config/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RecordsToday {
  inputs: number;
  outputs: number;
  variables: number;
  trendlogs: number;
  total: number;
}

export interface SyncHealthData {
  role: string;               // "server" | "client" | "standalone"
  centerDbEnabled: boolean;
  centerDbConnected: boolean;
  centerDbStatus: string;
  centerDbMessage: string | null;
  mssqlPoolActive: boolean;
  backendType: string;
  runtimeBackendType: string;
  writesBlocked: boolean;
  centerDbHost: string | null;
  centerDbPort: number | null;
  centerDbDatabaseName: string | null;
  canInitSchema: boolean;
  hostname: string;
  lastSyncTime: string | null;
  lastSyncAgo: string | null;
  recordsToday: RecordsToday;
  dbSizeBytes: number;
  dbSizeHuman: string;
  dbFolderPath: string;
  dbFilePath: string;
  devicesSyncedToday: number;
  samplingPaused: boolean;
  pausedReason: string | null;
  syncIntervalSecs: number;
}

export type EventLevel = 'info' | 'warn' | 'error';
export type LogCategory =
  | 'SYNC_CYCLE'
  | 'SYNC_ERROR'
  | 'DB_CONFIG'
  | 'SAMPLING_STATE'
  | 'SERVER_EVENT'
  | 'HEARTBEAT';

/** Formerly SyncEventEntry — extended with T3_APP_LOG columns */
export interface AppLogEntry {
  id: number;
  ts: string;
  tsUnix: number;
  level: EventLevel;
  category: string;
  source: string | null;
  hostname: string | null;
  role: string | null;
  deviceSerial: string | null;
  message: string;
  details: string | null;
}

/** @deprecated Use AppLogEntry */
export type SyncEventEntry = AppLogEntry;

export interface EventLogResponse {
  entries: AppLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface EventLogParams {
  limit?: number;
  page?: number;
  level?: EventLevel | 'all';
  category?: LogCategory | 'all';
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getSyncHealth(): Promise<SyncHealthData> {
  const res = await fetch(`${API_BASE_URL}/api/sync/health`);
  if (!res.ok) throw new Error(`sync/health: HTTP ${res.status}`);
  return res.json();
}

export async function getEventLog(params: EventLogParams = {}): Promise<EventLogResponse> {
  const { limit = 50, page = 0, level, category } = params;
  const qs = new URLSearchParams({
    limit: String(limit),
    page: String(page),
    ...(level && level !== 'all' ? { level } : {}),
    ...(category && category !== 'all' ? { category } : {}),
  });
  const res = await fetch(`${API_BASE_URL}/api/sync/event-log?${qs}`);
  if (!res.ok) throw new Error(`sync/event-log: HTTP ${res.status}`);
  return res.json();
}

export async function updateSyncInterval(secs: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/config/ffi-sync-interval`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interval_secs: secs }),
  });

  if (!res.ok) {
    throw new Error(`config/ffi-sync-interval: HTTP ${res.status}`);
  }
}

// ── Server sync metrics (client mode only) ────────────────────────────────────
// Fetches the server PC's actual sync activity by proxying through
// GET /api/sync/server-health on the local backend.

export interface ServerSyncMetrics {
  ok: boolean;
  devicesSyncedToday: number;
  recordsToday: RecordsToday;
  lastSyncAgo: string | null;
  lastSyncTime: string | null;
  serverHostname: string | null;
  error?: string;
}

export async function getServerSyncMetrics(): Promise<ServerSyncMetrics> {
  const res = await fetch(`${API_BASE_URL}/api/sync/server-health`);
  if (!res.ok) throw new Error(`sync/server-health: HTTP ${res.status}`);
  const data = await res.json();
  return {
    ok:                 data.ok ?? false,
    devicesSyncedToday: data.devicesSyncedToday ?? 0,
    recordsToday: {
      total:     data.recordsToday?.total     ?? 0,
      inputs:    data.recordsToday?.inputs    ?? 0,
      outputs:   data.recordsToday?.outputs   ?? 0,
      variables: data.recordsToday?.variables ?? 0,
      trendlogs: data.recordsToday?.trendlogs ?? 0,
    },
    lastSyncAgo:     data.lastSyncAgo     ?? null,
    lastSyncTime:    data.lastSyncTime    ?? null,
    serverHostname:  data.serverHostname  ?? null,
    error:           data.error,
  };
}
