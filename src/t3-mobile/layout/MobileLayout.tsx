/**
 * Mobile Layout Component
 * Main layout wrapper for mobile views
 */

import React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { MobileAppBar, MobileAppBarProps } from './MobileAppBar';

const useStyles = makeStyles({
  layout: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '16px',
    WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
  },
  contentNoPadding: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
  },
});

export interface MobileLayoutProps {
  children: React.ReactNode;
  appBarProps?: MobileAppBarProps;
  noPadding?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  appBarProps,
  noPadding = false,
}) => {
  const styles = useStyles();

  return (
    <div className={styles.layout}>
      {appBarProps && <MobileAppBar {...appBarProps} />}
      <div className={noPadding ? styles.contentNoPadding : styles.content}>
        {children}
      </div>
    </div>
  );
};
