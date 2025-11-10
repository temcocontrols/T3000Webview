/**
 * Status Bar Component
 *
 * Bottom status bar showing connection info, statistics, and messages
 * Based on C++ T3000 MainFrm.cpp status bar implementation
 */

import React from 'react';
import { makeStyles, mergeClasses, Tooltip } from '@fluentui/react-components';
import { Info16Regular } from '@fluentui/react-icons';
import type { MessageType } from '../store/statusBarStore';

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
  statusBarError: {
    backgroundColor: '#fde7e9',
  },
  statusBarSuccess: {
    backgroundColor: '#dff6dd',
  },
  statusBarWarning: {
    backgroundColor: '#fff4ce',
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
    flexShrink: 0,
  },
  connectionPane: {
    width: '200px',
    minWidth: '200px',
    flexShrink: 0,
  },
  protocolPane: {
    width: '180px',
    minWidth: '180px',
    flexShrink: 0,
  },
  messagePane: {
    flex: 1,
    minWidth: 0,
    gap: '6px',
    padding: '0 8px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  },
  messageText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  infoIcon: {
    cursor: 'help',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  messagePaneError: {
    color: '#a4262c',
    fontWeight: 600,
  },
  messagePaneSuccess: {
    color: '#0e700e',
    fontWeight: 600,
  },
  messagePaneWarning: {
    color: '#8a5d00',
    fontWeight: 600,
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
  messageType?: MessageType;
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
  messageType = 'info',
}) => {
  const styles = useStyles();

  // Check if message is long (more than 100 characters)
  const isLongMessage = message.length > 100;

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

  // Get message pane class based on message type
  const messagePaneClass = React.useMemo(() => {
    switch (messageType) {
      case 'error':
        return mergeClasses(styles.messagePane, styles.messagePaneError);
      case 'success':
        return mergeClasses(styles.messagePane, styles.messagePaneSuccess);
      case 'warning':
        return mergeClasses(styles.messagePane, styles.messagePaneWarning);
      default:
        return styles.messagePane;
    }
  }, [messageType, styles]);

  // Get status bar class based on message type (for full-width background)
  const statusBarClass = React.useMemo(() => {
    switch (messageType) {
      case 'error':
        return mergeClasses(styles.statusBar, styles.statusBarError);
      case 'success':
        return mergeClasses(styles.statusBar, styles.statusBarSuccess);
      case 'warning':
        return mergeClasses(styles.statusBar, styles.statusBarWarning);
      default:
        return styles.statusBar;
    }
  }, [messageType, styles]);

  return (
    <div className={statusBarClass}>
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

      {/* Pane 3: Messages - colored based on type */}
      <div className={messagePaneClass}>
        <span className={styles.messageText}>{message}</span>
        {isLongMessage && (
          <Tooltip
            content={message}
            relationship="description"
            positioning="above-start"
          >
            <span className={styles.infoIcon}>
              <Info16Regular />
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
};
