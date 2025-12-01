/**
 * Dashboard Page
 *
 * Main dashboard view for T3000 application
 */

import React from 'react';
import { makeStyles, Title1, Card, Text, Button } from '@fluentui/react-components';
import { useStatusBarStore } from '@t3-react/store';

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
  demoSection: {
    marginTop: '40px',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    flexWrap: 'wrap',
  },
});

/**
 * Dashboard Page Component
 */
export const DashboardPage: React.FC = () => {
  const styles = useStyles();

  // Get status bar actions
  const setMessage = useStatusBarStore((state) => state.setMessage);
  const setConnection = useStatusBarStore((state) => state.setConnection);
  const setProtocol = useStatusBarStore((state) => state.setProtocol);
  const incrementRx = useStatusBarStore((state) => state.incrementRx);
  const incrementTx = useStatusBarStore((state) => state.incrementTx);
  const reset = useStatusBarStore((state) => state.reset);

  // Demo handlers
  const handleConnect = () => {
    setConnection('Main Building', 'Tstat-101');
    setProtocol('BACnet IP', '192.168.1.100');
    setMessage('Connected to device');
  };

  const handleDisconnect = () => {
    setConnection('', '');
    setProtocol('', '');
    setMessage('Disconnected');
  };

  const handleSimulateTraffic = () => {
    incrementRx();
    incrementTx();
    setMessage('Data transferred');
  };

  const handleReset = () => {
    reset();
  };

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

      {/* Demo Section for Status Bar */}
      <div className={styles.demoSection}>
        <Title1 as="h3">Status Bar Demo</Title1>
        <Text>Use these buttons to test the status bar at the bottom of the page:</Text>
        <div className={styles.buttonGroup}>
          <Button appearance="primary" onClick={handleConnect}>
            Connect to Device
          </Button>
          <Button onClick={handleDisconnect}>Disconnect</Button>
          <Button onClick={handleSimulateTraffic}>Simulate Traffic</Button>
          <Button onClick={handleReset}>Reset Status Bar</Button>
        </div>
      </div>
    </div>
  );
};
