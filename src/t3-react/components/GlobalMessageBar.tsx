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
    backgroundColor: 'var(--t3-color-info-background)',
    color: 'var(--t3-color-info-text)',
    borderLeft: '4px solid var(--t3-color-info)',
  },
  messageBarWarning: {
    backgroundColor: 'var(--t3-color-warning-background)',
    color: 'var(--t3-color-warning-text)',
    borderLeft: '4px solid var(--t3-color-warning)',
  },
  messageBarError: {
    backgroundColor: 'var(--t3-color-error-background)',
    color: 'var(--t3-color-error-text)',
    borderLeft: '4px solid var(--t3-color-error)',
  },
  messageBarSuccess: {
    backgroundColor: 'var(--t3-color-success-background)',
    color: 'var(--t3-color-success-text)',
    borderLeft: '4px solid var(--t3-color-success)',
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
          {message.title && <MessageBarTitle>{message.title}</MessageBarTitle>}
          {message.message}
        </MessageBarBody>
        <MessageBarActions>
          {message.action && (
            <Button
              appearance="transparent"
              onClick={message.action.onClick}
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
            />
          )}
        </MessageBarActions>
      </MessageBar>
    </div>
  );
};
