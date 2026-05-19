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

// ── Sync diagnostics (dashboard troubleshooting panel) ───────────────────────

export type DiagnosticSeverity = 'ok' | 'info' | 'warn' | 'error';

export interface DiagnosticCheck {
  severity: DiagnosticSeverity;
  title: string;
  detail: string;
  hint?: string;
}

export interface SyncDiagnosticsData {
  role: string;
  hostname: string;
  iniRole: string;
  iniCenterDbEnabled: boolean;
  syncRunsOnThisPc: boolean;
  roleMismatch: boolean;
  metricsSource: string;
  ffiSyncHost: string | null;
  eventLogScope: string;
  eventLogNote: string;
  checks: DiagnosticCheck[];
  recentFfiEvents: AppLogEntry[];
}

export interface ServerDiagnosticsResult {
  ok: boolean;
  serverIp?: string;
  error?: string;
  diagnostics?: SyncDiagnosticsData;
}

function mapDiagnosticsPayload(data: Record<string, unknown>): SyncDiagnosticsData {
  const checks = Array.isArray(data.checks)
    ? (data.checks as Record<string, unknown>[]).map((c) => ({
        severity: (c.severity as DiagnosticSeverity) ?? 'info',
        title: String(c.title ?? ''),
        detail: String(c.detail ?? ''),
        hint: c.hint ? String(c.hint) : undefined,
      }))
    : [];

  const recentFfiEvents = Array.isArray(data.recentFfiEvents)
    ? (data.recentFfiEvents as Record<string, unknown>[]).map((e) => ({
        id: Number(e.id ?? 0),
        ts: String(e.ts ?? ''),
        tsUnix: Number(e.tsUnix ?? 0),
        level: (e.level as EventLevel) ?? 'info',
        category: String(e.category ?? ''),
        source: e.source ? String(e.source) : null,
        hostname: e.hostname ? String(e.hostname) : null,
        role: e.role ? String(e.role) : null,
        deviceSerial: e.deviceSerial ? String(e.deviceSerial) : null,
        message: String(e.message ?? ''),
        details: e.details ? String(e.details) : null,
      }))
    : [];

  return {
    role: String(data.role ?? ''),
    hostname: String(data.hostname ?? ''),
    iniRole: String(data.iniRole ?? ''),
    iniCenterDbEnabled: Boolean(data.iniCenterDbEnabled),
    syncRunsOnThisPc: Boolean(data.syncRunsOnThisPc),
    roleMismatch: Boolean(data.roleMismatch),
    metricsSource: String(data.metricsSource ?? ''),
    ffiSyncHost: data.ffiSyncHost ? String(data.ffiSyncHost) : null,
    eventLogScope: String(data.eventLogScope ?? 'local'),
    eventLogNote: String(data.eventLogNote ?? ''),
    checks,
    recentFfiEvents,
  };
}

export async function getSyncDiagnostics(): Promise<SyncDiagnosticsData> {
  const res = await fetch(`${API_BASE_URL}/api/sync/diagnostics`);
  if (!res.ok) throw new Error(`sync/diagnostics: HTTP ${res.status}`);
  const data = await res.json();
  return mapDiagnosticsPayload(data);
}

export async function getServerSyncDiagnostics(): Promise<ServerDiagnosticsResult> {
  const res = await fetch(`${API_BASE_URL}/api/sync/server-diagnostics`);
  if (!res.ok) throw new Error(`sync/server-diagnostics: HTTP ${res.status}`);
  const data = await res.json();
  return {
    ok: Boolean(data.ok),
    serverIp: data.serverIp ? String(data.serverIp) : undefined,
    error: data.error ? String(data.error) : undefined,
    diagnostics: data.diagnostics
      ? mapDiagnosticsPayload(data.diagnostics as Record<string, unknown>)
      : undefined,
  };
}
