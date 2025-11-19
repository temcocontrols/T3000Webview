import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Input,
  Spinner,
  Badge,
  makeStyles,
  shorthands,
  tokens,
  DataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  TableColumnDefinition,
  createTableColumn,
  TableCellLayout,
  TableRowId,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  AddRegular,
  DeleteRegular,
  SearchRegular,
} from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';
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

const DiscoverPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<TableRowId>>(new Set());

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/discover/devices`);
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

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDevices();
    setRefreshing(false);
  };

  // Add device handler
  const handleAddDevice = () => {
    console.log('Add device clicked');
    // TODO: Implement add device dialog
  };

  // Delete device handler
  const handleDeleteDevice = () => {
    if (selectedRows.size === 0) {
      alert('Please select at least one device to delete');
      return;
    }
    console.log('Delete devices:', Array.from(selectedRows));
    // TODO: Implement delete device functionality
  };

  // Search handler
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
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
      renderHeaderCell: () => 'Model',
      renderCell: (item) => (
        <TableCellLayout truncate title={item.model}>
          {item.model}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'building',
      compare: (a, b) => a.building.localeCompare(b.building),
      renderHeaderCell: () => 'Building',
      renderCell: (item) => (
        <TableCellLayout truncate title={item.building}>
          {item.building}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'floor',
      compare: (a, b) => a.floor.localeCompare(b.floor),
      renderHeaderCell: () => 'Floor',
      renderCell: (item) => (
        <TableCellLayout truncate title={item.floor}>
          {item.floor}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'room',
      compare: (a, b) => a.room.localeCompare(b.room),
      renderHeaderCell: () => 'Room',
      renderCell: (item) => (
        <TableCellLayout truncate title={item.room}>
          {item.room}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'subnet',
      compare: (a, b) => a.subnet.localeCompare(b.subnet),
      renderHeaderCell: () => 'Sub_net',
      renderCell: (item) => (
        <TableCellLayout truncate title={item.subnet}>
          {item.subnet}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'serialNumber',
      compare: (a, b) => a.serialNumber.localeCompare(b.serialNumber),
      renderHeaderCell: () => 'Serial#',
      renderCell: (item) => (
        <TableCellLayout truncate title={item.serialNumber}>
          {item.serialNumber}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'ipAddress',
      compare: (a, b) => a.ipAddress.localeCompare(b.ipAddress),
      renderHeaderCell: () => 'IP Address',
      renderCell: (item) => (
        <TableCellLayout truncate title={item.ipAddress}>
          {item.ipAddress}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'port',
      compare: (a, b) => a.port.localeCompare(b.port),
      renderHeaderCell: () => 'Port',
      renderCell: (item) => (
        <TableCellLayout truncate title={item.port}>
          {item.port}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'protocol',
      compare: (a, b) => a.protocol.localeCompare(b.protocol),
      renderHeaderCell: () => 'Protocol',
      renderCell: (item) => (
        <TableCellLayout truncate title={item.protocol}>
          {item.protocol}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'modbusId',
      compare: (a, b) => a.modbusId.localeCompare(b.modbusId),
      renderHeaderCell: () => 'ID',
      renderCell: (item) => (
        <TableCellLayout truncate title={item.modbusId}>
          {item.modbusId}
        </TableCellLayout>
      ),
    }),
  ];

  // Empty state
  if (!loading && devices.length === 0 && !error) {
    return (
      <div className={styles.container}>
        <div className={styles.bladeContentContainer}>
          <div className={styles.bladeContentWrapper}>
            <div className={styles.bladeContent}>
              <div className={styles.partContent}>
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>
                    <SearchRegular fontSize={48} />
                  </div>
                  <div className={styles.emptyStateText}>
                    <h3>No devices discovered</h3>
                    <p>Start a scan to discover devices on the network</p>
                  </div>
                  <Button
                    appearance="primary"
                    icon={<AddRegular />}
                    onClick={handleAddDevice}
                  >
                    Start Scan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.bladeContentContainer}>
        <div className={styles.bladeContentWrapper}>
          <div className={styles.bladeContent}>
            <div className={styles.partContent}>
              {/* Toolbar */}
              <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                  <Button
                    appearance="subtle"
                    icon={<ArrowSyncRegular />}
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  <Button
                    appearance="subtle"
                    icon={<AddRegular />}
                    onClick={handleAddDevice}
                  >
                    Start Scan
                  </Button>
                  <Button
                    appearance="subtle"
                    icon={<DeleteRegular />}
                    onClick={handleDeleteDevice}
                    disabled={selectedRows.size === 0}
                  >
                    Delete Device
                  </Button>
                  {selectedRows.size > 0 && (
                    <Badge appearance="filled" color="informative">
                      {selectedRows.size} selected
                    </Badge>
                  )}
                </div>
                <div className={styles.toolbarRight}>
                  <Input
                    className={styles.searchInput}
                    placeholder="Search devices..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    contentBefore={<SearchRegular />}
                  />
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className={styles.errorMessage}>
                  <Badge appearance="filled" color="danger">
                    Error
                  </Badge>
                  <span>{error}</span>
                </div>
              )}

              {/* Loading spinner */}
              {loading ? (
                <div className={styles.loadingContainer}>
                  <Spinner size="large" label="Loading devices..." />
                </div>
              ) : (
                /* Data grid */
                <div className={styles.gridContainer}>
                  <DataGrid
                    items={filteredDevices}
                    columns={columns}
                    sortable
                    selectionMode="multiselect"
                    selectedItems={selectedRows}
                    onSelectionChange={(e, data) => setSelectedRows(data.selectedItems)}
                    getRowId={(item) => item.id}
                    focusMode="composite"
                    size="small"
                    resizableColumns
                  >
                    <DataGridHeader>
                      <DataGridRow selectionCell={{ checkboxIndicator: { 'aria-label': 'Select all rows' } }}>
                        {({ renderHeaderCell }) => (
                          <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                        )}
                      </DataGridRow>
                    </DataGridHeader>
                    <DataGridBody<Device>>
                      {({ item, rowId }) => (
                        <DataGridRow<Device>
                          key={rowId}
                          selectionCell={{ checkboxIndicator: { 'aria-label': 'Select row' } }}
                        >
                          {({ renderCell }) => (
                            <DataGridCell>{renderCell(item)}</DataGridCell>
                          )}
                        </DataGridRow>
                      )}
                    </DataGridBody>
                  </DataGrid>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscoverPage;
