/**
 * Quick Access Widget
 * Navigation buttons to all main sections, grouped by category
 */

import React from 'react';
import { Button, Text } from '@fluentui/react-components';
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
}

interface CategoryGroup {
  title: string;
  links: QuickLink[];
}

export const QuickAccess: React.FC = () => {
  const navigate = useNavigate();

  const categories: CategoryGroup[] = [
    {
      title: 'Data Points',
      links: [
        { label: 'Inputs', path: '/t3000/inputs', icon: <WrenchRegular />, color: '#0078d4' },
        { label: 'Outputs', path: '/t3000/outputs', icon: <OptionsRegular />, color: '#107c10' },
        { label: 'Variables', path: '/t3000/variables', icon: <CircleMultipleConcentricRegular />, color: '#8764b8' },
      ],
    },
    {
      title: 'Control & Automation',
      links: [
        { label: 'Programs', path: '/t3000/programs', icon: <DeveloperBoardRegular />, color: '#d13438' },
        { label: 'PID Loops', path: '/t3000/pidloops', icon: <FlowRegular />, color: '#f7630c' },
        { label: 'Schedules', path: '/t3000/schedules', icon: <CalendarRegular />, color: '#00a4a4' },
        { label: 'Holidays', path: '/t3000/holidays', icon: <CalendarDateRegular />, color: '#8a8886' },
      ],
    },
    {
      title: 'Visualization',
      links: [
        { label: 'Graphics', path: '/t3000/graphics', icon: <ImageRegular />, color: '#5c2d91' },
        { label: 'Trends', path: '/t3000/trendlogs', icon: <ChartMultipleRegular />, color: '#0078d4' },
        { label: 'Alarms', path: '/t3000/alarms', icon: <AlertRegular />, color: '#d13438' },
      ],
    },
  ];

  return (
    <div className={styles.container}>
      {categories.map((category) => (
        <div key={category.title} className={styles.category}>
          <Text className={styles.categoryTitle}>{category.title}</Text>
          <div className={styles.buttonGroup}>
            {category.links.map((link) => (
              <Button
                key={link.path}
                appearance="subtle"
                className={styles.quickButton}
                onClick={() => navigate(link.path)}
                icon={React.cloneElement(link.icon, { style: { color: link.color } })}
              >
                {link.label}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
