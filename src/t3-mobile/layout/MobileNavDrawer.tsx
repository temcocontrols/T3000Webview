/**
 * MobileNavDrawer — left-side overlay navigation drawer for phones (< 768px).
 *
 * Opens via hamburger in MobileAppBar.
 * Closes on:  backdrop tap · route change
 * Width: 260px  |  Animation: slide from left 250ms ease
 * Background: white (GitHub/Notion style)
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { SideNavContent } from './SideNavContent';

const useStyles = makeStyles({
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 300,
    transition: 'opacity 0.25s ease',
  },
  backdropHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  drawer: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: '260px',
    backgroundColor: '#ffffff',
    boxShadow: tokens.shadow28,
    zIndex: 301,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    transform: 'translateX(0)',
    transition: 'transform 0.25s ease',
  },
  drawerHidden: {
    transform: 'translateX(-100%)',
  },
});

export interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({ isOpen, onClose }) => {
  const styles = useStyles();
  const { pathname } = useLocation();

  // Close on any route change
  useEffect(() => {
    onClose();
  }, [pathname]); // onClose is stable — intentionally omitted

  return (
    <>
      {/* Dimmed backdrop */}
      <div
        className={mergeClasses(styles.backdrop, !isOpen && styles.backdropHidden)}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sliding drawer */}
      <div
        className={mergeClasses(styles.drawer, !isOpen && styles.drawerHidden)}
        role="navigation"
        aria-label="Main navigation"
      >
        <SideNavContent onNavigate={onClose} />
      </div>
    </>
  );
};
