/**
 * System Health Widget
 * Shows real DB health data from /api/sync/health
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Text, Badge, Spinner, Tooltip } from '@fluentui/react-components';
import { getSyncHealth, SyncHealthData } from '../services/syncHealthApi';
import styles from './SystemHealth.module.css';

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
      <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <Spinner size="small" />
      </div>
    );
  }

  if (!health) {
    return (
      <div className={styles.container}>
        <Text style={{ color: '#d13438', fontSize: '13px' }}>Unable to load health data</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.metric}>
        <div className={styles.metricHeader}>
          <Text className={styles.metricLabel}>Center DB</Text>
          <Badge
            appearance="filled"
            color={health.centerDbConnected ? 'success' : 'danger'}
            size="small"
          >
            {health.centerDbConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        <Text style={{ fontSize: '12px', color: '#605e5c' }}>
          {health.backendType} • {health.role}
          {health.hostname ? ` • ${health.hostname}` : ''}
        </Text>
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
