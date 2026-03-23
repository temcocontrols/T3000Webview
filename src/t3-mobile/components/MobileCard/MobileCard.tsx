/**
 * Mobile Card Component
 * Generic card component for mobile views
 */

import React, { useState } from 'react';
import {
  Text,
  Button,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ChevronDownRegular,
  ChevronUpRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  row: {
    display: 'flex',
    alignItems: 'stretch',
    minHeight: '44px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    cursor: 'pointer',
    userSelect: 'none',
    '&:active': {
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  statusBar: {
    width: '3px',
    flexShrink: 0,
  },
  statusAuto: { backgroundColor: '#107c10' },
  statusManual: { backgroundColor: '#ca5010' },
  statusError: { backgroundColor: '#c42b1c' },
  statusNone: { backgroundColor: '#8a8a8a' },
  rowContent: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    padding: '10px',
    gap: '6px',
    overflow: 'hidden',
  },
  index: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
    minWidth: '28px',
  },
  titleText: {
    flex: 1,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  valueArea: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px',
    flexShrink: 0,
  },
  valueText: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  unitText: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  chevron: {
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  expandedSection: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: '12px 16px',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    marginBottom: '12px',
  },
  detailCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    paddingTop: '6px',
    paddingBottom: '6px',
  },
  detailCellLeft: {
    paddingRight: '12px',
  },
  detailCellRight: {
    paddingLeft: '12px',
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  detailLabel: {
    fontSize: '10px',
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  detailValue: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  refreshRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: '8px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

export interface DetailField {
  label: string;
  value: React.ReactNode;
}

export interface MobileCardProps {
  index?: string;
  title: string;
  displayValue?: string;
  displayUnit?: string;
  statusColor?: 'auto' | 'manual' | 'error' | 'none';
  expandedDetails?: DetailField[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const MobileCard: React.FC<MobileCardProps> = ({
  index,
  title,
  displayValue,
  displayUnit,
  statusColor = 'none',
  expandedDetails = [],
  onRefresh,
  refreshing = false,
}) => {
  const styles = useStyles();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div
        className={styles.row}
        onClick={() => setIsExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setIsExpanded((v) => !v)}
      >
        <div
          className={mergeClasses(
            styles.statusBar,
            statusColor === 'auto' && styles.statusAuto,
            statusColor === 'manual' && styles.statusManual,
            statusColor === 'error' && styles.statusError,
            statusColor === 'none' && styles.statusNone,
          )}
        />
        <div className={styles.rowContent}>
          {index && <Text className={styles.index}>{index}</Text>}
          <Text className={styles.titleText}>{title}</Text>
          {displayValue !== undefined && (
            <div className={styles.valueArea}>
              <Text className={styles.valueText}>{displayValue}</Text>
              {displayUnit && <Text className={styles.unitText}>{displayUnit}</Text>}
            </div>
          )}
          <span className={styles.chevron}>
            {isExpanded ? <ChevronUpRegular fontSize={14} /> : <ChevronDownRegular fontSize={14} />}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.expandedSection}>
          {expandedDetails.length > 0 && (
            <div className={styles.detailGrid}>
              {expandedDetails.map((field, i) => (
                <div
                  key={i}
                  className={mergeClasses(
                    styles.detailCell,
                    i % 2 === 0 ? styles.detailCellLeft : styles.detailCellRight,
                  )}
                >
                  <span className={styles.detailLabel}>{field.label}</span>
                  <span className={styles.detailValue}>{field.value}</span>
                </div>
              ))}
            </div>
          )}
          {onRefresh && (
            <div className={styles.refreshRow}>
              <Button
                appearance="subtle"
                icon={<ArrowSyncRegular />}
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                disabled={refreshing}
                size="small"
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
