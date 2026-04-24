/**
 * SyncHealthWidget
 *
 * Live DB & sync status card — shows role, center DB state,
 * DB size + path, last sync time, records written today,
 * Test Connection button, and View Sync Log button.
 */

import React, { useEffect, useState, useCallback } from 'react';
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
import { getSyncHealth, SyncHealthData } from '../services/syncHealthApi';
import { testConnection } from '../../database/services/databaseConfigApi';
import styles from './SyncHealthWidget.module.css';

interface Props {
  onViewLog: () => void;
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

export const SyncHealthWidget: React.FC<Props> = ({ onViewLog }) => {
  const [data, setData] = useState<SyncHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await getSyncHealth();
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sync health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const handleTest = async () => {
    if (!data) return;
    setTesting(true);
    setTestResult(null);
    try {
      const backend = data.backendType as any;
      const needsHostAndDb = backend === 'mssql' || backend === 'postgres' || backend === 'mysql';
      if (needsHostAndDb && (!data.centerDbHost || !data.centerDbDatabaseName)) {
        setTestResult({
          ok: false,
          msg: `Database config is incomplete (${backend.toUpperCase()}). Please set host and database name in Database Configuration.`,
        });
        return;
      }

      // Reuse the existing testConnection API using current center DB host/db from sync health
      const result = await testConnection({
        backend_type: backend,
        host: data.centerDbHost ?? undefined,
        database_name: data.centerDbDatabaseName ?? undefined,
      });
      setTestResult({
        ok: result.success,
        msg: result.success
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
    : (data.mssqlPoolActive ? 'Source: MSSQL sys.database_files' : 'Source: Center DB target (fallback)');

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
          {data.fallbackActive && (
            <Badge appearance="tint" color="warning" size="small">Fallback</Badge>
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
            Sync Log
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
            <span className={styles.statLabel}>Last Sync</span>
          </div>
          <span className={styles.statValue}>{data.lastSyncAgo ?? 'Never'}</span>
          {data.lastSyncTime && (
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
          <span className={styles.statValue}>{data.devicesSyncedToday}</span>
          <span className={styles.statSub}>synced</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHead}>
            <ListRegular className={styles.statIcon} />
            <span className={styles.statLabel}>Records Today</span>
          </div>
          <span className={styles.statValue}>{data.recordsToday.total.toLocaleString()}</span>
          <span className={styles.statSub}>
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
