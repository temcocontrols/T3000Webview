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
  tokens,
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
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  welcome: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  subtitle: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
    marginTop: '8px',
  },
  quickAccess: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  card: {
    cursor: 'pointer',
    transition: 'transform 0.2s',
    '&:hover': {
      transform: 'scale(1.02)',
      boxShadow: tokens.shadow8,
    },
  },
  cardContent: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cardIcon: {
    fontSize: '48px',
    color: tokens.colorBrandForeground1,
  },
  cardTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  cardDescription: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
  statCard: {
    padding: '16px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorBrandForeground1,
  },
  statLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    marginTop: '4px',
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
              ? `Connected to ${selectedDevice.label}`
              : 'Select a device from the tree to get started'}
          </div>
        </div>

        {/* Demo: Global Message Test Buttons */}
        <Card>
          <CardHeader
            header={<div>Global Message Demo</div>}
            description={<div>Test the global message bar at the top</div>}
          />
          <div style={{ padding: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
            <div className={styles.statValue} style={{ color: 'green' }}>
              {onlineCount}
            </div>
            <div className={styles.statLabel}>Online</div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statValue} style={{ color: 'red' }}>
              {offlineCount}
            </div>
            <div className={styles.statLabel}>Offline</div>
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
