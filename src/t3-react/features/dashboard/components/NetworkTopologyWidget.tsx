/**
 * NetworkTopologyWidget
 *
 * Shows the multi-PC network topology for the Dashboard top banner:
 *   Scenario A — Server:    This PC card + client tree + field devices strip
 *   Scenario B — Client:    This PC card + server row  + field devices strip
 *   Scenario C — Standalone: Single PC card             + field devices strip
 *
 * Each scenario has test buttons with inline result strips.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  makeStyles,
  mergeClasses,
  Button,
  Badge,
  Spinner,
} from '@fluentui/react-components';
import {
  ServerRegular,
  DesktopRegular,
  PlugConnectedRegular,
  ArrowClockwiseRegular,
  CheckmarkCircleRegular,
  ErrorCircleRegular,
  NetworkCheckRegular,
  DatabaseRegular,
  DismissRegular,
} from '@fluentui/react-icons';
import { getSyncHealth, SyncHealthData } from '../services/syncHealthApi';
import { isCenterDbDegraded, isSamplingDegraded } from '../services/severityRules';
import {
  getRegistry,
  getServerDbStatus,
  testConnection,
  pingClient,
  RegistryEntry,
} from '../../database/services/databaseConfigApi';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const useStyles = makeStyles({
  /* ── Outer wrapper ── */
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },

  /* ── Section header bar (matches DatabaseConfigPage sectionHeader) ── */
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    borderBottom: '1px solid #edebe9',
    backgroundColor: '#f5f5f5',
    minHeight: '32px',
    gap: '8px',
  },
  headerTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#323130',
    flex: 1,
    margin: 0,
  },
  headerTime: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#605e5c',
    fontFamily: 'monospace',
  },

  /* ── Body padding ── */
  body: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  bannerStack: {
    paddingTop: '8px',
    paddingLeft: '12px',
    paddingRight: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  /* ── This-PC card (Server = blue, Client/Standalone = neutral) ── */
  pcCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    border: '1px solid #edebe9',
    borderRadius: '6px',
    backgroundColor: '#fafafa',
  },
  pcCardServer: {
    backgroundColor: '#f0f6ff',
    borderTopColor: '#c7dff7',
    borderRightColor: '#c7dff7',
    borderBottomColor: '#c7dff7',
    borderLeftColor: '#c7dff7',
  },
  pcCardIcon: {
    fontSize: '24px',
    color: '#605e5c',
    flexShrink: 0,
  },
  pcCardIconServer: {
    color: '#0f6cbd',
  },
  pcCardInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  pcCardTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#323130',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  pcCardMeta: {
    fontSize: '11.5px',
    color: '#605e5c',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    flexWrap: 'wrap',
  },
  metaSep: {
    color: '#c8c6c4',
  },
  pcCardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },

  /* ── Test result strip ── */
  resultStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    fontSize: '12px',
    borderRadius: '4px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderLeftWidth: '1px',
    borderLeftStyle: 'solid',
  },
  resultStripOk: {
    backgroundColor: '#f1faf1',
    borderTopColor: '#a5d6a7',
    borderRightColor: '#a5d6a7',
    borderBottomColor: '#a5d6a7',
    borderLeftColor: '#a5d6a7',
    color: '#107c10',
  },
  resultStripFail: {
    backgroundColor: '#fdf3f4',
    borderTopColor: '#f4b8bb',
    borderRightColor: '#f4b8bb',
    borderBottomColor: '#f4b8bb',
    borderLeftColor: '#f4b8bb',
    color: '#d13438',
  },
  resultStripIcon: {
    fontSize: '14px',
    flexShrink: 0,
  },
  resultStripText: {
    flex: 1,
  },
  clientPingBadgeOk: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    backgroundColor: '#f1faf1',
    color: '#107c10',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: '#a5d6a7',
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: '#a5d6a7',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#a5d6a7',
    borderLeftWidth: '1px',
    borderLeftStyle: 'solid',
    borderLeftColor: '#a5d6a7',
  },
  clientPingBadgeFail: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    backgroundColor: '#fdf3f4',
    color: '#d13438',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: '#f4b8bb',
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: '#f4b8bb',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#f4b8bb',
    borderLeftWidth: '1px',
    borderLeftStyle: 'solid',
    borderLeftColor: '#f4b8bb',
  },
  resultStripDismiss: {
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    color: 'inherit',
    opacity: 0.6,
    padding: '0',
    lineHeight: '1',
    display: 'flex',
    alignItems: 'center',
    '&:hover': { opacity: 1 },
  },

  /* ── Tree (client list / server row) ── */
  tree: {
    padding: '4px 0 0 16px',
  },
  treeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 2px',
    fontSize: '12.5px',
    color: '#323130',
  },
  treeConnector: {
    color: '#c8c6c4',
    fontFamily: 'monospace',
    fontSize: '14px',
    width: '22px',
    flexShrink: 0,
    userSelect: 'none',
  },
  treeIcon: {
    fontSize: '14px',
    color: '#605e5c',
    flexShrink: 0,
  },
  treeHostname: {
    fontWeight: 600,
    minWidth: '120px',
  },
  treeIp: {
    color: '#605e5c',
    minWidth: '110px',
  },
  treeStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    minWidth: '80px',
  },
  treeDotOnline: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#107c10',
    flexShrink: 0,
  },
  treeDotOffline: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#d13438',
    flexShrink: 0,
  },
  treeDotGray: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#a19f9d',
    flexShrink: 0,
  },
  treeMeta: {
    color: '#a19f9d',
    fontSize: '11.5px',
  },
  treeRowPushRight: {
    marginLeft: 'auto',
    flexShrink: 0,
  },
  treeEmpty: {
    padding: '6px 2px 2px 30px',
    color: '#a19f9d',
    fontSize: '12px',
    fontStyle: 'italic',
  },

  /* ── Devices strip ── */
  devicesStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '8px 4px 0',
    marginTop: '8px',
    borderTop: '1px solid #edebe9',
  },
  deviceStripLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#605e5c',
  },
  deviceStripItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '12px',
    color: '#323130',
  },
  dotOnline: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#107c10',
    flexShrink: 0,
  },
  dotOffline: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#d13438',
    flexShrink: 0,
  },
  dotGray: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#a19f9d',
    flexShrink: 0,
  },

  /* ── Loading / error ── */
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#605e5c',
  },
  errorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    fontSize: '12.5px',
    color: '#d13438',
  },
  warnRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    fontSize: '12px',
    color: '#7d5700',
    backgroundColor: '#fff4ce',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#f0d070',
    borderTopWidth: '0',
    borderLeftWidth: '0',
    borderRightWidth: '0',
  },
  pauseRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    fontSize: '12px',
    color: '#8e1c1c',
    backgroundColor: '#fde7e9',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#f5c2c2',
    borderTopWidth: '0',
    borderLeftWidth: '0',
    borderRightWidth: '0',
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatLastSeen(ts: string | null | undefined): string {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return ts;
  }
}

// ---------------------------------------------------------------------------
// Backend label helper
// ---------------------------------------------------------------------------
function backendLabel(backendType: string): string {
  switch (backendType) {
    case 'mssql':   return 'SQL Server';
    case 'postgres': return 'PostgreSQL';
    case 'mysql':   return 'MySQL';
    case 'sqlite':  return 'SQLite';
    default:        return backendType.toUpperCase();
  }
}

function centerDbStatusLabel(status?: string, connected?: boolean): string {
  switch (status) {
    case 'healthy':
      return 'Connected';
    case 'server_unreachable':
      return 'SQL Server Down';
    case 'db_missing':
      return 'Database Missing';
    case 'schema_missing':
      return 'Needs Init';
    case 'misconfigured_backend':
      return 'Misconfigured';
    default:
      return connected ? 'Connected' : 'Disconnected';
  }
}

function effectiveCenterBackendType(health: SyncHealthData): string {
  // In Shared DB mode, sqlite means local fallback while the center target remains SQL Server.
  if (health.centerDbEnabled && health.backendType === 'sqlite') {
    return 'mssql';
  }
  return health.backendType;
}

// ---------------------------------------------------------------------------
// TestResult sub-type
// ---------------------------------------------------------------------------
interface TestResult { ok: boolean; msg: string }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface Props {
  currentTime: Date;
}

export const NetworkTopologyWidget: React.FC<Props> = ({ currentTime }) => {
  const s = useStyles();
  const { devices, deviceStatuses } = useDeviceTreeStore();

  const [health, setHealth] = useState<SyncHealthData | null>(null);
  const [registry, setRegistry] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-button test state
  const [testingDb, setTestingDb] = useState(false);
  const [dbResult, setDbResult] = useState<TestResult | null>(null);
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<TestResult | null>(null);
  const [refreshingClients, setRefreshingClients] = useState(false);
  const [refreshingOverview, setRefreshingOverview] = useState(false);

  // Per-client ping state: Map<client_id, { testing, result }>
  const [clientPingState, setClientPingState] = useState<Record<number, { testing: boolean; ok: boolean | null; msg: string }>>({});
  const clientPingTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const handlePingClient = async (entry: RegistryEntry) => {
    setClientPingState(prev => ({ ...prev, [entry.id]: { testing: true, ok: null, msg: '' } }));
    try {
      const r = await pingClient(entry.ip_address);
      setClientPingState(prev => ({ ...prev, [entry.id]: { testing: false, ok: r.reachable, msg: r.message } }));
      // Auto-dismiss after 10s
      if (clientPingTimers.current[entry.id]) clearTimeout(clientPingTimers.current[entry.id]);
      clientPingTimers.current[entry.id] = setTimeout(() => {
        setClientPingState(prev => { const n = { ...prev }; delete n[entry.id]; return n; });
      }, 10_000);
    } catch (e) {
      setClientPingState(prev => ({ ...prev, [entry.id]: { testing: false, ok: false, msg: e instanceof Error ? e.message : 'Failed' } }));
    }
  };

  // Auto-dismiss timers
  const dbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleDbDismiss = () => {
    if (dbTimer.current) clearTimeout(dbTimer.current);
    dbTimer.current = setTimeout(() => setDbResult(null), 10_000);
  };
  const schedulePingDismiss = () => {
    if (pingTimer.current) clearTimeout(pingTimer.current);
    pingTimer.current = setTimeout(() => setPingResult(null), 10_000);
  };

  const load = useCallback(async () => {
    const [h, reg] = await Promise.allSettled([getSyncHealth(), getRegistry()]);

    if (h.status === 'fulfilled') {
      setHealth(h.value);
      setError(null);
    } else {
      setHealth(null);
      setError(h.reason instanceof Error ? h.reason.message : 'Failed to load sync health');
    }

    if (reg.status === 'fulfilled') {
      setRegistry(reg.value);
    } else {
      setRegistry([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefreshOverview = async () => {
    setRefreshingOverview(true);
    try {
      await load();
    } finally {
      setRefreshingOverview(false);
    }
  };

  // ── Test DB connection ──
  const handleTestDb = async () => {
    if (!health) return;
    setTestingDb(true);
    setDbResult(null);
    try {
      const backend = health.backendType as any;
      const needsHostAndDb = backend === 'mssql' || backend === 'postgres' || backend === 'mysql';
      if (needsHostAndDb && (!health.centerDbHost || !health.centerDbDatabaseName)) {
        setDbResult({
          ok: false,
          msg: `Database config is incomplete (${backend.toUpperCase()}). Please set host and database name in Database Configuration.`,
        });
        return;
      }

      const r = await testConnection({
        backend_type: backend,
        host: health.centerDbHost ?? undefined,
        database_name: health.centerDbDatabaseName ?? undefined,
      });
      setDbResult({
        ok: r.success,
        msg: r.success
          ? `${backendLabel(health.backendType)} connected${r.latency_ms != null ? ` (${r.latency_ms}ms)` : ''}`
          : (r.error ?? r.message ?? 'Connection failed'),
      });
    } catch (e) {
      setDbResult({ ok: false, msg: e instanceof Error ? e.message : 'Test failed' });
    } finally {
      setTestingDb(false);
      scheduleDbDismiss();
    }
  };

  // ── Ping server (client scenario) ──
  const handlePingServer = async () => {
    setTestingPing(true);
    setPingResult(null);
    try {
      const s = await getServerDbStatus();
      setPingResult({
        ok: s.server_connected,
        msg: s.server_connected
          ? `Server reachable · ${s.hostname}`
          : `Cannot reach server`,
      });
    } catch (e) {
      setPingResult({ ok: false, msg: e instanceof Error ? e.message : 'Ping failed' });
    } finally {
      setTestingPing(false);
      schedulePingDismiss();
    }
  };

  // ── Refresh clients (server scenario) ──
  const handleRefreshClients = async () => {
    setRefreshingClients(true);
    try {
      const reg = await getRegistry();
      setRegistry(reg);
    } catch { /* silent */ } finally {
      setRefreshingClients(false);
    }
  };

  const onlineCount = Array.from(deviceStatuses.values()).filter((v) => v === 'online').length;
  const offlineCount = devices.length - onlineCount;

  // ── Helper: result strip ──
  const ResultStrip = ({ result, onDismiss }: { result: TestResult; onDismiss: () => void }) => (
    <div className={mergeClasses(s.resultStrip, result.ok ? s.resultStripOk : s.resultStripFail)}>
      {result.ok
        ? <CheckmarkCircleRegular className={s.resultStripIcon} />
        : <ErrorCircleRegular className={s.resultStripIcon} />}
      <span className={s.resultStripText}>{result.msg}</span>
      <button className={s.resultStripDismiss} onClick={onDismiss} title="Dismiss">
        <DismissRegular style={{ fontSize: '12px' }} />
      </button>
    </div>
  );

  // ── Devices strip (common to all scenarios) ──
  const DevicesStrip = () => (
    <div className={s.devicesStrip}>
      <span className={s.deviceStripLabel}>T3000 Field Devices</span>
      <span className={s.deviceStripItem}>
        <DatabaseRegular style={{ fontSize: '13px', color: '#605e5c' }} />
        {devices.length} device{devices.length !== 1 ? 's' : ''}
      </span>
      <span className={s.deviceStripItem}>
        <span className={onlineCount > 0 ? s.dotOnline : s.dotGray} />
        {onlineCount} online
      </span>
      {offlineCount > 0 && (
        <span className={s.deviceStripItem}>
          <span className={s.dotOffline} />
          {offlineCount} offline
        </span>
      )}
    </div>
  );

  const role = health?.role; // 'server' | 'client' | 'standalone'
  const selfEntry = registry.find((e) => e.is_self);
  const isCenterDbWarn = isCenterDbDegraded(health);
  const isSamplingWarn = isSamplingDegraded(health);

  // ── MOCK: set to true to preview client list styling ──
  const USE_MOCK_CLIENTS = false;
  const MOCK_CLIENTS: RegistryEntry[] = [
    { id: 101, hostname: 'OFFICE-PC-01', ip_address: '192.168.1.101', role: 'client', is_self: false, status: 'online',  last_seen: new Date(Date.now() - 45_000).toISOString(),      db_backend: 'sqlite', table_count: 12, version: '0.8.1' },
    { id: 102, hostname: 'OFFICE-PC-02', ip_address: '192.168.1.102', role: 'client', is_self: false, status: 'offline', last_seen: new Date(Date.now() - 320_000).toISOString(),     db_backend: 'sqlite', table_count: 12, version: '0.8.1' },
    { id: 103, hostname: 'LAB-STATION',  ip_address: '192.168.1.115', role: 'client', is_self: false, status: 'online',  last_seen: new Date(Date.now() - 8_000).toISOString(),       db_backend: 'mssql',  table_count: 24, version: '0.8.0' },
  ];
  const clients = USE_MOCK_CLIENTS && registry.filter((e) => !e.is_self && e.role === 'client').length === 0
    ? MOCK_CLIENTS
    : registry.filter((e) => !e.is_self && e.role === 'client');
  const serverEntry = registry.find((e) => e.role === 'server' && !e.is_self);

  return (
    <div className={s.root}>
      {/* ── Section header bar (always rendered) ── */}
      <div className={s.header}>
        <h3 className={s.headerTitle}>Network Overview</h3>
        <Button
          size="small"
          appearance="subtle"
          icon={refreshingOverview ? <Spinner size="extra-tiny" /> : <ArrowClockwiseRegular />}
          onClick={handleRefreshOverview}
          disabled={refreshingOverview}
          title="Refresh network overview"
        />
        <span className={s.headerTime}>
          {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      {/* Loading / error states — outside body so padding matches other sections */}
      {loading && (
        <div className={s.loadingRow}>
          <Spinner size="tiny" />
          Loading…
        </div>
      )}
      {!loading && (error || !health) && (
        <div className={s.errorRow}>
          <ErrorCircleRegular style={{ fontSize: '14px' }} />
          {error ?? 'No data'}
        </div>
      )}

      {/* Center DB / sampling banners + test result */}
      {!loading && (health || dbResult || pingResult) && (
        <div className={s.bannerStack}>
          {health && health.centerDbEnabled && !health.centerDbConnected && (
            <div className={isCenterDbWarn ? s.warnRow : s.pauseRow}>
              <ErrorCircleRegular style={{ fontSize: '14px', color: isCenterDbWarn ? '#c19c00' : '#8e1c1c' }} />
              {health.centerDbMessage ?? 'Shared DB is not ready.'}
              {health.fallbackActive ? ' Running on local SQLite fallback.' : ''}
            </div>
          )}
          {health && health.samplingPaused && (
            <div className={isSamplingWarn ? s.warnRow : s.pauseRow}>
              <ErrorCircleRegular style={{ fontSize: '14px', color: isSamplingWarn ? '#c19c00' : '#8e1c1c' }} />
              <strong>Sampling paused.</strong>&nbsp;
              {health.pausedReason ?? 'Shared DB unreachable — no data is being written until the connection is restored.'}
            </div>
          )}
          {dbResult && (
            <ResultStrip result={dbResult} onDismiss={() => { setDbResult(null); }} />
          )}
          {pingResult && (
            <ResultStrip result={pingResult} onDismiss={() => { setPingResult(null); }} />
          )}
        </div>
      )}

      {!loading && health && (
      <div className={s.body}>

        {/* ══════════════════════════════════════════════════════════
            SCENARIO A — Server
        ══════════════════════════════════════════════════════════ */}
        {!loading && health && role === 'server' && (
          <>
            {/* This PC card */}
            <div className={mergeClasses(s.pcCard, s.pcCardServer)}>
              <ServerRegular className={mergeClasses(s.pcCardIcon, s.pcCardIconServer)} />
              <div className={s.pcCardInfo}>
                <div className={s.pcCardTitle}>
                  Server (This PC)
                  <Badge appearance="filled" color="success" size="small">● Online</Badge>
                </div>
                <div className={s.pcCardMeta}>
                  <span>{selfEntry?.hostname ?? health.hostname ?? '—'}</span>
                  {selfEntry?.ip_address && (
                    <><span className={s.metaSep}>·</span><span>{selfEntry.ip_address}</span></>
                  )}
                  <span className={s.metaSep}>·</span>
                  <span>{backendLabel(effectiveCenterBackendType(health))}</span>
                  {selfEntry?.table_count != null && (
                    <><span className={s.metaSep}>·</span><span>{selfEntry.table_count} tables</span></>
                  )}
                </div>
              </div>
              <div className={s.pcCardActions}>
                <Button
                  size="small"
                  appearance="outline"
                  icon={testingDb ? <Spinner size="extra-tiny" /> : <DatabaseRegular />}
                  onClick={handleTestDb}
                  disabled={testingDb}
                >
                  Test DB
                </Button>
                <Button
                  size="small"
                  appearance="outline"
                  icon={refreshingClients ? <Spinner size="extra-tiny" /> : <ArrowClockwiseRegular />}
                  onClick={handleRefreshClients}
                  disabled={refreshingClients}
                  title="Refresh client list"
                >
                  Clients
                </Button>
              </div>
            </div>

            {/* Client tree */}
            {clients.length > 0 ? (
              <div className={s.tree}>
                {clients.map((entry, i) => {
                  const ps = clientPingState[entry.id];
                  return (
                  <div key={entry.id} className={s.treeRow}>
                    <span className={s.treeConnector}>{i < clients.length - 1 ? '├──' : '└──'}</span>
                    <DesktopRegular className={s.treeIcon} />
                    <span className={s.treeHostname}>{entry.hostname}</span>
                    <span className={s.treeIp}>{entry.ip_address}</span>
                    <span className={s.treeStatus}>
                      <span className={entry.status === 'online' ? s.treeDotOnline : s.treeDotOffline} />
                      {entry.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                    <span className={s.treeMeta}>Last: {formatLastSeen(entry.last_seen)}</span>
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={ps?.testing ? <Spinner size="extra-tiny" /> : <NetworkCheckRegular />}
                      onClick={() => handlePingClient(entry)}
                      disabled={ps?.testing}
                      className={s.treeRowPushRight}
                    >
                      Test
                    </Button>
                    {ps && !ps.testing && ps.ok !== null && (
                      <span className={ps.ok ? s.clientPingBadgeOk : s.clientPingBadgeFail}>
                        {ps.msg}
                      </span>
                    )}
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className={s.treeEmpty}>
                No client PCs connected yet. Clients appear once they send heartbeats.
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            SCENARIO B — Client
        ══════════════════════════════════════════════════════════ */}
        {!loading && health && role === 'client' && (
          <>
            {/* This PC card */}
            <div className={s.pcCard}>
              <DesktopRegular className={s.pcCardIcon} />
              <div className={s.pcCardInfo}>
                <div className={s.pcCardTitle}>
                  Client (This PC)
                </div>
                <div className={s.pcCardMeta}>
                  <span>{selfEntry?.hostname ?? health.hostname ?? '—'}</span>
                  {selfEntry?.ip_address && (
                    <><span className={s.metaSep}>·</span><span>{selfEntry.ip_address}</span></>
                  )}
                  {serverEntry?.ip_address && (
                    <><span className={s.metaSep}>·</span><span>Server: {serverEntry.ip_address}</span></>
                  )}
                </div>
              </div>
              <div className={s.pcCardActions}>
                <Button
                  size="small"
                  appearance="outline"
                  icon={testingPing ? <Spinner size="extra-tiny" /> : <NetworkCheckRegular />}
                  onClick={handlePingServer}
                  disabled={testingPing}
                >
                  Ping Server
                </Button>
                <Button
                  size="small"
                  appearance="outline"
                  icon={testingDb ? <Spinner size="extra-tiny" /> : <DatabaseRegular />}
                  onClick={handleTestDb}
                  disabled={testingDb}
                >
                  Test DB
                </Button>
              </div>
            </div>

            {/* Server row */}
            <div className={s.tree}>
              <div className={s.treeRow}>
                <span className={s.treeConnector}>└──</span>
                <ServerRegular className={s.treeIcon} />
                <span className={s.treeHostname}>{serverEntry?.hostname ?? '—'}</span>
                <span className={s.treeIp}>{serverEntry?.ip_address ?? '—'}</span>
                <span className={s.treeStatus}>
                  {health.centerDbConnected
                    ? <><span className={s.treeDotOnline} />{centerDbStatusLabel(health.centerDbStatus, health.centerDbConnected)}</>
                    : <><span className={s.treeDotOffline} />{centerDbStatusLabel(health.centerDbStatus, health.centerDbConnected)}</>}
                </span>
                {health.lastSyncAgo && (
                  <span className={s.treeMeta}>Last sync: {health.lastSyncAgo}</span>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            SCENARIO C — Standalone
        ══════════════════════════════════════════════════════════ */}
        {!loading && health && role === 'standalone' && (
          <>
            {/* This PC card */}
            <div className={s.pcCard}>
              <DesktopRegular className={s.pcCardIcon} />
              <div className={s.pcCardInfo}>
                <div className={s.pcCardTitle}>
                  Standalone (This PC)
                </div>
                <div className={s.pcCardMeta}>
                  <span>{selfEntry?.hostname ?? health.hostname ?? '—'}</span>
                  <span className={s.metaSep}>·</span>
                  <span>{backendLabel(effectiveCenterBackendType(health))}</span>
                  <span className={s.metaSep}>·</span>
                  <span>Local mode</span>
                </div>
              </div>
              <div className={s.pcCardActions}>
                <Button
                  size="small"
                  appearance="outline"
                  icon={testingDb ? <Spinner size="extra-tiny" /> : <DatabaseRegular />}
                  onClick={handleTestDb}
                  disabled={testingDb}
                >
                  Test DB
                </Button>
              </div>
            </div>

          </>
        )}

        {/* ── Field Devices strip ── (all scenarios) */}
        <DevicesStrip />

      </div>
      )}
    </div>
  );
};
