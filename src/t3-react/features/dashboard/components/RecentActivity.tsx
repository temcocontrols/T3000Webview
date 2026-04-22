/**
 * Recent Activity Widget
 * Shows real sync activity from DATA_SYNC_METADATA via /api/sync-status
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Text, Spinner } from '@fluentui/react-components';
import { ArrowSyncRegular, ErrorCircleRegular } from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import styles from './RecentActivity.module.css';

interface SyncStatus {
  id: number;
  syncTime: number;
  syncTimeFmt: string;
  dataType: string;
  serialNumber: string;
  recordsSynced: number;
  syncMethod: string;
  success: boolean;
  errorMessage: string | null;
}

interface Activity {
  id: string;
  device: string;
  dataType: string;
  timestamp: string;
  recordsSynced: number;
  success: boolean;
  method: string;
}

const DATA_TYPES = ['inputs', 'outputs', 'variables', 'trendlogs'];

export const RecentActivity: React.FC = () => {
  const { devices } = useDeviceTreeStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    if (devices.length === 0) { setLoading(false); return; }

    try {
      const requests = devices.slice(0, 4).flatMap((dev) =>
        DATA_TYPES.map(async (dt) => {
          try {
            const r = await fetch(`${API_BASE_URL}/api/sync-status/${dev.serialNumber}/${dt}`);
            if (!r.ok) return null;
            const data: SyncStatus = await r.json();
            return {
              id: `${dev.serialNumber}-${dt}`,
              device: dev.nameShowOnTree,
              dataType: dt,
              timestamp: data.syncTimeFmt,
              recordsSynced: data.recordsSynced,
              success: data.success,
              method: data.syncMethod,
            } as Activity;
          } catch { return null; }
        })
      );

      const settled = await Promise.all(requests);
      const valid = settled
        .filter((a): a is Activity => a !== null && a.recordsSynced > 0)
        .sort((a, b) => {
          // sort by timestamp desc (strings in yyyy-mm-dd HH:MM:SS format)
          return b.timestamp.localeCompare(a.timestamp);
        })
        .slice(0, 8);

      setActivities(valid);
    } finally {
      setLoading(false);
    }
  }, [devices]);

  useEffect(() => {
    fetchActivities();
    const id = setInterval(fetchActivities, 60_000);
    return () => clearInterval(id);
  }, [fetchActivities]);

  if (loading) {
    return (
      <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <Spinner size="small" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {activities.length === 0 ? (
        <div className={styles.emptyState}>
          <Text className={styles.emptyText}>No recent sync activity</Text>
        </div>
      ) : (
        <div className={styles.activityList}>
          {activities.map((activity) => (
            <div key={activity.id} className={styles.activityItem}>
              <div className={styles.activityIcon}>
                {activity.success
                  ? <ArrowSyncRegular className={styles.icon} style={{ color: '#0078d4' }} />
                  : <ErrorCircleRegular className={styles.icon} style={{ color: '#d13438' }} />}
              </div>
              <div className={styles.activityContent}>
                <div className={styles.activityTop}>
                  <div className={styles.activityDevice}>{activity.device}</div>
                  <div className={styles.activityMessage}>
                    {activity.success
                      ? `${activity.recordsSynced} ${activity.dataType} synced`
                      : `Sync failed (${activity.dataType})`}
                  </div>
                </div>
                <div className={styles.activityTimeInfo}>
                  <span className={styles.activityTimestamp}>{activity.timestamp}</span>
                  <span className={styles.timeDivider}>•</span>
                  <span className={styles.activitySyncType}>{activity.method}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
