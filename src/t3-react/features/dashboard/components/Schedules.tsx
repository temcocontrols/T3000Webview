/**
 * Schedules Widget
 * Shows upcoming scheduled events
 */

import React from 'react';
import { Text } from '@fluentui/react-components';
import { CalendarRegular, ClockRegular } from '@fluentui/react-icons';
import styles from './Schedules.module.css';

export const Schedules: React.FC = () => {
  // Mock data - replace with API call
  const schedules = [
    { id: '1', name: 'HVAC Start', time: '06:00 AM', status: 'active' },
    { id: '2', name: 'Lighting On', time: '07:00 AM', status: 'active' },
    { id: '3', name: 'Peak Hours', time: '09:00 AM', status: 'upcoming' },
    { id: '4', name: 'HVAC Stop', time: '06:00 PM', status: 'upcoming' },
    { id: '5', name: 'Lighting Off', time: '07:00 PM', status: 'upcoming' },
    { id: '6', name: 'Night Mode', time: '10:00 PM', status: 'upcoming' },
    { id: '7', name: 'Backup Sys', time: '11:00 PM', status: 'upcoming' },
    { id: '8', name: 'Chiller Start', time: '05:30 AM', status: 'upcoming' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#107c10';
      case 'upcoming':
        return '#0078d4';
      default:
        return '#8a8886';
    }
  };

  return (
    <div className={styles.container}>
      {schedules.length === 0 ? (
        <div className={styles.empty}>
          <CalendarRegular style={{ fontSize: '32px', color: '#c8c6c4' }} />
          <Text className={styles.emptyText}>No schedules</Text>
        </div>
      ) : (
        <div className={styles.scheduleList}>
          {schedules.map((schedule) => (
            <div key={schedule.id} className={styles.scheduleItem}>
              <div className={styles.scheduleIcon}>
                <ClockRegular style={{ fontSize: '12px', color: getStatusColor(schedule.status) }} />
              </div>
              <div className={styles.scheduleInfo}>
                <div className={styles.scheduleName}>{schedule.name}</div>
                <div className={styles.scheduleTime}>{schedule.time}</div>
              </div>
              <div
                className={styles.statusDot}
                style={{ backgroundColor: getStatusColor(schedule.status) }}
              ></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
