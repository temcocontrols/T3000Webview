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
        <div className={styles.cardContent}>
          <div className={styles.cardLabel}>DEVICES</div>
          <div className={styles.cardValue}>{stats.totalDevices}</div>
          <div className={styles.cardDetail}>
            {stats.onlineDevices} online • {stats.offlineDevices} offline
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.cardLabel}>ALARMS</div>
          <div className={styles.cardValue}>{stats.activeAlarms}</div>
          <div className={styles.cardDetail}>
            {stats.activeAlarms === 0 ? 'All clear' : 'Attention needed'}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.cardLabel}>POINTS</div>
          <div className={styles.cardValue}>{stats.totalPoints}</div>
          <div className={styles.cardDetail}>
            All types monitored
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.cardLabel}>GRAPHICS</div>
          <div className={styles.cardValue}>{stats.graphics}</div>
          <div className={styles.cardDetail}>
            View all →
          </div>
        </div>
      </div>
    </div>
  );
};
