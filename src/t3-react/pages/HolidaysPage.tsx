/**
 * HolidaysPage Component
 *
 * Display and manage holiday schedules
 */

import React, { useEffect, useState } from 'react';
import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { AddRegular, EditRegular, DeleteRegular } from '@fluentui/react-icons';
import { DataTable, Column, LoadingSpinner, EmptyState } from '@t3-react/components';
import { useBacnetApi, useDeviceData } from '@t3-react/hooks';
import { useBacnetStore } from '@t3-react/store';
import type { Holiday } from '@common/types/bacnet';

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

export const HolidaysPage: React.FC = () => {
  const styles = useStyles();
  const { selectedDevice } = useDeviceData();
  const { fetchHolidays } = useBacnetApi();
  const holidays = useBacnetStore((state) => state.holidays);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDevice) {
      loadHolidays();
    }
  }, [selectedDevice]);

  const loadHolidays = async () => {
    if (!selectedDevice) return;

    setLoading(true);
    try {
      await fetchHolidays(selectedDevice.id);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<Holiday>[] = [
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
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (row) => new Date(row.date).toLocaleDateString(),
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
          message="Please select a device from the tree to view holidays"
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading holidays..." />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Button appearance="primary" icon={<AddRegular />}>
          Add Holiday
        </Button>
      </div>

      <div className={styles.content}>
        {holidays.length === 0 ? (
          <EmptyState
            title="No Holidays"
            message="No holidays configured for this device"
          />
        ) : (
          <DataTable
            columns={columns}
            data={holidays}
            keyField="index"
          />
        )}
      </div>
    </div>
  );
};
