/**
 * Buildings Page - Azure Portal Pattern
 *
 * Building configuration management interface matching C++ BuildingConfigration.cpp
 * Displays list of buildings with protocol, connection settings and paths
 * Based on standardized InputsPage structure
 */

import React, { useState, useCallback } from 'react';
import {
  DataGrid,
  DataGridHeader,
  DataGridRow,
  DataGridHeaderCell,
  DataGridBody,
  DataGridCell,
  TableCellLayout,
  TableColumnDefinition,
  createTableColumn,
  Spinner,
  Text,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  AddRegular,
  DeleteRegular,
  SearchRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import styles from './BuildingsPage.module.css';

// Types based on C++ Building_Config struct
interface Building {
  id?: number;
  buildingName?: string;
  protocol?: string;
  ipAddress?: string;
  ipPort?: string;
  comPort?: string;
  baudRate?: string;
  buildingPath?: string;
}

export const BuildingsPage: React.FC = () => {
  const { selectedDevice } = useDeviceTreeStore();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch buildings
  const fetchBuildings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/buildings`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch buildings: ${response.statusText}`);
      }

      const data = await response.json();
      setBuildings(data.buildings || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load buildings';
      setError(errorMessage);
      console.error('Error fetching buildings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBuildings();
    setRefreshing(false);
  };

  const handleAdd = () => {
    console.log('Add building');
  };

  const handleDelete = () => {
    console.log('Delete building');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    console.log('Search query:', e.target.value);
  };

  // Display data with 10 empty rows when no buildings
  const displayBuildings = React.useMemo(() => {
    if (buildings.length === 0) {
      return Array(10).fill(null).map((_, index) => ({
        id: undefined,
        buildingName: '',
        protocol: '',
        ipAddress: '',
        ipPort: '',
        comPort: '',
        baudRate: '',
        buildingPath: '',
      }));
    }
    return buildings;
  }, [buildings]);

  // Helper to identify empty rows
  const isEmptyRow = (item: Building) => !item.id && buildings.length === 0;

  // Columns definition - matches C++ BuildingConfigration columns
  const columns: TableColumnDefinition<Building>[] = [
    createTableColumn<Building>({
      columnId: 'id',
      compare: (a, b) => (a.id || 0) - (b.id || 0),
      renderHeaderCell: () => 'Item',
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.id || '-')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Building>({
      columnId: 'buildingName',
      compare: (a, b) => (a.buildingName || '').localeCompare(b.buildingName || ''),
      renderHeaderCell: () => 'Building',
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.buildingName || '-')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Building>({
      columnId: 'protocol',
      compare: (a, b) => (a.protocol || '').localeCompare(b.protocol || ''),
      renderHeaderCell: () => 'Protocol',
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.protocol || '-')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Building>({
      columnId: 'ipAddress',
      compare: (a, b) => (a.ipAddress || '').localeCompare(b.ipAddress || ''),
      renderHeaderCell: () => 'IP/Domain/Tel#/SerialNumber',
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.ipAddress || '-')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Building>({
      columnId: 'ipPort',
      compare: (a, b) => (a.ipPort || '').localeCompare(b.ipPort || ''),
      renderHeaderCell: () => 'Modbus TCP Port',
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.ipPort || '-')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Building>({
      columnId: 'comPort',
      compare: (a, b) => (a.comPort || '').localeCompare(b.comPort || ''),
      renderHeaderCell: () => 'COM Port',
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.comPort || '-')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Building>({
      columnId: 'baudRate',
      compare: (a, b) => (a.baudRate || '').localeCompare(b.baudRate || ''),
      renderHeaderCell: () => 'Baud Rate',
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.baudRate || '-')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Building>({
      columnId: 'buildingPath',
      compare: (a, b) => (a.buildingPath || '').localeCompare(b.buildingPath || ''),
      renderHeaderCell: () => 'Building Path',
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.buildingPath || '-')}
        </TableCellLayout>
      ),
    }),
  ];

  return (
    <div className={styles.container}>
      {/* ========================================
          BLADE CONTENT CONTAINER
          Matches: fxs-blade-content-container-default-details
          ======================================== */}
      <div className={styles.bladeContentContainer}>
        <div className={styles.bladeContentWrapper}>
          <div className={styles.bladeContent}>
            <div className={styles.partContent}>

              {/* ========================================
                  ERROR MESSAGE (if any)
                  ======================================== */}
              {error && (
                <div style={{ marginBottom: '12px', padding: '8px 12px', backgroundColor: '#fef6f6', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ErrorCircleRegular style={{ color: '#d13438', fontSize: '16px', flexShrink: 0 }} />
                  <Text style={{ color: '#d13438', fontWeight: 500, fontSize: '13px' }}>
                    {error}
                  </Text>
                </div>
              )}

              {/* ========================================
                  TOOLBAR - Top Actions Bar
                  Matches: ext-overview-assistant-toolbar azc-toolbar
                  ======================================== */}
              {selectedDevice && (
              <>
              <div className={styles.toolbar}>
                <div className={styles.toolbarContainer}>
                  {/* Refresh Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleRefresh}
                    disabled={refreshing}
                    aria-label="Refresh"
                  >
                    <ArrowSyncRegular />
                    <span>Refresh</span>
                  </button>

                  {/* Add Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleAdd}
                    aria-label="Add Building"
                  >
                    <AddRegular />
                    <span>Add Building</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleDelete}
                    aria-label="Delete Building"
                  >
                    <DeleteRegular />
                    <span>Delete Building</span>
                  </button>

                  {/* Search Input Box */}
                  <div className={styles.searchInputWrapper}>
                    <SearchRegular className={styles.searchIcon} />
                    <input
                      className={styles.searchInput}
                      type="text"
                      placeholder="Search buildings..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search buildings"
                    />
                  </div>
                </div>
              </div>

              {/* ========================================
                  HORIZONTAL DIVIDER
                  Matches: ext-overview-hr
                  ======================================== */}
              <div style={{ padding: '0' }}>
                <hr className={styles.overviewHr} />
              </div>
              </>
              )}

              {/* ========================================
                  DOCKING BODY - Main Content
                  Matches: msportalfx-docking-body
                  ======================================== */}
              <div className={styles.dockingBody}>

                {/* Loading State */}
                {(loading || refreshing) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px' }}>
                    <Spinner size="tiny" />
                    <Text size={200} weight="regular">Loading buildings...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div className={styles.centerText}>
                      <Text size={400} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={200}>Please select a device from the tree to view inputs</Text>
                    </div>
                  </div>
                )}

                {/* Data Grid - Always show grid with headers */}
                {selectedDevice && !loading && (
                  <>
                  <DataGrid
                      items={displayBuildings}
                      columns={columns}
                      sortable
                      resizableColumns
                      columnSizingOptions={{
                        id: {
                          minWidth: 60,
                          defaultWidth: 80,
                        },
                        buildingName: {
                          minWidth: 120,
                          defaultWidth: 150,
                        },
                        protocol: {
                          minWidth: 100,
                          defaultWidth: 120,
                        },
                        ipAddress: {
                          minWidth: 150,
                          defaultWidth: 200,
                        },
                        ipPort: {
                          minWidth: 100,
                          defaultWidth: 120,
                        },
                        comPort: {
                          minWidth: 80,
                          defaultWidth: 100,
                        },
                        baudRate: {
                          minWidth: 80,
                          defaultWidth: 100,
                        },
                        buildingPath: {
                          minWidth: 200,
                          defaultWidth: 400,
                        },
                      }}
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

                    {/* No Data Message */}
                    {/* {buildings.length === 0 && (
                      <div style={{ marginTop: '24px', textAlign: 'center', padding: '0 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                          </svg>
                          <Text size={400} weight="semibold">No buildings found</Text>
                        </div>
                        <Text size={300} style={{ display: 'block', marginBottom: '16px', color: '#605e5c', textAlign: 'center' }}>No buildings configured in the system</Text>
                      </div>
                    )} */}
                </>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
