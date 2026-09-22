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
    // Units matter here: a bare number is emitted as-is (`gap: 8`), which the browser drops as invalid,
    // so the segments ran together — measured `gap: normal` and the bar 21 px tall instead of the
    // designed 24 (`designer-shell-areas.md` §4).
    height: '24px',
    fontSize: tokens.fontSizeBase200,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    flexShrink: 0,
    gap: '8px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  text: { color: tokens.colorNeutralForeground1, flexShrink: 0 },
  divider: { color: tokens.colorNeutralForeground3, flexShrink: 0 },
  // `gap` must carry its unit here too — `gap: 4` was dropped the same way, which is why the check glyph
  // sat flush against "Saved" (measured: no space between the icon and the label).
  saved: { color: tokens.colorPaletteGreenForeground1, display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 },
  unsaved: { color: tokens.colorPaletteMarigoldForeground1, display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 },
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

  // Only what the document actually publishes, and dividers only *between* the segments that exist.
  //
  // The bar used to render `status.name || 'Shape'` followed by an unconditional `|` + coords span, so an
  // empty status produced "Shape |". Nothing publishes that text: the EEZ/LVGL document's runtime carries no
  // `status` at all (`LvglDocument.tsx`), and HVAC's `sbName` starts as `''` (`RefConstant.ts:21`) — the
  // engine only writes it once something is selected (`SelectUtil.ts:211`). So the leading group is now
  // absent when there is nothing to say, which is what the designer's EEZ document shows.
  const leading: string[] = [];
  if (status.name) leading.push(status.name);
  if (status.coords) leading.push(status.coords);
  if (status.zoom != null) leading.push(`${Math.round(status.zoom)}%`);

  return (
    <div className={styles.root}>
      {leading.map((text, index) => (
        <React.Fragment key={`${index}:${text}`}>
          {index > 0 ? <span className={styles.divider}>|</span> : null}
          <span className={styles.text}>{text}</span>
        </React.Fragment>
      ))}
      <span style={{ flex: 1 }} />
      <span className={status.saved ? styles.saved : styles.unsaved}>
        <CheckmarkCircleRegular style={{ fontSize: 12 }} />
        {status.saved ? 'Saved' : 'Unsaved'}
      </span>
      <span className={styles.message}>{status.message}</span>
    </div>
  );
};
