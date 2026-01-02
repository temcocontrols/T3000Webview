/**
 * System Health Widget
 * Shows CPU, memory, and database metrics
 */

import React, { useEffect, useState } from 'react';
import { Text } from '@fluentui/react-components';
import styles from './SystemHealth.module.css';

export const SystemHealth: React.FC = () => {
  const [metrics, setMetrics] = useState({
    cpu: 45,
    memory: 32,
    database: 245, // MB
    databaseMax: 1024, // MB
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        cpu: Math.min(100, Math.max(0, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.min(100, Math.max(0, prev.memory + (Math.random() - 0.5) * 5)),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getBarColor = (value: number) => {
    if (value > 80) return '#d13438';
    if (value > 60) return '#f7630c';
    return '#107c10';
  };

  return (
    <div className={styles.container}>
      <div className={styles.metric}>
        <div className={styles.metricHeader}>
          <Text className={styles.metricLabel}>CPU Usage</Text>
          <Text className={styles.metricValue}>{Math.round(metrics.cpu)}%</Text>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${metrics.cpu}%`,
              backgroundColor: getBarColor(metrics.cpu),
            }}
          />
        </div>
      </div>

      <div className={styles.metric}>
        <div className={styles.metricHeader}>
          <Text className={styles.metricLabel}>Memory</Text>
          <Text className={styles.metricValue}>{Math.round(metrics.memory)}%</Text>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${metrics.memory}%`,
              backgroundColor: getBarColor(metrics.memory),
            }}
          />
        </div>
      </div>

      <div className={styles.metric}>
        <div className={styles.metricHeader}>
          <Text className={styles.metricLabel}>Database Size</Text>
          <Text className={styles.metricValue}>
            {metrics.database} MB / {metrics.databaseMax} MB
          </Text>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${(metrics.database / metrics.databaseMax) * 100}%`,
              backgroundColor: '#0078d4',
            }}
          />
        </div>
      </div>

      <div className={styles.statusRow}>
        <div className={styles.statusItem}>
          <span className={styles.statusDot} style={{ backgroundColor: '#107c10' }}></span>
          <Text className={styles.statusText}>API Server</Text>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusDot} style={{ backgroundColor: '#107c10' }}></span>
          <Text className={styles.statusText}>Database</Text>
        </div>
      </div>
    </div>
  );
};
