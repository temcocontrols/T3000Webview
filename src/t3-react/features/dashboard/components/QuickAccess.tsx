/**
 * Quick Access Widget
 * Aliyun-style horizontal scrollable service icons with detailed info
 */

import React from 'react';
import { Text } from '@fluentui/react-components';
import { useNavigate } from 'react-router-dom';
import {
  WrenchRegular,
  OptionsRegular,
  CircleMultipleConcentricRegular,
  DeveloperBoardRegular,
  FlowRegular,
  CalendarRegular,
  CalendarDateRegular,
  ImageRegular,
  ChartMultipleRegular,
  AlertRegular,
} from '@fluentui/react-icons';
import styles from './QuickAccess.module.css';

interface QuickLink {
  label: string;
  path: string;
  icon: React.ReactElement;
  color: string;
  count: number;
  lastSync: string;
}

export const QuickAccess: React.FC = () => {
  const navigate = useNavigate();

  const links: QuickLink[] = [
    { label: 'Inputs', path: '/t3000/inputs', icon: <WrenchRegular />, color: '#0078d4', count: 48, lastSync: '2 min ago' },
    { label: 'Outputs', path: '/t3000/outputs', icon: <OptionsRegular />, color: '#107c10', count: 32, lastSync: '2 min ago' },
    { label: 'Variables', path: '/t3000/variables', icon: <CircleMultipleConcentricRegular />, color: '#8764b8', count: 64, lastSync: '2 min ago' },
    { label: 'Programs', path: '/t3000/programs', icon: <DeveloperBoardRegular />, color: '#d13438', count: 12, lastSync: '5 min ago' },
    { label: 'PID Loops', path: '/t3000/pidloops', icon: <FlowRegular />, color: '#f7630c', count: 8, lastSync: '3 min ago' },
    { label: 'Graphics', path: '/t3000/graphics', icon: <ImageRegular />, color: '#5c2d91', count: 12, lastSync: '10 min ago' },
    { label: 'Schedules', path: '/t3000/schedules', icon: <CalendarRegular />, color: '#00a4a4', count: 15, lastSync: '1 min ago' },
    { label: 'Holidays', path: '/t3000/holidays', icon: <CalendarDateRegular />, color: '#8a8886', count: 6, lastSync: '1 hr ago' },
    { label: 'Trends', path: '/t3000/trendlogs', icon: <ChartMultipleRegular />, color: '#0078d4', count: 24, lastSync: '1 min ago' },
    { label: 'Alarms', path: '/t3000/alarms', icon: <AlertRegular />, color: '#d13438', count: 0, lastSync: 'Just now' },
  ];

  return (
    <div className={styles.container}>
      {links.map((link) => (
        <button
          key={link.path}
          className={styles.serviceCard}
          onClick={() => navigate(link.path)}
        >
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper}>
              {React.cloneElement(link.icon, { className: styles.icon, style: { color: link.color } })}
            </div>
            <span className={styles.label}>{link.label}</span>
          </div>
          <Text className={styles.sync}>{link.count} items • {link.lastSync}</Text>
        </button>
      ))}
    </div>
  );
};
