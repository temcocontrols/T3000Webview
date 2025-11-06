/**
 * EmptyState Component
 *
 * Placeholder for empty data states
 */

import React from 'react';
import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { DocumentRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    gap: '16px',
    minHeight: '300px',
  },
  icon: {
    fontSize: '64px',
    color: tokens.colorNeutralForeground3,
  },
  title: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  message: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    maxWidth: '400px',
  },
});

interface EmptyStateProps {
  icon?: React.ReactElement;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
}) => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      {icon ? (
        React.cloneElement(icon, { className: styles.icon })
      ) : (
        <DocumentRegular className={styles.icon} />
      )}
      <div className={styles.title}>{title}</div>
      {message && <div className={styles.message}>{message}</div>}
      {action && (
        <Button appearance="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};
