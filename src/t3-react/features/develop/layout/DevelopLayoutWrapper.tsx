/**
 * Develop Layout Wrapper
 *
 * Wrapper layout for developer tools that includes header but not device tree
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { makeStyles } from '@fluentui/react-components';
import { Header } from '../../../layout/Header';
import { StatusBar } from '../../../layout/StatusBar';
import { GlobalMessageBar } from '../../../shared/components/GlobalMessageBar';
import { useStatusBarStore } from '../../../store/statusBarStore';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    fontFamily: 'var(--t3-font-family)',
  },
  topArea: {
    flexShrink: 0,
  },
  contentArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #d1d1d1',
  },
  bottomArea: {
    flexShrink: 0,
    borderTop: '1px solid #d1d1d1',
  },
});

export const DevelopLayoutWrapper: React.FC = () => {
  const styles = useStyles();
  const { globalMessage, dismissGlobalMessage } = useStatusBarStore();

  return (
    <div className={styles.container}>
      {/* Global Message Bar */}
      <GlobalMessageBar
        message={globalMessage}
        onDismiss={dismissGlobalMessage}
      />

      {/* Top Area: Header */}
      <div className={styles.topArea}>
        <Header />
      </div>

      {/* Content Area - No device tree, just the develop layout */}
      <div className={styles.contentArea}>
        <Outlet />
      </div>

      {/* Bottom Area: Status Bar */}
      <div className={styles.bottomArea}>
        <StatusBar />
      </div>
    </div>
  );
};

export default DevelopLayoutWrapper;
