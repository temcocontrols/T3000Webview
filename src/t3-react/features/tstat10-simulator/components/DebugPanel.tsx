/**
 * DebugPanel — Toggles for grid overlay, coords, temperature drift,
 * simulated keypad, and live event/focus/value readout with blue badges.
 */

import React from 'react';
import { makeStyles, tokens, Switch, Button, Text, Divider, Checkbox } from '@fluentui/react-components';
import type { MenuRowWidget } from '../hooks/useSimulatorState';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '14px',
    backgroundColor: '#f7f7f7',
    borderRadius: '10px',
    border: '2px solid #888',
    minWidth: '220px',
    maxWidth: '280px',
    fontFamily: "'Fira Mono', 'Consolas', 'Menlo', monospace",
  },
  title: {
    fontWeight: 600,
    fontSize: '14px',
    color: tokens.colorNeutralForeground1,
    marginBottom: '2px',
    fontFamily: "'Fira Mono', 'Consolas', monospace",
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  readoutLabel: {
    fontWeight: 700,
    fontSize: '13px',
    color: '#333',
    minWidth: '60px',
    fontFamily: "'Fira Mono', 'Consolas', monospace",
  },
  readoutBadge: {
    fontSize: '13px',
    fontFamily: "'Fira Mono', 'Consolas', monospace",
    fontWeight: 700,
    color: '#fff',
    backgroundColor: '#1976d2',
    padding: '4px 12px',
    borderRadius: '4px',
    minWidth: '100px',
    textAlign: 'center',
    display: 'inline-block',
  },
  coordsText: {
    fontSize: '13px',
    fontFamily: "'Fira Mono', 'Consolas', monospace",
    color: '#333',
    fontWeight: 600,
  },
  // Mobile: horizontal collapsed accordion
  mobileRoot: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#f7f7f7',
    borderRadius: '10px',
    border: '2px solid #888',
    width: '100%',
    maxWidth: '360px',
  },
  mobileToggleRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
  },
});

interface DebugPanelProps {
  showGrid: boolean;
  onToggleGrid: (val: boolean) => void;
  showCoords: boolean;
  onToggleCoords: (val: boolean) => void;
  driftEnabled: boolean;
  onToggleDrift: () => void;
  onReset: () => void;
  focusedRow?: MenuRowWidget;
  lastEvent?: string;
  mobile?: boolean;
  simulatedKeypad?: boolean;
  onToggleSimulatedKeypad?: (val: boolean) => void;
  showRedbox?: boolean;
  onToggleRedbox?: (val: boolean) => void;
  redboxCoords?: { x: number; y: number };
  showKeypadDebug?: boolean;
  onToggleKeypadDebug?: (val: boolean) => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  showGrid,
  onToggleGrid,
  showCoords,
  onToggleCoords,
  driftEnabled,
  onToggleDrift,
  onReset,
  focusedRow,
  lastEvent,
  mobile = false,
  simulatedKeypad = false,
  onToggleSimulatedKeypad,
  showRedbox = false,
  onToggleRedbox,
  redboxCoords,
  showKeypadDebug = true,
  onToggleKeypadDebug,
}) => {
  const styles = useStyles();

  if (mobile) {
    return (
      <div className={styles.mobileRoot}>
        <Text className={styles.title}>Debug</Text>
        <div className={styles.mobileToggleRow}>
          <Switch
            label="Grid"
            checked={showGrid}
            onChange={(_, d) => onToggleGrid(d.checked)}
          />
          <Switch
            label="Coords"
            checked={showCoords}
            onChange={(_, d) => onToggleCoords(d.checked)}
          />
          <Switch
            label="Drift"
            checked={driftEnabled}
            onChange={onToggleDrift}
          />
          <Button size="small" onClick={onReset}>
            Reset
          </Button>
        </div>
        {focusedRow && (
          <div className={styles.mobileToggleRow}>
            <span className={styles.readoutLabel}>Focus:</span>
            <span className={styles.readoutBadge}>{focusedRow.label}</span>
            <span className={styles.readoutLabel}>Value:</span>
            <span className={styles.readoutBadge}>{String(focusedRow.value)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Text className={styles.title}>Tstat10 Debug</Text>

      <Checkbox
        label="Simulated Keypad"
        checked={simulatedKeypad}
        onChange={(_, d) => onToggleSimulatedKeypad?.(!!d.checked)}
      />
      <Checkbox
        label="Grid Layer"
        checked={showGrid}
        onChange={(_, d) => onToggleGrid(!!d.checked)}
      />
      <Checkbox
        label="Coords"
        checked={showCoords}
        onChange={(_, d) => onToggleCoords(!!d.checked)}
      />
      <Checkbox
        label="Redbox"
        checked={showRedbox}
        onChange={(_, d) => onToggleRedbox?.(!!d.checked)}
      />

      {redboxCoords && (
        <span className={styles.coordsText}>
          x:{redboxCoords.x}, y:{redboxCoords.y}
        </span>
      )}

      <Checkbox
        label="Keypad"
        checked={showKeypadDebug}
        onChange={(_, d) => onToggleKeypadDebug?.(!!d.checked)}
      />

      {showKeypadDebug ? (
        <>
          <Divider />

          <div className={styles.row}>
            <span className={styles.readoutLabel}>Event:</span>
            <span className={styles.readoutBadge}>{lastEvent || '—'}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.readoutLabel}>Focus:</span>
            <span className={styles.readoutBadge}>{focusedRow?.label || '—'}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.readoutLabel}>Value:</span>
            <span className={styles.readoutBadge}>{focusedRow ? String(focusedRow.value) : '—'}</span>
          </div>
        </>
      ) : (
        <span className={styles.coordsText}>Keypad debug info hidden</span>
      )}
    </div>
  );
};
