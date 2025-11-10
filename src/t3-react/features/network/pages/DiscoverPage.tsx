/**
 * Discover Page
 *
 * Device discovery and scanning interface
 */

import React from 'react';
import { makeStyles, Title1, Button, Card, Text, Spinner } from '@fluentui/react-components';
import { SearchRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    padding: '24px',
    height: '100%',
    overflowY: 'auto',
  },
  header: {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    marginTop: '20px',
  },
  card: {
    padding: '20px',
    marginBottom: '16px',
  },
  scanButton: {
    minWidth: '120px',
  },
});

/**
 * Discover Page Component
 */
export const DiscoverPage: React.FC = () => {
  const styles = useStyles();
  const [scanning, setScanning] = React.useState(false);
  const [devices, setDevices] = React.useState<any[]>([]);

  const handleScan = () => {
    setScanning(true);
    // Simulate scanning
    setTimeout(() => {
      setScanning(false);
      setDevices([]);
    }, 2000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Title1>Discover Devices</Title1>
          <Text>Scan for BACnet and Modbus devices on the network</Text>
        </div>
        <Button
          className={styles.scanButton}
          appearance="primary"
          icon={<SearchRegular />}
          onClick={handleScan}
          disabled={scanning}
        >
          {scanning ? 'Scanning...' : 'Scan Network'}
        </Button>
      </div>

      <div className={styles.content}>
        {scanning && (
          <Card className={styles.card}>
            <Spinner label="Scanning for devices..." />
          </Card>
        )}

        {!scanning && devices.length === 0 && (
          <Card className={styles.card}>
            <Text>No devices found. Click "Scan Network" to discover devices.</Text>
          </Card>
        )}

        {devices.length > 0 && (
          <Card className={styles.card}>
            <Text>Found {devices.length} device(s)</Text>
          </Card>
        )}
      </div>
    </div>
  );
};
