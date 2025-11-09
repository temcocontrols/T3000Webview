/**
 * Status Bar Component
 *
 * Bottom status bar showing connection info, statistics, and messages
 * Based on C++ T3000 MainFrm.cpp status bar implementation
 */

import React from 'react';
import { makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  statusBar: {
    display: 'flex',
    height: '24px',
    backgroundColor: '#f0f0f0',
    borderTop: '1px solid #d1d1d1',
    fontSize: '11px',
    fontFamily: "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
    color: '#323130',
    alignItems: 'center',
    overflow: 'hidden',
    userSelect: 'none',
  },
  pane: {
    padding: '0 8px',
    borderRight: '1px solid #d1d1d1',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  },
  rxTxPane: {
    width: '140px',
    minWidth: '140px',
  },
  connectionPane: {
    width: '200px',
    minWidth: '200px',
  },
  protocolPane: {
    width: '180px',
    minWidth: '180px',
  },
  messagePane: {
    flex: 1,
    minWidth: '300px',
    borderRight: 'none',
  },
  label: {
    fontWeight: 600,
    marginRight: '4px',
  },
});

export interface StatusBarProps {
  rxCount?: number;
  txCount?: number;
  buildingName?: string;
  deviceName?: string;
  protocol?: string;
  connectionType?: string;
  message?: string;
}

/**
 * Status Bar Component
 * Shows 4 panes: RX/TX stats, Building/Device info, Protocol info, and Messages
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  rxCount = 0,
  txCount = 0,
  buildingName = '',
  deviceName = '',
  protocol = '',
  connectionType = '',
  message = 'Ready',
}) => {
  const styles = useStyles();

  // Format connection info
  const connectionInfo = React.useMemo(() => {
    if (buildingName && deviceName) {
      return `${buildingName} / ${deviceName}`;
    } else if (deviceName) {
      return deviceName;
    } else if (buildingName) {
      return buildingName;
    }
    return 'No device selected';
  }, [buildingName, deviceName]);

  // Format protocol info
  const protocolInfo = React.useMemo(() => {
    if (protocol && connectionType) {
      return `${protocol} / ${connectionType}`;
    } else if (protocol) {
      return protocol;
    } else if (connectionType) {
      return connectionType;
    }
    return 'Not connected';
  }, [protocol, connectionType]);

  return (
    <div className={styles.statusBar}>
      {/* Pane 0: RX/TX Statistics */}
      <div className={`${styles.pane} ${styles.rxTxPane}`}>
        <span className={styles.label}>RX:</span>
        <span>{rxCount}</span>
        <span style={{ marginLeft: '12px' }} className={styles.label}>TX:</span>
        <span>{txCount}</span>
      </div>

      {/* Pane 1: Building/Device Info */}
      <div className={`${styles.pane} ${styles.connectionPane}`}>
        {connectionInfo}
      </div>

      {/* Pane 2: Protocol Info (stretches) */}
      <div className={`${styles.pane} ${styles.protocolPane}`}>
        {protocolInfo}
      </div>

      {/* Pane 3: Messages */}
      <div className={`${styles.pane} ${styles.messagePane}`}>
        {message}
      </div>
    </div>
  );
};
