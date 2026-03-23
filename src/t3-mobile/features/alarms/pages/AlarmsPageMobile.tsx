/**
 * Mobile Alarms Page
 * Card-based mobile view for Alarms
 * Uses shared useAlarmsPage hook for business logic
 */

import React from 'react';
import {
  Spinner,
  Text,
  makeStyles,
  tokens,
  Button,
} from '@fluentui/react-components';
import {
  ErrorCircleRegular,
  ArrowSyncRegular,
  AlertRegular,
} from '@fluentui/react-icons';
import { useMobilePage } from '../../../layout/MobilePageContext';
import { MobileCard } from '../../../components/MobileCard/MobileCard';
import { useAlarmsPage } from '../../../../shared/features/alarms/hooks/useAlarmsPage';

const useStyles = makeStyles({
  container: {
    paddingBottom: '24px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
    gap: '16px',
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    textAlign: 'center',
    gap: '12px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px',
  },
  cardList: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

export const AlarmsPageMobile: React.FC = () => {
  const styles = useStyles();
  const {
    alarms,
    loading,
    error,
    refreshing,
    refreshingItems,
    selectedDevice,
    handleRefresh,
    handleRefreshFromDevice,
    handleRefreshSingleAlarm,
  } = useAlarmsPage();

  const title = alarms.length > 0 ? `Alarms (${alarms.length})` : 'Alarms';
  useMobilePage({ title, onRefresh: error && alarms.length === 0 ? handleRefresh : handleRefreshFromDevice });

  if (loading && alarms.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner label="Loading alarms..." size="large" />
      </div>
    );
  }

  if (error && alarms.length === 0) {
    return (
      <div className={styles.errorState}>
        <ErrorCircleRegular fontSize={48} color={tokens.colorPaletteRedForeground1} />
        <Text size={400} weight="semibold">Failed to load alarms</Text>
        <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>{error}</Text>
        <Button appearance="primary" icon={<ArrowSyncRegular />} onClick={handleRefresh}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!selectedDevice) {
    return (
      <div className={styles.emptyState}>
        <Text size={500} weight="semibold">No Device Selected</Text>
        <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
          Please select a device from the tree to view alarms
        </Text>
      </div>
    );
  }

  if (alarms.length === 0) {
    return (
      <div className={styles.emptyState}>
        <AlertRegular fontSize={48} style={{ color: tokens.colorNeutralForeground3 }} />
        <Text size={500} weight="semibold">No Alarms Found</Text>
        <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
          Tap refresh to load alarms from device
        </Text>
        <Button
          appearance="primary"
          icon={<ArrowSyncRegular />}
          onClick={handleRefreshFromDevice}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh from Device'}
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.cardList}>
        {alarms.map((alarm) => {
          const isRefreshing = refreshingItems.has(alarm.alarm_id);
          const isAcknowledged = alarm.acknowledged === '1' || alarm.acknowledged?.toLowerCase() === 'yes';
          const isResolved = alarm.status === '1' || alarm.status?.toLowerCase() === 'resolved';

          return (
            <MobileCard
              key={alarm.alarm_id}
              index={`#${alarm.alarm_id}`}
              title={alarm.message || `Alarm ${alarm.alarm_id}`}
              displayValue={isAcknowledged ? 'ACK' : 'UNACK'}
              statusColor={!isAcknowledged ? 'error' : isResolved ? 'auto' : 'manual'}
              expandedDetails={[
                { label: 'Panel', value: alarm.panel || '-' },
                { label: 'Status', value: isResolved ? 'Resolved' : 'Active' },
                { label: 'Time', value: alarm.time_stamp || '-' },
                { label: 'ACK', value: isAcknowledged ? 'Acknowledged' : 'Pending' },
                ...(alarm.priority ? [{ label: 'Priority', value: alarm.priority }] : []),
              ]}
              onRefresh={() => handleRefreshSingleAlarm(alarm)}
              refreshing={isRefreshing}
            />
          );
        })}
      </div>
    </div>
  );
};
