/**
 * NavDrawer — overlay tree-panel drawer for tablet & mobile.
 * Slides in from the left over the content; closes on route change.
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import { useUIStore } from '@t3-shared/store/uiStore';
import { SideNavContent } from '@t3-mobile/layout/SideNavContent';

const useStyles = makeStyles({
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 200,
    transition: 'opacity 0.25s ease',
  },
  drawer: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: '280px',
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow28,
    zIndex: 201,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    transform: 'translateX(0)',
    transition: 'transform 0.25s ease',
  },
  drawerHidden: {
    transform: 'translateX(-100%)',
  },
  overlayHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
});

export const NavDrawer: React.FC = () => {
  const styles = useStyles();
  const isOpen = useUIStore((s) => s.isDrawerOpen);
  const closeDrawer = useUIStore((s) => s.closeDrawer);
  const location = useLocation();

  // Close on route change
  useEffect(() => {
    closeDrawer();
  }, [location.pathname, closeDrawer]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${styles.overlay} ${isOpen ? '' : styles.overlayHidden}`}
        onClick={closeDrawer}
      />
      {/* Panel */}
      <div className={`${styles.drawer} ${isOpen ? '' : styles.drawerHidden}`}>
        <SideNavContent onNavigate={closeDrawer} />
      </div>
    </>
  );
};
