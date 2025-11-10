/**
 * Buildings Page
 *
 * Building management and configuration interface
 */

import React from 'react';
import { makeStyles, Title1, Button, Card, Text, DataGrid, DataGridHeader, DataGridRow, DataGridHeaderCell, DataGridBody, DataGridCell, TableColumnDefinition, createTableColumn } from '@fluentui/react-components';
import { AddRegular, BuildingRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    padding: '24px',
    height: '100%',
    overflowY: 'auto',
  },
  header: {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    marginTop: '20px',
  },
  card: {
    padding: '20px',
  },
  addButton: {
    minWidth: '120px',
  },
});

interface Building {
  id: string;
  name: string;
  location: string;
  devices: number;
  status: string;
}

/**
 * Buildings Page Component
 */
export const BuildingsPage: React.FC = () => {
  const styles = useStyles();
  const [buildings] = React.useState<Building[]>([]);

  const columns: TableColumnDefinition<Building>[] = [
    createTableColumn<Building>({
      columnId: 'name',
      renderHeaderCell: () => 'Building Name',
      renderCell: (item) => item.name,
    }),
    createTableColumn<Building>({
      columnId: 'location',
      renderHeaderCell: () => 'Location',
      renderCell: (item) => item.location,
    }),
    createTableColumn<Building>({
      columnId: 'devices',
      renderHeaderCell: () => 'Devices',
      renderCell: (item) => item.devices,
    }),
    createTableColumn<Building>({
      columnId: 'status',
      renderHeaderCell: () => 'Status',
      renderCell: (item) => item.status,
    }),
  ];

  const handleAddBuilding = () => {
    console.log('Add building clicked');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Title1>Buildings</Title1>
          <Text>Manage buildings and their associated devices</Text>
        </div>
        <Button
          className={styles.addButton}
          appearance="primary"
          icon={<AddRegular />}
          onClick={handleAddBuilding}
        >
          Add Building
        </Button>
      </div>

      <div className={styles.content}>
        {buildings.length === 0 ? (
          <Card className={styles.card}>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <BuildingRegular style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
              <Text>No buildings configured. Click "Add Building" to get started.</Text>
            </div>
          </Card>
        ) : (
          <Card className={styles.card}>
            <DataGrid
              items={buildings}
              columns={columns}
              sortable
              getRowId={(item) => item.id}
            >
              <DataGridHeader>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<Building>>
                {({ item, rowId }) => (
                  <DataGridRow<Building> key={rowId}>
                    {({ renderCell }) => (
                      <DataGridCell>{renderCell(item)}</DataGridCell>
                    )}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          </Card>
        )}
      </div>
    </div>
  );
};
