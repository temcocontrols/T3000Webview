/**
 * System Health Widget
 * Shows real DB health data from /api/sync/health
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Text, Badge, Spinner, Tooltip } from '@fluentui/react-components';
import { getSyncHealth, SyncHealthData } from '../services/syncHealthApi';
import styles from './SystemHealth.module.css';

function centerDbBadge(status?: string, connected?: boolean) {
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

export const SystemHealth: React.FC = () => {
  const [health, setHealth] = useState<SyncHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await getSyncHealth();
      setHealth(data);
    } catch {
      // leave stale data if available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 30_000);
    return () => clearInterval(id);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <Spinner size="small" />
      </div>
    );
  }

  if (!health) {
    return (
      <div className={styles.container}>
        <Text className={styles.errorText}>Unable to load health data</Text>
      </div>
    );
  }

  const centerDbUi = centerDbBadge(health.centerDbStatus, health.centerDbConnected);

  return (
    <div className={styles.container}>
      <div className={styles.metric}>
        <div className={styles.metricHeader}>
          <Text className={styles.metricLabel}>Center DB</Text>
          <Badge
            appearance="filled"
            color={centerDbUi.color}
            size="small"
          >
            {centerDbUi.label}
          </Badge>
        </div>
        <Text style={{ fontSize: '12px', color: '#605e5c' }}>
          {health.backendType} • {health.role}
          {health.hostname ? ` • ${health.hostname}` : ''}
        </Text>
        {health.centerDbMessage && !health.centerDbConnected && (
          <Text style={{ fontSize: '12px', color: '#605e5c' }}>{health.centerDbMessage}</Text>
        )}
      </div>

      <div className={styles.metric}>
        <div className={styles.metricHeader}>
          <Text className={styles.metricLabel}>Last Sync</Text>
          <Text className={styles.metricValue}>{health.lastSyncAgo}</Text>
        </div>
        <Text style={{ fontSize: '12px', color: '#605e5c' }}>
          {health.lastSyncTime ?? 'No sync recorded'}
        </Text>
      </div>

      <div className={styles.metric}>
        <div className={styles.metricHeader}>
          <Text className={styles.metricLabel}>Records Today</Text>
          <Text className={styles.metricValue}>{health.recordsToday.total.toLocaleString()}</Text>
        </div>
        <Text style={{ fontSize: '12px', color: '#605e5c' }}>
          {health.recordsToday.inputs} inputs · {health.recordsToday.outputs} outputs · {health.recordsToday.variables} variables · {health.recordsToday.trendlogs} trendlogs
        </Text>
      </div>

      <div className={styles.metric}>
        <div className={styles.metricHeader}>
          <Text className={styles.metricLabel}>Database Size</Text>
          <Text className={styles.metricValue}>{health.dbSizeHuman}</Text>
        </div>
        <Tooltip content={health.dbFilePath ?? '—'} relationship="description">
          <Text style={{ fontSize: '11px', color: '#605e5c', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '100%' }}>
            {health.dbFolderPath ?? '—'}
          </Text>
        </Tooltip>
      </div>
    </div>
  );
};
