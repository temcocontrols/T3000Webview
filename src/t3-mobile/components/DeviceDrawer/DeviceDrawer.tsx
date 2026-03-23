/**
 * DeviceDrawer — left-side overlay drawer for device selection on mobile.
 *
 * Triggered by the plug icon in MobileAppBar.
 * Slides in from the LEFT (same direction as MobileNavDrawer).
 * Content: DevicePanel (device list + scan).
 *
 * Closes when: backdrop tapped · device selected.
 */

import React, { useEffect } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { DevicePanel } from '../DevicePanel/DevicePanel';

const useStyles = makeStyles({
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 400,
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
    width: '280px',
    backgroundColor: '#ffffff',
    boxShadow: tokens.shadow28,
    zIndex: 401,
    display: 'flex',
    flexDirection: 'column',
    transform: 'translateX(0)',
    transition: 'transform 0.25s ease',
  },
  drawerHidden: {
    transform: 'translateX(-100%)',
  },
});

export interface DeviceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceDrawer: React.FC<DeviceDrawerProps> = ({ isOpen, onClose }) => {
  const styles = useStyles();

  // Lock background scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Dimmed backdrop */}
      <div
        className={mergeClasses(styles.backdrop, !isOpen && styles.backdropHidden)}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Left-slide drawer */}
      <div
        className={mergeClasses(styles.drawer, !isOpen && styles.drawerHidden)}
        role="dialog"
        aria-modal="true"
        aria-label="Select device"
      >
        <DevicePanel onClose={onClose} />
      </div>
    </>
  );
};
