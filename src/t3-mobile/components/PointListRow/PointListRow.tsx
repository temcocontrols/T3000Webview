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

import React from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { ChevronDownRegular, ChevronUpRegular } from '@fluentui/react-icons';

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
    fontWeight: 700,
    color: tokens.colorNeutralForeground1,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headerId: {
    width: '44px',
    flexShrink: 0,
  },
  headerLabel: {
    flex: 1,
    paddingLeft: '6px',
  },
  headerValue: {
    width: '52px',
    flexShrink: 0,
    textAlign: 'right',
    paddingRight: '4px',
  },
  headerUnit: {
    width: '40px',
    flexShrink: 0,
    textAlign: 'center',
  },
  headerRange: {
    width: '60px',
    flexShrink: 0,
  },
  headerSubLabel: {
    width: '72px',
    flexShrink: 0,
    paddingLeft: '6px',
  },
  headerChevron: {
    width: '20px',
    flexShrink: 0,
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
    width: '44px',
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
    width: '52px',
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
    width: '40px',
    flexShrink: 0,
    textAlign: 'center',
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  /* Range column */
  rangeCell: {
    width: '60px',
    flexShrink: 0,
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  /* Short label column */
  subLabelCell: {
    width: '72px',
    flexShrink: 0,
    paddingLeft: '6px',
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  /* Chevron */
  chevronCell: {
    width: '20px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground3,
  },

  /* ── Expanded section ── */
  expanded: {
    backgroundColor: '#f6f7f9',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    padding: '6px 10px 8px',
  },
  chipWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
  },
  chip: {
    flex: '1 1 110px',
    minWidth: '110px',
    backgroundColor: '#ffffff',
    border: `1px solid #edebe9`,
    borderRadius: '4px',
    padding: '4px 8px 5px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    overflow: 'hidden',
  },
  chipLabel: {
    fontSize: '9px',
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontWeight: 600,
  },
  chipValue: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground1,
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
  /** Kept for API compatibility */
  onRefresh?: () => void;
  refreshing?: boolean;
}

/* ─────────────────────────────────────────── Header ── */

export interface PointListHeaderProps {
  idLabel?: string;
  labelLabel?: string;
  subLabelLabel?: string;
  valueLabel?: string;
  unitLabel?: string;
  rangeLabel?: string;
}

export const PointListHeader: React.FC<PointListHeaderProps> = ({
  idLabel = 'ID',
  labelLabel = 'Label',
  subLabelLabel,
  valueLabel = 'Value',
  unitLabel = 'Units',
  rangeLabel = 'Range',
}) => {
  const styles = useStyles();
  return (
    <div className={styles.headerRow}>
      <span className={mergeClasses(styles.headerCell, styles.headerId)}>{idLabel}</span>
      <span className={mergeClasses(styles.headerCell, styles.headerLabel)}>{labelLabel}</span>
      {subLabelLabel && <span className={mergeClasses(styles.headerCell, styles.headerSubLabel)}>{subLabelLabel}</span>}
      <span className={mergeClasses(styles.headerCell, styles.headerValue)}>{valueLabel}</span>
      <span className={mergeClasses(styles.headerCell, styles.headerUnit)}>{unitLabel}</span>
      <span className={mergeClasses(styles.headerCell, styles.headerRange)}>{rangeLabel}</span>
      <span className={styles.headerChevron} />
    </div>
  );
};

/* ─────────────────────────────────────────── Row ── */

export const PointListRow: React.FC<PointListRowProps> = React.memo(({
  pointId,
  label,
  subLabel,
  value,
  unit,
  range,
  statusColor = 'none',
  badgeText,
  details = [],
  expanded = false,
  onToggle,
  onRefresh: _onRefresh,
  refreshing: _refreshing,
}) => {
  const styles = useStyles();

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
          <div className={styles.labelCell}>
            <span className={styles.labelText}>{label}</span>
            {badgeText && (
              <span className={mergeClasses(styles.badge, statusColor === 'error' && styles.badgeError)}>
                {badgeText}
              </span>
            )}
          </div>

          {/* Short label */}
          {subLabel !== undefined && <span className={styles.subLabelCell}>{subLabel}</span>}

          {/* Value */}
          <div className={styles.valueCell}>
            <span className={mergeClasses(styles.valueText, isNA && styles.valueNA)}>
              {value ?? '—'}
            </span>
          </div>

          {/* Units */}
          <span className={styles.unitCell}>{unit ?? ''}</span>

          {/* Range */}
          <span className={styles.rangeCell}>{range ?? ''}</span>

          {/* Chevron */}
          <span className={styles.chevronCell}>
            {expanded ? <ChevronUpRegular fontSize={13} /> : <ChevronDownRegular fontSize={13} />}
          </span>
        </div>
      </button>

      {/* Expanded accordion */}
      {expanded && (
        <div className={styles.expanded}>
          {details.length > 0 && (
            <div className={styles.chipWrap}>
              {details.map((d, i) => (
                <div key={i} className={styles.chip}>
                  <span className={styles.chipLabel}>{d.label}</span>
                  <span className={styles.chipValue}>{d.value}</span>
                </div>
              ))}
            </div>
          )}
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
         prev.value      === next.value      &&
         prev.unit       === next.unit       &&
         prev.range      === next.range      &&
         prev.badgeText  === next.badgeText  &&
         prev.statusColor === next.statusColor;
});
