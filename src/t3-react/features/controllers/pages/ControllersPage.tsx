/**
 * ControllersPage Component
 *
 * Display and manage BACnet controllers
 */

import React, { useEffect, useState } from 'react';
import { Button, makeStyles, tokens, Badge } from '@fluentui/react-components';
import { AddRegular, DeleteRegular, SettingsRegular } from '@fluentui/react-icons';
import { DataTable, Column, LoadingSpinner, EmptyState } from '@t3-react/components';
import { useDeviceData } from '@t3-react/hooks';
import { useDeviceStore } from '@t3-react/store';
import type { T3Device } from '@common/react/types/device';

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

export const ControllersPage: React.FC = () => {
  const styles = useStyles();
  const { selectedDevice, deviceCount } = useDeviceData();
  const devices = useDeviceStore((state) => state.devices);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadControllers();
  }, []);

  const loadControllers = async () => {
    setLoading(true);
    try {
      // TODO: Fetch controllers
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (deviceId: string) => {
    // TODO: Delete controller
    console.log('Deleting controller:', deviceId);
  };

  const columns: Column<T3Device>[] = [
    {
      key: 'label',
      label: 'Name',
      sortable: true,
      filterable: true,
    },
    {
      key: 'ipAddress',
      label: 'IP Address',
      sortable: true,
    },
    {
      key: 'serialNumber',
      label: 'Serial Number',
      sortable: true,
    },
    {
      key: 'modelName',
      label: 'Model',
      sortable: true,
    },
    {
      key: 'online',
      label: 'Status',
      render: (row) => (
        <Badge appearance="filled" color={row.online ? 'success' : 'danger'}>
          {row.online ? 'Online' : 'Offline'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button
            appearance="subtle"
            size="small"
            icon={<SettingsRegular />}
          />
          <Button
            appearance="subtle"
            size="small"
            icon={<DeleteRegular />}
            onClick={() => handleDelete(row.id)}
          />
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingSpinner message="Loading controllers..." />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Button appearance="primary" icon={<AddRegular />}>
          Add Controller
        </Button>
        <div style={{ flex: 1 }} />
        <span>{deviceCount} Controllers</span>
      </div>

      <div className={styles.content}>
        {devices.length === 0 ? (
          <EmptyState
            title="No Controllers"
            message="No controllers found in the network"
            action={{
              label: 'Add Controller',
              onClick: () => console.log('Add controller'),
            }}
          />
        ) : (
          <DataTable
            columns={columns}
            data={devices}
            keyField="id"
          />
        )}
      </div>
    </div>
  );
};
