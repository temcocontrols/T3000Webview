/**
 * SyncHealthWidget
 *
 * Live DB & sync status card — shows role, center DB state,
 * DB size + path, last sync time, records written today,
 * Test Connection button, and View Sync Log button.
 */

import React, { useState } from 'react';
import {
  Button,
  Badge,
  Spinner,
  Text,
  Tooltip,
} from '@fluentui/react-components';
import {
  DatabaseRegular,
  ArrowClockwiseRegular,
  PlugConnectedRegular,
  PlugDisconnectedRegular,
  ServerRegular,
  DesktopRegular,
  FolderRegular,
  ListRegular,
  CheckmarkCircleRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import { SyncHealthData } from '../services/syncHealthApi';
import { API_BASE_URL } from '../../../config/constants';
import styles from './SyncHealthWidget.module.css';

interface Props {
  onViewLog: () => void;
  data: SyncHealthData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  isStandalone?: boolean;
}

function centerDbStatusLabel(status?: string, connected?: boolean) {
  switch (status) {
    case 'db_missing':
      return { label: 'Database Missing', color: 'warning' as const };
    case 'schema_missing':
      return { label: 'Needs Init', color: 'warning' as const };
    case 'server_unreachable':
      return { label: 'SQL Server Down', color: 'danger' as const };
    case 'misconfigured_backend':
      return { label: 'Misconfigured', color: 'warning' as const };
    default:
      return {
        label: connected ? 'Connected' : 'Disconnected',
        color: connected ? ('success' as const) : ('danger' as const),
      };
  }
}

export const SyncHealthWidget: React.FC<Props> = ({ onViewLog, data, loading, error, onRefresh, isStandalone = false }) => {
  const [testing, setTesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleTest = async () => {
    if (!data) return;
    setTesting(true);
    setTestResult(null);
    try {
      // Ping through the existing active pool — avoids sending credentials from the frontend
      // and gives an accurate latency reading from a live connection.
      const res = await fetch(`${API_BASE_URL}/api/sync/health/ping`);
      const result = await res.json();
      setTestResult({
        ok: result.ok,
        msg: result.ok
          ? `Connected (${result.latency_ms ?? '?'}ms)`
          : (result.error ?? 'Connection failed'),
      });
    } catch (e) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner size="tiny" />
        <Text className={styles.loadingText}>Loading…</Text>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.errorState}>
        <ErrorCircleRegular className={styles.errorIcon} />
        <Text className={styles.errorText}>{error ?? 'No data'}</Text>
      </div>
    );
  }

  const connected = data.centerDbEnabled ? data.centerDbConnected : true; // standalone is always "ok"
  const metricsBlocked = data.centerDbEnabled && data.samplingPaused;
  const roleLabel = data.role === 'server' ? 'Server' : data.role === 'client' ? 'Client' : 'Standalone';
  const RoleIcon = data.role === 'server' ? ServerRegular : DesktopRegular;
  const effectiveBackend = data.backendType;
  const backendLabel = effectiveBackend === 'mssql' ? 'SQL Server'
    : effectiveBackend === 'postgres' ? 'PostgreSQL'
    : effectiveBackend === 'mysql' ? 'MySQL'
    : 'SQLite';
  const statusUi = centerDbStatusLabel(data.centerDbStatus, connected);
  const dbTargetText = data.centerDbEnabled
    ? `${backendLabel} · ${data.centerDbHost ?? '—'}${data.centerDbDatabaseName ? ` / ${data.centerDbDatabaseName}` : ''}`
    : data.dbFolderPath;
  const dbSizeSourceText = !data.centerDbEnabled
    ? 'Source: Local SQLite file'
    : (data.mssqlPoolActive ? 'Source: MSSQL sys.database_files' : 'Source: Center DB target');

  return (
    <div className={styles.container}>
      {/* Row 1: Role | Status | Actions */}
      <div className={styles.topRow}>
        <div className={styles.roleChip}>
          <RoleIcon className={styles.roleIcon} />
          <span className={styles.roleLabel}>{roleLabel}</span>
        </div>

        <div className={styles.statusChip}>
          {connected
            ? <PlugConnectedRegular className={styles.connIcon} style={{ color: '#107c10' }} />
            : <PlugDisconnectedRegular className={styles.connIcon} style={{ color: '#d13438' }} />}
          <Badge
            appearance="filled"
            color={statusUi.color}
            size="small"
          >
            {data.centerDbEnabled
              ? statusUi.label
              : 'Local SQLite'}
          </Badge>
          {data.centerDbEnabled && (
            <Badge appearance="tint" color="informative" size="small">{backendLabel}</Badge>
          )}
          {!data.centerDbEnabled && data.writesBlocked && (
            <Badge appearance="tint" color="warning" size="small">Local SQLite</Badge>
          )}
          {data.mssqlPoolActive && (
            <Badge appearance="tint" color="informative" size="small">Direct</Badge>
          )}
        </div>

        <div className={styles.actions}>
          {data.centerDbEnabled && (
            <Button
              size="small"
              appearance="outline"
              icon={testing ? <Spinner size="extra-tiny" /> : <PlugConnectedRegular />}
              onClick={handleTest}
              disabled={testing}
            >
              Test
            </Button>
          )}
          <Button
            size="small"
            appearance="outline"
            icon={<ListRegular />}
            onClick={onViewLog}
          >
            Activity Log
          </Button>
          <Button
            size="small"
            appearance="subtle"
            icon={refreshing ? <Spinner size="extra-tiny" /> : <ArrowClockwiseRegular />}
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh sync health"
          />
        </div>
      </div>
      {data.centerDbEnabled && data.centerDbMessage && !connected && (
        <Text style={{ color: '#605e5c', fontSize: '12px' }}>{data.centerDbMessage}</Text>
      )}

      {/* Test result banner */}
      {testResult && (
        <div className={`${styles.testResult} ${testResult.ok ? styles.testOk : styles.testFail}`}>
          {testResult.ok
            ? <CheckmarkCircleRegular style={{ fontSize: '14px' }} />
            : <ErrorCircleRegular style={{ fontSize: '14px' }} />}
          <span>{testResult.msg}</span>
        </div>
      )}

      {/* Row 2: Stat cards */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statHead}>
            <ArrowClockwiseRegular className={styles.statIcon} />
            <span className={styles.statLabel}>{isStandalone ? 'Last Poll' : 'Last Sync'}</span>
          </div>
          <span className={`${styles.statValue} ${metricsBlocked ? styles.statValueWarn : ''}`}>
            {data.lastSyncAgo ?? 'Never'}
          </span>
          {metricsBlocked ? (
            <span className={`${styles.statSub} ${styles.statSubWarn}`}>
              Blocked: values may be stale
            </span>
          ) : data.lastSyncTime && (
            <Tooltip content={data.lastSyncTime} relationship="label">
              <span className={styles.statSub}>{data.lastSyncTime}</span>
            </Tooltip>
          )}
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHead}>
            <DesktopRegular className={styles.statIcon} />
            <span className={styles.statLabel}>Devices Today</span>
          </div>
          <span className={`${styles.statValue} ${metricsBlocked ? styles.statValueWarn : ''}`}>{data.devicesSyncedToday}</span>
          <span className={`${styles.statSub} ${metricsBlocked ? styles.statSubWarn : ''}`}>
            {metricsBlocked ? 'stale count' : isStandalone ? 'polled' : 'synced'}
          </span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHead}>
            <ListRegular className={styles.statIcon} />
            <span className={styles.statLabel}>Records Today</span>
          </div>
          <span className={`${styles.statValue} ${metricsBlocked ? styles.statValueWarn : ''}`}>
            {data.recordsToday.total.toLocaleString()}
          </span>
          <span className={`${styles.statSub} ${metricsBlocked ? styles.statSubWarn : ''}`}>
            {data.recordsToday.inputs}in · {data.recordsToday.outputs}out · {data.recordsToday.variables}var
          </span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHead}>
            <DatabaseRegular className={styles.statIcon} />
            <span className={styles.statLabel}>DB Size</span>
          </div>
          <span className={styles.statValue}>{data.dbSizeHuman}</span>
          <span className={styles.statSub}>{dbSizeSourceText}</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHead}>
            <FolderRegular className={styles.statIcon} />
            <span className={styles.statLabel}>{data.centerDbEnabled ? 'Center DB Target' : 'DB Folder'}</span>
          </div>
          <Tooltip content={dbTargetText} relationship="label">
            <span className={styles.statPath}>{dbTargetText}</span>
          </Tooltip>
          <span className={styles.statSub}>Configured target</span>
        </div>
      </div>
    </div>
  );
};
