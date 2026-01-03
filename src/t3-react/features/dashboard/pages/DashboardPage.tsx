/**
 * Dashboard Page
 *
 * Main dashboard view for T3000 Building Automation System
 * Features: System overview, alarms, health metrics, quick access, recent activity
 */

import React, { useEffect, useState } from 'react';
import { Text } from '@fluentui/react-components';
import { InfoLabel } from '@fluentui/react-components';
import { GaugeRegular } from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import {
  DashboardWidget,
  SystemOverview,
  RecentAlarms,
  SystemHealth,
  QuickAccess,
  RecentActivity,
} from '../components';
import styles from './DashboardPage.module.css';

/**
 * Dashboard Page Component
 */
export const DashboardPage: React.FC = () => {
  const { devices, deviceStatuses, lastSyncTime } = useDeviceTreeStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const onlineDevices = Array.from(deviceStatuses.values()).filter(
    (status) => status === 'online'
  ).length;

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeSince = (date: Date | null) => {
    if (!date) return 'Not synced';
    const seconds = Math.floor((currentTime.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hr ago`;
  };

  return (
    <div className={styles.container}>
      {/* Info Bar Header */}
      <div className={styles.infoBar}>
        <div className={styles.infoBarLeft}>
          <div className={styles.infoBarIcon}>
            <GaugeRegular />
          </div>
          <div className={styles.infoBarContent}>
            <h1 className={styles.infoBarTitle}>T3000 Building Automation System</h1>
            <Text className={styles.infoBarDescription}>
              Real-time monitoring and control dashboard • {devices.length} devices configured
              {onlineDevices > 0 && ` • ${onlineDevices} online`}
              {deviceStatuses.size > 0 && ` • Last sync: ${getTimeSince(lastSyncTime)}`}
            </Text>
          </div>
        </div>
        <div className={styles.infoBarRight}>
          <div className={styles.infoBarStat}>
            <span className={styles.infoBarStatLabel}>System Status</span>
            <span className={styles.infoBarStatValue}>
              <span className={styles.statusDot}></span>
              Operational
            </span>
          </div>
          <div className={styles.infoBarStat}>
            <span className={styles.infoBarStatLabel}>Current Time</span>
            <span className={styles.infoBarStatValue}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {/* System Status Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>System Status</h2>
          <SystemOverview />
        </div>

        {/* Monitoring Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Monitoring</h2>
          <div className={styles.monitoringGrid}>
            <DashboardWidget title="Recent Alarms" size="medium">
              <RecentAlarms />
            </DashboardWidget>

            <DashboardWidget title="Recent Activity" size="medium">
              <RecentActivity />
            </DashboardWidget>
          </div>
        </div>

        {/* Quick Access Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Quick Access</h2>
          <QuickAccess />
        </div>
      </div>
    </div>
  );
};
