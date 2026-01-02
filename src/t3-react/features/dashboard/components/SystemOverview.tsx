/**
 * System Overview Widget
 * Shows key metrics: devices, alarms, points, graphics
 */

import React, { useEffect, useState } from 'react';
import { Text, Spinner } from '@fluentui/react-components';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import styles from './SystemOverview.module.css';

export const SystemOverview: React.FC = () => {
  const { devices, deviceStatuses } = useDeviceTreeStore();
  const [stats, setStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    totalPoints: 0,
    activeAlarms: 0,
    graphics: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateStats = async () => {
      const onlineCount = Array.from(deviceStatuses.values()).filter(
        (status) => status === 'online'
      ).length;

      // Estimate total points (this would come from API in production)
      const estimatedPoints = devices.length * 35; // Average points per device

      setStats({
        totalDevices: devices.length,
        onlineDevices: onlineCount,
        offlineDevices: devices.length - onlineCount,
        totalPoints: estimatedPoints,
        activeAlarms: 0, // TODO: Fetch from alarms API
        graphics: 12, // TODO: Fetch from graphics API
      });

      setLoading(false);
    };

    calculateStats();
  }, [devices, deviceStatuses]);

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
        <div className={styles.cardIcon} style={{ backgroundColor: '#0078d4' }}>
          <span>📱</span>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.cardValue}>{stats.totalDevices}</div>
          <div className={styles.cardLabel}>Devices</div>
          <div className={styles.cardDetail}>
            <span className={styles.online}>● {stats.onlineDevices} Online</span>
            {stats.offlineDevices > 0 && (
              <span className={styles.offline}> • {stats.offlineDevices} Offline</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardIcon} style={{ backgroundColor: '#d13438' }}>
          <span>🔔</span>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.cardValue}>{stats.activeAlarms}</div>
          <div className={styles.cardLabel}>Active Alarms</div>
          <div className={styles.cardDetail}>
            {stats.activeAlarms === 0 ? (
              <span className={styles.success}>✓ All Clear</span>
            ) : (
              <span className={styles.warning}>⚠️ Attention Needed</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardIcon} style={{ backgroundColor: '#107c10' }}>
          <span>📊</span>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.cardValue}>{stats.totalPoints}</div>
          <div className={styles.cardLabel}>Total Points</div>
          <div className={styles.cardDetail}>
            <span className={styles.muted}>All Types</span>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardIcon} style={{ backgroundColor: '#8764b8' }}>
          <span>🖼️</span>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.cardValue}>{stats.graphics}</div>
          <div className={styles.cardLabel}>Graphics</div>
          <div className={styles.cardDetail}>
            <span className={styles.link}>View All →</span>
          </div>
        </div>
      </div>
    </div>
  );
};
