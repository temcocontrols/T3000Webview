import React, { useEffect, useState } from 'react';
import { CheckmarkCircleRegular } from '@fluentui/react-icons';
import { makeStyles, tokens } from '@fluentui/react-components';

interface StatusState {
  name: string;
  coords: string;
  message: string;
  zoom: number | null;
  saved: boolean;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    height: 24,
    fontSize: tokens.fontSizeBase200,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    flexShrink: 0,
    gap: 8,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  text: { color: tokens.colorNeutralForeground1, flexShrink: 0 },
  divider: { color: tokens.colorNeutralForeground3, flexShrink: 0 },
  saved: { color: tokens.colorPaletteGreenForeground1, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 },
  unsaved: { color: tokens.colorPaletteMarigoldForeground1, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 },
  message: { color: tokens.colorNeutralForeground2, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis' },
});

export const EditorStatusBar: React.FC<{
  name?: string;
  coords?: string;
  message?: string;
}> = ({ name: nameProp = '', coords: coordsProp = '', message: messageProp = 'Ready' }) => {
  const styles = useStyles();
  const [status, setStatus] = useState<StatusState>({
    name: nameProp,
    coords: coordsProp,
    message: messageProp,
    zoom: null,
    saved: true,
  });

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      setStatus((s) => ({
        ...s,
        name: detail.name ?? s.name,
        coords: detail.coords ?? s.coords,
        message: detail.message ?? s.message,
        zoom: detail.zoom !== undefined ? detail.zoom : s.zoom,
        saved: detail.saved !== undefined ? detail.saved : s.saved,
      }));
    };
    window.addEventListener('t3-editor-status', listener);
    return () => window.removeEventListener('t3-editor-status', listener);
  }, []);

  // Keep prop changes in sync (used by engines that render state directly).
  useEffect(() => {
    setStatus((s) => ({ ...s, name: nameProp, coords: coordsProp, message: messageProp }));
  }, [nameProp, coordsProp, messageProp]);

  return (
    <div className={styles.root}>
      <span className={styles.text}>{status.name || 'Shape'}</span>
      <span className={styles.divider}>|</span>
      <span className={styles.text}>{status.coords}</span>
      {status.zoom != null && (
        <>
          <span className={styles.divider}>|</span>
          <span className={styles.text}>{Math.round(status.zoom)}%</span>
        </>
      )}
      <span style={{ flex: 1 }} />
      <span className={status.saved ? styles.saved : styles.unsaved}>
        <CheckmarkCircleRegular style={{ fontSize: 12 }} />
        {status.saved ? 'Saved' : 'Unsaved'}
      </span>
      <span className={styles.message}>{status.message}</span>
    </div>
  );
};
