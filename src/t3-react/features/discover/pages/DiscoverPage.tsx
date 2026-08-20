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
  ArrowClockwiseRegular,
  AddRegular,
  SearchRegular,
  ArrowSortUpRegular,
  ArrowSortDownRegular,
  ArrowSortRegular,
  ErrorCircleRegular,
  InfoRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { usePageRefresh } from '@t3-react/shared/hooks/usePageRefresh';
import { API_BASE_URL } from '@t3-react/config/constants';
import styles from './DiscoverPage.module.css';

// Device interface matching C++ ScanDlg columns:
// SCAN_TABLE_TYPE=0, BUILDING=1, FLOOR=2, ROOM=3, SUBNET=4, SERIALID=5, IPADDRESS=6, COMPORT=7, PROTOCOL=8, MODBUSID=9
interface Device {
  id: string;
  model: string;
  building: string;
  floor: string;
  room: string;
  subnet: string;
  serialNumber: string;
  ipAddress: string;
  port: string;
  protocol: string;
  modbusId: string;
  isOnline: boolean;
  lastChecked: string;
}

export const DiscoverPage: React.FC = () => {
  const { selectedDevice, loadDevicesWithSync } = useDeviceTreeStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending');

  // Scan drawer state
  const [scanDrawerOpen, setScanDrawerOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<'scanning' | 'done' | 'error'>('scanning');
  const [scanMessage, setScanMessage] = useState('');
  const [scanSteps, setScanSteps] = useState<{ mode: string; status: string; reply: string; notes: string }[]>([]);


  // Load from DB on mount
  useEffect(() => {
    handleRefresh();
  }, []);

  // Refresh: reload from DB
  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/t3_device/devices`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setDevices((data.devices || []).map((d: any, i: number) => ({
        id: String(i),
        model: d.productName || d.showLabelName || '',
        building: d.mainBuildingName || '',
        floor: d.floorName || '',
        room: d.roomName || '',
        subnet: d.buildingName || '',
        serialNumber: String(d.serialNumber),
        ipAddress: d.ipAddress || '',
        port: String(d.port || ''),
        protocol: d.connectionType || 'BACnet',
        modbusId: String(d.modbusAddress || ''),
        isOnline: d.isOnline === 1 || d.isOnline === true,
        lastChecked: d.lastChecked || '',
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setRefreshing(false);
    }
  };

  usePageRefresh(handleRefresh);

  // Start Scan: trigger FFI scan with progress drawer (C++ equivalent: CScanDbWaitDlg)
  const handleStartScan = async () => {
    setScanDrawerOpen(true);
    setScanStatus('scanning');
    setScanMessage('T3000 is scanning, please wait...');
    setScanSteps([
      { mode: 'Ethernet Scan', status: 'In Progress', reply: '---', notes: 'Scanning network...' },
      { mode: 'BACnet MSTP', status: 'Waiting', reply: '---', notes: '' },
    ]);
    setError(null);
    try {
      await loadDevicesWithSync();
      setScanStatus('done');
      setScanMessage('Scan complete!');
      setScanSteps([
        { mode: 'Ethernet Scan', status: 'Completed', reply: `${devices.length} found`, notes: 'Devices saved to database' },
        { mode: 'BACnet MSTP', status: 'Completed', reply: 'N/A', notes: 'Via FFI GET_PANELS_LIST (Action 4)' },
      ]);
      await handleRefresh();
    } catch (err) {
      setScanStatus('error');
      setScanMessage(err instanceof Error ? err.message : 'Scan failed');
      setScanSteps(prev => prev.map(s => s.status === 'In Progress' ? { ...s, status: 'Failed' } : s));
    }
  };

  // Delete device handler - not in C++ ScanDlg, removed
  // Delete is handled via the device tree

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

  // Display data with 10 empty rows when no devices
  const displayDevices = React.useMemo(() => {
    if (devices.length === 0) {
      return Array(18).fill(null).map((_, index) => ({
        id: '',
        model: '',
        building: '',
        floor: '',
        room: '',
        subnet: '',
        serialNumber: '',
        ipAddress: '',
        port: '',
        protocol: '',
        modbusId: '',
      }));
    }
    return filteredDevices;
  }, [devices.length, filteredDevices]);

  // Helper to identify empty rows
  const isEmptyRow = (item: Device) => !item.id && devices.length === 0;

  // Column definitions matching C++ InitScanGrid()
  const columns: TableColumnDefinition<Device>[] = [
    createTableColumn<Device>({
      columnId: 'model',
      compare: (a, b) => a.model.localeCompare(b.model),
      renderHeaderCell: () => (
        <div className={styles.sortHeader} onClick={() => handleSort('model')}>
          <span>Model</span>
          {sortColumn === 'model' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconMuted} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.model}>
          {!isEmptyRow(item) && item.model}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'building',
      compare: (a, b) => a.building.localeCompare(b.building),
      renderHeaderCell: () => (
        <div className={styles.sortHeader} onClick={() => handleSort('building')}>
          <span>Building</span>
          {sortColumn === 'building' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconMuted} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.building}>
          {!isEmptyRow(item) && item.building}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'floor',
      compare: (a, b) => a.floor.localeCompare(b.floor),
      renderHeaderCell: () => (
        <div className={styles.sortHeader} onClick={() => handleSort('floor')}>
          <span>Floor</span>
          {sortColumn === 'floor' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconMuted} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.floor}>
          {!isEmptyRow(item) && item.floor}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'room',
      compare: (a, b) => a.room.localeCompare(b.room),
      renderHeaderCell: () => (
        <div className={styles.sortHeader} onClick={() => handleSort('room')}>
          <span>Room</span>
          {sortColumn === 'room' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconMuted} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.room}>
          {!isEmptyRow(item) && item.room}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'subnet',
      compare: (a, b) => a.subnet.localeCompare(b.subnet),
      renderHeaderCell: () => (
        <div className={styles.sortHeader} onClick={() => handleSort('subnet')}>
          <span>Sub_net</span>
          {sortColumn === 'subnet' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconMuted} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.subnet}>
          {!isEmptyRow(item) && item.subnet}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'serialNumber',
      compare: (a, b) => a.serialNumber.localeCompare(b.serialNumber),
      renderHeaderCell: () => (
        <div className={styles.sortHeader} onClick={() => handleSort('serialNumber')}>
          <span>Serial#</span>
          {sortColumn === 'serialNumber' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconMuted} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.serialNumber}>
          {!isEmptyRow(item) && item.serialNumber}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'ipAddress',
      compare: (a, b) => a.ipAddress.localeCompare(b.ipAddress),
      renderHeaderCell: () => (
        <div className={styles.sortHeader} onClick={() => handleSort('ipAddress')}>
          <span>IP Address</span>
          {sortColumn === 'ipAddress' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconMuted} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.ipAddress}>
          {!isEmptyRow(item) && item.ipAddress}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'port',
      compare: (a, b) => a.port.localeCompare(b.port),
      renderHeaderCell: () => (
        <div className={styles.sortHeader} onClick={() => handleSort('port')}>
          <span>Port</span>
          {sortColumn === 'port' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconMuted} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.port}>
          {!isEmptyRow(item) && item.port}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'protocol',
      compare: (a, b) => a.protocol.localeCompare(b.protocol),
      renderHeaderCell: () => (
        <div className={styles.sortHeader} onClick={() => handleSort('protocol')}>
          <span>Protocol</span>
          {sortColumn === 'protocol' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconMuted} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.protocol}>
          {!isEmptyRow(item) && item.protocol}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Device>({
      columnId: 'modbusId',
      compare: (a, b) => a.modbusId.localeCompare(b.modbusId),
      renderHeaderCell: () => (
        <div className={styles.sortHeader} onClick={() => handleSort('modbusId')}>
          <span>ID</span>
          {sortColumn === 'modbusId' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconMuted} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout truncate title={item.modbusId}>
          {!isEmptyRow(item) && item.modbusId}
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
              {/* ========================================
                  ERROR MESSAGE (if any)
                  ======================================== */}
              {error && (
                <div className={styles.errorBanner}>
                  <ErrorCircleRegular className={styles.errorBannerIcon} />
                  <Text className={styles.errorBannerText}>
                    {error}
                  </Text>
                </div>
              )}

              {/* Description bar — what this feature does */}
              <div className={styles.infoStrip}>
                <InfoRegular className={styles.infoStripIcon} />
                <span>
                  Discover T3000 devices on your network. Click <strong>Start Scan</strong> to search
                  for BACnet and Modbus devices. Found devices are automatically saved to the database
                  and appear in the device tree.
                </span>
              </div>

              {/* Toolbar */}
              {selectedDevice && (
              <>
              <div className={styles.toolbar}>
                <div className={styles.toolbarContainer}>
                  {/* Search Input Box */}
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

                  <button
                    className={styles.toolbarButton}
                    onClick={handleRefresh}
                    disabled={refreshing}
                    title="Refresh from Device"
                    aria-label="Refresh from Device"
                  >
                    <ArrowClockwiseRegular className={refreshing ? styles.rotating : ''} />
                    <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                  </button>

                  <div className={styles.toolbarSeparator} role="separator" />

                  <button
                    className={styles.toolbarButton}
                    onClick={handleStartScan}
                    title="Start Scan"
                    aria-label="Start Scan"
                  >
                    <AddRegular />
                    <span>Start Scan</span>
                  </button>

                </div>
              </div>

              <div className={styles.noPaddingWrapper}>
                <hr className={styles.overviewHr} />
              </div>
              </>
              )}

              <div className={styles.dockingBody}>
                {/* Loading State */}
                {loading && (
                  <div className={styles.loadingRow}>
                    <Spinner size="tiny" />
                    <Text size={200} weight="regular">Loading devices...</Text>
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
                    items={displayDevices}
                    columns={columns}
                    sortable
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
                  {/* {devices.length === 0 && (
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
                  )} */}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Scan Status Drawer — C++ equivalent: CScanDbWaitDlg */}
      {scanDrawerOpen && (
        <div className={styles.scanOverlay}>
          <div className={styles.scanDrawer}>
            <div className={styles.scanDrawerHeader}>
              <Text size={400} weight="semibold">Device Scan</Text>
            </div>

            {/* Info bar showing current status */}
            <div className={styles.scanInfoBar}>
              {scanStatus === 'scanning' && <Spinner size="tiny" />}
              <Text size={200} weight="semibold">{scanMessage}</Text>
            </div>

            {/* Steps table — always visible */}
            <div className={styles.scanDrawerBody}>
              <table className={styles.scanTable}>
                <thead>
                  <tr>
                    <th>Scanning Mode</th><th>Status</th><th>Reply</th><th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {scanSteps.map((step, i) => (
                    <tr key={i}>
                      <td>{step.mode}</td>
                      <td>
                        <Badge appearance="filled" color={step.status === 'Completed' ? 'success' : step.status === 'Failed' ? 'danger' : 'warning'} size="small">
                          {step.status}
                        </Badge>
                      </td>
                      <td>{step.reply}</td>
                      <td>{step.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.scanDrawerFooter}>
              <Button size="small" appearance="primary" onClick={() => setScanDrawerOpen(false)}
                disabled={scanStatus === 'scanning'}>
                {scanStatus === 'scanning' ? 'Scanning...' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
