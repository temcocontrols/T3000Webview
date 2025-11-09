/**
 * Dashboard Page
 *
 * Main dashboard view for T3000 application
 */

import React from 'react';
import { makeStyles, Title1, Card, Text } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    padding: '24px',
    height: '100%',
    overflowY: 'auto',
  },
  header: {
    marginBottom: '20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginTop: '20px',
  },
  card: {
    padding: '20px',
  },
});

/**
 * Dashboard Page Component
 */
export const DashboardPage: React.FC = () => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title1>Dashboard</Title1>
        <Text>Welcome to T3000 Building Automation System</Text>
      </div>

      <div className={styles.grid}>
        <Card className={styles.card}>
          <Title1 as="h3">System Status</Title1>
          <Text>All systems operational</Text>
        </Card>

        <Card className={styles.card}>
          <Title1 as="h3">Active Alarms</Title1>
          <Text>No active alarms</Text>
        </Card>

        <Card className={styles.card}>
          <Title1 as="h3">Connected Devices</Title1>
          <Text>0 devices connected</Text>
        </Card>

        <Card className={styles.card}>
          <Title1 as="h3">Recent Activity</Title1>
          <Text>No recent activity</Text>
        </Card>
      </div>
    </div>
  );
};
