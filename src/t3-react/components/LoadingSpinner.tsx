/**
 * LoadingSpinner Component
 * 
 * Reusable loading indicator with optional message
 */

import React from 'react';
import { Spinner, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    gap: '12px',
  },
  message: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});

interface LoadingSpinnerProps {
  message?: string;
  size?: 'tiny' | 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large' | 'huge';
  overlay?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'medium',
  overlay = false,
}) => {
  const styles = useStyles();

  const content = (
    <div className={styles.container}>
      <Spinner size={size} />
      {message && <div className={styles.message}>{message}</div>}
    </div>
  );

  if (overlay) {
    return <div className={styles.overlay}>{content}</div>;
  }

  return content;
};
