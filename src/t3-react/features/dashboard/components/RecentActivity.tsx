/**
 * Recent Activity Widget
 * Shows device activity and system events
 */

import React, { useEffect, useState } from 'react';
import { Text } from '@fluentui/react-components';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import styles from './RecentActivity.module.css';

interface Activity {
  id: string;
  type: 'sync' | 'update' | 'config' | 'alarm';
  message: string;
  device: string;
  timestamp: string;
}

export const RecentActivity: React.FC = () => {
  const { devices } = useDeviceTreeStore();
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // Mock recent activities - in production, fetch from API
    if (devices.length > 0) {
      const mockActivities: Activity[] = devices.slice(0, 5).map((device, index) => ({
        id: `activity-${index}`,
        type: 'sync',
        message: 'Synced successfully',
        device: device.nameShowOnTree,
        timestamp: `${index * 3 + 2} min ago`,
      }));
      setActivities(mockActivities);
    }
  }, [devices]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sync':
        return '🔄';
      case 'update':
        return '📝';
      case 'config':
        return '⚙️';
      case 'alarm':
        return '🔔';
      default:
        return '📌';
    }
  };

  return (
    <div className={styles.container}>
      {activities.length === 0 ? (
        <div className={styles.empty}>
          <Text className={styles.emptyText}>No recent activity</Text>
        </div>
      ) : (
        <div className={styles.activityList}>
          {activities.map((activity) => (
            <div key={activity.id} className={styles.activityItem}>
              <div className={styles.activityIcon}>{getActivityIcon(activity.type)}</div>
              <div className={styles.activityContent}>
                <div className={styles.activityDevice}>{activity.device}</div>
                <div className={styles.activityMessage}>{activity.message}</div>
              </div>
              <div className={styles.activityTime}>{activity.timestamp}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
