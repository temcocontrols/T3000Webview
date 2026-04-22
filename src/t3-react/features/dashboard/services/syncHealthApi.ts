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
  mssqlPoolActive: boolean;
  backendType: string;
  hostname: string;
  lastSyncTime: string | null;
  lastSyncAgo: string | null;
  recordsToday: RecordsToday;
  dbSizeBytes: number;
  dbSizeHuman: string;
  dbFolderPath: string;
  dbFilePath: string;
  devicesSyncedToday: number;
}

export type EventLevel = 'info' | 'warn' | 'error';

export interface SyncEventEntry {
  id: number;
  ts: string;
  tsUnix: number;
  level: EventLevel;
  deviceSerial: string | null;
  message: string;
}

export interface EventLogResponse {
  entries: SyncEventEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface EventLogParams {
  limit?: number;
  page?: number;
  level?: EventLevel | 'all';
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getSyncHealth(): Promise<SyncHealthData> {
  const res = await fetch(`${API_BASE_URL}/api/sync/health`);
  if (!res.ok) throw new Error(`sync/health: HTTP ${res.status}`);
  return res.json();
}

export async function getEventLog(params: EventLogParams = {}): Promise<EventLogResponse> {
  const { limit = 50, page = 0, level } = params;
  const qs = new URLSearchParams({
    limit: String(limit),
    page: String(page),
    ...(level && level !== 'all' ? { level } : {}),
  });
  const res = await fetch(`${API_BASE_URL}/api/sync/event-log?${qs}`);
  if (!res.ok) throw new Error(`sync/event-log: HTTP ${res.status}`);
  return res.json();
}
