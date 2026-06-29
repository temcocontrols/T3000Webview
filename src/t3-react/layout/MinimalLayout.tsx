/**
 * MinimalLayout Component
 *
 * Minimal layout with just the top menu bar
 * Used for full-screen pages like HVAC Designer
 * Composition:
 * - Header (menu, toolbar)
 * - Main content area (full height, no padding)
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { makeStyles } from '@fluentui/react-components';
import { Header } from './Header';
import { GlobalMessageBar } from '../shared/components/GlobalMessageBar';
import { useUIStore } from '../store/uiStore';

// Force Fluent UI menu popovers above EEZ Studio content
const menuZIndexFix = `
  .fui-MenuPopover { z-index: 10000 !important; }
  .fui-PopoverSurface { z-index: 10000 !important; }
`;

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
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
});

export const MinimalLayout: React.FC = () => {
  const styles = useStyles();
  const globalMessage = useUIStore((state) => state.globalMessage);
  const dismissGlobalMessage = useUIStore((state) => state.dismissGlobalMessage);

  return (
    <div className={styles.container}>
      <style>{menuZIndexFix}</style>
      {/* Top area with header and global message */}
      <div className={styles.topArea}>
        <Header showToolbar={false} />
        {globalMessage && (
          <GlobalMessageBar
            message={globalMessage.message}
            intent={globalMessage.type}
            onDismiss={dismissGlobalMessage}
          />
        )}
      </div>

      {/* Main content area - full height, no padding */}
      <div className={styles.mainContent}>
        <Outlet />
      </div>
    </div>
  );
};
