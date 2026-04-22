/**
 * Recent Activity Widget
 * Shows real sync activity from DATA_SYNC_METADATA via /api/sync-status
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Text, Spinner } from '@fluentui/react-components';
import { CheckmarkCircleRegular, DismissCircleRegular } from '@fluentui/react-icons';

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

const DATA_TYPES = ['inputs', 'outputs', 'variables', 'trendlogs'];

// ── MOCK: set to true to preview activity list styling ──
const USE_MOCK_ACTIVITY = true;

const MOCK_ACTIVITIES: Activity[] = [
  { id: 'm1', device: 'Fandu144-BB-Test487', dataType: 'trendlogs',  timestamp: new Date(Date.now() - 2 * 60_000).toISOString(),   recordsSynced: 48,  success: true,  method: 'ffi' },
  { id: 'm2', device: 'Fandu144-BB-Test487', dataType: 'inputs',     timestamp: new Date(Date.now() - 5 * 60_000).toISOString(),   recordsSynced: 16,  success: true,  method: 'ffi' },
  { id: 'm3', device: 'OfficeUnit-CC-001',   dataType: 'outputs',    timestamp: new Date(Date.now() - 11 * 60_000).toISOString(),  recordsSynced: 8,   success: true,  method: 'ffi' },
  { id: 'm4', device: 'LabStation-AA-022',   dataType: 'trendlogs',  timestamp: new Date(Date.now() - 18 * 60_000).toISOString(),  recordsSynced: 0,   success: false, method: 'ffi' },
  { id: 'm5', device: 'Fandu144-BB-Test487', dataType: 'variables',  timestamp: new Date(Date.now() - 25 * 60_000).toISOString(),  recordsSynced: 32,  success: true,  method: 'ffi' },
  { id: 'm6', device: 'OfficeUnit-CC-001',   dataType: 'inputs',     timestamp: new Date(Date.now() - 42 * 60_000).toISOString(),  recordsSynced: 16,  success: true,  method: 'ffi' },
  { id: 'm7', device: 'LabStation-AA-022',   dataType: 'outputs',    timestamp: new Date(Date.now() - 58 * 60_000).toISOString(),  recordsSynced: 12,  success: true,  method: 'ffi' },
  { id: 'm8', device: 'Fandu144-BB-Test487', dataType: 'trendlogs',  timestamp: new Date(Date.now() - 75 * 60_000).toISOString(),  recordsSynced: 48,  success: true,  method: 'ffi' },
];

export const RecentActivity: React.FC<RecentActivityProps> = ({ onSummary }) => {
  const { devices } = useDeviceTreeStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    if (USE_MOCK_ACTIVITY) {
      setActivities(MOCK_ACTIVITIES);
      onSummary?.({ ok: MOCK_ACTIVITIES.filter(a => a.success).length, fail: MOCK_ACTIVITIES.filter(a => !a.success).length, total: MOCK_ACTIVITIES.length });
      setLoading(false);
      return;
    }

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
      onSummary?.({ ok: valid.filter(a => a.success).length, fail: valid.filter(a => !a.success).length, total: valid.length });
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
        <>
          <div className={styles.activityList}>
          {activities.map((activity) => (
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
                {USE_MOCK_ACTIVITY
                  ? (() => { const diff = Math.floor((Date.now() - new Date(activity.timestamp).getTime()) / 60_000); return diff < 1 ? 'just now' : `${diff} min ago`; })()
                  : activity.timestamp}
              </div>
            </div>
          ))}
          </div>
        </>
      )}
    </div>
  );
};
