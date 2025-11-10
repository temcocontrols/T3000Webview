/**
 * GlobalMessageBar Component
 *
 * Displays global information messages at the top of the application
 * Supports different types: info, warning, error, success
 */

import React from 'react';
import {
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  MessageBarActions,
  Button,
  makeStyles,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';

export interface GlobalMessage {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  message: string;
  dismissable?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface GlobalMessageBarProps {
  message: GlobalMessage | null;
  onDismiss?: () => void;
}

const useStyles = makeStyles({
  container: {
    width: '100%',
    borderBottom: '1px solid var(--t3-color-border)',
  },
  messageBarInfo: {
    backgroundColor: '#f0f6ff', // Softer light blue
    color: '#323130',
    borderLeft: '3px solid #0078d4', // Thinner border
    padding: '6px 12px', // Compact padding
    fontSize: '12px', // Smaller font
  },
  messageBarWarning: {
    backgroundColor: '#fff8f0', // Softer light orange
    color: '#323130',
    borderLeft: '3px solid #f7630c',
    padding: '6px 12px',
    fontSize: '12px',
  },
  messageBarError: {
    backgroundColor: '#fef0f1', // Softer light red
    color: '#323130',
    borderLeft: '3px solid #d13438',
    padding: '6px 12px',
    fontSize: '12px',
  },
  messageBarSuccess: {
    backgroundColor: '#f0faf0', // Softer light green
    color: '#323130',
    borderLeft: '3px solid #107c10',
    padding: '6px 12px',
    fontSize: '12px',
  },
  messageTitle: {
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '2px',
  },
  messageText: {
    fontSize: '11px',
    lineHeight: '16px',
  },
});

export const GlobalMessageBar: React.FC<GlobalMessageBarProps> = ({
  message,
  onDismiss,
}) => {
  const styles = useStyles();

  if (!message) {
    return null;
  }

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  // Get style class based on message type
  const getMessageBarClass = () => {
    switch (message.type) {
      case 'info':
        return styles.messageBarInfo;
      case 'warning':
        return styles.messageBarWarning;
      case 'error':
        return styles.messageBarError;
      case 'success':
        return styles.messageBarSuccess;
      default:
        return styles.messageBarInfo;
    }
  };

  return (
    <div className={styles.container}>
      <MessageBar intent={message.type} className={getMessageBarClass()}>
        <MessageBarBody>
          {message.title && (
            <MessageBarTitle className={styles.messageTitle}>
              {message.title}
            </MessageBarTitle>
          )}
          <span className={styles.messageText}>{message.message}</span>
        </MessageBarBody>
        <MessageBarActions>
          {message.action && (
            <Button
              appearance="transparent"
              onClick={message.action.onClick}
              style={{ fontSize: '11px', padding: '2px 8px' }}
            >
              {message.action.label}
            </Button>
          )}
          {(message.dismissable !== false) && (
            <Button
              appearance="transparent"
              icon={<Dismiss24Regular />}
              onClick={handleDismiss}
              aria-label="Dismiss"
              style={{ padding: '2px' }}
            />
          )}
        </MessageBarActions>
      </MessageBar>
    </div>
  );
};
