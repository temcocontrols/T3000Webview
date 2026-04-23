/**
 * System Overview Widget
 * Shows key metrics pulled from real APIs: devices, sync health, points, alarms.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Spinner, Tooltip } from '@fluentui/react-components';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { getSyncHealth, SyncHealthData } from '../services/syncHealthApi';
import { API_BASE_URL } from '../../../config/constants';
import styles from './SystemOverview.module.css';

function centerDbSummary(status?: string, connected?: boolean) {
  switch (status) {
    case 'db_missing':
      return { label: 'Database Missing', color: '#c19c00' };
    case 'schema_missing':
      return { label: 'Needs Init', color: '#c19c00' };
    case 'server_unreachable':
      return { label: 'SQL Server Down', color: '#d13438' };
    case 'misconfigured_backend':
      return { label: 'Misconfigured', color: '#c19c00' };
    default:
      return {
        label: connected ? 'Connected' : 'Disconnected',
        color: connected ? '#107c10' : '#d13438',
      };
  }
}

export const SystemOverview: React.FC = () => {
  const { devices, deviceStatuses } = useDeviceTreeStore();
  const [syncHealth, setSyncHealth] = useState<SyncHealthData | null>(null);
  const [alarmCount, setAlarmCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const onlineCount = Array.from(deviceStatuses.values()).filter((s) => s === 'online').length;
  const offlineCount = devices.length - onlineCount;

  const fetchData = useCallback(async () => {
    try {
      const [health, alarmsResp] = await Promise.allSettled([
        getSyncHealth(),
        fetch(`${API_BASE_URL}/api/t3_device/alarms/active`),
      ]);

      if (health.status === 'fulfilled') setSyncHealth(health.value);

      if (alarmsResp.status === 'fulfilled' && alarmsResp.value.ok) {
        const data = await alarmsResp.value.json();
        // accept { total } or array length
        setAlarmCount(typeof data?.total === 'number' ? data.total : (Array.isArray(data) ? data.length : 0));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const centerUi = syncHealth
    ? centerDbSummary(syncHealth.centerDbStatus, syncHealth.centerDbConnected)
    : { label: '—', color: '#605e5c' };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner size="small" />
      </div>
    );
  }

  return (
    <div className={styles.overview}>
      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.cardLabel}>DEVICES</div>
          <div className={styles.cardValue}>{devices.length}</div>
          <div className={styles.cardDetail}>
            {onlineCount} online • {offlineCount} offline
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.cardLabel}>CENTER DB</div>
          <div className={styles.cardValue} style={{ color: centerUi.color, fontSize: '16px' }}>
            {centerUi.label}
          </div>
          <div className={styles.cardDetail}>
            {(() => {
              if (!syncHealth) return 'N/A';
              const isCenterDb = syncHealth.role !== 'standalone';
              // If Center DB mode but reporting sqlite, it's in SQLite fallback — configured target is SQL Server
              const backend = isCenterDb && syncHealth.backendType === 'sqlite' ? 'SQL Server' : syncHealth.backendType;
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
            <div className={styles.cardValue} style={{ fontSize: '15px' }}>
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
          <div className={styles.cardValue} style={{ color: alarmCount > 0 ? '#d13438' : undefined }}>
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
          <div className={styles.cardLabel}>DB SIZE</div>
          <div className={styles.cardValue} style={{ fontSize: '15px' }}>
            {syncHealth?.dbSizeHuman ?? '—'}
          </div>
          <div className={styles.cardDetail} style={{ fontFamily: 'monospace', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {syncHealth?.dbFolderPath ?? '—'}
          </div>
        </div>
      </div>
    </div>
  );
};
