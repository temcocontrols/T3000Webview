/**
 * Logs Page — user-centric design
 *
 * The log viewer is the primary surface. Settings and file logs are
 * secondary actions accessible from a slim toolbar, not equal tabs.
 *
 * Header bar:  title + subtitle  |  [File Logs]  [Configure Logging]
 * Settings:    collapsible panel that opens inline below the header
 * Main area:   ActivityLogTab by default; FileLogsTab when files mode active
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  makeStyles,
  mergeClasses,
  Button,
  Text,
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Badge,
  tokens,
} from '@fluentui/react-components';
import {
  DocumentTextRegular,
  SettingsRegular,
  ArrowLeftRegular,
  Dismiss24Regular,
  ChevronUpRegular,
  ChevronDownRegular,
} from '@fluentui/react-icons';
import { ActivityLogTab } from '../components/ActivityLogTab';
import { FileLogsTab } from '../components/FileLogsTab';
import { LogSettingsTab } from '../components/LogSettingsTab';
import { API_BASE_URL } from '../../../config/constants';

const ACTIVITY_LOG_URL = `${API_BASE_URL}/api/sync/event-log`;

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
}

// ---------- Sparkline ----------
// Renders a tiny 10-bar SVG chart from a number[] of values 0..max
const SPARK_W = 64;
const SPARK_H = 20;
const SPARK_BARS = 10;

const useSparkStyles = makeStyles({
  svg: { display: 'block', flexShrink: 0 },
});

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const ss = useSparkStyles();
  const max = Math.max(...values, 1);
  const barW = (SPARK_W - (SPARK_BARS - 1)) / SPARK_BARS;
  return (
    <svg width={SPARK_W} height={SPARK_H} className={ss.svg}>
      {values.map((v, i) => {
        const h = Math.max(2, Math.round((v / max) * SPARK_H));
        return (
          <rect
            key={i}
            x={i * (barW + 1)}
            y={SPARK_H - h}
            width={barW}
            height={h}
            rx={1}
            fill={color}
            opacity={0.75}
          />
        );
      })}
    </svg>
  );
}

/** Bucket entries into SPARK_BARS time slots by logged_at */
function buildSparkValues(entries: AppLogEntry[], level: string): number[] {
  if (!entries.length) return Array(SPARK_BARS).fill(0);
  const times = entries.map(e => new Date(e.logged_at).getTime()).filter(Boolean);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const range = tMax - tMin || 1;
  const buckets: number[] = Array(SPARK_BARS).fill(0);
  for (const entry of entries) {
    if (entry.level !== level) continue;
    const t = new Date(entry.logged_at).getTime();
    const idx = Math.min(SPARK_BARS - 1, Math.floor(((t - tMin) / range) * SPARK_BARS));
    buckets[idx] += 1;
  }
  return buckets;
}

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },

  /* ---- header bar ---- */
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#edebe9',
    backgroundColor: '#ffffff',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#201f1e',
    display: 'block',
  },
  subtitle: {
    fontSize: '11.5px',
    color: '#605e5c',
    marginTop: '1px',
    display: 'block',
  },
  headerActions: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexShrink: 0,
  },

  drawerHeader: {
    padding: '8px 12px',
    minHeight: 'auto',
  },
  drawerHeaderTitle: {
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: '18px',
  },
  drawerHeaderTitleText: {
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: '18px',
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
  statHint: {
    fontSize: '11px',
    color: '#605e5c',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
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
    gap: '6px',
    overflowX: 'auto',
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

  /* files mode back bar */
  backBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#edebe9',
    backgroundColor: '#f0f6ff',
    flexShrink: 0,
    fontSize: '12px',
    color: '#323130',
  },
});

export const LogsPage: React.FC = () => {
  const s = useStyles();
  const [showSettings, setShowSettings] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(true);
  const [latestLog, setLatestLog] = useState<AppLogEntry | null>(null);
  const [summary, setSummary] = useState({
    total: 0,
    errorCount: 0,
    warnCount: 0,
    categoryCount: 0,
    lastUpdated: '--:--:--',
  });
  const [sparkErrors, setSparkErrors] = useState<number[]>(Array(SPARK_BARS).fill(0));
  const [sparkWarns, setSparkWarns]   = useState<number[]>(Array(SPARK_BARS).fill(0));
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('');
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const entriesRef = useRef<AppLogEntry[]>([]);

  const loadTopSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: '0', limit: '80' });
      const response = await fetch(`${ACTIVITY_LOG_URL}?${params.toString()}`);
      if (!response.ok) return;

      const json: EventLogResponse = await response.json();
      const entries = json.entries ?? [];
      entriesRef.current = entries;
      const categories = new Set<string>();
      let errorCount = 0;
      let warnCount = 0;
      const catCounts: Record<string, number> = {};

      for (const entry of entries) {
        categories.add(entry.category);
        catCounts[entry.category] = (catCounts[entry.category] ?? 0) + 1;
        if (entry.level === 'ERROR') errorCount += 1;
        if (entry.level === 'WARN') warnCount += 1;
      }

      setLatestLog(entries[0] ?? null);
      setSummary({
        total: json.total ?? 0,
        errorCount,
        warnCount,
        categoryCount: categories.size,
        lastUpdated: new Date().toLocaleTimeString(),
      });
      setSparkErrors(buildSparkValues(entries, 'ERROR'));
      setSparkWarns(buildSparkValues(entries, 'WARN'));
      setCategoryCounts(catCounts);
    } catch (err) {
      console.error('Failed to load logs summary:', err);
    }
  }, []);

  useEffect(() => {
    loadTopSummary();
    const timer = window.setInterval(loadTopSummary, 15000);
    return () => window.clearInterval(timer);
  }, [loadTopSummary]);

  const handleFilesClick = () => {
    setShowFiles(true);
  };

  const handleBackToActivity = () => {
    setShowFiles(false);
  };

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.headerText}>
          <span className={s.title}>T3000 Logs</span>
          <span className={s.subtitle}>
            View and search what the T3000 service has been doing — errors, sync activity, device
            changes. Use <strong>Configure</strong> to control which categories get recorded.
          </span>
        </div>
        <div className={s.headerActions}>
          {!showFiles && (
            <Button
              size="small"
              appearance="subtle"
              icon={<DocumentTextRegular />}
              onClick={handleFilesClick}
            >
              Raw File Logs
            </Button>
          )}
          <Button
            size="small"
            appearance={showSettings ? 'primary' : 'subtle'}
            icon={<SettingsRegular />}
            style={{ fontSize: '12px' }}
            onClick={() => setShowSettings(true)}
          >
            Configure Logging
          </Button>
        </div>
      </div>

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
            <Badge size="small" color={latestLog?.level === 'ERROR' ? 'danger' : latestLog?.level === 'WARN' ? 'warning' : 'informative'}>
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
                <span className={s.statHint}><Sparkline values={sparkErrors} color="#a4262c" /></span>
              </div>
              <span className={s.vDivider} />
              <div className={s.statCell}>
                <span className={s.statLabel}>Warnings</span>
                <span className={mergeClasses(s.statValue, s.statValueWarn)}>{summary.warnCount}</span>
                <span className={s.statHint}><Sparkline values={sparkWarns} color="#8a6100" /></span>
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
              {Object.entries(categoryCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <span
                    key={cat}
                    className={mergeClasses(s.chip, activeCategoryFilter === cat && s.chipActive)}
                    onClick={() => setActiveCategoryFilter(prev => prev === cat ? '' : cat)}
                  >
                    {cat} <span className={s.chipCount}>{count}</span>
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
              color={
                latestLog?.level === 'ERROR'
                  ? 'danger'
                  : latestLog?.level === 'WARN'
                    ? 'warning'
                    : 'informative'
              }
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

      {/* Settings drawer */}
      <Drawer
        type="overlay"
        position="end"
        size="medium"
        open={showSettings}
        onOpenChange={(_, { open }) => setShowSettings(open)}
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
                onClick={() => setShowSettings(false)}
              />
            }
          >
            <span className={s.drawerHeaderTitleText}>Configure Logging</span>
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody className={s.drawerBody}>
          <LogSettingsTab />
        </DrawerBody>
      </Drawer>

      {/* Main content */}
      <div className={s.content}>
        {showFiles ? (
          <>
            <div className={s.backBar}>
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowLeftRegular />}
                onClick={handleBackToActivity}
              >
                Back to Activity Log
              </Button>
              <Text size={200} style={{ color: '#605e5c' }}>
                — Raw text files written by the T3000 service process (T3WebLog)
              </Text>
            </div>
            <FileLogsTab />
          </>
        ) : (
          <ActivityLogTab
            externalCategoryFilter={activeCategoryFilter}
            onCategoryFilterChange={setActiveCategoryFilter}
          />
        )}
      </div>
    </div>
  );
};

export default LogsPage;
