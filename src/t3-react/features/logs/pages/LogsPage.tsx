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
  InfoRegular,
  DatabasePlugConnectedRegular,
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
  },

  /* ---- left sidebar ---- */
  leftPanel: {
    width: '170px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: '#e1dfdd',
    overflow: 'hidden',
    backgroundColor: '#faf9f8',
  },
  statsBlock: {
    padding: '10px 12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    flexShrink: 0,
  },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '4px',
  },
  statRowLabel: {
    fontSize: '11.5px',
    color: '#8a8886',
    fontWeight: 400,
  },
  statRowValue: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#323130',
  },
  statRowValueError: {
    color: tokens.colorPaletteRedForeground1,
  },
  statRowValueWarn: {
    color: tokens.colorPaletteMarigoldForeground1,
  },
  leftDivider: {
    height: '1px',
    backgroundColor: '#e1dfdd',
    margin: '0 8px',
    flexShrink: 0,
  },
  catSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
  },
  catSectionLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#a19f9d',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '8px 12px 4px',
    flexShrink: 0,
    userSelect: 'none',
  },
  catList: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingBottom: '8px',
  },
  catItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 12px',
    cursor: 'pointer',
    userSelect: 'none',
    gap: '6px',
    ':hover': { backgroundColor: '#f3f2f1' },
  },
  catItemActive: {
    backgroundColor: '#e8f0fe',
    ':hover': { backgroundColor: '#dce6fd' },
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
  },

  /* latest activity banner — top of right panel */
  latestPanel: {
    backgroundColor: '#f3f8ff',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#d0e4f7',
    padding: '8px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
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
    if (logToggleLoading) {
      return;
    }

    setLogToggleLoading(true);
    setLoggingEnabled(enabled); // optimistic
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

  // Sort categories by count descending for the left sidebar list
  const sortedCats = [...availableCategories].sort(
    (a, b) => (categoryCounts[b] ?? 0) - (categoryCounts[a] ?? 0),
  );

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
          icon={sqlTesting ? <Spinner size="tiny" /> : <DatabasePlugConnectedRegular />}
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

        {/* Enable / Disable Logging toggle */}
        <div className={s.toggleWrapper}>
          <Switch
            checked={loggingEnabled}
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

      {/* ── Two-panel body: left sidebar + right main ── */}
      <div className={s.body}>

        {/* Left sidebar — stats + scrollable category filter */}
        <div className={s.leftPanel}>
          <div className={s.statsBlock}>
            <div className={s.statRow}>
              <span className={s.statRowLabel}>Total</span>
              <span className={s.statRowValue}>{summary.total.toLocaleString()}</span>
            </div>
            <div className={s.statRow}>
              <span className={s.statRowLabel}>Errors</span>
              <span className={mergeClasses(s.statRowValue, s.statRowValueError)}>
                {summary.errorCount}
              </span>
            </div>
            <div className={s.statRow}>
              <span className={s.statRowLabel}>Warnings</span>
              <span className={mergeClasses(s.statRowValue, s.statRowValueWarn)}>
                {summary.warnCount}
              </span>
            </div>
            <div className={s.statRow}>
              <span className={s.statRowLabel}>Categories</span>
              <span className={s.statRowValue}>{summary.categoryCount}</span>
            </div>
          </div>

          <div className={s.leftDivider} />

          <div className={s.catSection}>
            <span className={s.catSectionLabel}>Category</span>
            <div className={s.catList}>
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
              externalCategoryFilter={activeCategoryFilter}
              onCategoryFilterChange={setActiveCategoryFilter}
              categoryOptions={availableCategories}
              sharedData={logData ?? undefined}
              sharedDataMode
              onRefresh={handleRefreshLogs}
            />
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default LogsPage;
