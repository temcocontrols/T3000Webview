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
  Select,
  Spinner,
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Badge,
  Tooltip,
  tokens,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
} from '@fluentui/react-components';
import {
  SettingsRegular,
  Dismiss24Regular,
  InfoRegular,
  DatabasePlugConnectedRegular,
  DeleteRegular,
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
  levelCounts?: Record<string, number>;
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
    color: '#605e5c',
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

  /* ---- body layout: left sidebar + right panel ---- */
  body: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
    marginTop: '8px',
    gap: '8px',
    padding: '0 8px 8px',
  },

  /* ---- left sidebar ---- */
  leftPanel: {
    width: '170px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#b0b0b0',
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  statsBlock: {
    padding: '10px 10px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    flexShrink: 0,
    backgroundColor: '#f5f5f5',
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    padding: '6px 8px',
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#e8e8e8',
    textAlign: 'left',
    transitionProperty: 'border-color, box-shadow, transform',
    transitionDuration: '120ms',
  },
  statCardText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  statCardClickable: {
    cursor: 'pointer',
    ':hover': { backgroundColor: '#ffffff', borderColor: '#c8c6c4' },
    ':active': { transform: 'translateY(1px)' },
    ':focus-visible': {
      outlineStyle: 'solid',
      outlineWidth: '2px',
      outlineColor: '#9cc7f1',
      outlineOffset: '1px',
    },
  },
  statCardActive: {
    backgroundColor: '#ffffff',
    borderColor: '#7fb4e9',
  },
  statCardLabelActive: {
    display: 'inline-block',
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    borderLeftColor: '#0f6cbd',
    paddingLeft: '6px',
    color: '#0f6cbd',
    fontWeight: 600,
  },
  statCardLabel: {
    fontSize: '10px',
    color: '#8a8886',
    fontWeight: 400,
    lineHeight: '13px',
  },
  statCardValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#323130',
    lineHeight: '20px',
  },
  statCardValueError: {
    color: tokens.colorPaletteRedForeground1,
  },
  statCardValueWarn: {
    color: tokens.colorPaletteMarigoldForeground1,
  },
  leftDivider: {
    height: '1px',
    backgroundColor: '#e0e0e0',
    margin: '6px 0',
    flexShrink: 0,
  },
  catSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
    backgroundColor: '#f5f5f5',
  },
  catSectionLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: tokens.colorBrandForeground1,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '8px 12px 5px',
    flexShrink: 0,
    userSelect: 'none',
  },
  catList: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingBottom: '12px',
    scrollbarWidth: 'thin',
    scrollbarColor: '#c8c6c4 transparent',
  },
  catItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '5px 12px',
    cursor: 'pointer',
    userSelect: 'none',
    gap: '6px',
    ':hover': { backgroundColor: '#eaeaea' },
  },
  catItemActive: {
    backgroundColor: '#dbeafe',
    ':hover': { backgroundColor: '#d0e6fc' },
  },
  catName: {
    fontSize: '11.5px',
    color: '#323130',
    fontWeight: 400,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    minWidth: 0,
  },
  catNameActive: {
    fontWeight: 600,
    color: '#0f6cbd',
  },
  catCount: {
    fontSize: '10.5px',
    color: '#a19f9d',
    fontWeight: 600,
    flexShrink: 0,
  },
  catCountActive: {
    color: '#0f6cbd',
  },

  /* ---- right main panel ---- */
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
    minHeight: 0,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#d0e4f7',
    borderRadius: '6px',
  },

  /* latest activity banner — top of right panel */
  latestPanel: {
    backgroundColor: '#f5f5f5',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#d0e4f7',
    borderRadius: '4px',
    margin: '0 8px 8px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    flexShrink: 0,
  },
  latestHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  latestTitle: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.3px',
    color: tokens.colorBrandForeground1,
    textTransform: 'uppercase',
  },
  lastUpdated: {
    fontSize: '10px',
    color: tokens.colorNeutralForeground3,
  },
  latestMessage: {
    fontSize: '12px',
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
    fontWeight: 400,
    color: '#323130',
    lineHeight: '20px',
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
    backgroundColor: '#0078d4',
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
  const [activeLevelFilter, setActiveLevelFilter] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const entriesRef = useRef<AppLogEntry[]>([]);

  // Advanced drawer (Log Settings only)
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Main view selector
  const [mainView, setMainView] = useState<'default' | 'files' | 'flows'>('default');

  // Log Everything master toggle
  const [loggingEnabled, setLoggingEnabled] = useState(true);
  const [logToggleLoading, setLogToggleLoading] = useState(false);

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
  const [clearing, setClearing] = useState(false);
  const [clearKey, setClearKey] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const styleId = 'logs-page-drawer-size-override';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = '.fce6y3m{--fui-Drawer--size:820px !important;}' +
      '[data-t3-catlist]::-webkit-scrollbar{width:4px}' +
      '[data-t3-catlist]::-webkit-scrollbar-track{background:transparent}' +
      '[data-t3-catlist]::-webkit-scrollbar-thumb{background-color:#c8c6c4;border-radius:4px}';

    return () => {
      const existing = document.getElementById(styleId);
      if (existing) {
        existing.remove();
      }
    };
  }, []);

  const loadTopSummary = useCallback(async () => {
    try {
      const json: EventLogResponse = await fetchEventLogOnce(`${ACTIVITY_LOG_URL}?page=0&limit=1`);
      const entries = json.entries ?? [];
      setLogData(json);
      entriesRef.current = entries;

      const errorCount = json.levelCounts?.['error'] ?? 0;
      const warnCount  = json.levelCounts?.['warn']  ?? 0;

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
      const res = await fetch(`${API_BASE_URL}/api/logs/enabled`);
      if (!res.ok) return;
      const json: { enabled: boolean } = await res.json();
      setLoggingEnabled(json.enabled ?? true);
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
    if (logToggleLoading) {
      return;
    }

    setLogToggleLoading(true);
    setLoggingEnabled(enabled); // optimistic
    try {
      const res = await fetch(`${API_BASE_URL}/api/logs/enabled`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('toggle failed');
    } catch {
      setLoggingEnabled(!enabled); // revert on error
    } finally {
      setLogToggleLoading(false);
    }
  }, [logToggleLoading]);

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

  const handleClearAll = useCallback(async () => {
    setShowClearConfirm(false);
    setClearing(true);
    // Immediately wipe local state for instant visual feedback
    setLogData(null);
    setLatestLog(null);
    setSummary({ total: 0, errorCount: 0, warnCount: 0, categoryCount: 0, lastUpdated: '--:--:--' });
    setAvailableCategories([]);
    setCategoryCounts({});
    try {
      await Promise.all([
        fetch(`${API_BASE_URL}/api/flows/clear-all`, { method: 'POST' }),
        fetch(`${API_BASE_URL}/api/develop/logs/clear`, { method: 'POST' }),
      ]);
      // Bump clearKey AFTER the clear completes so tabs remount and fetch fresh (empty) data
      setClearKey((k) => k + 1);
      loadTopSummary();
    } catch (e) {
      console.error('Clear all failed:', e);
    } finally {
      setClearing(false);
    }
  }, [loadTopSummary]);

  const toggleLevelFilter = (nextLevel: string) => {
    setActiveLevelFilter((prev) => (prev === nextLevel ? '' : nextLevel));
  };

  // Sort categories by count descending for the left sidebar list
  const sortedCats = [...availableCategories].sort(
    (a, b) => (categoryCounts[b] ?? 0) - (categoryCounts[a] ?? 0),
  );

  const isAllLevels = activeLevelFilter === '';
  const isErrorLevel = activeLevelFilter === 'ERROR';
  const isWarnLevel = activeLevelFilter === 'WARN';

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
                <InfoRegular className={s.drawerInfoIcon} />
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
          icon={sqlTesting ? <Spinner size="tiny" /> : <DatabasePlugConnectedRegular style={{ fontSize: '16px' }} />}
          disabled={sqlTesting}
          style={{ fontSize: '12px' }}
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

        {/* Enable / Disable Logging toggle */}
        <div className={s.toggleWrapper}>
          <Switch
            checked={loggingEnabled}
            onChange={(_, data) => void handleToggleLogging(data.checked)}
            style={{ transform: 'scale(0.78)', transformOrigin: 'center', margin: '0 -5px' }}
          />
          <span
            className={s.toggleLabel}
            style={{ cursor: 'pointer' }}
            onClick={() => void handleToggleLogging(!loggingEnabled)}
          >
            {loggingEnabled ? 'Disable Logging' : 'Enable Logging'}
          </span>
        </div>

        {/* Advanced drawer trigger */}
        <Button
          size="small"
          appearance={showAdvanced ? 'primary' : 'subtle'}
          icon={<SettingsRegular style={{ fontSize: '16px' }} />}
          style={{ fontSize: '12px' }}
          onClick={() => setShowAdvanced(true)}
        >
          Advanced
        </Button>

        {/* Clear All — opens confirmation dialog */}
        <Button
          size="small"
          appearance="subtle"
          icon={clearing ? <Spinner size="tiny" /> : <DeleteRegular style={{ fontSize: '16px' }} />}
          disabled={clearing}
          style={{ fontSize: '12px', color: tokens.colorPaletteRedForeground1 }}
          onClick={() => setShowClearConfirm(true)}
        >
          {clearing ? 'Clearing…' : 'Clear All'}
        </Button>
      </div>

      {/* Clear All confirmation dialog */}
      <Dialog open={showClearConfirm} onOpenChange={(_, d) => setShowClearConfirm(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle style={{ fontSize: '16px' }}>Clear All Logs?</DialogTitle>
            <DialogContent>
              <p style={{ margin: '8px 0 4px', color: tokens.colorNeutralForeground1 }}>
                This will permanently delete:
              </p>
              <ul style={{ margin: '4px 0 12px', paddingLeft: '20px', color: tokens.colorNeutralForeground2, fontSize: '13px' }}>
                <li>All flow logs (T3_FLOW, T3_FLOW_STEP)</li>
                <li>All activity logs (T3_APP_LOG)</li>
                <li>All log files on disk (T3WebLog folder)</li>
              </ul>
              <p style={{ margin: 0, fontWeight: 600, color: tokens.colorPaletteRedForeground1, fontSize: '13px' }}>
                This cannot be undone.
              </p>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" style={{ fontSize: '13px', fontWeight: 400 }} onClick={() => setShowClearConfirm(false)}>Cancel</Button>
              <Button
                appearance="primary"
                style={{ backgroundColor: tokens.colorPaletteRedBackground3, border: 'none', fontSize: '13px', fontWeight: 400 }}
                onClick={handleClearAll}
              >
                Yes, Clear All
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* ── Body: switches based on mainView dropdown ── */}
      <div className={s.body}>

        {/* File Logs full-width view */}
        {mainView === 'files' && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <FileLogsTab key={clearKey} />
          </div>
        )}

        {/* Flow Logs full-width view */}
        {mainView === 'flows' && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <FlowLogTab key={clearKey} />
          </div>
        )}

        {/* Default two-panel view */}
        {mainView === 'default' && <>

        {/* Left sidebar — stats + scrollable category filter */}
        <div className={s.leftPanel}>
          <div className={s.statsBlock}>
            <button
              type="button"
              className={mergeClasses(s.statCard, s.statCardClickable, isAllLevels && s.statCardActive)}
              onClick={() => setActiveLevelFilter('')}
              title="Show all levels"
              aria-pressed={isAllLevels}
            >
              <span className={s.statCardText}>
                <span className={mergeClasses(s.statCardLabel, isAllLevels && s.statCardLabelActive)}>Total</span>
                <span className={s.statCardValue}>{summary.total.toLocaleString()}</span>
              </span>
            </button>
            <button
              type="button"
              className={mergeClasses(s.statCard, s.statCardClickable, isErrorLevel && s.statCardActive)}
              onClick={() => toggleLevelFilter('ERROR')}
              title="Filter table to ERROR"
              aria-pressed={isErrorLevel}
            >
              <span className={s.statCardText}>
                <span className={mergeClasses(s.statCardLabel, isErrorLevel && s.statCardLabelActive)}>Errors</span>
                <span className={mergeClasses(s.statCardValue, s.statCardValueError)}>
                  {summary.errorCount.toLocaleString()}
                </span>
              </span>
            </button>
            <button
              type="button"
              className={mergeClasses(s.statCard, s.statCardClickable, isWarnLevel && s.statCardActive)}
              onClick={() => toggleLevelFilter('WARN')}
              title="Filter table to WARN"
              aria-pressed={isWarnLevel}
            >
              <span className={s.statCardText}>
                <span className={mergeClasses(s.statCardLabel, isWarnLevel && s.statCardLabelActive)}>Warnings</span>
                <span className={mergeClasses(s.statCardValue, s.statCardValueWarn)}>
                  {summary.warnCount.toLocaleString()}
                </span>
              </span>
            </button>
            <button
              type="button"
              className={mergeClasses(s.statCard, s.statCardClickable)}
              onClick={() => setActiveCategoryFilter('')}
              title="Show all categories"
              aria-pressed={false}
            >
              <span className={s.statCardText}>
                <span className={s.statCardLabel}>Categories</span>
                <span className={s.statCardValue}>{summary.categoryCount}</span>
              </span>
            </button>
          </div>

          <div className={s.leftDivider} />

          <div className={s.catSection}>
            <span className={s.catSectionLabel}>Category</span>
            <div className={s.catList} data-t3-catlist="">
              {/* All — resets filter */}
              <div
                className={mergeClasses(s.catItem, activeCategoryFilter === '' && s.catItemActive)}
                onClick={() => setActiveCategoryFilter('')}
              >
                <span className={mergeClasses(s.catName, activeCategoryFilter === '' && s.catNameActive)}>
                  All
                </span>
                <span className={mergeClasses(s.catCount, activeCategoryFilter === '' && s.catCountActive)}>
                  {summary.total.toLocaleString()}
                </span>
              </div>
              {sortedCats.map((cat) => (
                <div
                  key={cat}
                  className={mergeClasses(s.catItem, activeCategoryFilter === cat && s.catItemActive)}
                  onClick={() => setActiveCategoryFilter((prev) => (prev === cat ? '' : cat))}
                >
                  <span className={mergeClasses(s.catName, activeCategoryFilter === cat && s.catNameActive)}>
                    {cat}
                  </span>
                  <span className={mergeClasses(s.catCount, activeCategoryFilter === cat && s.catCountActive)}>
                    {categoryCounts[cat] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — latest activity banner + log list */}
        <div className={s.rightPanel}>
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
              <span>
                {latestLog?.logged_at
                  ? new Date(latestLog.logged_at).toLocaleString()
                  : '--'}
              </span>
            </div>
          </div>

          <div className={s.content}>
            <ActivityLogTab
              key={clearKey}
              externalLevelFilter={activeLevelFilter}
              onLevelFilterChange={setActiveLevelFilter}
              externalCategoryFilter={activeCategoryFilter}
              onCategoryFilterChange={setActiveCategoryFilter}
              categoryOptions={availableCategories}
              onRefresh={handleRefreshLogs}
            />
          </div>
        </div>
        </> /* end default view */}
      </div>

      {/* Advanced drawer — Log Settings only */}
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
                      <div><strong>File Mode</strong>: Raw text files written by the T3000 service process (T3WebLog).</div>
                      <div><strong>Flow Mode</strong>: Step-by-step operation traces with timing and status.</div>
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
          <div className={s.advancedTabContent}>
            <LogSettingsTab mainView={mainView} onMainViewChange={setMainView} />
          </div>
        </DrawerBody>
      </Drawer>
    </div>
  );
};

export default LogsPage;
