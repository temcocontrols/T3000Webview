/**
 * SchedulesPage Component
 *
 * Display and manage BACnet schedules
 */

import React, { useEffect, useState } from 'react';
import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { AddRegular, EditRegular, DeleteRegular } from '@fluentui/react-icons';
import { DataTable, Column, LoadingSpinner, EmptyState } from '@t3-react/components';
import { useBacnetApi, useDeviceData } from '@t3-react/hooks';
import { useBacnetStore } from '@t3-react/store';
import type { Schedule } from '@common/react/types/bacnet';

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
  },
  content: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
  },
});

export const SchedulesPage: React.FC = () => {
  const styles = useStyles();
  const { selectedDevice } = useDeviceData();
  const { fetchSchedules } = useBacnetApi();
  const schedules = useBacnetStore((state) => state.schedules);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDevice) {
      loadSchedules();
    }
  }, [selectedDevice]);

  const loadSchedules = async () => {
    if (!selectedDevice) return;

    setLoading(true);
    try {
      await fetchSchedules(selectedDevice.id);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<Schedule>[] = [
    {
      key: 'index',
      label: '#',
      sortable: true,
      width: '60px',
    },
    {
      key: 'label',
      label: 'Name',
      sortable: true,
      filterable: true,
    },
    {
      key: 'description',
      label: 'Description',
      filterable: true,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (row.status === 'active' ? 'Active' : 'Inactive'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button
            appearance="subtle"
            size="small"
            icon={<EditRegular />}
          />
          <Button
            appearance="subtle"
            size="small"
            icon={<DeleteRegular />}
          />
        </div>
      ),
    },
  ];

  if (!selectedDevice) {
    return (
      <div className={styles.container}>
        <EmptyState
          title="No Device Selected"
          message="Please select a device from the tree to view schedules"
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading schedules..." />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Button appearance="primary" icon={<AddRegular />}>
          Add Schedule
        </Button>
      </div>

      <div className={styles.content}>
        {schedules.length === 0 ? (
          <EmptyState
            title="No Schedules"
            message="No schedules found for this device"
          />
        ) : (
          <DataTable
            columns={columns}
            data={schedules}
            keyField="index"
          />
        )}
      </div>
    </div>
  );
};
