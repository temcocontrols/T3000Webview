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
import { TreePanel } from '../features/devices/components/TreePanel';
import { StatusBar } from './StatusBar';
import { GlobalMessageBar } from '../shared/components/GlobalMessageBar';
import { useUIStore } from '../store/uiStore';
import { useStatusBarStore } from '../store/statusBarStore';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', sans-serif",
  },
  topArea: {
    flexShrink: 0,
    boxShadow: '0 0.3px 0.9px rgba(0, 0, 0, 0.108), 0 1.6px 3.6px rgba(0, 0, 0, 0.132)',
    zIndex: 100,
  },
  middleArea: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: '220px',
    maxWidth: '480px',
    borderRight: '1px solid #edebe9',
    backgroundColor: '#ffffff',
    boxShadow: '1px 0 2px rgba(0, 0, 0, 0.06)',
  },
  resizer: {
    width: '1px',
    cursor: 'col-resize',
    backgroundColor: '#edebe9',
    transition: 'all 0.1s ease-in-out',
    flexShrink: 0,
    position: 'relative',
    '&:hover': {
      backgroundColor: '#0078d4',
      width: '3px',
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-2px',
      right: '-2px',
      bottom: 0,
    },
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    padding: '20px 24px',
    minWidth: 0,
    backgroundColor: '#ffffff',
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderLeft: '1px solid #edebe9',
    backgroundColor: '#ffffff',
    minWidth: '220px',
    maxWidth: '480px',
    boxShadow: '-1px 0 2px rgba(0, 0, 0, 0.06)',
  },
  rightPanelContent: {
    padding: '20px',
    color: '#201f1e',
  },
  bottomArea: {
    flexShrink: 0,
    marginTop: '1px',
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
  const statusMessageType = useStatusBarStore((state) => state.messageType);

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
      const newWidth = Math.min(Math.max(startWidth + delta, 200), 500);
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
      const newWidth = Math.min(Math.max(startWidth + delta, 200), 500);
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

      {/* Top Area: Header */}
      <div className={styles.topArea}>
        <Header />
      </div>

      {/* Middle Area: Left Panel + Content (+ Right Panel) */}
      <div className={styles.middleArea}>
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

      {/* Bottom Area: Status Bar */}
      <div className={styles.bottomArea}>
        <StatusBar
          rxCount={rxCount}
          txCount={txCount}
          buildingName={buildingName}
          deviceName={deviceName}
          protocol={protocol}
          connectionType={connectionType}
          message={statusMessage}
          messageType={statusMessageType}
        />
      </div>
    </div>
  );
};
