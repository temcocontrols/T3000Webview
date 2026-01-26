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
import { PageHeader } from './PageHeader';
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
    backgroundColor: '#f5f5f5',
    fontFamily: 'var(--t3-font-family)',
  },
  topArea: {
    flexShrink: 0,
    // borderBottom: '1px solid #d1d1d1',
  },
  middleArea: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #d1d1d1',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    minWidth: '200px',
    maxWidth: '500px',
    borderRight: '1px solid #e1e1e1',
    backgroundColor: '#fafafa',
  },
  resizer: {
    width: '4px',
    cursor: 'col-resize',
    backgroundColor: '#e1e1e1',
    transition: 'background-color 0.2s',
    flexShrink: 0,
    '&:hover': {
      backgroundColor: '#0078d4',
    },
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
    backgroundColor: '#ffffff',
  },
  mainContentBody: {
    flex: 1,
    overflow: 'auto',
    padding: '10px',
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderLeft: '1px solid #e1e1e1',
    backgroundColor: '#fafafa',
    minWidth: '200px',
    maxWidth: '500px',
  },
  rightPanelContent: {
    padding: '16px',
    color: '#323130',
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
          <PageHeader />
          <div className={styles.mainContentBody}>
            <Outlet />
          </div>
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
