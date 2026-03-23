/**
 * MobileShell — React Router layout shell for phones (< 768px).
 *
 * Structure:
 *   MobileAppBar (top, 56px) with hamburger
 *   MobileNavDrawer (left overlay, opens on hamburger tap)
 *   Content (full width, scrollable — no bottom nav padding)
 *
 * Bottom nav bar removed in favour of left side drawer.
 * PC layout is NOT affected.
 * Pages register their title + refresh via useMobilePage() hook.
 */

import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { makeStyles } from '@fluentui/react-components';
import { MobileAppBar } from './MobileAppBar';
import { MobileNavDrawer } from './MobileNavDrawer';
import { DeviceDrawer } from '../components/DeviceDrawer/DeviceDrawer';
import { MobilePageProvider, useMobilePageMeta } from './MobilePageContext';
import { GlobalMessageBar } from '@t3-react/shared/components/GlobalMessageBar';
import { useUIStore } from '@t3-shared/store/uiStore';
import { useDeviceTreeStore } from '@t3-react/features/devices/store/deviceTreeStore';

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

/** Inner shell — reads page meta from context */
const MobileShellInner: React.FC = () => {
  const styles = useStyles();
  const { pathname } = useLocation();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isDeviceOpen, setIsDeviceOpen] = useState(false);
  const { title, onRefresh } = useMobilePageMeta();

  const globalMessage = useUIStore((s) => s.globalMessage);
  const dismissGlobalMessage = useUIStore((s) => s.dismissGlobalMessage);

  const fetchDevices = useDeviceTreeStore((s) => s.fetchDevices);
  const loadDevicesWithSync = useDeviceTreeStore((s) => s.loadDevicesWithSync);

  // Load devices on shell mount (once per session)
  useEffect(() => {
    const init = async () => {
      await fetchDevices();
      if (useDeviceTreeStore.getState().devices.length === 0) {
        await loadDevicesWithSync();
      }
    };
    init();
  }, []);

  useEffect(() => {
    document.title = 'T3000';
  }, []);

  return (
    <div className={styles.container}>
      <GlobalMessageBar message={globalMessage} onDismiss={dismissGlobalMessage} />

      <MobileAppBar
        title={title}
        showMenu
        onMenu={() => setIsNavOpen(true)}
        onDevice={() => setIsDeviceOpen(true)}
        showBack={pathname !== '/t3000'}
        onBack={() => window.history.back()}
        onRefresh={onRefresh ?? (() => window.location.reload())}
        showRefresh
      />

      {/* Left-side overlay: device list */}
      <DeviceDrawer isOpen={isDeviceOpen} onClose={() => setIsDeviceOpen(false)} />

      {/* Left-side overlay: navigation links */}
      <MobileNavDrawer isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />

      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
};

/** Outer shell — provides context */
export const MobileShell: React.FC = () => (
  <MobilePageProvider>
    <MobileShellInner />
  </MobilePageProvider>
);
