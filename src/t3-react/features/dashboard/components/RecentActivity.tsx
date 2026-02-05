/**
 * Recent Activity Widget
 * Shows device activity and system events
 */

import React, { useEffect, useState } from 'react';
import { Text } from '@fluentui/react-components';
import { ArrowSyncRegular, EditRegular, SettingsRegular, AlertRegular } from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import styles from './RecentActivity.module.css';

interface Activity {
  id: string;
  type: 'sync' | 'update' | 'config' | 'alarm';
  message: string;
  device: string;
  timestamp: string;
  syncType: string;
  timeAgo: string;
}

export const RecentActivity: React.FC = () => {
  const { devices } = useDeviceTreeStore();
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // Mock recent activities - in production, fetch from API
    if (devices.length > 0) {
      const now = new Date();
      const syncTypes = ['Manual Sync', 'Auto Sync', 'Network Sync', 'Scheduled Sync'];
      const mockActivities: Activity[] = devices.slice(0, 5).map((device, index) => {
        const minutesAgo = index * 3 + 2;
        const activityTime = new Date(now.getTime() - minutesAgo * 60000);

        // Format: yyyy-mm-dd hh:mm:ss AM/PM
        const year = activityTime.getFullYear();
        const month = String(activityTime.getMonth() + 1).padStart(2, '0');
        const day = String(activityTime.getDate()).padStart(2, '0');
        const hours = activityTime.getHours();
        const minutes = String(activityTime.getMinutes()).padStart(2, '0');
        const seconds = String(activityTime.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;

        const timestamp = `${year}-${month}-${day} ${String(hours12).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
        const timeAgo = minutesAgo < 60 ? `${minutesAgo} min ago` : `${Math.floor(minutesAgo / 60)} hr ago`;

        return {
          id: `activity-${index}`,
          type: 'sync',
          message: 'Synced successfully',
          device: device.nameShowOnTree,
          timestamp,
          timeAgo,
          syncType: syncTypes[index % syncTypes.length],
        };
      });
      setActivities(mockActivities);
    }
  }, [devices]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sync':
        return <ArrowSyncRegular className={styles.icon} style={{ color: '#0078d4' }} />;
      case 'update':
        return <EditRegular className={styles.icon} style={{ color: '#107c10' }} />;
      case 'config':
        return <SettingsRegular className={styles.icon} style={{ color: '#8764b8' }} />;
      case 'alarm':
        return <AlertRegular className={styles.icon} style={{ color: '#d13438' }} />;
      default:
        return <ArrowSyncRegular className={styles.icon} style={{ color: '#605e5c' }} />;
    }
  };

  return (
    <div className={styles.container}>
      {activities.length === 0 ? (
        <div className={styles.emptyState}>
          <Text className={styles.emptyText}>No recent activity</Text>
        </div>
      ) : (
        <div className={styles.activityList}>
          {activities.map((activity) => (
            <div key={activity.id} className={styles.activityItem}>
              <div className={styles.activityIcon}>{getActivityIcon(activity.type)}</div>
              <div className={styles.activityContent}>
                <div className={styles.activityTop}>
                  <div className={styles.activityDevice}>{activity.device}</div>
                  <div className={styles.activityMessage}>{activity.message}</div>
                </div>
                <div className={styles.activityTimeInfo}>
                  <span className={styles.activityTimestamp}>{activity.timestamp}</span>
                  <span className={styles.timeDivider}>•</span>
                  <span className={styles.activityTime}>{activity.timeAgo}</span>
                  <span className={styles.timeDivider}>•</span>
                  <span className={styles.activitySyncType}>{activity.syncType}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
