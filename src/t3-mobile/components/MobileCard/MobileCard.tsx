/**
 * Mobile Card Component
 * Generic card component for mobile views
 */

import React from 'react';
import {
  Card,
  Text,
  Badge,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ChevronRightRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  card: {
    marginBottom: '12px',
    cursor: 'pointer',
    '&:active': {
      transform: 'scale(0.98)',
      transition: 'transform 0.1s ease',
    },
  },
  cardContent: {
    padding: '12px 16px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  titleContainer: {
    flex: 1,
  },
  label: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  value: {
    fontSize: tokens.fontSizeBase400,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightRegular,
  },
  valueWithUnit: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  unit: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  badge: {
    marginLeft: '8px',
  },
  subtitle: {
    display: 'block',
    color: tokens.colorNeutralForeground3,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

export interface MobileCardProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  unit?: string;
  status?: string;
  badge?: string;
  onTap?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: React.ReactNode;
}

export const MobileCard: React.FC<MobileCardProps> = ({
  title,
  subtitle,
  value,
  unit,
  status,
  badge,
  onTap,
  onRefresh,
  refreshing = false,
  children,
}) => {
  const styles = useStyles();

  return (
    <Card
      className={styles.card}
      onClick={onTap}
      appearance="filled-alternative"
    >
      <div className={styles.cardContent}>
        <div className={styles.row}>
          <div className={styles.titleContainer}>
            <Text weight="semibold" size={400}>
              {title}
            </Text>
            {subtitle && (
              <Text size={200} className={styles.subtitle}>
                {subtitle}
              </Text>
            )}
          </div>
          {badge && (
            <Badge appearance="filled" color="informative" className={styles.badge}>
              {badge}
            </Badge>
          )}
          {onTap && <ChevronRightRegular fontSize={20} />}
        </div>

        {(value !== undefined || children) && (
          <div className={styles.row}>
            {value !== undefined ? (
              <div className={styles.valueWithUnit}>
                <Text className={styles.value}>{value}</Text>
                {unit && <Text className={styles.unit}>{unit}</Text>}
              </div>
            ) : (
              children
            )}
          </div>
        )}

        {status && (
          <div className={styles.row}>
            <Text className={styles.label}>Status</Text>
            <Text className={styles.value}>{status}</Text>
          </div>
        )}

        {onRefresh && (
          <div className={styles.actions}>
            <Button
              appearance="subtle"
              icon={<ArrowSyncRegular />}
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
