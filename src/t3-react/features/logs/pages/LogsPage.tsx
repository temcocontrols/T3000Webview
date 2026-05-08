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
    lineHeight: '16px',
  },
  drawerHeaderTitleText: {
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: '16px',
  },
  drawerCloseButton: {
    minWidth: '24px',
    width: '24px',
    height: '24px',
  },

  topStrip: {
    display: 'grid',
    gridTemplateColumns: '1.45fr 1fr',
    gap: '0',
    margin: '10px 16px 8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
    flexShrink: 0,
  },
  topStripHidden: {
    display: 'none',
  },
  latestPanel: {
    backgroundColor: '#f3f8ff',
    borderRight: `1px solid #d0e4f7`,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minHeight: '84px',
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
    letterSpacing: '0.2px',
    color: tokens.colorBrandForeground1,
    textTransform: 'uppercase',
  },
  lastUpdated: {
    fontSize: '11px',
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
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  statCell: {
    padding: '9px 10px',
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: '10.5px',
    color: tokens.colorNeutralForeground4,
    textTransform: 'uppercase',
    letterSpacing: '0.25px',
  },
  statValue: {
    fontSize: '19px',
    fontWeight: 700,
    color: tokens.colorNeutralForeground1,
    lineHeight: '1.05',
  },
  statValueError: {
    color: tokens.colorPaletteRedForeground1,
  },
  statValueWarn: {
    color: tokens.colorPaletteMarigoldForeground1,
  },
  statHint: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  stripToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 16px 2px',
    flexShrink: 0,
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

      for (const entry of entries) {
        categories.add(entry.category);
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

      <div className={s.stripToggle}>
        <Button
          size="small"
          appearance="subtle"
          icon={summaryVisible ? <ChevronUpRegular /> : <ChevronDownRegular />}
          iconPosition="after"
          onClick={() => setSummaryVisible(v => !v)}
        >
          {summaryVisible ? 'Hide summary' : 'Show summary'}
        </Button>
      </div>

      <div className={mergeClasses(s.topStrip, !summaryVisible && s.topStripHidden)}>
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

        <div className={s.summaryGrid}>
          <div className={s.statCell}>
            <span className={s.statLabel}>Total Records</span>
            <span className={s.statValue}>{summary.total.toLocaleString()}</span>
            <span className={s.statHint}>all pages</span>
          </div>
          <div className={s.statCell}>
            <span className={s.statLabel}>Categories Active</span>
            <span className={s.statValue}>{summary.categoryCount}</span>
            <span className={s.statHint}>seen recently</span>
          </div>
          <div className={s.statCell}>
            <span className={s.statLabel}>Errors</span>
            <span className={mergeClasses(s.statValue, s.statValueError)}>{summary.errorCount}</span>
            <span className={s.statHint}>
              last 80 &nbsp;<Sparkline values={sparkErrors} color="#a4262c" />
            </span>
          </div>
          <div className={s.statCell}>
            <span className={s.statLabel}>Warnings</span>
            <span className={mergeClasses(s.statValue, s.statValueWarn)}>{summary.warnCount}</span>
            <span className={s.statHint}>
              last 80 &nbsp;<Sparkline values={sparkWarns} color="#8a6100" />
            </span>
          </div>
        </div>
      </div>

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
          <ActivityLogTab />
        )}
      </div>
    </div>
  );
};

export default LogsPage;
