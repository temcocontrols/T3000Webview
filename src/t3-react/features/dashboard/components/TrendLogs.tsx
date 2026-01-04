/**
 * Trend Logs Widget
 * Shows recent trend log data
 */

import React from 'react';
import { Text } from '@fluentui/react-components';
import styles from './TrendLogs.module.css';

export const TrendLogs: React.FC = () => {
  // Mock data - replace with API call
  const trendLogs = [
    { id: '1', name: 'Temperature - Zone A', lastUpdate: '2 min ago', points: 245 },
    { id: '2', name: 'Humidity - Main Hall', lastUpdate: '5 min ago', points: 180 },
    { id: '3', name: 'Pressure - HVAC System', lastUpdate: '8 min ago', points: 320 },
  ];

  return (
    <div className={styles.container}>
      {trendLogs.length === 0 ? (
        <div className={styles.empty}>
          <Text className={styles.emptyText}>No trend logs available</Text>
        </div>
      ) : (
        <div className={styles.logList}>
          {trendLogs.map((log) => (
            <div key={log.id} className={styles.logItem}>
              <div className={styles.logInfo}>
                <div className={styles.logName}>{log.name}</div>
                <div className={styles.logMeta}>
                  {log.points} data points • {log.lastUpdate}
                </div>
              </div>
              <div className={styles.logChart}>
                {/* Placeholder for mini chart */}
                <div className={styles.miniChart}>
                  <div className={styles.chartLine} style={{ height: '60%' }}></div>
                  <div className={styles.chartLine} style={{ height: '80%' }}></div>
                  <div className={styles.chartLine} style={{ height: '40%' }}></div>
                  <div className={styles.chartLine} style={{ height: '70%' }}></div>
                  <div className={styles.chartLine} style={{ height: '55%' }}></div>
                  <div className={styles.chartLine} style={{ height: '85%' }}></div>
                  <div className={styles.chartLine} style={{ height: '65%' }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
