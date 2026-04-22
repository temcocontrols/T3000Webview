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
  ArrowSyncRegular,
  CheckmarkCircleRegular,
  ErrorCircleRegular,
  NetworkCheckRegular,
  DatabaseRegular,
  DismissRegular,
} from '@fluentui/react-icons';
import { getSyncHealth, SyncHealthData } from '../services/syncHealthApi';
import {
  getRegistry,
  getServerDbStatus,
  testConnection,
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
    borderColor: '#c7dff7',
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
    gap: '7px',
    padding: '5px 14px',
    fontSize: '12px',
    borderRadius: '0 0 4px 4px',
    marginTop: '-1px',
    borderLeft: '1px solid',
    borderRight: '1px solid',
    borderBottom: '1px solid',
  },
  resultStripOk: {
    backgroundColor: '#f1faf1',
    borderColor: '#a5d6a7',
    color: '#107c10',
  },
  resultStripFail: {
    backgroundColor: '#fdf3f4',
    borderColor: '#f4b8bb',
    color: '#d13438',
  },
  resultStripIcon: {
    fontSize: '14px',
    flexShrink: 0,
  },
  resultStripText: {
    flex: 1,
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
    try {
      const [h, reg] = await Promise.allSettled([getSyncHealth(), getRegistry()]);
      if (h.status === 'fulfilled') setHealth(h.value);
      if (reg.status === 'fulfilled') setRegistry(reg.value);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Test DB connection ──
  const handleTestDb = async () => {
    if (!health) return;
    setTestingDb(true);
    setDbResult(null);
    try {
      const r = await testConnection({ backend_type: health.backendType as any });
      setDbResult({
        ok: r.success,
        msg: r.success
          ? `${health.backendType.toUpperCase()} connected${r.latency_ms != null ? ` (${r.latency_ms}ms)` : ''}`
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
  const clients = registry.filter((e) => !e.is_self && e.role === 'client');
  const serverEntry = registry.find((e) => e.role === 'server' && !e.is_self);

  return (
    <div className={s.root}>
      {/* ── Section header bar (always rendered) ── */}
      <div className={s.header}>
        <h3 className={s.headerTitle}>Network Overview</h3>
        <Button
          size="small"
          appearance="subtle"
          icon={<ArrowSyncRegular />}
          onClick={load}
          title="Refresh"
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
                  <span>{health.backendType.toUpperCase()}</span>
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
                  icon={refreshingClients ? <Spinner size="extra-tiny" /> : <ArrowSyncRegular />}
                  onClick={handleRefreshClients}
                  disabled={refreshingClients}
                >
                  Clients
                </Button>
              </div>
            </div>

            {/* DB test result */}
            {dbResult && (
              <ResultStrip result={dbResult} onDismiss={() => { setDbResult(null); }} />
            )}

            {/* Client tree */}
            {clients.length > 0 ? (
              <div className={s.tree}>
                {clients.map((entry, i) => (
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
                  </div>
                ))}
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

            {/* Ping result */}
            {pingResult && (
              <ResultStrip result={pingResult} onDismiss={() => { setPingResult(null); }} />
            )}
            {/* DB result */}
            {dbResult && (
              <ResultStrip result={dbResult} onDismiss={() => { setDbResult(null); }} />
            )}

            {/* Server row */}
            <div className={s.tree}>
              <div className={s.treeRow}>
                <span className={s.treeConnector}>└──</span>
                <ServerRegular className={s.treeIcon} />
                <span className={s.treeHostname}>{serverEntry?.hostname ?? '—'}</span>
                <span className={s.treeIp}>{serverEntry?.ip_address ?? '—'}</span>
                <span className={s.treeStatus}>
                  {health.centerDbConnected
                    ? <><span className={s.treeDotOnline} />Connected</>
                    : <><span className={s.treeDotOffline} />Disconnected</>}
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
                  <span>{health.backendType.toUpperCase()}</span>
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

            {/* DB result */}
            {dbResult && (
              <ResultStrip result={dbResult} onDismiss={() => { setDbResult(null); }} />
            )}
          </>
        )}

        {/* ── Field Devices strip ── (all scenarios) */}
        <DevicesStrip />

      </div>
      )}
    </div>
  );
};
