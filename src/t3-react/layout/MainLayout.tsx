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

import React, { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { makeStyles } from '@fluentui/react-components';
import { Header } from './Header';
import { PageHeader } from './PageHeader';
import { TreePanel } from '../features/devices/components/TreePanel';
import { StatusBar } from './StatusBar';
import { GlobalMessageBar } from '../shared/components/GlobalMessageBar';
import { useUIStore } from '../store/uiStore';
import { useStatusBarStore } from '../store/statusBarStore';
import { useResponsive } from '@t3-shared/core/hooks/useResponsive';
import { MobileShell } from '@t3-mobile/layout/MobileShell';
import { ChatPanel } from '../features/ai-chat/components/ChatPanel';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
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
    scrollbarWidth: 'thin',
    scrollbarColor: '#c1c1c1 #f5f5f5',
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
    scrollbarWidth: 'thin',
    scrollbarColor: '#c1c1c1 transparent',
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

/** Desktop-only layout — full shell with resizable left panel, menu bar, and status bar. */
const DesktopLayout: React.FC<{ chatWidth?: number }> = ({ chatWidth = 500 }) => {
  const styles = useStyles();

  const isLeftPanelVisible = useUIStore((state) => state.isLeftPanelVisible);
  const isRightPanelVisible = useUIStore((state) => state.isRightPanelVisible);
  const leftPanelWidth = useUIStore((state) => state.leftPanelWidth);
  const rightPanelWidth = useUIStore((state) => state.rightPanelWidth);
  const setLeftPanelWidth = useUIStore((state) => state.setLeftPanelWidth);
  const setRightPanelWidth = useUIStore((state) => state.setRightPanelWidth);
  const globalMessage = useUIStore((state) => state.globalMessage);
  const dismissGlobalMessage = useUIStore((state) => state.dismissGlobalMessage);
  const chatMode = useUIStore((state) => state.chatMode);

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // Status bar state
  const rxCount = useStatusBarStore((state) => state.rxCount);
  const txCount = useStatusBarStore((state) => state.txCount);
  const statusDeviceName = useStatusBarStore((state) => state.deviceName);
  const statusDeviceSerial = useStatusBarStore((state) => state.deviceSerialNumber);
  const statusDevicePanel = useStatusBarStore((state) => state.devicePanelId);
  const protocol = useStatusBarStore((state) => state.protocol);
  const connectionType = useStatusBarStore((state) => state.connectionType);
  const statusMessage = useStatusBarStore((state) => state.message);
  const statusMessageType = useStatusBarStore((state) => state.messageType);

  // Set page title
  useEffect(() => {
    document.title = 'T3000 Building Automation System';
  }, []);

  useEffect(() => {
    if (leftPanelRef.current) leftPanelRef.current.style.width = `${leftPanelWidth}px`;
  }, [leftPanelWidth]);

  useEffect(() => {
    if (rightPanelRef.current) rightPanelRef.current.style.width = `${rightPanelWidth}px`;
  }, [rightPanelWidth]);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <GlobalMessageBar message={globalMessage} onDismiss={dismissGlobalMessage} />
      <Header />

      {/* Container — shrinks when chat is open */}
      <div className={styles.container} style={{
        flex: 1,
        width: chatMode === 'sidebar' ? `calc(100% - ${chatWidth}px)` : '100%',
      }}>
        <div className={styles.middleArea}>
          {isLeftPanelVisible && (
            <>
              <div ref={leftPanelRef} className={styles.leftPanel}><TreePanel /></div>
              <div className={styles.resizer} onMouseDown={handleLeftPanelResize} />
            </>
          )}
          <div className={styles.mainContent}>
            <PageHeader />
            <div className={styles.mainContentBody}><Outlet /></div>
          </div>
          {isRightPanelVisible && (
            <>
              <div className={styles.resizer} onMouseDown={handleRightPanelResize} />
              <div ref={rightPanelRef} className={styles.rightPanel}>
                <div className={styles.rightPanelContent}>
                  <h3>Properties</h3><p>Property panel content...</p>
                </div>
              </div>
            </>
          )}
        </div>
        <div className={styles.bottomArea}>
          <StatusBar rxCount={rxCount} txCount={txCount}
            deviceName={statusDeviceName} deviceSerialNumber={statusDeviceSerial}
            devicePanelId={statusDevicePanel} protocol={protocol}
            connectionType={connectionType} message={statusMessage} messageType={statusMessageType} />
        </div>
      </div>
    </div>
  );
};

// ── AI Chat fixed panel (sibling to container, not inside it) ──

const DesktopLayoutWithChat: React.FC = () => {
  const chatMode = useUIStore((state) => state.chatMode);
  const [chatWidth, setChatWidth] = React.useState(500);

  const handleChatResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = chatWidth;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      setChatWidth(Math.min(Math.max(startWidth + delta, 320), 700));
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      <DesktopLayout chatWidth={chatWidth} />
      {chatMode === 'sidebar' && (
        <>
          {/* Resize handle */}
          <div
            onMouseDown={handleChatResize}
            style={{
            position: 'fixed', top: '42px', bottom: 0,
              right: `${chatWidth}px`, width: '4px',
              cursor: 'col-resize', zIndex: 11,
              background: 'transparent',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#0078d4')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          />
          {/* Chat panel — starts at toolbar level, below menu bar */}
          <div style={{
            position: 'fixed', top: '42px', right: 0, bottom: 0, width: `${chatWidth}px`,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            borderLeft: '1px solid #e1e1e1', backgroundColor: '#ffffff', zIndex: 10,
          }}>
            <ChatPanel variant="panel" />
          </div>
        </>
      )}
    </>
  );
};

/**
 * MainLayout — platform dispatcher.
 * Delegates to the appropriate shell based on screen size:
 *   > 1024px  → DesktopLayout (full shell with resizable tree panel)
 *   768–1024px → TabletLayout  (overlay drawer + compact header)
 *   < 768px   → MobileShell   (bottom nav + full-screen drawer)
 *
 * Each shell independently manages its own hooks — no Rules-of-Hooks violation.
 */
export const MainLayout: React.FC = () => {
  const { isMobile } = useResponsive();
  if (isMobile) return <MobileShell />;
  return <DesktopLayoutWithChat />;
};
