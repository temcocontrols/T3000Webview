/**
 * Recent Activity Widget
 * Shows real sync activity from DATA_SYNC_METADATA via /api/sync-status
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Text, Spinner } from '@fluentui/react-components';
import { CheckmarkCircleRegular, DismissCircleRegular, InfoRegular } from '@fluentui/react-icons';

export interface ActivitySummary { ok: number; fail: number; total: number; }
export interface RecentActivityProps { onSummary?: (s: ActivitySummary) => void; }
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

export const RecentActivity: React.FC<RecentActivityProps> = ({ onSummary }) => {
  const { devices } = useDeviceTreeStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (devices.length === 0) {
      setActivities([]);
      onSummary?.({ ok: 0, fail: 0, total: 0 });
      setNotice('No devices available for sync activity yet');
      setLoading(false);
      return;
    }

    try {
      // One request per device returns all data types, then flatten
      const requests = devices.slice(0, 6).map(async (dev) => {
        try {
          const r = await fetch(`${API_BASE_URL}/api/sync-status/${dev.serialNumber}`);
          if (!r.ok) return { ok: false, items: [] as Activity[] };
          const data: SyncStatus[] = await r.json();
          const items = data.map((s) => ({
            id: `${dev.serialNumber}-${s.dataType}`,
            device: dev.nameShowOnTree,
            dataType: s.dataType,
            timestamp: s.syncTimeFmt,
            recordsSynced: s.recordsSynced,
            success: s.success,
            method: s.syncMethod,
          } as Activity));
          return { ok: true, items };
        } catch {
          return { ok: false, items: [] as Activity[] };
        }
      });

      const settled = await Promise.all(requests);
      const anyFailure = settled.some((x) => !x.ok);
      const valid = settled
        .flatMap((x) => x.items)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 10);

      if (valid.length > 0) {
        setActivities(valid);
        onSummary?.({ ok: valid.filter(a => a.success).length, fail: valid.filter(a => !a.success).length, total: valid.length });
        setNotice(anyFailure ? 'Partial refresh: some devices did not return activity' : null);
      } else {
        if (activities.length > 0) {
          // Keep last known real data; do not replace with mock.
          setNotice('Unable to refresh right now; showing last known activity');
          onSummary?.({ ok: activities.filter(a => a.success).length, fail: activities.filter(a => !a.success).length, total: activities.length });
        } else {
          setActivities([]);
          onSummary?.({ ok: 0, fail: 0, total: 0 });
          setNotice(anyFailure ? 'Unable to load recent sync activity' : 'No recent sync activity');
        }
      }
    } catch {
      if (activities.length > 0) {
        setNotice('Unable to refresh right now; showing last known activity');
        onSummary?.({ ok: activities.filter(a => a.success).length, fail: activities.filter(a => !a.success).length, total: activities.length });
      } else {
        setActivities([]);
        onSummary?.({ ok: 0, fail: 0, total: 0 });
        setNotice('Unable to load recent sync activity');
      }
    } finally {
      setLoading(false);
    }
  }, [devices, activities, onSummary]);

  useEffect(() => {
    fetchActivities();
    const id = setInterval(fetchActivities, 60_000);
    return () => clearInterval(id);
  }, [fetchActivities]);

  if (loading) {
    return (
      <div className={`${styles.container} ${styles.loadingState}`}>
        <Spinner size="small" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {notice && (
        <div className={styles.infoBar}>
          <InfoRegular className={styles.infoBarIcon} />
          <Text className={styles.infoBarText}>{notice}</Text>
        </div>
      )}
      {activities.length === 0 ? (
        <div className={styles.emptyState}>
          {!notice && <Text className={styles.emptyText}>No recent sync activity</Text>}
        </div>
      ) : (
        <>
          <div className={styles.activityList}>
          {activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className={styles.activityItem}>
              <div className={styles.activityStatus}>
                {activity.success
                  ? <CheckmarkCircleRegular style={{ fontSize: '14px', color: '#107c10' }} />
                  : <DismissCircleRegular style={{ fontSize: '14px', color: '#d13438' }} />}
              </div>
              <div className={styles.activityDevice}>{activity.device}</div>
              <div className={styles.activityDataType}>{activity.dataType}</div>
              <div className={styles.activityMessage}>
                {activity.success
                  ? `${activity.recordsSynced} records`
                  : 'Sync failed'}
              </div>
              <div className={styles.activityTimestamp}>
                {activity.timestamp}
              </div>
            </div>
          ))}
          </div>
        </>
      )}
    </div>
  );
};
