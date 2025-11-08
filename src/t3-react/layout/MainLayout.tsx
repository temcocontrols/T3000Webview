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
import { makeStyles, tokens } from '@fluentui/react-components';
import { Header } from './Header';
import { TreePanel } from './TreePanel';
import { useUIStore } from '@t3-react/store';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    minHeight: '100vh',
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    position: 'relative',
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
    backgroundColor: tokens.colorNeutralStroke2,
    '&:hover': {
      backgroundColor: tokens.colorBrandBackground,
    },
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.3s ease',
    overflow: 'hidden',
    borderLeft: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground2,
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
              <div style={{ padding: '16px' }}>
                <h3>Properties</h3>
                <p>Property panel content...</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
