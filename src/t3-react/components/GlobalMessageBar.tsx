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
  tokens,
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
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
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

  return (
    <div className={styles.container}>
      <MessageBar intent={message.type}>
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
