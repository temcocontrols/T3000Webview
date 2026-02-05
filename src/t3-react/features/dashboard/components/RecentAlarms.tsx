/**
 * Recent Alarms Widget
 * Shows latest alarm notifications
 */

import React from 'react';
import { Text, Button } from '@fluentui/react-components';
import { ErrorCircleRegular, WarningRegular, InfoRegular, CheckmarkCircleRegular } from '@fluentui/react-icons';
import styles from './RecentAlarms.module.css';

interface Alarm {
  id: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  device: string;
  timestamp: string;
}

export const RecentAlarms: React.FC = () => {
  // Mock data - replace with API call
  const alarms: Alarm[] = [
    // {
    //   id: '1',
    //   severity: 'high',
    //   message: 'Temperature High - Room 301',
    //   device: 'AHU-3',
    //   timestamp: '2 min ago',
    // },
    // {
    //   id: '2',
    //   severity: 'medium',
    //   message: 'Low Pressure - Zone B',
    //   device: 'VAV-12',
    //   timestamp: '5 min ago',
    // },
  ];

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <ErrorCircleRegular style={{ color: '#d13438', fontSize: '16px' }} />;
      case 'medium':
        return <WarningRegular style={{ color: '#f7630c', fontSize: '16px' }} />;
      case 'low':
        return <InfoRegular style={{ color: '#ffc83d', fontSize: '16px' }} />;
      default:
        return <InfoRegular style={{ color: '#a19f9d', fontSize: '16px' }} />;
    }
  };

  return (
    <div className={styles.container}>
      {alarms.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <CheckmarkCircleRegular style={{ fontSize: '32px', color: '#107c10' }} />
          </div>
          <Text className={styles.emptyText}>No active alarms</Text>
          <Text className={styles.emptySubtext}>System is running normally</Text>
        </div>
      ) : (
        <>
          <div className={styles.alarmList}>
            {alarms.map((alarm) => (
              <div key={alarm.id} className={styles.alarmItem}>
                <div className={styles.alarmIcon}>{getSeverityIcon(alarm.severity)}</div>
                <div className={styles.alarmContent}>
                  <div className={styles.alarmMessage}>{alarm.message}</div>
                  <div className={styles.alarmMeta}>
                    {alarm.timestamp} | {alarm.device}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button
            appearance="subtle"
            className={styles.viewAllButton}
            onClick={() => (window.location.href = '/t3000/alarms')}
          >
            View All Alarms →
          </Button>
        </>
      )}
    </div>
  );
};
