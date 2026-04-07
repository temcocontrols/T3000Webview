/**
 * DebugPanel — Toggles for grid overlay, coords, temperature drift,
 * and live event/focus/value readout.
 */

import React from 'react';
import { makeStyles, tokens, Switch, Button, Text, Divider } from '@fluentui/react-components';
import type { MenuRowWidget } from '../hooks/useSimulatorState';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fafafa',
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    minWidth: '220px',
    maxWidth: '280px',
  },
  title: {
    fontWeight: 600,
    fontSize: '14px',
    color: tokens.colorNeutralForeground1,
    marginBottom: '4px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  readoutLabel: {
    fontWeight: 600,
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    minWidth: '48px',
  },
  readoutValue: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground3,
    padding: '2px 8px',
    borderRadius: '4px',
    minWidth: '80px',
    textAlign: 'right',
  },
  // Mobile: horizontal collapsed accordion
  mobileRoot: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#fafafa',
    borderRadius: '12px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
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
            <span className={styles.readoutValue}>{focusedRow.label}</span>
            <span className={styles.readoutLabel}>Value:</span>
            <span className={styles.readoutValue}>{String(focusedRow.value)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Text className={styles.title}>Tstat10 Debug</Text>

      <Switch
        label="Grid Layer"
        checked={showGrid}
        onChange={(_, d) => onToggleGrid(d.checked)}
      />
      <Switch
        label="Coordinates"
        checked={showCoords}
        onChange={(_, d) => onToggleCoords(d.checked)}
      />
      <Switch
        label="Temperature Drift"
        checked={driftEnabled}
        onChange={onToggleDrift}
      />

      <Button size="small" appearance="outline" onClick={onReset}>
        Reset Simulator
      </Button>

      <Divider />

      <div className={styles.row}>
        <span className={styles.readoutLabel}>Event</span>
        <span className={styles.readoutValue}>{lastEvent || '—'}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.readoutLabel}>Focus</span>
        <span className={styles.readoutValue}>{focusedRow?.label || '—'}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.readoutLabel}>Value</span>
        <span className={styles.readoutValue}>{focusedRow ? String(focusedRow.value) : '—'}</span>
      </div>
    </div>
  );
};
