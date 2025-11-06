/**
 * VariablesPage Component
 *
 * Display and edit BACnet variable points
 */

import React, { useEffect, useState } from 'react';
import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { AddRegular, EditRegular } from '@fluentui/react-icons';
import { DataTable, Column, LoadingSpinner, EmptyState, PointEditor } from '@t3-react/components';
import { useBacnetApi, useDeviceData } from '@t3-react/hooks';
import { useBacnetStore } from '@t3-react/store';
import type { VariablePoint } from '@common/types/bacnet';

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
  editor: {
    borderLeft: `1px solid ${tokens.colorNeutralStroke1}`,
    padding: '16px',
    width: '400px',
  },
});

export const VariablesPage: React.FC = () => {
  const styles = useStyles();
  const { selectedDevice } = useDeviceData();
  const { fetchVariables } = useBacnetApi();
  const variables = useBacnetStore((state) => state.variables);
  const [loading, setLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<VariablePoint | null>(null);

  useEffect(() => {
    if (selectedDevice) {
      loadVariables();
    }
  }, [selectedDevice]);

  const loadVariables = async () => {
    if (!selectedDevice) return;

    setLoading(true);
    try {
      await fetchVariables(selectedDevice.id);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePoint = async (point: VariablePoint) => {
    // TODO: Implement save via API
    console.log('Saving point:', point);
    setSelectedPoint(null);
  };

  const columns: Column<VariablePoint>[] = [
    {
      key: 'index',
      label: '#',
      sortable: true,
      width: '60px',
    },
    {
      key: 'label',
      label: 'Label',
      sortable: true,
      filterable: true,
    },
    {
      key: 'description',
      label: 'Description',
      filterable: true,
    },
    {
      key: 'value',
      label: 'Value',
      sortable: true,
      render: (row) => `${row.value} ${row.units || ''}`,
    },
    {
      key: 'auto',
      label: 'Mode',
      render: (row) => (row.auto ? 'Auto' : 'Manual'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <Button
          appearance="subtle"
          icon={<EditRegular />}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPoint(row);
          }}
        />
      ),
    },
  ];

  if (!selectedDevice) {
    return (
      <div className={styles.container}>
        <EmptyState
          title="No Device Selected"
          message="Please select a device from the tree to view variables"
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading variables..." />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Button appearance="primary" icon={<AddRegular />}>
          Add Variable
        </Button>
        <Button icon={<EditRegular />}>Refresh</Button>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        <div className={styles.content}>
          {variables.length === 0 ? (
            <EmptyState
              title="No Variables"
              message="No variable points found for this device"
            />
          ) : (
            <DataTable
              columns={columns}
              data={variables}
              keyField="index"
              onRowClick={(row) => setSelectedPoint(row)}
            />
          )}
        </div>

        {selectedPoint && (
          <div className={styles.editor}>
            <h3>Edit Variable</h3>
            <PointEditor
              point={selectedPoint}
              onSave={handleSavePoint}
              onCancel={() => setSelectedPoint(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
