/**
 * Mobile Alarms Page
 * Compact list view for Alarms — new design with action bar + column header.
 */

import React, { useState } from 'react';
import {
  Spinner,
  Text,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ErrorCircleRegular,
  ArrowSyncRegular,
  AlertRegular,
  ArrowDownloadRegular,
  SettingsRegular,
  SearchRegular,
} from '@fluentui/react-icons';
import { useMobilePage } from '../../../layout/MobilePageContext';
import { PointListRow, PointListHeader } from '../../../components/PointListRow/PointListRow';
import { useAlarmsPage } from '../../../../shared/features/alarms/hooks/useAlarmsPage';

const useStyles = makeStyles({
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  actionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 8px',
    backgroundColor: '#ffffff',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
  searchBox: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    height: '32px',
    padding: '0 10px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: '13px',
    color: tokens.colorNeutralForeground3,
    cursor: 'text',
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'none',
    outline: 'none',
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
    fontFamily: 'inherit',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    border: 'none',
    background: 'none',
    color: '#424242',
    cursor: 'pointer',
    flexShrink: 0,
    fontSize: '16px',
    ':hover': { backgroundColor: 'rgba(0,0,0,0.06)' },
    ':active': { backgroundColor: 'rgba(0,0,0,0.1)' },
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
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
});

export const AlarmsPageMobile: React.FC = () => {
  const styles = useStyles();
  const [search, setSearch] = useState('');
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
        <Button appearance="primary" icon={<ArrowSyncRegular />} onClick={handleRefresh}>Try Again</Button>
      </div>
    );
  }

  if (!selectedDevice) {
    return (
      <div className={styles.emptyState}>
        <Text size={400} weight="semibold">No Device Selected</Text>
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
        <Button appearance="primary" icon={<ArrowSyncRegular />} onClick={handleRefreshFromDevice} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh from Device'}
        </Button>
      </div>
    );
  }

  const filtered = search.trim()
    ? alarms.filter((alarm) =>
        (alarm.message || '').toLowerCase().includes(search.toLowerCase()) ||
        String(alarm.alarm_id).includes(search)
      )
    : alarms;

  return (
    <div className={styles.wrapper}>
      <div className={styles.actionBar}>
        <div className={styles.searchBox}>
          <SearchRegular fontSize={14} />
          <input
            className={styles.searchInput}
            placeholder="Search alarms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className={styles.actionBtn} onClick={handleRefreshFromDevice} disabled={refreshing} title="Refresh from device" aria-label="Refresh from device">
          <ArrowSyncRegular fontSize={16} />
        </button>
        <button className={styles.actionBtn} title="Export to CSV" aria-label="Export to CSV">
          <ArrowDownloadRegular fontSize={16} />
        </button>
        <button className={styles.actionBtn} title="Settings" aria-label="Settings">
          <SettingsRegular fontSize={16} />
        </button>
      </div>

      <PointListHeader idLabel="Alarm" labelLabel="Message" valueLabel="Status" />

      <div className={styles.list}>
        {filtered.map((alarm) => {
          const isRefreshing = refreshingItems.has(alarm.alarm_id);
          const isAcknowledged = alarm.acknowledged === '1' || alarm.acknowledged?.toLowerCase() === 'yes';
          const isResolved = alarm.status === '1' || alarm.status?.toLowerCase() === 'resolved';

          return (
            <PointListRow
              key={alarm.alarm_id}
              pointId={`#${alarm.alarm_id}`}
              label={alarm.message || `Alarm ${alarm.alarm_id}`}
              value={isAcknowledged ? 'ACK' : 'UNACK'}
              statusColor={!isAcknowledged ? 'error' : isResolved ? 'auto' : 'manual'}
              badgeText={!isAcknowledged ? 'UNACK' : undefined}
              details={[
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
