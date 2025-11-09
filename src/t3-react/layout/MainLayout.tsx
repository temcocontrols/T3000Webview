/**
 * MainLayout Component
 *
 * Main application layout shell
 * Composition:
 * - Header (menu, toolbar, breadcrumb)
 * - Left panel (tree navigation) - collapsible
 * - Main content area
 * - Right panel (properties) - optional, collapsible
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { makeStyles } from '@fluentui/react-components';
import { Header } from './Header';
import { TreePanel } from './TreePanel';
import { StatusBar } from './StatusBar';
import { GlobalMessageBar } from '@t3-react/components';
import { useUIStore, useStatusBarStore } from '@t3-react/store';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    minHeight: '100vh',
    overflow: 'hidden',
    backgroundColor: 'var(--t3-color-background)',
    position: 'relative',
    fontFamily: 'var(--t3-font-family)',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.3s ease',
    overflow: 'hidden',
  },
  resizer: {
    width: '4px',
    cursor: 'col-resize',
    backgroundColor: 'var(--t3-color-border)',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: 'var(--t3-color-primary)',
    },
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    backgroundColor: 'var(--t3-color-background)',
    padding: 'var(--t3-spacing-lg)',
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.3s ease',
    overflow: 'hidden',
    borderLeft: '1px solid var(--t3-color-border)',
    backgroundColor: 'var(--t3-color-surface)',
  },
  rightPanelContent: {
    padding: 'var(--t3-spacing-md)',
    color: 'var(--t3-color-text)',
  },
});

export const MainLayout: React.FC = () => {
  const styles = useStyles();

  const isLeftPanelVisible = useUIStore((state) => state.isLeftPanelVisible);
  const isRightPanelVisible = useUIStore((state) => state.isRightPanelVisible);
  const leftPanelWidth = useUIStore((state) => state.leftPanelWidth);
  const rightPanelWidth = useUIStore((state) => state.rightPanelWidth);
  const setLeftPanelWidth = useUIStore((state) => state.setLeftPanelWidth);
  const setRightPanelWidth = useUIStore((state) => state.setRightPanelWidth);
  const globalMessage = useUIStore((state) => state.globalMessage);
  const dismissGlobalMessage = useUIStore((state) => state.dismissGlobalMessage);

  // Status bar state
  const rxCount = useStatusBarStore((state) => state.rxCount);
  const txCount = useStatusBarStore((state) => state.txCount);
  const buildingName = useStatusBarStore((state) => state.buildingName);
  const deviceName = useStatusBarStore((state) => state.deviceName);
  const protocol = useStatusBarStore((state) => state.protocol);
  const connectionType = useStatusBarStore((state) => state.connectionType);
  const statusMessage = useStatusBarStore((state) => state.message);

  console.log('🏗️ MainLayout rendering...', {
    isLeftPanelVisible,
    isRightPanelVisible,
    leftPanelWidth,
    rightPanelWidth,
  });

  // Handle left panel resize
  const handleLeftPanelResize = (e: React.MouseEvent) => {
    e.preventDefault();

    const startX = e.clientX;
    const startWidth = leftPanelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = startWidth + delta;
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle right panel resize
  const handleRightPanelResize = (e: React.MouseEvent) => {
    e.preventDefault();

    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const newWidth = startWidth + delta;
      setRightPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className={styles.container}>
      {/* Global Message Bar */}
      <GlobalMessageBar
        message={globalMessage}
        onDismiss={dismissGlobalMessage}
      />

      <Header />

      <div className={styles.body}>
        {/* Left Panel - Tree Navigation */}
        {isLeftPanelVisible && (
          <>
            <div
              className={styles.leftPanel}
              style={{ width: `${leftPanelWidth}px` }}
            >
              <TreePanel />
            </div>
            <div
              className={styles.resizer}
              onMouseDown={handleLeftPanelResize}
            />
          </>
        )}

        {/* Main Content Area */}
        <div className={styles.mainContent}>
          <Outlet />
        </div>

        {/* Right Panel - Properties/Details */}
        {isRightPanelVisible && (
          <>
            <div
              className={styles.resizer}
              onMouseDown={handleRightPanelResize}
            />
            <div
              className={styles.rightPanel}
              style={{ width: `${rightPanelWidth}px` }}
            >
              {/* Right panel content will be rendered here */}
              <div className={styles.rightPanelContent}>
                <h3>Properties</h3>
                <p>Property panel content...</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        rxCount={rxCount}
        txCount={txCount}
        buildingName={buildingName}
        deviceName={deviceName}
        protocol={protocol}
        connectionType={connectionType}
        message={statusMessage}
      />
    </div>
  );
};
