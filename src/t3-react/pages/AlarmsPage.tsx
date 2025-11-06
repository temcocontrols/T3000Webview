/**
 * AlarmsPage Component
 *
 * Display and manage system alarms
 */

import React, { useEffect, useState } from 'react';
import { Button, Badge, makeStyles, tokens } from '@fluentui/react-components';
import { AlertRegular, DismissRegular, CheckmarkRegular } from '@fluentui/react-icons';
import { DataTable, Column, LoadingSpinner, EmptyState, SearchBox } from '@t3-react/components';
import { useDeviceData } from '@t3-react/hooks';
import { useAlarmStore } from '@t3-react/store';
import type { Alarm } from '@common/types/bacnet';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  toolbar: {
    padding: '16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
  },
  stats: {
    display: 'flex',
    gap: '16px',
    marginLeft: 'auto',
  },
});

export const AlarmsPage: React.FC = () => {
  const styles = useStyles();
  const { selectedDevice } = useDeviceData();
  const alarms = useAlarmStore((state) => state.alarms);
  const activeCount = useAlarmStore((state) => state.activeCount);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (selectedDevice) {
      loadAlarms();
    }
  }, [selectedDevice]);

  const loadAlarms = async () => {
    setLoading(true);
    try {
      // TODO: Fetch alarms
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = (alarmId: number) => {
    // TODO: Acknowledge alarm via API
    console.log('Acknowledging alarm:', alarmId);
  };

  const handleClear = (alarmId: number) => {
    // TODO: Clear alarm via API
    console.log('Clearing alarm:', alarmId);
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, any> = {
      critical: 'danger',
      warning: 'warning',
      info: 'informative',
    };
    return (
      <Badge appearance="filled" color={colors[severity] || 'subtle'}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const columns: Column<Alarm>[] = [
    {
      key: 'timestamp',
      label: 'Time',
      sortable: true,
      render: (row) => new Date(row.timestamp).toLocaleString(),
      width: '180px',
    },
    {
      key: 'severity',
      label: 'Severity',
      sortable: true,
      render: (row) => getSeverityBadge(row.severity),
      width: '120px',
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      filterable: true,
    },
    {
      key: 'message',
      label: 'Message',
      filterable: true,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (row.acknowledged ? 'Acknowledged' : 'Active'),
      width: '120px',
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '120px',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          {!row.acknowledged && (
            <Button
              appearance="subtle"
              size="small"
              icon={<CheckmarkRegular />}
              onClick={() => handleAcknowledge(row.id)}
            />
          )}
          <Button
            appearance="subtle"
            size="small"
            icon={<DismissRegular />}
            onClick={() => handleClear(row.id)}
          />
        </div>
      ),
    },
  ];

  // Filter alarms based on search query
  const filteredAlarms = searchQuery
    ? alarms.filter(
        (alarm) =>
          alarm.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          alarm.source.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : alarms;

  if (!selectedDevice) {
    return (
      <div className={styles.container}>
        <EmptyState
          title="No Device Selected"
          message="Please select a device from the tree to view alarms"
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading alarms..." />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <AlertRegular />
        <span>System Alarms</span>
        <SearchBox
          placeholder="Search alarms..."
          onSearch={setSearchQuery}
        />
        <div className={styles.stats}>
          <Badge appearance="filled" color="danger">
            {activeCount} Active
          </Badge>
          <Badge appearance="filled" color="subtle">
            {alarms.length} Total
          </Badge>
        </div>
      </div>

      <div className={styles.content}>
        {filteredAlarms.length === 0 ? (
          <EmptyState
            title="No Alarms"
            message={
              searchQuery
                ? 'No alarms match your search'
                : 'No alarms found for this device'
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredAlarms}
            keyField="id"
            searchable={false}
          />
        )}
      </div>
    </div>
  );
};
