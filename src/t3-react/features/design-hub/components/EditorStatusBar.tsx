/**
 * EditorStatusBar — slim shared bottom status bar for drawing engines.
 * Shows shape name, cursor coords, zoom, save state and the current message.
 * Listens for `t3-editor-status` events so any engine can publish updates
 * without prop-drilling.
 */
import React, { useEffect, useState } from 'react';
import { CheckmarkCircleRegular } from '@fluentui/react-icons';

interface StatusState {
  name: string;
  coords: string;
  message: string;
  zoom: number | null;
  saved: boolean;
}

export const EditorStatusBar: React.FC<{
  name?: string;
  coords?: string;
  message?: string;
}> = ({ name: nameProp = '', coords: coordsProp = '', message: messageProp = 'Ready' }) => {
  const [status, setStatus] = useState<StatusState>({
    name: nameProp,
    coords: coordsProp,
    message: messageProp,
    zoom: null,
    saved: true,
  });

  // Merge external updates from the engine's event bus.
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      setStatus((s) => ({
        ...s,
        name: detail.name ?? s.name,
        coords: detail.coords ?? s.coords,
        message: detail.message ?? s.message,
        zoom: detail.zoom ?? s.zoom,
        saved: detail.saved ?? s.saved,
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      height: 24,
      fontSize: 11,
      borderTop: '1px solid #e1e1e1',
      backgroundColor: '#ffffff',
      flexShrink: 0,
      gap: 8,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ color: '#444', flexShrink: 0 }}>{status.name || 'Shape'}</span>
      <span style={{ color: '#bbb', flexShrink: 0 }}>|</span>
      <span style={{ color: '#444', flexShrink: 0 }}>{status.coords}</span>
      {status.zoom != null && (
        <>
          <span style={{ color: '#bbb', flexShrink: 0 }}>|</span>
          <span style={{ color: '#444', flexShrink: 0 }}>{Math.round(status.zoom)}%</span>
        </>
      )}
      <span style={{ flex: 1 }} />
      <span style={{ color: status.saved ? '#0e700e' : '#ca5010', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <CheckmarkCircleRegular style={{ fontSize: 12 }} />
        {status.saved ? 'Saved' : 'Unsaved'}
      </span>
      <span style={{ color: '#666', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{status.message}</span>
    </div>
  );
};
