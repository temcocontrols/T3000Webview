/**
 * NetworkPage Component
 *
 * Display network topology and device connections
 */

import React, { useEffect, useState } from 'react';
import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { NetworkCheckRegular, ArrowSyncRegular } from '@fluentui/react-icons';
import { LoadingSpinner, EmptyState } from '@t3-react/components';
import { useDeviceStore } from '@t3-react/store';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  toolbar: {
    padding: '16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
  },
  networkMap: {
    width: '100%',
    height: '100%',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const NetworkPage: React.FC = () => {
  const styles = useStyles();
  const devices = useDeviceStore((state) => state.devices);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      // TODO: Scan network for devices
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading network..." />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <NetworkCheckRegular />
        <span>Network Topology</span>
        <div style={{ flex: 1 }} />
        <Button
          appearance="primary"
          icon={<ArrowSyncRegular />}
          onClick={handleScan}
          disabled={scanning}
        >
          {scanning ? 'Scanning...' : 'Scan Network'}
        </Button>
      </div>

      <div className={styles.content}>
        <div className={styles.networkMap}>
          <EmptyState
            title="Network Map"
            message="Network topology visualization coming soon"
          />
        </div>
      </div>
    </div>
  );
};
