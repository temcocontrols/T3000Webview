/**
 * System Overview Widget
 * Shows key metrics pulled from real APIs: devices, sync health, points, alarms.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Spinner, Tooltip } from '@fluentui/react-components';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { getSyncHealth, SyncHealthData } from '../services/syncHealthApi';
import { isCenterDbDegraded } from '../services/severityRules';
import { API_BASE_URL } from '../../../config/constants';
import styles from './SystemOverview.module.css';

function centerDbSummary(status?: string, connected?: boolean) {
  switch (status) {
    case 'db_missing':
      return { label: 'Database Missing', tone: 'warning' as const };
    case 'schema_missing':
      return { label: 'Needs Init', tone: 'warning' as const };
    case 'server_unreachable':
      return { label: 'SQL Server Down', tone: 'danger' as const };
    case 'misconfigured_backend':
      return { label: 'Misconfigured', tone: 'warning' as const };
    default:
      return {
        label: connected ? 'Connected' : 'Disconnected',
        tone: connected ? ('success' as const) : ('danger' as const),
      };
  }
}

function backendLabel(backendType: string): string {
  switch (backendType) {
    case 'mssql':
      return 'SQL Server';
    case 'postgres':
      return 'PostgreSQL';
    case 'mysql':
      return 'MySQL';
    case 'sqlite':
      return 'SQLite';
    default:
      return backendType.toUpperCase();
  }
}

export const SystemOverview: React.FC = () => {
  const { devices, deviceStatuses } = useDeviceTreeStore();
  const [syncHealth, setSyncHealth] = useState<SyncHealthData | null>(null);
  const [alarmCount, setAlarmCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [alarmsError, setAlarmsError] = useState<string | null>(null);

  const onlineCount = Array.from(deviceStatuses.values()).filter((s) => s === 'online').length;
  const offlineCount = devices.length - onlineCount;

  const fetchData = useCallback(async () => {
    const [health, alarmsResp] = await Promise.allSettled([
      getSyncHealth(),
      fetch(`${API_BASE_URL}/api/t3_device/alarms/active`),
    ]);

    if (health.status === 'fulfilled') {
      setSyncHealth(health.value);
      setHealthError(null);
    } else {
      setHealthError(health.reason instanceof Error ? health.reason.message : 'Failed to refresh sync health');
    }

    if (alarmsResp.status === 'fulfilled') {
      if (alarmsResp.value.ok) {
        const data = await alarmsResp.value.json();
        // accept { total } or array length
        setAlarmCount(typeof data?.total === 'number' ? data.total : (Array.isArray(data) ? data.length : 0));
        setAlarmsError(null);
      } else {
        setAlarmsError(`alarms: HTTP ${alarmsResp.value.status}`);
      }
    } else {
      setAlarmsError(alarmsResp.reason instanceof Error ? alarmsResp.reason.message : 'Failed to refresh alarms');
    }

    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const centerUiBase = syncHealth
    ? centerDbSummary(syncHealth.centerDbStatus, syncHealth.centerDbConnected)
    : { label: '—', tone: 'muted' as const };
  const centerUi = syncHealth && centerUiBase.label === 'SQL Server Down' && isCenterDbDegraded(syncHealth)
    ? { ...centerUiBase, tone: 'warning' as const }
    : centerUiBase;
  const isSharedDbMode = !!syncHealth && syncHealth.role !== 'standalone';
  const dbTargetText = isSharedDbMode
    ? `${syncHealth?.centerDbHost ?? '—'}${syncHealth?.centerDbDatabaseName ? ` / ${syncHealth.centerDbDatabaseName}` : ''}`
    : (syncHealth?.dbFolderPath ?? '—');
  const dbSizeSourceText = !syncHealth
    ? 'Source: N/A'
    : (!isSharedDbMode
      ? 'Source: Local SQLite file'
      : (syncHealth.mssqlPoolActive ? 'Source: MSSQL sys.database_files' : 'Source: Center DB target (fallback)'));

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner size="small" />
      </div>
    );
  }

  return (
    <>
      <div className={styles.metaRow}>
        <span className={styles.metaText}>
          Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
        </span>
        {(healthError || alarmsError) && (
          <span className={styles.metaWarn}>
            Partial refresh issue: {healthError ? 'sync health' : ''}{healthError && alarmsError ? ', ' : ''}{alarmsError ? 'alarms' : ''}. Retrying automatically.
          </span>
        )}
      </div>
      <div className={styles.overview}>
      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.cardLabel}>DEVICES</div>
          <div className={styles.cardValue}>{devices.length}</div>
          <div className={styles.cardDetail}>
            {onlineCount} online • {offlineCount} offline
          </div>
          {isSharedDbMode && (
            <div className={styles.debugLine}>
              src: GET_PANELS_LIST | th: 120s | upd: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
            </div>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.cardLabel}>CENTER DB</div>
          <div className={`${styles.cardValue} ${styles.cardValueStatus} ${styles[centerUi.tone]}`}>
            {centerUi.label}
          </div>
          <div className={styles.cardDetail}>
            {(() => {
              if (!syncHealth) return 'N/A';
              const isCenterDb = syncHealth.role !== 'standalone';
              // If Center DB mode but reporting sqlite, it's in SQLite fallback — configured target is SQL Server
              const backend = isCenterDb && syncHealth.backendType === 'sqlite'
                ? 'SQL Server'
                : backendLabel(syncHealth.backendType);
              const roleLabel = syncHealth.role === 'server' ? 'Server' : syncHealth.role === 'client' ? 'Client' : 'Standalone';
              return `${backend} · ${roleLabel}`;
            })()}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.cardLabel}>LAST SYNC</div>
          <Tooltip content={syncHealth?.lastSyncTime ?? 'No sync recorded'} relationship="description">
            <div className={`${styles.cardValue} ${styles.cardValueCompact}`}>
              {syncHealth?.lastSyncAgo ?? '—'}
            </div>
          </Tooltip>
          <div className={styles.cardDetail}>
            {syncHealth?.devicesSyncedToday ?? 0} device{syncHealth?.devicesSyncedToday !== 1 ? 's' : ''} today
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.cardLabel}>ALARMS</div>
          <div className={`${styles.cardValue} ${alarmCount > 0 ? styles.danger : ''}`}>
            {alarmCount}
          </div>
          <div className={styles.cardDetail}>
            {alarmCount === 0 ? 'All clear' : 'Attention needed'}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.cardLabel}>RECORDS TODAY</div>
          <div className={styles.cardValue}>{syncHealth?.recordsToday.total ?? 0}</div>
          <div className={styles.cardDetail}>
            {syncHealth ? `${syncHealth.recordsToday.inputs}in · ${syncHealth.recordsToday.outputs}out · ${syncHealth.recordsToday.variables}var` : 'No data'}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.cardLabel}>{isSharedDbMode ? 'LOCAL DB CACHE SIZE' : 'DB SIZE'}</div>
          <div className={`${styles.cardValue} ${styles.cardValueCompact}`}>
            {syncHealth?.dbSizeHuman ?? '—'}
          </div>
          <div className={`${styles.cardDetail} ${styles.cardDetailMono}`}>
            {dbTargetText}
          </div>
          <div className={styles.debugLine}>{dbSizeSourceText}</div>
        </div>
      </div>
      </div>
    </>
  );
};
