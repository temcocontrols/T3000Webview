/**
 * Logs Page — two-tier UX
 *
 * Simple view (default):  Log Everything toggle + SQL Server status bar
 * Advanced drawer:        Log Settings | File Logs | Flow Logs tabs
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  makeStyles,
  mergeClasses,
  Button,
  Switch,
  TabList,
  Tab,
  Spinner,
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Badge,
  Tooltip,
  tokens,
} from '@fluentui/react-components';
import {
  SettingsRegular,
  Dismiss24Regular,
  ChevronUpRegular,
  ChevronDownRegular,
  InfoRegular,
  InfoFilled,
  ArrowSyncRegular,
  CheckmarkCircleFilled,
} from '@fluentui/react-icons';
import { ActivityLogTab } from '../components/ActivityLogTab';
import { FileLogsTab } from '../components/FileLogsTab';
import { FlowLogTab } from '../components/FlowLogTab';
import { LogSettingsTab } from '../components/LogSettingsTab';
import { API_BASE_URL } from '@t3-react/config/constants';

const ACTIVITY_LOG_URL = `${API_BASE_URL}/api/sync/event-log`;

const eventLogRequestCache = new Map<string, Promise<EventLogResponse>>();

async function fetchEventLogOnce(url: string): Promise<EventLogResponse> {
  const cached = eventLogRequestCache.get(url);
  if (cached) {
    return cached;
  }

  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`event-log: HTTP ${response.status}`);
      }
      return response.json() as Promise<EventLogResponse>;
    })
    .finally(() => {
      eventLogRequestCache.delete(url);
    });

  eventLogRequestCache.set(url, request);
  return request;
}
interface AppLogEntry {
  id: number;
  logged_at: string;
  level: string;
  category: string;
  source: string | null;
  message: string;
}

interface EventLogResponse {
  entries: AppLogEntry[];
  total: number;
  categories?: string[];
  categoryCounts?: Record<string, number>;
  page: number;
  limit: number;
}

const normalizeLevel = (level: string | null | undefined) =>
  (level ?? '').trim().toUpperCase();

const levelBadgeColor = (level: string | null | undefined): 'danger' | 'warning' | 'informative' | 'subtle' => {
  switch (normalizeLevel(level)) {
    case 'ERROR':
      return 'danger';
    case 'WARN':
      return 'warning';
    case 'DEBUG':
      return 'subtle';
    default:
      return 'informative';
  }
};

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },

  /* ---- header bar (same width as content strips) ---- */
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '8px 12px 0',
    padding: '0 0 8px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#e1dfdd',
    flexShrink: 0,
  },
  headerDivider: {
    width: '1px',
    height: '20px',
    backgroundColor: '#d2d0ce',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    flexShrink: 0,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#201f1e',
    whiteSpace: 'nowrap',
  },
  subtitle: {
    fontSize: '11px',
    color: '#8a8886',
  },
  infoIcon: {
    fontSize: '14px',
    color: '#0078d4',
    cursor: 'default',
    display: 'inline-flex',
    alignItems: 'center',
    outline: 'none',
  },
  headerActions: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexShrink: 0,
  },
  toggleWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  feedbackCheck: {
    fontSize: '18px',
    color: '#107c10',
    opacity: 0,
    transitionProperty: 'opacity, transform',
    transitionDuration: '0.3s',
    transitionTimingFunction: 'ease',
    transform: 'scale(0.7)',
    flexShrink: 0,
    display: 'inline-flex',
  },
  feedbackCheckVisible: {
    opacity: 1,
    transform: 'scale(1)',
  },

  drawerHeader: {
    padding: '8px 12px',
    minHeight: 'auto',
  },
  drawerHeaderTitle: {
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: '16px',
  },
  drawerHeaderTitleText: {
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: '16px',
  },
  drawerHeaderTitleRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  drawerInfoButton: {
    minWidth: '14px',
    width: '14px',
    height: '14px',
    padding: 0,
  },
  drawerInfoIcon: {
    fontSize: '12px',
  },
  drawerPolicyTooltipContent: {
    width: '100%',
    maxWidth: '100%',
    lineHeight: 1.45,
    whiteSpace: 'normal',
  },
  drawerPolicyTooltip: {
    width: 'min(1100px, calc(100vw - 32px))',
    maxWidth: 'none',
  },
  drawerCloseButton: {
    minWidth: '24px',
    width: '24px',
    height: '24px',
  },

  topStrip: {
    display: 'flex',
    flexDirection: 'column',
    margin: '6px 12px 0',
    gap: '8px',
    flexShrink: 0,
  },
  topStripHidden: {
    display: 'none',
  },

  /* row 1 — latest activity */
  latestPanel: {
    backgroundColor: '#f3f8ff',
    border: '1px solid #d0e4f7',
    borderRadius: '4px',
    padding: '9px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  summaryPanel: {
    border: '1px solid #e1dfdd',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  latestHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  latestTitle: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.3px',
    color: tokens.colorBrandForeground1,
    textTransform: 'uppercase',
  },
  lastUpdated: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  latestMessage: {
    fontSize: '12.5px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  latestMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },

  /* row 2 — compact inline stats bar */
  summaryGrid: {
    display: 'flex',
    alignItems: 'center',
    padding: '7px 12px',
    gap: '10px',
    backgroundColor: '#f8f8f8',
  },
  summaryStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
  statCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
  },
  statLabel: {
    fontSize: '11.5px',
    color: '#8a8886',
    fontWeight: 400,
  },
  statValue: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#323130',
  },
  statValueError: {
    color: tokens.colorPaletteRedForeground1,
  },
  statValueWarn: {
    color: tokens.colorPaletteMarigoldForeground1,
  },
  vDivider: {
    width: '1px',
    height: '14px',
    backgroundColor: '#d2d0ce',
    flexShrink: 0,
  },

  /* filter inline with stats */
  catsRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px',
    rowGap: '5px',
    minWidth: 0,
    flex: 1,
  },
  catsLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#8a8886',
    flexShrink: 0,
    marginRight: '2px',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    paddingTop: '3px',
    paddingBottom: '3px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: '12px',
    borderTopWidth: '1px',
    borderRightWidth: '1px',
    borderBottomWidth: '1px',
    borderLeftWidth: '1px',
    borderTopStyle: 'solid',
    borderRightStyle: 'solid',
    borderBottomStyle: 'solid',
    borderLeftStyle: 'solid',
    borderTopColor: '#edebe9',
    borderRightColor: '#edebe9',
    borderBottomColor: '#edebe9',
    borderLeftColor: '#edebe9',
    fontSize: '11px',
    fontWeight: 500,
    color: '#323130',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'border-color 0.12s, background 0.12s, color 0.12s',
    '&:hover': {
      borderTopColor: '#0078d4',
      borderRightColor: '#0078d4',
      borderBottomColor: '#0078d4',
      borderLeftColor: '#0078d4',
      color: '#0078d4',
    },
  },
  chipActive: {
    borderTopColor: '#0f6cbd',
    borderRightColor: '#0f6cbd',
    borderBottomColor: '#0f6cbd',
    borderLeftColor: '#0f6cbd',
    backgroundColor: '#0f6cbd',
    color: '#ffffff',
    '&:hover': {
      borderTopColor: '#0078d4',
      borderRightColor: '#0078d4',
      borderBottomColor: '#0078d4',
      borderLeftColor: '#0078d4',
      backgroundColor: '#0078d4',
      color: '#ffffff',
    },
  },
  chipCount: {
    fontSize: '10px',
    fontWeight: 700,
    opacity: 0.8,
  },
  summaryActions: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  showSummaryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '6px 12px 0',
    padding: '6px 10px',
    border: '1px solid #d7e5f7',
    borderRadius: '4px',
    backgroundColor: '#f5f9ff',
  },
  showSummaryInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  showSummaryInfoLabel: {
    fontSize: '11px',
    color: '#0f6cbd',
    fontWeight: 600,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  showSummaryInfoText: {
    fontSize: '12px',
    color: '#323130',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  showSummaryInfoMeta: {
    fontSize: '11px',
    color: '#605e5c',
    whiteSpace: 'nowrap',
  },

  /* ---- drawer body ---- */
  drawerBody: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  /* ---- main content ---- */
  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  /* ---- simple controls bar (enable toggle + SQL status) ---- */
  simpleBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px 10px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#edebe9',
    backgroundColor: '#f8f8f8',
    flexShrink: 0,
    flexWrap: 'wrap',
    rowGap: '6px',
  },
  toggleLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#605e5c',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  sqlBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginLeft: 'auto',
    flexWrap: 'wrap',
    rowGap: '4px',
  },
  sqlDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
    display: 'inline-block',
  },
  sqlConnected: {
    backgroundColor: '#107c10',
  },
  sqlDisconnected: {
    backgroundColor: '#d13438',
  },
  sqlUnknown: {
    backgroundColor: '#a19f9d',
  },
  sqlLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#323130',
  },
  sqlMeta: {
    fontSize: '11.5px',
    color: '#605e5c',
  },
  advancedTabContent: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

});

function readLogsHashParams(): { viewFiles: boolean; category: string } {
  const hash = window.location.hash ?? '';
  const qIndex = hash.indexOf('?');
  if (qIndex < 0) return { viewFiles: false, category: '' };
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  return {
    viewFiles: params.get('view') === 'files',
    category: params.get('category') ?? '',
  };
}

export const LogsPage: React.FC = () => {
  const s = useStyles();
  const initialHash = readLogsHashParams();
  const [summaryVisible, setSummaryVisible] = useState(true);
  const [logData, setLogData] = useState<EventLogResponse | null>(null);
  const [latestLog, setLatestLog] = useState<AppLogEntry | null>(null);
  const [summary, setSummary] = useState({
    total: 0,
    errorCount: 0,
    warnCount: 0,
    categoryCount: 0,
    lastUpdated: '--:--:--',
  });
  const [activeCategoryFilter, setActiveCategoryFilter] = useState(initialHash.category);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const entriesRef = useRef<AppLogEntry[]>([]);

  // Advanced drawer
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<'settings' | 'files' | 'flows'>('settings');

  // Log Everything master toggle
  const [loggingEnabled, setLoggingEnabled] = useState(true);
  const [logToggleLoading, setLogToggleLoading] = useState(false);
  const [showEnabledFeedback, setShowEnabledFeedback] = useState(false);

  // SQL Server status
  const [sqlStatus, setSqlStatus] = useState<{
    connected: boolean;
    lastContactAgo: string | null;
    host: string | null;
  } | null>(null);
  const [sqlTesting, setSqlTesting] = useState(false);
  const [sqlTestResult, setSqlTestResult] = useState<{
    ok: boolean;
    latency_ms?: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    const styleId = 'logs-page-drawer-size-override';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = '.fce6y3m{--fui-Drawer--size:820px !important;}';

    return () => {
      const existing = document.getElementById(styleId);
      if (existing) {
        existing.remove();
      }
    };
  }, []);

  const loadTopSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: '0', limit: '5000' });
      const json: EventLogResponse = await fetchEventLogOnce(`${ACTIVITY_LOG_URL}?${params.toString()}`);
      const entries = json.entries ?? [];
      setLogData(json);
      entriesRef.current = entries;
      let errorCount = 0;
      let warnCount = 0;

      for (const entry of entries) {
        const level = normalizeLevel(entry.level);
        if (level === 'ERROR') errorCount += 1;
        if (level === 'WARN') warnCount += 1;
      }

      const categoryList = (json.categories ?? []).length
        ? [...(json.categories ?? [])].sort((a, b) => a.localeCompare(b))
        : [];

      const categoryCountMap: Record<string, number> = { ...(json.categoryCounts ?? {}) };
      for (const cat of categoryList) {
        categoryCountMap[cat] = Number(categoryCountMap[cat] ?? 0);
      }

      setLatestLog(entries[0] ?? null);
      setAvailableCategories(categoryList);
      setCategoryCounts(categoryCountMap);
      setSummary({
        total: json.total ?? 0,
        errorCount,
        warnCount,
        categoryCount: categoryList.length,
        lastUpdated: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      console.error('Failed to load logs summary:', err);
    }
  }, []);

  useEffect(() => {
    loadTopSummary();
    const timer = window.setInterval(loadTopSummary, 15000);
    return () => window.clearInterval(timer);
  }, [loadTopSummary]);

  // Load logging-enabled state
  const loadLoggingEnabled = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/logs/settings`);
      if (!res.ok) return;
      const cats: Array<{ enabled: boolean }> = await res.json();
      setLoggingEnabled(cats.some((c) => c.enabled));
    } catch {
      // ignore
    }
  }, []);

  // Load SQL Server status
  const loadSqlStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sync/health`);
      if (!res.ok) return;
      const json = await res.json();
      setSqlStatus({
        connected: json.centerDbConnected ?? false,
        lastContactAgo: json.lastSyncAgo ?? null,
        host: json.centerDbHost ?? null,
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadLoggingEnabled();
    loadSqlStatus();
    const sqlTimer = window.setInterval(loadSqlStatus, 30_000);
    return () => window.clearInterval(sqlTimer);
  }, [loadLoggingEnabled, loadSqlStatus]);

  const handleToggleLogging = useCallback(async (enabled: boolean) => {
    setLogToggleLoading(true);
    setLoggingEnabled(enabled); // optimistic
    if (enabled) {
      setShowEnabledFeedback(true);
      setTimeout(() => setShowEnabledFeedback(false), 1800);
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/logs/settings`);
      if (!res.ok) throw new Error('load failed');
      const cats: Array<Record<string, unknown> & { enabled: boolean }> = await res.json();
      const updated = cats.map((c) => ({ ...c, enabled }));
      await fetch(`${API_BASE_URL}/api/logs/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {
      setLoggingEnabled(!enabled); // revert on error
    } finally {
      setLogToggleLoading(false);
    }
  }, []);

  const handleTestSql = useCallback(async () => {
    setSqlTesting(true);
    setSqlTestResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/sync/health/ping`);
      const json = await res.json();
      setSqlTestResult(json);
      void loadSqlStatus();
      setTimeout(() => setSqlTestResult(null), 6000);
    } catch (e) {
      setSqlTestResult({ ok: false, error: String(e) });
    } finally {
      setSqlTesting(false);
    }
  }, [loadSqlStatus]);

  const handleRefreshLogs = () => {
    loadTopSummary();
  };

  return (
    <div className={s.page}>
      {/* Single unified header row — same width as content strips */}
      <div className={s.header}>
        {/* Title with short description and info tooltip */}
        <div className={s.titleSection}>
          <div className={s.titleRow}>
            <span className={s.title}>T3000 Logs</span>
            <Tooltip
              relationship="description"
              content="Captures all T3000 service activity: sync cycles, device polling, error traces, FFI calls, and more. Use Advanced → Log Settings to control per-category recording."
            >
              <span tabIndex={0} className={s.infoIcon} aria-label="About T3000 Logs">
                <InfoFilled />
              </span>
            </Tooltip>
          </div>
          <span className={s.subtitle}>Monitor sync, errors and device activity</span>
        </div>

        {/* Push SQL status to the right */}
        <div style={{ flex: 1 }} />

        {/* SQL Server status */}
        <span
          className={mergeClasses(
            s.sqlDot,
            sqlStatus == null
              ? s.sqlUnknown
              : sqlStatus.connected
              ? s.sqlConnected
              : s.sqlDisconnected,
          )}
        />
        <span className={s.sqlLabel}>
          {sqlStatus == null
            ? 'SQL …'
            : sqlStatus.connected
            ? 'SQL Connected'
            : 'SQL Disconnected'}
        </span>
        {sqlStatus?.lastContactAgo && (
          <span className={s.sqlMeta}>· Last contact: {sqlStatus.lastContactAgo}</span>
        )}
        <Button
          size="small"
          appearance="subtle"
          icon={sqlTesting ? <Spinner size="tiny" /> : <ArrowSyncRegular />}
          disabled={sqlTesting}
          onClick={handleTestSql}
        >
          Test
        </Button>
        {sqlTestResult && (
          <Badge color={sqlTestResult.ok ? 'success' : 'danger'} size="small">
            {sqlTestResult.ok ? `OK ${sqlTestResult.latency_ms ?? ''}ms` : 'Failed'}
          </Badge>
        )}

        <span className={s.headerDivider} />

        {/* Enable / Disable Logging toggle with success checkmark */}
        <div className={s.toggleWrapper}>
          <CheckmarkCircleFilled
            className={mergeClasses(s.feedbackCheck, showEnabledFeedback && s.feedbackCheckVisible)}
          />
          <Switch
            checked={loggingEnabled}
            disabled={logToggleLoading}
            onChange={(_, data) => void handleToggleLogging(data.checked)}
            label={
              <span className={s.toggleLabel}>
                {loggingEnabled ? 'Disable Logging' : 'Enable Logging'}
              </span>
            }
          />
        </div>

        {/* Advanced drawer trigger */}
        <Button
          size="small"
          appearance={showAdvanced ? 'primary' : 'subtle'}
          icon={<SettingsRegular />}
          style={{ fontSize: '12px' }}
          onClick={() => { setShowAdvanced(true); setAdvancedTab('settings'); }}
        >
          Advanced
        </Button>
      </div>

      {/* Stats + Category filter strip */}
      <div className={mergeClasses(s.topStrip, !summaryVisible && s.topStripHidden)}>
        {/* Row 1 — Latest Activity */}
        <div className={s.latestPanel}>
          <div className={s.latestHeader}>
            <span className={s.latestTitle}>Latest Activity</span>
            <span className={s.lastUpdated}>Updated {summary.lastUpdated}</span>
          </div>
          <span className={s.latestMessage}>
            {latestLog?.message || 'No recent activity yet'}
          </span>
          <div className={s.latestMeta}>
            <Badge size="small" color={levelBadgeColor(latestLog?.level)}>
              {latestLog?.level || 'INFO'}
            </Badge>
            <span>{latestLog?.category || 'N/A'}</span>
            <span>{latestLog?.source || 'system'}</span>
            <span>{latestLog?.logged_at ? new Date(latestLog.logged_at).toLocaleString() : '--'}</span>
          </div>
        </div>

        {/* Row 2 — compact stats bar */}
        <div className={s.summaryPanel}>
          <div className={s.summaryGrid}>
            <div className={s.summaryStats}>
              <div className={s.statCell}>
                <span className={s.statLabel}>Total</span>
                <span className={s.statValue}>{summary.total.toLocaleString()}</span>
              </div>
              <span className={s.vDivider} />
              <div className={s.statCell}>
                <span className={s.statLabel}>Errors</span>
                <span className={mergeClasses(s.statValue, s.statValueError)}>{summary.errorCount}</span>
              </div>
              <span className={s.vDivider} />
              <div className={s.statCell}>
                <span className={s.statLabel}>Warnings</span>
                <span className={mergeClasses(s.statValue, s.statValueWarn)}>{summary.warnCount}</span>
              </div>
              <span className={s.vDivider} />
              <div className={s.statCell}>
                <span className={s.statLabel}>Categories</span>
                <span className={s.statValue}>{summary.categoryCount}</span>
              </div>
            </div>

            <span className={s.vDivider} />

            <div className={s.catsRow}>
              <span className={s.catsLabel}>Filter:</span>
              <span
                className={mergeClasses(s.chip, activeCategoryFilter === '' && s.chipActive)}
                onClick={() => setActiveCategoryFilter('')}
              >
                All
              </span>
              {availableCategories.map((cat) => (
                  <span
                    key={cat}
                    className={mergeClasses(s.chip, activeCategoryFilter === cat && s.chipActive)}
                    onClick={() => setActiveCategoryFilter(prev => prev === cat ? '' : cat)}
                  >
                    {cat} <span className={s.chipCount}>{categoryCounts[cat] ?? 0}</span>
                  </span>
                ))}
            </div>

            <div className={s.summaryActions}>
              <Button
                size="small"
                appearance="subtle"
                icon={<ChevronUpRegular />}
                iconPosition="after"
                onClick={() => setSummaryVisible(false)}
              >
                Hide
              </Button>
            </div>
          </div>
        </div>
      </div>

      {!summaryVisible && (
        <div className={s.showSummaryRow}>
          <div className={s.showSummaryInfo}>
            <span className={s.showSummaryInfoLabel}>Latest</span>
            <Badge
              size="small"
              color={levelBadgeColor(latestLog?.level)}
            >
              {latestLog?.level || 'INFO'}
            </Badge>
            <span className={s.showSummaryInfoText}>
              {latestLog?.message || 'No recent activity yet'}
            </span>
            <span className={s.showSummaryInfoMeta}>{latestLog?.category || 'N/A'}</span>
          </div>
          <Button
            size="small"
            appearance="subtle"
            icon={<ChevronDownRegular />}
            iconPosition="after"
            onClick={() => setSummaryVisible(true)}
          >
            Show summary
          </Button>
        </div>
      )}

      {/* Advanced drawer — Settings | File Logs | Flow Logs */}
      <Drawer
        type="overlay"
        position="end"
        size="large"
        root={{ style: { '--fui-Drawer--size': '820px' } }}
        open={showAdvanced}
        onOpenChange={(_, { open }) => setShowAdvanced(open)}
      >
        <DrawerHeader className={s.drawerHeader}>
          <DrawerHeaderTitle
            className={s.drawerHeaderTitle}
            action={
              <Button
                size="small"
                className={s.drawerCloseButton}
                appearance="subtle"
                aria-label="Close"
                icon={<Dismiss24Regular />}
                onClick={() => setShowAdvanced(false)}
              />
            }
          >
            <span className={s.drawerHeaderTitleRow}>
              <span className={s.drawerHeaderTitleText}>Advanced</span>
              <Tooltip
                relationship="description"
                content={{
                  className: s.drawerPolicyTooltip,
                  children: (
                    <div className={s.drawerPolicyTooltipContent}>
                      <div><strong>Log Settings</strong>: Per-category enable/disable, log level, detail mode, and sink targets.</div>
                      <div><strong>File Logs</strong>: Raw text files written by the T3000 service process (T3WebLog).</div>
                      <div><strong>Flow Logs</strong>: Step-by-step operation traces with timing and status.</div>
                    </div>
                  ),
                }}
              >
                <Button
                  size="small"
                  appearance="subtle"
                  className={s.drawerInfoButton}
                  icon={<InfoRegular className={s.drawerInfoIcon} />}
                  aria-label="Advanced panel guide"
                />
              </Tooltip>
            </span>
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody className={s.drawerBody}>
          <TabList
            selectedValue={advancedTab}
            onTabSelect={(_, data) => setAdvancedTab(data.value as typeof advancedTab)}
            style={{ borderBottom: '1px solid #edebe9', padding: '0 4px', flexShrink: 0 }}
          >
            <Tab value="settings">Log Settings</Tab>
            <Tab value="files">File Logs</Tab>
            <Tab value="flows">Flow Logs</Tab>
          </TabList>
          <div className={s.advancedTabContent}>
            {advancedTab === 'settings' && <LogSettingsTab />}
            {advancedTab === 'files' && <FileLogsTab />}
            {advancedTab === 'flows' && <FlowLogTab />}
          </div>
        </DrawerBody>
      </Drawer>

      {/* Main content — always activity log */}
      <div className={s.content}>
        <ActivityLogTab
          externalCategoryFilter={activeCategoryFilter}
          onCategoryFilterChange={setActiveCategoryFilter}
          categoryOptions={availableCategories}
          sharedData={logData ?? undefined}
          sharedDataMode
          onRefresh={handleRefreshLogs}
        />
      </div>
    </div>
  );
};

export default LogsPage;
