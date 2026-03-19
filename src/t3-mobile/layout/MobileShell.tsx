/**
 * MobileShell — React Router layout shell for phones (< 768px).
 * Mirrors TabletLayout and MainLayout in pattern (uses <Outlet />).
 *
 * Structure:
 *   MobileAppBar (top)
 *   NavDrawer (overlay from t3-tablet, shared component)
 *   Content (full width, scrollable)
 *   MobileBottomNav (fixed bottom tabs)
 */

import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { makeStyles } from '@fluentui/react-components';
import { MobileAppBar } from './MobileAppBar';
import { MobileBottomNav } from './MobileBottomNav';
import { GlobalMessageBar } from '@t3-react/shared/components/GlobalMessageBar';
import { useUIStore } from '@t3-shared/store/uiStore';
import { NavDrawer } from '@t3-tablet/layout/NavDrawer';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
    fontFamily: 'var(--t3-font-family)',
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
    WebkitOverflowScrolling: 'touch',
  },
});

const pathToTitle = (pathname: string): string => {
  const segment = pathname.split('/').filter(Boolean).pop() ?? 'Home';
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
};

export const MobileShell: React.FC = () => {
  const styles = useStyles();
  const { pathname } = useLocation();

  const globalMessage = useUIStore((s) => s.globalMessage);
  const dismissGlobalMessage = useUIStore((s) => s.dismissGlobalMessage);

  useEffect(() => {
    document.title = 'T3000';
  }, []);

  return (
    <div className={styles.container}>
      <GlobalMessageBar message={globalMessage} onDismiss={dismissGlobalMessage} />

      <MobileAppBar
        title={pathToTitle(pathname)}
        showBack={pathname !== '/t3000'}
        onBack={() => window.history.back()}
        onRefresh={() => window.location.reload()}
        showRefresh
      />

      {/* NavDrawer reused from t3-tablet */}
      <NavDrawer />

      <div className={styles.content}>
        <Outlet />
      </div>

      <MobileBottomNav />
    </div>
  );
};
