/**
 * Dashboard Page
 *
 * Redesigned following the DatabaseConfigPage design language:
 *   - makeStyles (Griffel/Fluent UI v9 tokens)
 *   - Sections with bordered sectionHeader (gray #f5f5f5)
 *   - Intro banner (blue #f0f6ff)
 *   - Compact, information-dense layout
 *   - Real API data throughout
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  makeStyles,
  mergeClasses,
  Button,
  Spinner,
  Tooltip,
} from '@fluentui/react-components';
import {
  ArrowClockwiseRegular,
  ChevronRightRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { getSyncHealth, SyncHealthData } from '../services/syncHealthApi';
import { API_BASE_URL } from '../../../config/constants';
import { getIniConfig, IniConfig } from '../../database/services/databaseConfigApi';
import { SyncHealthWidget } from '../components/SyncHealthWidget';
import { SyncLogDrawer } from '../components/SyncLogDrawer';
import { TrendLogs } from '../components/TrendLogs';
import { RecentActivity, ActivitySummary } from '../components/RecentActivity';
import { NetworkTopologyWidget } from '../components/NetworkTopologyWidget';
import { ModeBanner } from '../components/ModeBanner';


// ---------------------------------------------------------------------------
// Styles — mirrors DatabaseConfigPage.tsx design
// ---------------------------------------------------------------------------

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100% + 20px)',
    margin: '-10px',
    backgroundColor: '#ffffff',
  },
  scrollArea: {
    flex: 1,
    overflow: 'auto',
    padding: '0 6px 20px',
    scrollbarWidth: 'thin',
    scrollbarColor: '#c1c1c1 transparent',
  },

  /* ── Intro Banner ── */
  introBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 20px',
    margin: '12px',
    backgroundColor: '#f0f6ff',
    borderRadius: '8px',
    border: '1px solid #c7dff7',
  },
  introBannerIcon: {
    fontSize: '22px',
    color: '#0f6cbd',
    flexShrink: 0,
  },
  introBannerBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  introBannerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  introBannerTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0f6cbd',
    margin: 0,
  },
  introBannerTime: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#323130',
    fontFamily: 'monospace',
    flexShrink: 0,
  },
  chipRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11.5px',
    fontWeight: 500,
    border: '1px solid',
  },
  chipBlue: {
    backgroundColor: '#e8f2fc',
    borderTopColor: '#b3d4f0',
    borderRightColor: '#b3d4f0',
    borderBottomColor: '#b3d4f0',
    borderLeftColor: '#b3d4f0',
    color: '#0f6cbd',
  },
  chipGreen: {
    backgroundColor: '#e8f5e9',
    borderTopColor: '#a5d6a7',
    borderRightColor: '#a5d6a7',
    borderBottomColor: '#a5d6a7',
    borderLeftColor: '#a5d6a7',
    color: '#107c10',
  },
  chipGray: {
    backgroundColor: '#f0f0f0',
    borderTopColor: '#d8d8d8',
    borderRightColor: '#d8d8d8',
    borderBottomColor: '#d8d8d8',
    borderLeftColor: '#d8d8d8',
    color: '#605e5c',
  },
  chipDotGreen: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
    backgroundColor: '#107c10',
  },
  chipDotGray: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
    backgroundColor: '#a19f9d',
  },

  /* ── Section ── */
  section: {
    margin: '0 12px 12px',
    border: '1px solid #edebe9',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  sectionFirst: {
    marginTop: '8px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0 12px',
    borderBottom: '1px solid #edebe9',
    backgroundColor: '#f5f5f5',
    minHeight: '32px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#323130',
    margin: 0,
    flex: 1,
  },
  activitySummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11.5px',
    color: '#605e5c',
  },
  activitySummaryOk: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    color: '#107c10',
  },
  activitySummaryFail: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    color: '#d13438',
  },
  activitySummarySep: {
    color: '#c8c6c4',
  },
  activitySummaryTotal: {
    color: '#8a8886',
  },

  /* ── KPI Cards row ── */
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
  },
  kpiCard: {
    display: 'grid',
    gridTemplateRows: 'auto 34px auto',
    rowGap: '4px',
    alignItems: 'start',
    padding: '14px 16px',
    borderRight: '1px solid #edebe9',
    '&:last-child': {
      borderRightWidth: 0,
    },
  },
  kpiLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#a19f9d',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    lineHeight: '1',
  },
  kpiValue: {
    fontSize: '26px',
    fontWeight: 700,
    color: '#323130',
    lineHeight: '1.1',
  },
  kpiValueMd: {
    fontSize: '17px',
    fontWeight: 600,
    color: '#323130',
    lineHeight: '1.2',
  },
  kpiValueGreen: {
    color: '#107c10',
  },
  kpiValueRed: {
    color: '#d13438',
  },
  kpiDetail: {
    fontSize: '12px',
    color: '#605e5c',
    lineHeight: '1.3',
    minHeight: '16px',
    alignSelf: 'end',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'flex-end',
    gap: '4px',
  },
  kpiDetailMono: {
    fontSize: '12px',
    color: '#605e5c',
    lineHeight: '1.3',
    fontFamily: 'monospace',
    minHeight: '16px',
    alignSelf: 'end',
    display: 'flex',
    alignItems: 'flex-end',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  statusDot: {
    display: 'inline-block',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusDotGreen: {
    backgroundColor: '#107c10',
  },
  statusDotMuted: {
    backgroundColor: '#a19f9d',
  },

  /* ── Wrappers ── */
  loadingBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#605e5c',
  },
  syncHealthWrapper: {
    padding: '8px 0',
  },
  trendlogWrapper: {
    height: '320px',
    padding: '8px 0',
  },

  /* ── 2-column monitoring ── */
  monitoringGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
  },
  monitoringCol: {
    borderRight: '1px solid #edebe9',
    '&:last-child': {
      borderRightWidth: 0,
    },
  },
  monitoringColHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 12px',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: '#fafafa',
    minHeight: '28px',
  },
  monitoringColTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#605e5c',
    margin: 0,
    flex: 1,
  },
  monitoringColContent: {
    overflow: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: '#c1c1c1 transparent',
  },

  /* ── View-all button ── */
  viewAll: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    fontSize: '12px',
    color: '#0f6cbd',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: '0',
    fontFamily: 'inherit',
    '&:hover': {
      textDecorationLine: 'underline',
    },
  },
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DashboardPage: React.FC = () => {
  const s = useStyles();
  const { devices, deviceStatuses } = useDeviceTreeStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncHealth, setSyncHealth] = useState<SyncHealthData | null>(null);
  const [alarmCount, setAlarmCount] = useState(0);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [syncLogOpen, setSyncLogOpen] = useState(false);
  const [activitySummary, setActivitySummary] = useState<ActivitySummary | null>(null);
  const [iniConfig, setIniConfig] = useState<IniConfig | null>(null);
  // Track whether we're in "fast poll" mode (after a mode change, waiting for restart)
  const [fastPolling, setFastPolling] = useState(false);

  // appMode derivation:
  // Primary = syncHealth.role (live runtime state — what the service is actually running as).
  // Fallback = iniConfig (INI file) while syncHealth hasn't loaded yet.
  // NOTE: INI changes take effect only after a service restart; the ModeBanner shows
  //       a "restart pending" notice when INI and runtime disagree.
  const appMode: 'standalone' | 'server' | 'client' = syncHealth
    ? (syncHealth.role === 'server' ? 'server' : syncHealth.role === 'client' ? 'client' : 'standalone')
    : (iniConfig?.enabled ? (iniConfig.role === 'server' ? 'server' : 'client') : 'standalone');

  // Derive restartPending here so we can use it to drive fast polling
  const iniMode: 'standalone' | 'server' | 'client' = iniConfig?.enabled
    ? (iniConfig.role === 'server' ? 'server' : 'client')
    : 'standalone';
  const restartPending = !!syncHealth && iniConfig !== null && iniMode !== appMode;

  // When restartPending flips true → start fast polling; when mode stabilises → stop
  useEffect(() => {
    if (restartPending) {
      setFastPolling(true);
    } else {
      setFastPolling(false);
    }
  }, [restartPending]);

  const fetchIniConfig = useCallback(async () => {
    try { setIniConfig(await getIniConfig()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchIniConfig(); }, [fetchIniConfig]);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const onlineCount = Array.from(deviceStatuses.values()).filter((v) => v === 'online').length;
  const offlineCount = devices.length - onlineCount;

  const fetchHealth = useCallback(async () => {
    try {
      const [health, alarmsResp] = await Promise.allSettled([
        getSyncHealth(),
        fetch(`${API_BASE_URL}/api/t3_device/alarms/active`),
      ]);
      if (health.status === 'fulfilled') {
        setSyncHealth(health.value);
        setHealthError(null);
      } else {
        setHealthError(health.reason instanceof Error ? health.reason.message : 'Failed to load sync health');
      }
      if (alarmsResp.status === 'fulfilled' && alarmsResp.value.ok) {
        const d = await alarmsResp.value.json();
        setAlarmCount(typeof d?.total === 'number' ? d.total : Array.isArray(d) ? d.length : 0);
      }
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    // Fast-poll (every 3s) right after a mode change so the banner updates quickly
    // once the server restarts. Falls back to normal 60s once stable.
    const interval = fastPolling ? 3_000 : 60_000;
    const id = setInterval(fetchHealth, interval);
    return () => clearInterval(id);
  }, [fetchHealth, fastPolling]);

  // null = not yet loaded OR standalone (Center DB not in use)
  // true = Center DB enabled + connected
  // false = Center DB enabled + disconnected
  const centerDbOk: boolean | null = syncHealth
    ? (syncHealth.centerDbEnabled ? syncHealth.centerDbConnected : null)
    : null;

  // Human-readable CENTER DB detail for the KPI card
  const centerDbDetail: string = syncHealth
    ? syncHealth.centerDbEnabled
      ? (() => {
          const backend = (syncHealth.centerDbEnabled && syncHealth.backendType === 'sqlite')
            ? 'SQL Server'  // sqlite means SQLite fallback — target is still SQL Server
            : syncHealth.backendType === 'mssql' ? 'SQL Server'
            : syncHealth.backendType;
          const role = syncHealth.role === 'server' ? 'Server'
            : syncHealth.role === 'client' ? 'Client'
            : syncHealth.role;
          return `${backend} · ${role}`;
        })()
      : 'Standalone mode'
    : '—';

  return (
    <div className={s.container}>
      <div className={s.scrollArea}>

        {/* ── Mode Banner ── */}
        <ModeBanner
          appMode={appMode}
          syncHealth={syncHealth}
          iniConfig={iniConfig}
          onModeChanged={() => { fetchIniConfig(); fetchHealth(); setFastPolling(true); }}
        />

        {/* ── Network Topology (Server + Client modes only) ── */}
        {appMode !== 'standalone' && (
          <div className={mergeClasses(s.section, s.sectionFirst)}>
            <NetworkTopologyWidget
              currentTime={currentTime}
              health={syncHealth}
              healthLoading={healthLoading}
              healthError={healthError}
              onRefreshOverview={fetchHealth}
            />
          </div>
        )}

        {/* ── System Overview KPIs ── */}
        <div className={mergeClasses(s.section, appMode === 'standalone' ? s.sectionFirst : undefined)}>
          <div className={s.sectionHeader}>
            <h3 className={s.sectionTitle}>System Overview</h3>
            <Button
              size="small"
              appearance="subtle"
              icon={<ArrowClockwiseRegular />}
              onClick={fetchHealth}
              title="Refresh"
            />
          </div>
          {healthLoading ? (
            <div className={s.loadingBar}>
              <Spinner size="tiny" />
              <span>Loading…</span>
            </div>
          ) : (
            <div className={s.kpiRow}>

              {/* Devices */}
              <div className={s.kpiCard}>
                <span className={s.kpiLabel}>Devices</span>
                <span className={s.kpiValue}>{devices.length}</span>
                <span className={s.kpiDetail}>
                  <span
                    className={mergeClasses(s.statusDot, onlineCount > 0 ? s.statusDotGreen : s.statusDotMuted)}
                  />
                  {onlineCount} online{offlineCount > 0 ? ` · ${offlineCount} offline` : ''}
                </span>
              </div>

              {/* Shared DB (server/client) OR Realtime Poll (standalone) */}
              {appMode === 'standalone' ? (
                <div className={s.kpiCard}>
                  <span className={s.kpiLabel}>Realtime Poll</span>
                  <span className={mergeClasses(
                    s.kpiValueMd,
                    syncHealth?.samplingPaused ? s.kpiValueRed : s.kpiValueGreen,
                  )}>
                    {syncHealth ? (syncHealth.samplingPaused ? 'Paused' : 'Active') : '—'}
                  </span>
                  <span className={s.kpiDetail}>
                    {syncHealth?.samplingPaused ? (syncHealth.pausedReason ?? 'Paused') : 'FFI polling running'}
                  </span>
                </div>
              ) : (
                <div className={s.kpiCard}>
                  <span className={s.kpiLabel}>Shared DB</span>
                  <span className={mergeClasses(
                    s.kpiValueMd,
                    centerDbOk === true ? s.kpiValueGreen : centerDbOk === false ? s.kpiValueRed : '',
                  )}>
                    {centerDbOk === true ? 'Connected' : centerDbOk === false ? 'Disconnected' : '—'}
                  </span>
                  <span className={s.kpiDetail}>{centerDbDetail}</span>
                </div>
              )}

              {/* Last Poll (standalone) / Last Sync (server/client) */}
              <div className={s.kpiCard}>
                <span className={s.kpiLabel}>{appMode === 'standalone' ? 'Last Poll' : 'Last Sync'}</span>
                <Tooltip content={syncHealth?.lastSyncTime ?? 'No data recorded'} relationship="description">
                  <span className={s.kpiValueMd}>{syncHealth?.lastSyncAgo ?? '—'}</span>
                </Tooltip>
                <span className={s.kpiDetail}>
                  {appMode === 'standalone'
                    ? `${syncHealth?.devicesSyncedToday ?? 0} device${syncHealth?.devicesSyncedToday !== 1 ? 's' : ''} polled`
                    : `${syncHealth?.devicesSyncedToday ?? 0} device${syncHealth?.devicesSyncedToday !== 1 ? 's' : ''} today`}
                </span>
              </div>

              {/* Records Today */}
              <div className={s.kpiCard}>
                <span className={s.kpiLabel}>Records Today</span>
                <span className={s.kpiValue}>
                  {syncHealth?.recordsToday.total.toLocaleString() ?? '—'}
                </span>
                <span className={s.kpiDetail}>
                  {syncHealth
                    ? `${syncHealth.recordsToday.inputs}in · ${syncHealth.recordsToday.outputs}out · ${syncHealth.recordsToday.variables}var`
                    : '—'}
                </span>
              </div>

              {/* DB Size */}
              <div className={s.kpiCard}>
                <span className={s.kpiLabel}>DB Size</span>
                <span className={s.kpiValueMd}>{syncHealth?.dbSizeHuman ?? '—'}</span>
                <Tooltip content={syncHealth?.dbFolderPath ?? '—'} relationship="description">
                  <span className={s.kpiDetailMono}>{syncHealth?.dbFolderPath ?? '—'}</span>
                </Tooltip>
              </div>

              {/* Alarms */}
              <div className={s.kpiCard}>
                <span className={s.kpiLabel}>Alarms</span>
                <span className={mergeClasses(s.kpiValue, alarmCount > 0 ? s.kpiValueRed : s.kpiValueGreen)}>
                  {alarmCount}
                </span>
                <span className={s.kpiDetail}>
                  {alarmCount === 0 ? 'All systems normal' : 'Requires attention'}
                </span>
              </div>

            </div>
          )}
        </div>

        {/* ── Sync & DB Health ── */}
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <h3 className={s.sectionTitle}>
              {appMode === 'standalone' ? 'Local Database Health' : 'Sync \u0026 Database Health'}
            </h3>
          </div>
          <div className={s.syncHealthWrapper}>
            <SyncHealthWidget
              onViewLog={() => setSyncLogOpen(true)}
              data={syncHealth}
              loading={healthLoading}
              error={healthError}
              onRefresh={fetchHealth}
              isStandalone={appMode === 'standalone'}
            />
          </div>
        </div>

        {/* ── Trend Logs ── */}
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <h3 className={s.sectionTitle}>Trend Logs — Last 24 Hours</h3>
            <button
              className={s.viewAll}
              onClick={() => { window.location.hash = '#/t3000/trendlogs'; }}
            >
              View All <ChevronRightRegular style={{ fontSize: '12px' }} />
            </button>
          </div>
          <div className={s.trendlogWrapper}>
            <TrendLogs isStandalone={appMode === 'standalone'} />
          </div>
        </div>

        {/* ── Monitoring ── */}
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <h3 className={s.sectionTitle}>Monitoring</h3>
            {activitySummary && (
              <div className={s.activitySummary}>
                <span className={s.activitySummaryOk}>
                  <CheckmarkCircleRegular style={{ fontSize: '13px' }} />
                  {activitySummary.ok} ok
                </span>
                <span className={s.activitySummarySep}>·</span>
                <span className={s.activitySummaryFail}>
                  <DismissCircleRegular style={{ fontSize: '13px' }} />
                  {activitySummary.fail} failed
                </span>
                <span className={s.activitySummarySep}>·</span>
                <span className={s.activitySummaryTotal}>{activitySummary.total} total</span>
              </div>
            )}
          </div>
          <div className={s.monitoringColContent}>
            <RecentActivity onSummary={setActivitySummary} />
          </div>
        </div>

      </div>
      <SyncLogDrawer open={syncLogOpen} onClose={() => setSyncLogOpen(false)} />
    </div>
  );
};

