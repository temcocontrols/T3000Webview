/**
 * PointListRow — compact list row for Inputs / Outputs / Variables / Alarms.
 *
 * Design:
 *   • Point ID  (IN1, OUT3 …)   short, muted
 *   • Label text               flex-1, truncated (optional badge inline)
 *   • Value                    normal-weight text, right-aligned
 *   • Units                    center column
 *   • Range                    truncated column
 *   • Chevron                  toggles expand
 *
 * Expanded section:
 *   • 2-col detail grid (label / value pairs)
 *   • Refresh button bottom-right
 *
 * Column header row:
 *   • via <PointListHeader> static sub-component
 */

import React, { useState, useEffect } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { ChevronDownRegular, ChevronUpRegular } from '@fluentui/react-icons';

/* ──────────────────────────────────────── Viewport width hook ── */
// Uses window.innerWidth (rendered CSS pixels) so breakpoints react to the
// actual available space, not the physical screen size.
function useViewportWidth(): number {
  const [vw, setVw] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0
  );
  useEffect(() => {
    let tid: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(tid);
      tid = setTimeout(() => setVw(window.innerWidth), 50);
    };
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      clearTimeout(tid);
    };
  }, []);
  return vw;
}
// Tier thresholds
const T1 = 600;   // show Label, Mode, Range
const T2 = 800;   // also show Status, Type
const T3 = 1000;  // also show Calibration, Signal Type

/* ─────────────────────────────────────────────────────── Styles ── */

const useStyles = makeStyles({
  /* ── Header row ── */
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    height: '32px',
    backgroundColor: '#fafafa',
    borderBottom: `1px solid #edebe9`,
    paddingLeft: '8px',
    paddingRight: '6px',
    gap: '0px',
    userSelect: 'none',
  },
  headerCell: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#323130',
    letterSpacing: '0.01em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headerId: {
    width: '56px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  headerLabel: {
    flex: 1,
    paddingLeft: '6px',
  },
  /* Cap Full Label header in landscape to match data row cap */
  headerLabelWide: {
    flex: '0 1 220px',
    maxWidth: '220px',
    minWidth: '0',
  },
  headerValue: {
    width: '50px',
    flexShrink: 0,
    textAlign: 'right',
    paddingRight: '4px',
  },
  headerUnit: {
    width: '32px',
    flexShrink: 0,
    textAlign: 'center',
  },
  headerChevron: {
    width: '16px',
    flexShrink: 0,
  },
  /* Landscape-only header columns — tier 1 (≥600px) */
  headerSubLabel: {
    width: '100px',
    flexShrink: 0,
    paddingLeft: '4px',
  },
  headerMode: {
    width: '70px',
    flexShrink: 0,
    textAlign: 'center' as const,
  },
  headerRange: {
    width: '90px',
    flexShrink: 0,
    textAlign: 'right' as const,
    paddingRight: '4px',
  },
  /* Tier 2 (≥800px) header columns */
  headerStatus: {
    width: '80px',
    flexShrink: 0,
    textAlign: 'center' as const,
  },
  headerType: {
    width: '70px',
    flexShrink: 0,
    textAlign: 'center' as const,
  },
  /* Tier 3 (≥1000px) header columns */
  headerCalibration: {
    width: '80px',
    flexShrink: 0,
    textAlign: 'right' as const,
    paddingRight: '4px',
  },
  headerSignalType: {
    width: '90px',
    flexShrink: 0,
    textAlign: 'center' as const,
  },

  /* ── Data row ── */
  row: {
    display: 'flex',
    alignItems: 'stretch',
    minHeight: '44px',
    width: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderRadius: 0,
    padding: 0,
    margin: 0,
    cursor: 'pointer',
    userSelect: 'none',
    textAlign: 'left',
    appearance: 'none',
    WebkitAppearance: 'none',
    fontFamily: 'inherit',
    ':hover': { backgroundColor: '#fafafa' },
    ':active': { backgroundColor: tokens.colorNeutralBackground2 },
  },
  rowExpanded: {
    backgroundColor: '#edf2fa',
    ':hover': { backgroundColor: '#e4ecf7' },
  },

  rowInner: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '8px',
    paddingRight: '6px',
    gap: '0px',
    overflow: 'hidden',
  },

  /* ID column */
  idCell: {
    width: '56px',
    flexShrink: 0,
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  /* Label column — flex row holds truncated text + optional inline badge */
  labelCell: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    paddingLeft: '6px',
    overflow: 'hidden',
  },
  /* Cap Full Label in landscape so it doesn't swallow all available space */
  labelCellWide: {
    flex: '0 1 220px',
    maxWidth: '220px',
  },
  labelText: {
    flex: 1,
    fontSize: '13px',
    fontWeight: 400,
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    flexShrink: 0,
    fontSize: '10px',
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: '#ca5010',
    borderRadius: '3px',
    padding: '1px 5px',
    letterSpacing: '0.02em',
  },
  badgeError: {
    backgroundColor: '#c42b1c',
  },

  /* Value column */
  valueCell: {
    width: '50px',
    flexShrink: 0,
    textAlign: 'right',
    paddingRight: '4px',
  },
  valueText: {
    fontSize: '13px',
    fontWeight: 400,
    color: tokens.colorNeutralForeground1,
  },
  valueNA: {
    color: tokens.colorNeutralForeground3,
  },

  /* Units column */
  unitCell: {
    width: '32px',
    flexShrink: 0,
    textAlign: 'center',
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  /* Landscape-only data columns */
  subLabelCell: {
    width: '100px',
    flexShrink: 0,
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    fontWeight: 400,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    paddingLeft: '4px',
  },
  modeCell: {
    width: '70px',
    flexShrink: 0,
    textAlign: 'center' as const,
    fontSize: '11px',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  modeCellAuto: {
    color: '#107c10',
  },
  modeCellManual: {
    color: '#ca5010',
  },
  rangeCell: {
    width: '90px',
    flexShrink: 0,
    textAlign: 'right' as const,
    paddingRight: '4px',
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rangeCellClickable: {
    cursor: 'pointer',
    color: '#0078d4',
    textDecorationLine: 'underline',
    ':active': { color: '#004578' },
  },
  /* Tier 2 (≥800px) data columns */
  statusCell: {
    width: '80px',
    flexShrink: 0,
    textAlign: 'center' as const,
    fontSize: '11px',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: tokens.colorNeutralForeground3,
  },
  typeCell: {
    width: '70px',
    flexShrink: 0,
    textAlign: 'center' as const,
    fontSize: '11px',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: tokens.colorNeutralForeground2,
  },
  /* Tier 3 (≥1000px) data columns */
  calibrationCell: {
    width: '80px',
    flexShrink: 0,
    textAlign: 'right' as const,
    paddingRight: '4px',
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  signalTypeCell: {
    width: '90px',
    flexShrink: 0,
    textAlign: 'center' as const,
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  /* Chevron */
  chevronCell: {
    width: '16px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground3,
  },

  /* ── Expanded section ── */
  expanded: {
    backgroundColor: '#f5f5f5',
    borderBottom: `1px solid #edebe9`,
    padding: '0',
  },
  propGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    borderTop: '1px solid #e0e0e0',
    borderLeft: '1px solid #e0e0e0',
  },
  propRow: {
    flex: '1 1 140px',
    minWidth: '140px',
    display: 'flex',
    flexDirection: 'column',
    padding: '6px 10px',
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
  },
  propRowLast: {
    // kept for API compat
  },
  propKey: {
    fontSize: '10px',
    color: '#8a8886',
    fontWeight: 600,
    textTransform: 'uppercase' as 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '2px',
  },
  propVal: {
    fontSize: '12px',
    color: '#323130',
    fontWeight: 400,
    wordBreak: 'break-word' as 'break-word',
  },
});

/* ─────────────────────────────────────────── Types ── */

export interface PointDetail {
  label: string;
  value: React.ReactNode;
}

export type PointStatusColor = 'auto' | 'manual' | 'error' | 'none';

export interface PointListRowProps {
  /** Short point ID shown in first column, e.g. "IN1" or "#3" */
  pointId: string;
  /** Primary label / full label */
  label: string;
  /** Formatted value string, e.g. "0.00" or "N/A" */
  value?: string;
  /** Unit string shown in Units column, e.g. "°F" or "5" */
  unit?: string;
  /** Range label shown in Range column, e.g. "Unused" or "0-10V" */
  range?: string;
  /** Short label shown between full label and value columns */
  subLabel?: string;
  /** Mode string shown in landscape, e.g. "Auto" or "Manual" */
  mode?: string;
  /** Status text shown at tier 2 (≥800px) */
  statusText?: string;
  /** Type text shown at tier 2 (≥800px), e.g. "Digital" or "Analog" */
  typeText?: string;
  /** Calibration value shown at tier 3 (≥1000px) */
  calibration?: string;
  /** Signal type shown at tier 3 (≥1000px) */
  signalType?: string;
  /** Status color — used only for inline badge color, no left bar */
  statusColor?: PointStatusColor;
  /** Text shown as inline badge pill next to label — omit to hide */
  badgeText?: string;
  /** Detail fields shown in the expanded accordion */
  details?: PointDetail[];
  /** Controlled expanded state */
  expanded?: boolean;
  /** Called when the row is clicked to toggle expand */
  onToggle?: () => void;
  /** Called when the range cell is tapped (mobile range picker) */
  onRangeClick?: () => void;
  /** Kept for API compatibility */
  onRefresh?: () => void;
  refreshing?: boolean;
}

/* ─────────────────────────────────────────── Header ── */

export interface PointListHeaderProps {
  idLabel?: string;
  labelLabel?: string;
  subLabelLabel?: string;
  modeLabel?: string;
  valueLabel?: string;
  unitLabel?: string;
  rangeLabel?: string;
  statusLabel?: string;
  typeLabel?: string;
  calibrationLabel?: string;
  signalTypeLabel?: string;
}

export const PointListHeader: React.FC<PointListHeaderProps> = ({
  idLabel = 'ID',
  labelLabel = 'Label',
  subLabelLabel = 'Label',
  modeLabel = 'Mode',
  valueLabel = 'Value',
  unitLabel = 'Units',
  rangeLabel = 'Range',
  statusLabel = 'Status',
  typeLabel = 'Type',
  calibrationLabel = 'Calibration',
  signalTypeLabel = 'Signal Type',
}) => {
  const styles = useStyles();
  const vw = useViewportWidth();
  const isWide = vw >= T1;
  const isVeryWide = vw >= T2;
  const isExtraWide = vw >= T3;
  return (
    <div className={styles.headerRow}>
      <span className={mergeClasses(styles.headerCell, styles.headerId)}>{idLabel}</span>
      <span className={mergeClasses(styles.headerCell, styles.headerLabel, isWide && styles.headerLabelWide)}>{labelLabel}</span>
      {isWide && <span className={mergeClasses(styles.headerCell, styles.headerSubLabel)}>{subLabelLabel}</span>}
      {isWide && <span className={mergeClasses(styles.headerCell, styles.headerMode)}>{modeLabel}</span>}
      <span className={mergeClasses(styles.headerCell, styles.headerValue)}>{valueLabel}</span>
      <span className={mergeClasses(styles.headerCell, styles.headerUnit)}>{unitLabel}</span>
      {isWide && <span className={mergeClasses(styles.headerCell, styles.headerRange)}>{rangeLabel}</span>}
      {isVeryWide && <span className={mergeClasses(styles.headerCell, styles.headerStatus)}>{statusLabel}</span>}
      {isVeryWide && <span className={mergeClasses(styles.headerCell, styles.headerType)}>{typeLabel}</span>}
      {isExtraWide && <span className={mergeClasses(styles.headerCell, styles.headerCalibration)}>{calibrationLabel}</span>}
      {isExtraWide && <span className={mergeClasses(styles.headerCell, styles.headerSignalType)}>{signalTypeLabel}</span>}
      <span className={styles.headerChevron} />
    </div>
  );
};

/* ─────────────────────────────────────────── Row ── */

export const PointListRow: React.FC<PointListRowProps> = React.memo(({
  pointId,
  label,
  subLabel,
  mode,
  statusText,
  typeText,
  calibration,
  signalType,
  value,
  unit,
  range,
  statusColor = 'none',
  badgeText,
  details = [],
  expanded = false,
  onToggle,
  onRangeClick,
  onRefresh: _onRefresh,
  refreshing: _refreshing,
}) => {
  const styles = useStyles();
  const vw = useViewportWidth();
  const isWide = vw >= T1;
  const isVeryWide = vw >= T2;
  const isExtraWide = vw >= T3;

  const isNA = !value || value === 'N/A';

  return (
    <>
      <button
        className={mergeClasses(styles.row, expanded && styles.rowExpanded)}
        onClick={onToggle}
        type="button"
      >
        <div className={styles.rowInner}>
          {/* Point ID */}
          <span className={styles.idCell}>{pointId}</span>

          {/* Label + optional inline badge */}
          <div className={mergeClasses(styles.labelCell, isWide && styles.labelCellWide)}>
            <span className={styles.labelText}>{label}</span>
            {badgeText && (
              <span className={mergeClasses(styles.badge, statusColor === 'error' && styles.badgeError)}>
                {badgeText}
              </span>
            )}
          </div>

          {/* Sub-label — wide viewport only */}
          {isWide && (
            <span className={styles.subLabelCell}>{subLabel ?? '—'}</span>
          )}

          {/* Mode — wide viewport only */}
          {isWide && (
            <span className={mergeClasses(
              styles.modeCell,
              mode === 'Auto' ? styles.modeCellAuto : mode === 'Manual' ? styles.modeCellManual : undefined
            )}>{mode ?? '—'}</span>
          )}

          {/* Value */}
          <div className={styles.valueCell}>
            <span className={mergeClasses(styles.valueText, isNA && styles.valueNA)}>
              {value ?? '—'}
            </span>
          </div>

          {/* Units */}
          <span className={styles.unitCell}>{unit ?? ''}</span>

          {/* Range — tier 1 only */}
          {isWide && (
            <span
              className={mergeClasses(styles.rangeCell, onRangeClick && styles.rangeCellClickable)}
              onClick={onRangeClick ? (e) => { e.stopPropagation(); onRangeClick(); } : undefined}
            >
              {range ?? '—'}
            </span>
          )}

          {/* Status — tier 2 */}
          {isVeryWide && (
            <span className={styles.statusCell}>{statusText ?? '—'}</span>
          )}

          {/* Type — tier 2 */}
          {isVeryWide && (
            <span className={styles.typeCell}>{typeText ?? '—'}</span>
          )}

          {/* Calibration — tier 3 */}
          {isExtraWide && (
            <span className={styles.calibrationCell}>{calibration ?? '—'}</span>
          )}

          {/* Signal Type — tier 3 */}
          {isExtraWide && (
            <span className={styles.signalTypeCell}>{signalType ?? '—'}</span>
          )}

          {/* Chevron */}
          <span className={styles.chevronCell}>
            {expanded ? <ChevronUpRegular fontSize={13} /> : <ChevronDownRegular fontSize={13} />}
          </span>
        </div>
      </button>

      {/* Expanded accordion */}
      {expanded && (
        <div className={styles.expanded}>
          <div className={styles.propGrid}>
            {details.map((d, i) => (
              <div
                key={i}
                className={mergeClasses(styles.propRow, i === details.length - 1 && styles.propRowLast)}
              >
                <span className={styles.propKey}>{d.label}</span>
                <span className={styles.propVal}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}, (prev, next) => {
  // Only re-render when the displayed data or expand state changes.
  // Intentionally skip onToggle/details reference comparison — inline arrays/functions
  // change every render but their content only changes when the scalar props change.
  return prev.expanded   === next.expanded   &&
         prev.pointId    === next.pointId    &&
         prev.label      === next.label      &&
         prev.subLabel   === next.subLabel   &&
         prev.mode       === next.mode       &&
         prev.statusText === next.statusText &&
         prev.typeText   === next.typeText   &&
         prev.calibration === next.calibration &&
         prev.signalType  === next.signalType  &&
         prev.value      === next.value      &&
         prev.unit       === next.unit       &&
         prev.range      === next.range      &&
         prev.badgeText  === next.badgeText  &&
         prev.statusColor === next.statusColor &&
         prev.onRangeClick === next.onRangeClick;
});
