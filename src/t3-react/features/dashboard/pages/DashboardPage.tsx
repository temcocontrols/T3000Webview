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
  ArrowSyncRegular,
  ChevronRightRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { getSyncHealth, SyncHealthData } from '../services/syncHealthApi';
import { API_BASE_URL } from '../../../config/constants';
import { SyncHealthWidget } from '../components/SyncHealthWidget';
import { SyncLogDrawer } from '../components/SyncLogDrawer';
import { TrendLogs } from '../components/TrendLogs';
import { RecentActivity } from '../components/RecentActivity';
import { NetworkTopologyWidget } from '../components/NetworkTopologyWidget';


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
    borderColor: '#b3d4f0',
    color: '#0f6cbd',
  },
  chipGreen: {
    backgroundColor: '#e8f5e9',
    borderColor: '#a5d6a7',
    color: '#107c10',
  },
  chipGray: {
    backgroundColor: '#f0f0f0',
    borderColor: '#d8d8d8',
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

  /* ── KPI Cards row ── */
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
  },
  kpiCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
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
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  kpiDetailMono: {
    fontSize: '11px',
    color: '#605e5c',
    lineHeight: '1.3',
    fontFamily: 'monospace',
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
    height: '240px',
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
    padding: '8px 12px',
    maxHeight: '240px',
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
  const [syncLogOpen, setSyncLogOpen] = useState(false);

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
      if (health.status === 'fulfilled') setSyncHealth(health.value);
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
    const id = setInterval(fetchHealth, 60_000);
    return () => clearInterval(id);
  }, [fetchHealth]);

  const centerDbOk: boolean | null = syncHealth
    ? (syncHealth.centerDbEnabled ? syncHealth.centerDbConnected : true)
    : null;

  return (
    <div className={s.container}>
      <div className={s.scrollArea}>

        {/* ── Network Topology ── */}
        <div className={s.section} style={{ marginTop: '8px' }}>
          <NetworkTopologyWidget currentTime={currentTime} />
        </div>

        {/* ── System Overview KPIs ── */}
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <h3 className={s.sectionTitle}>System Overview</h3>
            <Button
              size="small"
              appearance="subtle"
              icon={<ArrowSyncRegular />}
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

              {/* Center DB */}
              <div className={s.kpiCard}>
                <span className={s.kpiLabel}>Center DB</span>
                <span className={mergeClasses(
                  s.kpiValueMd,
                  centerDbOk === null ? '' : centerDbOk ? s.kpiValueGreen : s.kpiValueRed,
                )}>
                  {centerDbOk === null ? '—' : centerDbOk ? 'Connected' : 'Disconnected'}
                </span>
                <span className={s.kpiDetail}>
                  {syncHealth ? `${syncHealth.backendType} · ${syncHealth.role}` : '—'}
                </span>
              </div>

              {/* Last Sync */}
              <div className={s.kpiCard}>
                <span className={s.kpiLabel}>Last Sync</span>
                <Tooltip content={syncHealth?.lastSyncTime ?? 'No sync recorded'} relationship="description">
                  <span className={s.kpiValueMd}>{syncHealth?.lastSyncAgo ?? '—'}</span>
                </Tooltip>
                <span className={s.kpiDetail}>
                  {syncHealth?.devicesSyncedToday ?? 0} device{syncHealth?.devicesSyncedToday !== 1 ? 's' : ''} today
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
            <h3 className={s.sectionTitle}>Sync &amp; Database Health</h3>
          </div>
          <div className={s.syncHealthWrapper}>
            <SyncHealthWidget onViewLog={() => setSyncLogOpen(true)} />
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
            <TrendLogs />
          </div>
        </div>

        {/* ── Monitoring ── */}
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <h3 className={s.sectionTitle}>Monitoring</h3>
          </div>
          <div className={s.monitoringColContent}>
            <RecentActivity />
          </div>
        </div>

      </div>
      <SyncLogDrawer open={syncLogOpen} onClose={() => setSyncLogOpen(false)} />
    </div>
  );
};

