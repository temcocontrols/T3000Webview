/**
 * HomePage Component
 *
 * Dashboard/home page showing overview and quick access
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  Button,
  makeStyles,
} from '@fluentui/react-components';
import {
  DataUsageRegular,
  ChartMultipleRegular,
  SettingsRegular,
  ClockRegular,
  AlertRegular,
  DeviceDesktopRegular,
} from '@fluentui/react-icons';
import { useDeviceData, useGlobalMessage } from '@t3-react/hooks';
import { StatusBar } from '@t3-react/components';

const useStyles = makeStyles({
  container: {
    padding: 'var(--t3-spacing-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--t3-spacing-lg)',
  },
  welcome: {
    fontSize: 'var(--t3-font-size-h1)',
    fontWeight: 'var(--t3-font-weight-semibold)',
    color: 'var(--t3-color-text)',
  },
  subtitle: {
    fontSize: 'var(--t3-font-size-h3)',
    color: 'var(--t3-color-text-secondary)',
    marginTop: 'var(--t3-spacing-sm)',
  },
  quickAccess: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 'var(--t3-spacing-md)',
  },
  card: {
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    backgroundColor: 'var(--t3-color-surface)',
    border: '1px solid var(--t3-color-border)',
    borderRadius: 'var(--t3-border-radius)',
    boxShadow: 'var(--t3-shadow-card)',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: 'var(--t3-shadow-card-hover)',
      borderColor: 'var(--t3-color-primary)',
    },
  },
  cardContent: {
    padding: 'var(--t3-spacing-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--t3-spacing-sm)',
  },
  cardIcon: {
    fontSize: '48px',
    color: 'var(--t3-color-primary)',
  },
  cardTitle: {
    fontSize: 'var(--t3-font-size-h3)',
    fontWeight: 'var(--t3-font-weight-semibold)',
    color: 'var(--t3-color-text)',
  },
  cardDescription: {
    fontSize: 'var(--t3-font-size-body)',
    color: 'var(--t3-color-text-secondary)',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 'var(--t3-spacing-md)',
  },
  statCard: {
    padding: 'var(--t3-spacing-md)',
    textAlign: 'center',
    backgroundColor: 'var(--t3-color-surface)',
    border: '1px solid var(--t3-color-border)',
    borderRadius: 'var(--t3-border-radius)',
    boxShadow: 'var(--t3-shadow-card)',
  },
  statValue: {
    fontSize: 'var(--t3-font-size-h1)',
    fontWeight: 'var(--t3-font-weight-bold)',
    color: 'var(--t3-color-primary)',
  },
  statLabel: {
    fontSize: 'var(--t3-font-size-body)',
    color: 'var(--t3-color-text-secondary)',
    marginTop: 'var(--t3-spacing-xs)',
  },
  demoButtons: {
    padding: 'var(--t3-spacing-md)',
    display: 'flex',
    gap: 'var(--t3-spacing-sm)',
    flexWrap: 'wrap',
  },
  statOnline: {
    fontSize: 'var(--t3-font-size-h1)',
    fontWeight: 'var(--t3-font-weight-bold)',
    color: 'var(--t3-color-success)',
  },
  statOffline: {
    fontSize: 'var(--t3-font-size-h1)',
    fontWeight: 'var(--t3-font-weight-bold)',
    color: 'var(--t3-color-error)',
  },
});

export const HomePage: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { selectedDevice, deviceCount, onlineCount, offlineCount } = useDeviceData();
  const { showInfo, showWarning, showError, showSuccess } = useGlobalMessage();

  console.log('🏠 HomePage rendering...', {
    selectedDevice,
    deviceCount,
    onlineCount,
    offlineCount,
  });

  const quickAccessItems = [
    {
      title: 'Inputs',
      description: 'View and edit analog/digital inputs',
      icon: <DataUsageRegular className={styles.cardIcon} />,
      path: '/t3000/inputs',
    },
    {
      title: 'Outputs',
      description: 'View and edit analog/digital outputs',
      icon: <DataUsageRegular className={styles.cardIcon} />,
      path: '/t3000/outputs',
    },
    {
      title: 'Variables',
      description: 'View and edit variables',
      icon: <DataUsageRegular className={styles.cardIcon} />,
      path: '/t3000/variables',
    },
    {
      title: 'Programs',
      description: 'Edit BACnet programs',
      icon: <SettingsRegular className={styles.cardIcon} />,
      path: '/t3000/programs',
    },
    {
      title: 'Trend Logs',
      description: 'View and analyze trend data',
      icon: <ChartMultipleRegular className={styles.cardIcon} />,
      path: '/t3000/trendlogs',
    },
    {
      title: 'Alarms',
      description: 'Monitor system alarms',
      icon: <AlertRegular className={styles.cardIcon} />,
      path: '/t3000/alarms',
    },
  ];

  return (
    <>
      <div className={styles.container}>
        <div>
          <div className={styles.welcome}>Welcome to T3000</div>
          <div className={styles.subtitle}>
            {selectedDevice
              ? `Connected to ${(selectedDevice as any).label || selectedDevice.name}`
              : 'Select a device from the tree to get started'}
          </div>
        </div>

        {/* Demo: Global Message Test Buttons */}
        <Card className={styles.card}>
          <CardHeader
            header={<div>Global Message Demo</div>}
            description={<div>Test the global message bar at the top</div>}
          />
          <div className={styles.demoButtons}>
            <Button
              appearance="primary"
              onClick={() => showInfo('This is an informational message')}
            >
              Show Info
            </Button>
            <Button
              onClick={() => showWarning('Warning: Check system configuration', 'System Warning')}
            >
              Show Warning
            </Button>
            <Button
              onClick={() => showError('Error: Connection failed', 'Connection Error')}
            >
              Show Error
            </Button>
            <Button
              onClick={() => showSuccess('Successfully saved changes!', 'Success')}
            >
              Show Success
            </Button>
          </div>
        </Card>

        {/* Statistics */}
        <div className={styles.stats}>
          <Card className={styles.statCard}>
            <div className={styles.statValue}>{deviceCount}</div>
            <div className={styles.statLabel}>Total Devices</div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statOnline}>
              {onlineCount}
            </div>
            <div className={styles.statLabel}>Online Devices</div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statOffline}>
              {offlineCount}
            </div>
            <div className={styles.statLabel}>Offline Devices</div>
          </Card>
        </div>

        {/* Quick Access */}
        <div>
          <h2>Quick Access</h2>
          <div className={styles.quickAccess}>
            {quickAccessItems.map((item) => (
              <Card
                key={item.path}
                className={styles.card}
                onClick={() => navigate(item.path)}
              >
                <div className={styles.cardContent}>
                  {item.icon}
                  <div className={styles.cardTitle}>{item.title}</div>
                  <div className={styles.cardDescription}>{item.description}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <StatusBar />
    </>
  );
};
