/**
 * Dashboard Page
 *
 * Main dashboard view for T3000 Building Automation System
 * Features: System overview, alarms, health metrics, quick access, recent activity
 */

import React from 'react';
import { Text } from '@fluentui/react-components';
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
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <Text className={styles.subtitle}>
          Welcome to T3000 Building Automation System
        </Text>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {/* System Overview - Full Width */}
        <div className={styles.overviewSection}>
          <SystemOverview />
        </div>

        {/* Main Grid - Two Columns */}
        <div className={styles.grid}>
          {/* Recent Alarms */}
          <DashboardWidget title="Recent Alarms" size="medium">
            <RecentAlarms />
          </DashboardWidget>

          {/* System Health */}
          <DashboardWidget title="System Health" size="medium">
            <SystemHealth />
          </DashboardWidget>

          {/* Recent Activity */}
          <DashboardWidget title="Recent Activity" size="medium">
            <RecentActivity />
          </DashboardWidget>

          {/* Placeholder for future widgets */}
          <DashboardWidget title="Network Status" size="medium">
            <div style={{ padding: '32px', textAlign: 'center', color: '#8a8886' }}>
              <Text>Coming Soon</Text>
            </div>
          </DashboardWidget>
        </div>

        {/* Quick Access - Full Width */}
        <DashboardWidget title="Quick Access" size="full">
          <QuickAccess />
        </DashboardWidget>
      </div>
    </div>
  );
};
