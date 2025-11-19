import React, { useState, useEffect, useCallback } from 'react';
import {
  DataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  TableColumnDefinition,
  createTableColumn,
  TableCellLayout,
  Button,
  Spinner,
  Text,
  Badge,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  AddRegular,
  DeleteRegular,
  SearchRegular,
  ArrowSortUpRegular,
  ArrowSortDownRegular,
  ArrowSortRegular,
} from '@fluentui/react-icons';
import styles from './DiscoverPage.module.css';

// Device interface matching C++ Scan dialog structure
interface Device {
  id: string;
  model: string;           // SCAN_TABLE_TYPE (Model)
  building: string;        // SCAN_TABLE_BUILDING
  floor: string;           // SCAN_TABLE_FLOOR
  room: string;            // SCAN_TABLE_ROOM
  subnet: string;          // SCAN_TABLE_SUBNET (Sub_net)
  serialNumber: string;    // SCAN_TABLE_SERIALID (Serial#)
  ipAddress: string;       // SCAN_TABLE_IPADDRESS (IP Address)
  port: string;            // SCAN_TABLE_COMPORT (Port)
  protocol: string;        // SCAN_TABLE_PROTOCOL (Protocol)
  modbusId: string;        // SCAN_TABLE_MODBUSID (ID)
}

export const DiscoverPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending');

  // Fetch devices - only called manually
  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/discover/devices');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDevices(data);
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  }, []);

  // DO NOT auto-fetch on mount - wait for user to click "Start Scan"
  // useEffect(() => {
  //   fetchDevices();
  // }, [fetchDevices]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDevices();
    setRefreshing(false);
  };

  // Start Scan handler
  const handleAddDevice = () => {
    console.log('Start scan clicked');
    fetchDevices();
  };

  // Delete device handler
  const handleDeleteDevice = () => {
    console.log('Delete device clicked');
    // TODO: Implement delete device functionality
  };

  // Search handler
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // Sort handler
  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
    } else {
      setSortColumn(columnId);
      setSortDirection('ascending');
    }
  };

  // Filter devices based on search query
  const filteredDevices = devices.filter((device) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      device.model.toLowerCase().includes(query) ||
      device.building.toLowerCase().includes(query) ||
      device.floor.toLowerCase().includes(query) ||
      device.room.toLowerCase().includes(query) ||
      device.subnet.toLowerCase().includes(query) ||
      device.serialNumber.toLowerCase().includes(query) ||
      device.ipAddress.toLowerCase().includes(query) ||
      device.port.toLowerCase().includes(query) ||
      device.protocol.toLowerCase().includes(query) ||
      device.modbusId.toLowerCase().includes(query)
    );
  });

  // Column definitions matching C++ InitScanGrid()
  const columns: TableColumnDefinition<Device>[] = [
    createTableColumn<Device>({
      columnId: 'model',
      compare: (a, b) => a.model.localeCompare(b.model),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('model')}>
          <span>Model</span>
          {sortColumn === 'model' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.model}>
          {item.model}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'building',
      compare: (a, b) => a.building.localeCompare(b.building),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('building')}>
          <span>Building</span>
          {sortColumn === 'building' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.building}>
          {item.building}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'floor',
      compare: (a, b) => a.floor.localeCompare(b.floor),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('floor')}>
          <span>Floor</span>
          {sortColumn === 'floor' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.floor}>
          {item.floor}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'room',
      compare: (a, b) => a.room.localeCompare(b.room),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('room')}>
          <span>Room</span>
          {sortColumn === 'room' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.room}>
          {item.room}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'subnet',
      compare: (a, b) => a.subnet.localeCompare(b.subnet),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('subnet')}>
          <span>Sub_net</span>
          {sortColumn === 'subnet' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.subnet}>
          {item.subnet}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'serialNumber',
      compare: (a, b) => a.serialNumber.localeCompare(b.serialNumber),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('serialNumber')}>
          <span>Serial#</span>
          {sortColumn === 'serialNumber' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.serialNumber}>
          {item.serialNumber}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'ipAddress',
      compare: (a, b) => a.ipAddress.localeCompare(b.ipAddress),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('ipAddress')}>
          <span>IP Address</span>
          {sortColumn === 'ipAddress' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.ipAddress}>
          {item.ipAddress}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'port',
      compare: (a, b) => a.port.localeCompare(b.port),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('port')}>
          <span>Port</span>
          {sortColumn === 'port' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.port}>
          {item.port}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'protocol',
      compare: (a, b) => a.protocol.localeCompare(b.protocol),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('protocol')}>
          <span>Protocol</span>
          {sortColumn === 'protocol' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.protocol}>
          {item.protocol}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'modbusId',
      compare: (a, b) => a.modbusId.localeCompare(b.modbusId),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('modbusId')}>
          <span>ID</span>
          {sortColumn === 'modbusId' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.modbusId}>
          {item.modbusId}
        </TableCellLayout>
      ),
    }),
  ];

  return (
    <div className={styles.container}>
      <div className={styles.bladeContentContainer}>
        <div className={styles.bladeContentWrapper}>
          <div className={styles.bladeContent}>
            <div className={styles.partContent}>
              {/* Toolbar */}
              <div className={styles.toolbar}>
                <div className={styles.toolbarContainer}>
                  <button
                    className={styles.toolbarButton}
                    onClick={handleRefresh}
                    disabled={refreshing}
                    title="Refresh"
                    aria-label="Refresh"
                  >
                    <ArrowSyncRegular />
                    <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                  </button>

                  <button
                    className={styles.toolbarButton}
                    onClick={handleAddDevice}
                    title="Start Scan"
                    aria-label="Start Scan"
                  >
                    <AddRegular />
                    <span>Start Scan</span>
                  </button>

                  <div className={styles.toolbarSeparator} role="separator" />

                  <button
                    className={styles.toolbarButton}
                    onClick={handleDeleteDevice}
                    title="Delete Device"
                    aria-label="Delete Device"
                  >
                    <DeleteRegular />
                    <span>Delete Device</span>
                  </button>

                  <div className={styles.searchInputWrapper}>
                    <SearchRegular className={styles.searchIcon} />
                    <input
                      className={styles.searchInput}
                      type="text"
                      placeholder="Search devices..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search devices"
                    />
                  </div>
                </div>
              </div>

              <div style={{ padding: '0' }}>
                <hr className={styles.overviewHr} />
              </div>

              <div className={styles.dockingBody}>
                {/* Loading State */}
                {loading && (
                  <div className={styles.loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spinner size="small" />
                    <Text size={300} style={{ marginLeft: '8px' }}>Loading devices...</Text>
                  </div>
                )}

                {/* Error State */}
                {error && !loading && (
                  <div className={styles.noData}>
                    <div style={{ textAlign: 'center' }}>
                      <Badge appearance="filled" color="danger">Error</Badge>
                      <br />
                      <Text size={300}>{error}</Text>
                    </div>
                  </div>
                )}

                {/* Data Grid - Always show grid with headers */}
                {!loading && !error && (
                  <>
                  <DataGrid
                    items={filteredDevices}
                    columns={columns}
                    sortable
                    resizableColumns
                    columnSizingOptions={{
                      model: {
                        minWidth: 150,
                        defaultWidth: 200,
                      },
                      building: {
                        minWidth: 100,
                        defaultWidth: 130,
                      },
                      floor: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      room: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      subnet: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      serialNumber: {
                        minWidth: 100,
                        defaultWidth: 120,
                      },
                      ipAddress: {
                        minWidth: 120,
                        defaultWidth: 150,
                      },
                      port: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      protocol: {
                        minWidth: 100,
                        defaultWidth: 120,
                      },
                      modbusId: {
                        minWidth: 60,
                        defaultWidth: 80,
                      },
                    }}
                    focusMode="composite"
                  >
                    <DataGridHeader>
                      <DataGridRow>
                        {({ renderHeaderCell }) => (
                          <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                        )}
                      </DataGridRow>
                    </DataGridHeader>
                    <DataGridBody<Device>>
                      {({ item, rowId }) => (
                        <DataGridRow<Device> key={rowId}>
                          {({ renderCell }) => (
                            <DataGridCell>{renderCell(item)}</DataGridCell>
                          )}
                        </DataGridRow>
                      )}
                    </DataGridBody>
                  </DataGrid>

                  {/* No Data Message - Show below grid when empty */}
                  {devices.length === 0 && (
                    <div style={{ marginTop: '24px', textAlign: 'center', padding: '0 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                        </svg>
                        <Text size={400} weight="semibold">No devices found</Text>
                      </div>
                      <Text size={300} style={{ display: 'block', marginBottom: '16px', color: '#605e5c', textAlign: 'center' }}>Click "Start Scan" to discover devices on the network</Text>
                      <Button
                        appearance="subtle"
                        icon={<ArrowSyncRegular />}
                        onClick={handleRefresh}
                        style={{ minWidth: '120px', fontWeight: 'normal' }}
                      >
                        Refresh
                      </Button>
                    </div>
                  )}
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
