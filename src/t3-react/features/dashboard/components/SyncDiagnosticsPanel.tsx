/**
 * SyncDiagnosticsPanel — read-only troubleshooting for FFI interval sync.
 * Uses GET /api/sync/diagnostics (and server proxy in client mode).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Spinner,
} from '@fluentui/react-components';
import {
  ArrowClockwiseRegular,
  CheckmarkCircleRegular,
  InfoRegular,
  WarningRegular,
  ErrorCircleRegular,
  DocumentTextRegular,
  ServerRegular,
  DesktopRegular,
} from '@fluentui/react-icons';
import {
  AppLogEntry,
  DiagnosticSeverity,
  getServerSyncDiagnostics,
  getSyncDiagnostics,
  ServerDiagnosticsResult,
  SyncDiagnosticsData,
} from '../services/syncHealthApi';
import styles from './SyncDiagnosticsPanel.module.css';

interface Props {
  appMode: 'standalone' | 'server' | 'client';
  onViewActivityLog: () => void;
  refreshKey?: number;
}

function severityIcon(severity: DiagnosticSeverity) {
  switch (severity) {
    case 'ok':
      return <CheckmarkCircleRegular className={`${styles.checkIcon} ${styles.iconOk}`} />;
    case 'warn':
      return <WarningRegular className={`${styles.checkIcon} ${styles.iconWarn}`} />;
    case 'error':
      return <ErrorCircleRegular className={`${styles.checkIcon} ${styles.iconError}`} />;
    default:
      return <InfoRegular className={`${styles.checkIcon} ${styles.iconInfo}`} />;
  }
}

function severityClass(severity: DiagnosticSeverity): string {
  switch (severity) {
    case 'ok':
      return styles.sevOk;
    case 'warn':
      return styles.sevWarn;
    case 'error':
      return styles.sevError;
    default:
      return styles.sevInfo;
  }
}

function navigateToActivityLog(category?: string) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  const qs = params.toString();
  window.location.hash = qs
    ? `#/t3000/develop/logs?${qs}`
    : '#/t3000/develop/logs';
}

function EventRows({ events, emptyLabel }: { events: AppLogEntry[]; emptyLabel: string }) {
  if (events.length === 0) {
    return <div className={styles.emptyEvents}>{emptyLabel}</div>;
  }

  return (
    <div className={styles.eventsTable}>
      <div className={styles.eventsHead}>
        <span>Time</span>
        <span>Level</span>
        <span>Message</span>
      </div>
      {events.map((e) => (
        <div
          key={`${e.id}-${e.tsUnix}`}
          className={[
            styles.eventsRow,
            e.level === 'warn' ? styles.eventsRowWarn : '',
            e.level === 'error' ? styles.eventsRowError : '',
          ].filter(Boolean).join(' ')}
        >
          <span>{e.ts || '—'}</span>
          <span>{e.level.toUpperCase()}</span>
          <span className={styles.eventMsg}>
            <span>{e.message}</span>
            {e.details && <div className={styles.eventDetails}>{e.details}</div>}
          </span>
        </div>
      ))}
    </div>
  );
}

function PcRoleBanner({ diag }: { diag: SyncDiagnosticsData | null }) {
  if (!diag) return null;

  if (diag.role === 'server') {
    return (
      <span className={styles.serverBadge}>
        <ServerRegular style={{ fontSize: 12 }} />
        This PC is the SERVER (FFI sync host) — {diag.hostname}
      </span>
    );
  }
  if (diag.role === 'client') {
    return (
      <span className={styles.clientBadge}>
        <DesktopRegular style={{ fontSize: 12 }} />
        This PC is a CLIENT — sync KPIs come from {diag.ffiSyncHost ?? 'server'}:9103
      </span>
    );
  }
  return (
    <span className={styles.clientBadge}>
      <DesktopRegular style={{ fontSize: 12 }} />
      Standalone mode — no background FFI sync
    </span>
  );
}

export const SyncDiagnosticsPanel: React.FC<Props> = ({
  appMode,
  onViewActivityLog,
  refreshKey = 0,
}) => {
  const [localDiag, setLocalDiag] = useState<SyncDiagnosticsData | null>(null);
  const [serverDiag, setServerDiag] = useState<ServerDiagnosticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const local = await getSyncDiagnostics();
      setLocalDiag(local);
      if (appMode === 'client') {
        const server = await getServerSyncDiagnostics();
        setServerDiag(server);
      } else {
        setServerDiag(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load diagnostics');
    }
  }, [appMode]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [load, refreshKey]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  /** Server checks/events when client proxy works; else local (this PC). */
  const serverView = appMode === 'client' && serverDiag?.ok ? serverDiag.diagnostics : null;
  const displayDiag = serverView ?? localDiag;

  const checks = useMemo(() => {
    if (appMode === 'client') {
      const localChecks = localDiag?.checks ?? [];
      const remoteChecks = serverView?.checks ?? [];
      if (serverView) {
        return [
          ...localChecks.filter((c) => c.title.includes('CLIENT')),
          ...remoteChecks.filter((c) => !c.title.includes('CLIENT')),
        ];
      }
      return localChecks;
    }
    return displayDiag?.checks ?? [];
  }, [appMode, localDiag, serverView, displayDiag]);

  const ffiEvents = displayDiag?.recentFfiEvents ?? [];

  const eventsLabel = serverView
    ? `Recent ffi_sync events (from server ${serverDiag?.serverIp ?? ''})`
    : 'Recent ffi_sync events (this PC, Activity Log)';

  const eventsEmpty = appMode === 'client' && serverDiag && !serverDiag.ok
    ? `Cannot load server events: ${serverDiag.error ?? 'server unreachable'}`
    : displayDiag?.role === 'server'
      ? 'No ffi_sync rows yet. Wait one interval or check Activity Log → POLL after a cycle.'
      : 'No ffi_sync rows on this PC (expected on a client).';

  const iniLine = displayDiag
    ? `setting.ini: enabled=${displayDiag.iniCenterDbEnabled ? 1 : 0}, role=${displayDiag.iniRole}`
    : '';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h4 className={styles.title}>Sync Diagnostics</h4>
          <p className={styles.subtitle}>
            Confirms whether <strong>this PC</strong> runs the FFI sync loop, or a remote server does.
            All data is read from existing Activity Log / health APIs — nothing new is written to disk.
          </p>
          {iniLine && <p className={styles.subtitle}>{iniLine}</p>}
        </div>
        <div className={styles.actions}>
          <Button
            size="small"
            appearance="subtle"
            icon={<DocumentTextRegular />}
            onClick={onViewActivityLog}
          >
            Activity Log
          </Button>
          <Button
            size="small"
            appearance="subtle"
            icon={<DocumentTextRegular />}
            onClick={() => navigateToActivityLog('POLL')}
          >
            Develop Logs (POLL)
          </Button>
          <Button
            size="small"
            appearance="subtle"
            icon={<ArrowClockwiseRegular />}
            disabled={refreshing}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {loading && (
        <div className={styles.loadingRow}>
          <Spinner size="tiny" />
          <span>Loading diagnostics…</span>
        </div>
      )}

      {error && !loading && (
        <p className={styles.errorText}>{error}</p>
      )}

      {!loading && !error && (
        <>
          <PcRoleBanner diag={localDiag} />
          {serverView && (
            <PcRoleBanner diag={serverView} />
          )}

          <div className={styles.checkList}>
            {checks.map((check, idx) => (
              <div
                key={`${check.title}-${idx}`}
                className={`${styles.checkItem} ${severityClass(check.severity)}`}
              >
                {severityIcon(check.severity)}
                <div className={styles.checkBody}>
                  <span className={styles.checkTitle}>{check.title}</span>
                  <span className={styles.checkDetail}>{check.detail}</span>
                  {check.hint && <span className={styles.checkHint}>{check.hint}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.eventsSection}>
            <span className={styles.eventsTitle}>{eventsLabel}</span>
            <span className={styles.eventsNote}>
              Summaries only (category POLL/DEVICE, source=ffi_sync). For deep FFI traces use existing T3WebLog on the sync host PC.
            </span>
            <EventRows events={ffiEvents} emptyLabel={eventsEmpty} />
          </div>
        </>
      )}
    </div>
  );
};

export default SyncDiagnosticsPanel;
