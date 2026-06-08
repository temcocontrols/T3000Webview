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

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  InfoRegular,
  DataBarVerticalRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { getSyncHealth, getServerSyncMetrics, SyncHealthData, ServerSyncMetrics } from '../services/syncHealthApi';
import { API_BASE_URL } from '../../../config/constants';
import { getIniConfig, IniConfig } from '../../database/services/databaseConfigApi';
import { SyncHealthWidget } from '../components/SyncHealthWidget';
import { SyncLogDrawer } from '../components/SyncLogDrawer';
import { TrendLogs, TrendDeviceOption } from '../components/TrendLogs';
import { TrendlogVerifyDrawer } from '../../trendlogs/components/TrendlogVerifyDrawer';
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
  trendSection: {
    overflow: 'visible',
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
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
    minWidth: 0,
  },
  sectionTitleStatic: {
    flex: 'none',
  },
  sectionHeaderActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  sectionInfoButton: {
    border: 'none',
    background: 'transparent',
    color: '#8a8886',
    cursor: 'help',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    flexShrink: 0,
    '&:hover': {
      color: '#605e5c',
    },
  },
  activitySummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#605e5c',
  },
  summaryTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '1px 7px',
    borderRadius: '999px',
    fontSize: '11.5px',
    fontWeight: 600,
    lineHeight: 1.2,
    border: '1px solid transparent',
  },
  summaryTagOk: {
    color: '#107c10',
    backgroundColor: '#edf7ed',
    borderColor: '#c7e7cb',
  },
  summaryTagFail: {
    color: '#d13438',
    backgroundColor: '#fdeeee',
    borderColor: '#f5c2c3',
  },
  summaryTagTotal: {
    color: '#605e5c',
    backgroundColor: '#f3f2f1',
    borderColor: '#e1dfdd',
  },
  activitySummaryOk: {
    color: '#107c10',
  },
  activitySummaryFail: {
    color: '#d13438',
  },
  activitySummarySep: {
    color: '#c8c6c4',
  },
  activitySummaryTotal: {
    color: '#8a8886',
  },
  monitoringHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
    minWidth: 0,
  },
  monitoringTitle: {
    flex: 'unset',
    marginRight: '2px',
  },
  monitoringHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconButton: {
    border: 'none',
    background: 'transparent',
    color: '#8a8886',
    cursor: 'help',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '18px',
    height: '18px',
    flexShrink: 0,
    transitionProperty: 'color',
    transitionDuration: '120ms',
    '&:hover': {
      color: '#605e5c',
    },
  },
  refreshIconButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    border: '1px solid #bfd8f2',
    background: '#edf5fe',
    color: '#0f6cbd',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
    transitionProperty: 'background-color, color, border-color, box-shadow',
    transitionDuration: '120ms',
    '&:hover': {
      background: '#e4f0fc',
      borderColor: '#a9caed',
      boxShadow: '0 0 0 1px #e5f1fb inset',
    },
    '&:active': {
      background: '#ebf3fc',
      borderColor: '#a9caed',
    },
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
    alignItems: 'center',
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
    display: 'block',
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

  /* ── Devices details popover ── */
  kpiLabelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiCardRelative: {
    position: 'relative',
  },
  detailsLink: {
    fontSize: '11px',
    color: '#0078d4',
    cursor: 'pointer',
    lineHeight: '1',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  devPopover: {
    position: 'fixed',
    zIndex: 9999,
    width: '340px',
    backgroundColor: '#fafafa',
    border: '1px solid #d0d0d0',
    borderRadius: '6px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    overflow: 'hidden',
  },
  devPopoverHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#e8e8e8',
    borderBottom: '1px solid #d0d0d0',
  },
  devPopoverTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#323130',
    letterSpacing: '0.1px',
  },
  devPopoverBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#323130',
    backgroundColor: '#c8c6c4',
    borderRadius: '10px',
    padding: '1px 7px',
  },
  devList: {
    padding: '4px 0',
  },
  devRow: {
    display: 'grid',
    gridTemplateColumns: '12px 1fr 90px 36px',
    alignItems: 'center',
    columnGap: '10px',
    padding: '5px 12px',
    borderBottom: '1px solid #edebe9',
    '&:last-child': {
      borderBottomWidth: 0,
    },
  },
  devName: {
    fontSize: '12.5px',
    color: '#1b1b1b',
    fontWeight: 700,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  devSn: {
    fontSize: '11px',
    color: '#605e5c',
    whiteSpace: 'nowrap',
    fontFamily: 'monospace',
    textAlign: 'left',
  },
  devPanel: {
    fontSize: '11px',
    color: '#605e5c',
    whiteSpace: 'nowrap',
    fontFamily: 'monospace',
    textAlign: 'left',
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
    minHeight: '430px',
    padding: '10px 0 12px',
    overflow: 'visible',
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
  const [alarmCount, setAlarmCount] = useState<number | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [syncLogOpen, setSyncLogOpen] = useState(false);
  const [devPopoverOpen, setDevPopoverOpen] = useState(false);
  const [devPopoverPos, setDevPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const detailsAnchorRef = useRef<HTMLSpanElement>(null);
  const devPopoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activitySummary, setActivitySummary] = useState<ActivitySummary | null>(null);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [trendRefreshKey, setTrendRefreshKey] = useState(0);
  const [verifyDrawerOpen, setVerifyDrawerOpen] = useState(false);
  const [verifySerial, setVerifySerial] = useState<number | null>(null);
  const [verifyPanel, setVerifyPanel] = useState<number | null>(null);
  const [verifyDevices, setVerifyDevices] = useState<TrendDeviceOption[]>([]);
  const [iniConfig, setIniConfig] = useState<IniConfig | null>(null);
  const [serverMetrics, setServerMetrics] = useState<ServerSyncMetrics | null>(null);
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
        // In client mode, also fetch server's actual sync counts
        if (health.value.role === 'client') {
          getServerSyncMetrics().then(setServerMetrics).catch(() => setServerMetrics(null));
        } else {
          setServerMetrics(null);
        }
      } else {
        setHealthError(health.reason instanceof Error ? health.reason.message : 'Failed to load sync health');
      }
      if (alarmsResp.status === 'fulfilled' && alarmsResp.value.ok) {
        const d = await alarmsResp.value.json();
        setAlarmCount(typeof d?.total === 'number' ? d.total : Array.isArray(d) ? d.length : 0);
      } else {
        // Show unavailable instead of a potentially misleading zero.
        setAlarmCount(null);
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
              <div className={mergeClasses(s.kpiCard, s.kpiCardRelative)}>
                <div className={s.kpiLabelRow}>
                  <span className={s.kpiLabel}>Devices</span>
                  <span
                    ref={detailsAnchorRef}
                    className={s.detailsLink}
                    onMouseEnter={() => {
                      if (devPopoverCloseTimer.current) clearTimeout(devPopoverCloseTimer.current);
                      const rect = detailsAnchorRef.current?.getBoundingClientRect();
                      if (rect) setDevPopoverPos({ top: rect.top - 6, left: rect.right });
                      setDevPopoverOpen(true);
                    }}
                    onMouseLeave={() => {
                      devPopoverCloseTimer.current = setTimeout(() => setDevPopoverOpen(false), 150);
                    }}
                  >
                    Details
                  </span>
                </div>
                <span className={s.kpiValue}>{devices.length}</span>
                <span className={s.kpiDetail}>
                  <span
                    className={mergeClasses(s.statusDot, onlineCount > 0 ? s.statusDotGreen : s.statusDotMuted)}
                  />
                  {onlineCount} online{offlineCount > 0 ? ` · ${offlineCount} offline` : ''}
                </span>
              </div>
              {devPopoverOpen && devPopoverPos && createPortal(
                <div
                  className={s.devPopover}
                  ref={(el) => {
                    if (el) {
                      el.style.top = 'auto';
                      el.style.right = 'auto';
                      el.style.bottom = `${window.innerHeight - devPopoverPos.top}px`;
                      el.style.left = `${devPopoverPos.left}px`;
                    }
                  }}
                  onMouseEnter={() => {
                    if (devPopoverCloseTimer.current) clearTimeout(devPopoverCloseTimer.current);
                    setDevPopoverOpen(true);
                  }}
                  onMouseLeave={() => setDevPopoverOpen(false)}
                >
                  <div className={s.devPopoverHeader}>
                    <span className={s.devPopoverTitle}>Device Details</span>
                    <span className={s.devPopoverBadge}>{devices.length}</span>
                  </div>
                  <div className={s.devList}>
                    {[...devices].sort((a, b) => a.serialNumber - b.serialNumber).map((dev) => {
                      const isOnline = deviceStatuses.get(dev.serialNumber) === 'online';
                      return (
                        <div key={`${dev.serialNumber}-${dev.panelId}`} className={s.devRow}>
                          <span className={mergeClasses(s.statusDot, isOnline ? s.statusDotGreen : s.statusDotMuted)} />
                          <span className={s.devName}>{dev.nameShowOnTree || dev.productName || `SN-${dev.serialNumber}`}</span>
                          <span className={s.devSn}>SN-{dev.serialNumber}</span>
                          <span className={s.devPanel}>P{dev.panelId ?? 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>,
                document.body
              )}

              {/* Shared DB (server/client) OR Realtime Poll (standalone) */}
              {appMode === 'standalone' ? (
                <div className={s.kpiCard}>
                  <span className={s.kpiLabel}>Background Sync</span>
                  <span className={s.kpiValueMd}>
                    N/A
                  </span>
                  <span className={s.kpiDetail}>
                    Disabled in standalone mode
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
              {(() => {
                const syncAgo = appMode === 'client' && serverMetrics?.ok
                  ? (serverMetrics.lastSyncAgo ?? '—')
                  : (syncHealth?.lastSyncAgo ?? '—');
                const syncTime = appMode === 'client' && serverMetrics?.ok
                  ? (serverMetrics.lastSyncTime ?? 'No data')
                  : (syncHealth?.lastSyncTime ?? 'No data recorded');
                const devCount = appMode === 'client' && serverMetrics?.ok
                  ? serverMetrics.devicesSyncedToday
                  : (syncHealth?.devicesSyncedToday ?? 0);
                return (
                  <div className={s.kpiCard}>
                    <span className={s.kpiLabel}>{appMode === 'standalone' ? 'Last Poll' : 'Last Sync'}</span>
                    <Tooltip content={appMode === 'standalone' ? 'No background sync in standalone mode' : syncTime} relationship="description">
                      <span className={s.kpiValueMd}>{appMode === 'standalone' ? '—' : syncAgo}</span>
                    </Tooltip>
                    <span className={s.kpiDetail}>
                      {appMode === 'standalone'
                        ? 'No sync in standalone mode'
                        : `${devCount} device${devCount !== 1 ? 's' : ''} today`}
                    </span>
                  </div>
                );
              })()}

              {/* Records Today */}
              {(() => {
                const rec = appMode === 'client' && serverMetrics?.ok
                  ? serverMetrics.recordsToday
                  : syncHealth?.recordsToday;
                return (
                  <div className={s.kpiCard}>
                    <span className={s.kpiLabel}>Records Today</span>
                    <span className={s.kpiValue}>
                      {appMode === 'standalone' ? '—' : (rec?.total.toLocaleString() ?? '—')}
                    </span>
                    <span className={s.kpiDetail}>
                      {appMode === 'standalone'
                        ? 'N/A in standalone mode'
                        : (rec
                          ? `${rec.inputs}in · ${rec.outputs}out · ${rec.variables}var`
                          : '—')}
                    </span>
                  </div>
                );
              })()}

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
                <span className={mergeClasses(
                  s.kpiValue,
                  alarmCount == null ? '' : alarmCount > 0 ? s.kpiValueRed : s.kpiValueGreen,
                )}>
                  {alarmCount ?? '—'}
                </span>
                <span className={s.kpiDetail}>
                  {alarmCount == null
                    ? 'Alarm data unavailable'
                    : alarmCount === 0
                      ? 'All systems normal'
                      : 'Requires attention'}
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
              isClient={appMode === 'client'}
              serverMetrics={serverMetrics ?? undefined}
            />
          </div>
        </div>

        {/* ── Trend Logs ── */}
        <div className={mergeClasses(s.section, s.trendSection)}>
          <div className={s.sectionHeader}>
            <div className={s.sectionTitleRow}>
              <h3 className={mergeClasses(s.sectionTitle, s.sectionTitleStatic)}>Trend Logs — Last 24 Hours</h3>
              <Tooltip
                relationship="description"
                content="Shows the last 24h trend history. Use View All for detailed point-level diagnostics and filtering."
              >
                <button className={s.sectionInfoButton} aria-label="About Trend Logs section">
                  <InfoRegular style={{ fontSize: '12px' }} />
                </button>
              </Tooltip>
              <button
                className={s.viewAll}
                onClick={() => { window.location.hash = '#/t3000/haystack-tags'; }}
              >
                Trend Policy <ChevronRightRegular style={{ fontSize: '12px' }} />
              </button>
            </div>
            <div className={s.sectionHeaderActions}>
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowClockwiseRegular />}
                onClick={() => setTrendRefreshKey((v) => v + 1)}
                title="Refresh trend logs"
              />
              <Button
                size="small"
                appearance="subtle"
                icon={<DataBarVerticalRegular />}
                onClick={() => setVerifyDrawerOpen(true)}
                disabled={verifySerial === null}
                title={verifySerial !== null ? 'Verify trendlog data' : 'Loading device data…'}
              >
                Verify Data
              </Button>
              <button
                className={s.viewAll}
                onClick={() => { window.location.hash = '#/t3000/trendlogs'; }}
              >
                View All <ChevronRightRegular style={{ fontSize: '12px' }} />
              </button>
            </div>
          </div>
          <div className={s.trendlogWrapper}>
            <TrendLogs
              key={trendRefreshKey}
              isStandalone={appMode === 'standalone'}
              onVerify={(serial, panel, devs) => { setVerifySerial(serial); setVerifyPanel(panel); setVerifyDevices(devs); }}
            />
          </div>
        </div>

        {verifySerial !== null && (
          <TrendlogVerifyDrawer
            isOpen={verifyDrawerOpen}
            onClose={() => setVerifyDrawerOpen(false)}
            serialNumber={verifySerial}
            panelId={verifyPanel ?? 1}
            devices={verifyDevices}
          />
        )}

        {/* ── Monitoring ── */}
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <div className={s.monitoringHeaderLeft}>
              <h3 className={mergeClasses(s.sectionTitle, s.monitoringTitle)}>Monitoring</h3>
              <Tooltip
                relationship="description"
                content="Shows recent per-device sync activity, latest data type updates, and success/fail status."
              >
                <button className={s.iconButton} aria-label="About monitoring">
                  <InfoRegular style={{ fontSize: '12px' }} />
                </button>
              </Tooltip>
            </div>
            <div className={s.monitoringHeaderRight}>
              {activitySummary && (
                <div className={s.activitySummary}>
                  <span className={mergeClasses(s.summaryTag, s.summaryTagOk)}>
                    <CheckmarkCircleRegular style={{ fontSize: '14px' }} />
                    {activitySummary.ok} ok
                  </span>
                  <span className={mergeClasses(s.summaryTag, s.summaryTagFail)}>
                    <DismissCircleRegular style={{ fontSize: '14px' }} />
                    {activitySummary.fail} failed
                  </span>
                  <span className={mergeClasses(s.summaryTag, s.summaryTagTotal)}>{activitySummary.total} total</span>
                </div>
              )}
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowClockwiseRegular />}
                onClick={() => setActivityRefreshKey((v) => v + 1)}
                title="Refresh monitoring"
              />
            </div>
          </div>
          <div className={s.monitoringColContent}>
            <RecentActivity key={activityRefreshKey} onSummary={setActivitySummary} />
          </div>
        </div>

      </div>
      <SyncLogDrawer open={syncLogOpen} onClose={() => setSyncLogOpen(false)} />
    </div>
  );
};

