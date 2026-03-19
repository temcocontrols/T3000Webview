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
  Badge,
} from '@fluentui/react-components';
import {
  ErrorCircleRegular,
  ArrowSyncRegular,
  AlertRegular,
} from '@fluentui/react-icons';
import { MobileLayout } from '../../../layout/MobileLayout';
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
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  deviceInfo: {
    padding: '12px 16px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: '16px',
  },
  alarmMeta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: '4px',
  },
});

const getAcknowledgedColor = (acknowledged: string): 'success' | 'warning' | 'danger' => {
  if (acknowledged === '1' || acknowledged.toLowerCase() === 'yes') return 'success';
  return 'danger';
};

const getStatusColor = (status: string): 'success' | 'warning' | 'informative' => {
  if (status === '1' || status.toLowerCase() === 'resolved') return 'success';
  return 'warning';
};

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

  if (loading && alarms.length === 0) {
    return (
      <MobileLayout appBarProps={{ title: 'Alarms', showRefresh: false }}>
        <div className={styles.loadingContainer}>
          <Spinner label="Loading alarms..." size="large" />
        </div>
      </MobileLayout>
    );
  }

  if (error && alarms.length === 0) {
    return (
      <MobileLayout appBarProps={{ title: 'Alarms', onRefresh: handleRefresh }}>
        <div className={styles.errorState}>
          <ErrorCircleRegular fontSize={48} color={tokens.colorPaletteRedForeground1} />
          <Text size={400} weight="semibold">Failed to load alarms</Text>
          <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>{error}</Text>
          <Button appearance="primary" icon={<ArrowSyncRegular />} onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      </MobileLayout>
    );
  }

  if (!selectedDevice) {
    return (
      <MobileLayout appBarProps={{ title: 'Alarms' }}>
        <div className={styles.emptyState}>
          <Text size={500} weight="semibold">No Device Selected</Text>
          <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
            Please select a device from the tree to view alarms
          </Text>
        </div>
      </MobileLayout>
    );
  }

  if (alarms.length === 0) {
    return (
      <MobileLayout appBarProps={{ title: 'Alarms', onRefresh: handleRefreshFromDevice }}>
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
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      appBarProps={{
        title: `Alarms (${alarms.length})`,
        onRefresh: handleRefreshFromDevice,
      }}
    >
      <div className={styles.container}>
        <div className={styles.deviceInfo}>
          <Text size={300} weight="semibold" style={{ display: 'block', marginBottom: '4px' }}>Device</Text>
          <Text size={400}>{selectedDevice.nameShowOnTree}</Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>
            SN: {selectedDevice.serialNumber}
          </Text>
        </div>
        <div className={styles.cardList}>
          {alarms.map((alarm) => {
            const isRefreshing = refreshingItems.has(alarm.alarm_id);

            return (
              <MobileCard
                key={alarm.alarm_id}
                title={alarm.message || `Alarm #${alarm.alarm_id}`}
                subtitle={alarm.time_stamp ? `${alarm.panel} • ${alarm.time_stamp}` : alarm.panel}
                onRefresh={() => handleRefreshSingleAlarm(alarm)}
                refreshing={isRefreshing}
              >
                <div className={styles.alarmMeta}>
                  <Badge
                    appearance="filled"
                    color={getAcknowledgedColor(alarm.acknowledged)}
                    size="small"
                  >
                    {alarm.acknowledged === '1' ? 'ACK' : 'Unacknowledged'}
                  </Badge>
                  <Badge
                    appearance="outline"
                    color={getStatusColor(alarm.status)}
                    size="small"
                  >
                    {alarm.status === '1' ? 'Resolved' : 'Active'}
                  </Badge>
                  {alarm.priority && (
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                      Priority: {alarm.priority}
                    </Text>
                  )}
                </div>
              </MobileCard>
            );
          })}
        </div>
      </div>
    </MobileLayout>
  );
};
