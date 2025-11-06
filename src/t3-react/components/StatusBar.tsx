/**
 * StatusBar Component
 *
 * Bottom status bar showing connection status, device info, etc.
 */

import React from 'react';
import { makeStyles, tokens, Badge } from '@fluentui/react-components';
import { useDeviceData } from '@t3-react/hooks';
import { useAuthStore } from '@t3-react/store';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 16px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    minHeight: '28px',
  },
  section: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  divider: {
    width: '1px',
    height: '16px',
    backgroundColor: tokens.colorNeutralStroke2,
  },
});

export const StatusBar: React.FC = () => {
  const styles = useStyles();

  const { selectedDevice, onlineCount, offlineCount, deviceCount } = useDeviceData();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        {selectedDevice && (
          <>
            <div className={styles.item}>
              <strong>Device:</strong> {selectedDevice.label}
            </div>
            <div className={styles.divider} />
          </>
        )}
        <div className={styles.item}>
          <strong>Devices:</strong> {deviceCount}
        </div>
        <div className={styles.item}>
          <Badge appearance="filled" color="success">
            {onlineCount} Online
          </Badge>
        </div>
        {offlineCount > 0 && (
          <div className={styles.item}>
            <Badge appearance="filled" color="danger">
              {offlineCount} Offline
            </Badge>
          </div>
        )}
      </div>

      <div className={styles.section}>
        {isAuthenticated && user && (
          <>
            <div className={styles.item}>
              <strong>User:</strong> {user.username}
            </div>
            <div className={styles.divider} />
          </>
        )}
        <div className={styles.item}>
          <Badge appearance="outline" color="brand">
            Connected
          </Badge>
        </div>
      </div>
    </div>
  );
};
