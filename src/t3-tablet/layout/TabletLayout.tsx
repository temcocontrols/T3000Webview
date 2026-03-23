/**
 * TabletLayout — shell for tablet (768–1024px).
 * Structure: TabletHeader + NavDrawer (overlay) + full-width content + StatusBar.
 * Left tree panel is hidden by default; revealed via the NavDrawer.
 */

import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { makeStyles } from '@fluentui/react-components';
import { TabletHeader } from './TabletHeader';
import { NavDrawer } from './NavDrawer';
import { TabletSidebar } from './TabletSidebar';
import { PageHeader } from '@t3-react/layout/PageHeader';
import { StatusBar } from '@t3-react/layout/StatusBar';
import { GlobalMessageBar } from '@t3-react/shared/components/GlobalMessageBar';
import { useUIStore } from '@t3-shared/store/uiStore';
import { useStatusBarStore } from '@t3-shared/store/statusBarStore';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
    fontFamily: 'var(--t3-font-family)',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  mainRow: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  contentBody: {
    flex: 1,
    overflow: 'auto',
    padding: '10px',
  },
  bottomArea: {
    flexShrink: 0,
    marginTop: '1px',
  },
});

export const TabletLayout: React.FC = () => {
  const styles = useStyles();

  const globalMessage = useUIStore((s) => s.globalMessage);
  const dismissGlobalMessage = useUIStore((s) => s.dismissGlobalMessage);

  const rxCount = useStatusBarStore((s) => s.rxCount);
  const txCount = useStatusBarStore((s) => s.txCount);
  const buildingName = useStatusBarStore((s) => s.buildingName);
  const deviceName = useStatusBarStore((s) => s.deviceName);
  const protocol = useStatusBarStore((s) => s.protocol);
  const connectionType = useStatusBarStore((s) => s.connectionType);
  const statusMessage = useStatusBarStore((s) => s.message);
  const statusMessageType = useStatusBarStore((s) => s.messageType);

  useEffect(() => {
    document.title = 'T3000 Building Automation System';
  }, []);

  return (
    <div className={styles.container}>
      <GlobalMessageBar message={globalMessage} onDismiss={dismissGlobalMessage} />

      {/* Compact header with hamburger */}
      <TabletHeader />

      {/* Overlay nav drawer — slides in from left */}
      <NavDrawer />

      {/* Sidebar (persistent) + content row */}
      <div className={styles.mainRow}>
        <TabletSidebar />
        <div className={styles.content}>
          <PageHeader />
          <div className={styles.contentBody}>
            <Outlet />
          </div>
        </div>
      </div>

      {/* Status bar */}
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
