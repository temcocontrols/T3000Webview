/**
 * Network Page - Azure Portal Complete Sample
 *
 * Complete Azure Portal blade layout matching Cost Management + Billing
 * Extracted from: https://portal.azure.com/#view/Microsoft_Azure_GTM/ModernBillingMenuBlade/~/BillingAccounts
 *
 * This displays network configuration and topology information for BACnet devices
 * Network structure based on C++ Subnetwork and device routing tables
 *
 * Azure Portal Structure:
 * - Blade Content Container (fxs-blade-content-container-default-details)
 * - Blade Content Wrapper (fxs-blade-content-wrapper)
 * - Part Content (fxs-part-content ext-msportal-padding)
 * - Toolbar (ext-overview-assistant-toolbar azc-toolbar)
 * - Horizontal Divider (ext-overview-hr)
 * - Blade Description (ext-blade-description)
 * - Docking Body (msportalfx-docking-body)
 * - Data Grid (fxc-gc-dataGrid) with thead/tbody structure
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Tooltip,
} from '@fluentui/react-components';
import {
  ArrowClockwiseRegular,
  SettingsRegular,
  SearchRegular,
  ErrorCircleRegular,
  InfoRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import styles from './NetworkPage.module.css';
import { useRegisterCsvHandlers } from '@t3-react/shared/context/CsvOperationsContext';
import { exportToCsv, parseCsvFile, mapCsvToObjects } from '@t3-react/shared/utils/csvUtils';

// Network interface based on C++ Subnetwork structure and device network fields
interface NetworkItem {
  networkId: string;              // Network ID
  networkNumber?: number;         // Network number from devices table
  buildingName?: string;          // Building/subnet name
  deviceCount?: number;           // Number of devices on this network
  status?: string;                // Network status (Online/Offline)
  protocol?: string;              // Protocol (BACnet IP/MSTP)
  description?: string;           // Network description
}

export const NetworkPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();

  const [networks, setNetworks] = useState<NetworkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortState, setSortState] = useState<{ sortColumn: string; sortDirection: 'ascending' | 'descending' } | undefined>();
  const [sortKey, setSortKey] = useState(0);
  const prevSortRef = React.useRef<{ sortColumn: string; sortDirection: string } | undefined>();

  const handleSortChange = (_e: any, newState: { sortColumn: string; sortDirection: 'ascending' | 'descending' }) => {
    const prev = prevSortRef.current;
    prevSortRef.current = newState;
    if (prev?.sortColumn === newState.sortColumn && prev?.sortDirection === 'descending' && newState.sortDirection === 'ascending') {
      setSortState(undefined);
      setSortKey(k => k + 1);
    } else {
      setSortState(newState);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Auto-select first device on page load if none selected
  useEffect(() => {
    if (!selectedDevice && treeData.length > 0) {
      const findFirstDevice = (nodes: any[]): any => {
        for (const node of nodes) {
          if (node.data) return node;
          if (node.children && node.children.length > 0) {
            const found = findFirstDevice(node.children);
            if (found) return found;
          }
        }
        return null;
      };

      const firstDeviceNode = findFirstDevice(treeData);
      if (firstDeviceNode?.data) {
        selectDevice(firstDeviceNode.data);
      }
    }
  }, [selectedDevice, treeData, selectDevice]);

  // Fetch networks for selected device
  const fetchNetworks = useCallback(async () => {
    if (!selectedDevice) {
      setNetworks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Network data will come from device aggregation or routing tables
      // For now, since no specific network endpoint exists, return empty until implemented
      setNetworks([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load networks';
      setError(errorMessage);
      console.error('Error fetching networks:', err);
      // DON'T clear networks on database fetch error - preserve what we have
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchNetworks();
  }, [fetchNetworks]);

  // Handlers
  const handleRefresh = () => {
    fetchNetworks();
  };

  const handleExport = () => {
    if (networks.length === 0) return;
    const csvColumns: import('@t3-react/shared/utils/csvUtils').CsvColumn<NetworkItem>[] = [
      { header: 'Network ID', accessor: n => n.networkId },
      { header: 'Number', accessor: n => n.networkNumber },
      { header: 'Building Name', accessor: n => n.buildingName },
      { header: 'Devices', accessor: n => n.deviceCount },
      { header: 'Status', accessor: n => n.status },
      { header: 'Protocol', accessor: n => n.protocol },
      { header: 'Description', accessor: n => n.description },
    ];
    exportToCsv(networks, csvColumns, `networks_${selectedDevice?.serialNumber || 'export'}.csv`);
  };

  const handleImport = async (file: File) => {
    const { headers, rows } = await parseCsvFile(file);
    if (rows.length === 0) return;
    const csvColumns: import('@t3-react/shared/utils/csvUtils').CsvColumn<NetworkItem>[] = [
      { header: 'Network ID', accessor: n => n.networkId, setter: (n, v) => { n.networkId = v; } },
      { header: 'Number', accessor: n => n.networkNumber, setter: (n, v) => { n.networkNumber = parseInt(v) || 0; } },
      { header: 'Building Name', accessor: n => n.buildingName, setter: (n, v) => { n.buildingName = v; } },
      { header: 'Devices', accessor: n => n.deviceCount, setter: (n, v) => { n.deviceCount = parseInt(v) || 0; } },
      { header: 'Status', accessor: n => n.status, setter: (n, v) => { n.status = v; } },
      { header: 'Protocol', accessor: n => n.protocol, setter: (n, v) => { n.protocol = v; } },
      { header: 'Description', accessor: n => n.description, setter: (n, v) => { n.description = v; } },
    ];
    const imported = mapCsvToObjects(headers, rows, csvColumns, () => ({ networkId: '' } as NetworkItem));
    setNetworks(imported);
  };

  // Register CSV export/import handlers with global context (Tools menu)
  useRegisterCsvHandlers(handleExport, handleImport);

  const handleSettings = () => {
    console.log('Settings clicked');
  };

  // Display networks with empty rows when no data (show 10 empty rows)
  const displayNetworks = React.useMemo(() => {
    let filtered = networks;
    if (searchQuery.trim() && networks.length > 0) {
      const q = searchQuery.toLowerCase();
      filtered = networks.filter(n =>
        (n.networkId || '').toLowerCase().includes(q) ||
        (n.buildingName || '').toLowerCase().includes(q) ||
        (n.protocol || '').toLowerCase().includes(q) ||
        (n.description || '').toLowerCase().includes(q)
      );
    }
    if (networks.length === 0) {
      return Array(18).fill(null).map(() => ({
        networkId: '', networkNumber: undefined, buildingName: '',
        deviceCount: undefined, status: '', protocol: '', description: '',
      } as NetworkItem));
    }
    return filtered;
  }, [networks, searchQuery]);

  // Helper to check if row is an empty placeholder
  const isEmptyRow = (network: NetworkItem) => {
    return !network.networkId && networks.length === 0;
  };

  // Column definitions for network topology
  const columns: TableColumnDefinition<NetworkItem>[] = useMemo(() => [
    // Column 0: Network ID
    createTableColumn<NetworkItem>({
      columnId: 'networkId',
      renderHeaderCell: () => <span>Network ID</span>,
      renderCell: (network) => (
        <TableCellLayout>
          {!isEmptyRow(network) && network.networkId}
        </TableCellLayout>
      ),
    }),

    // Column 1: Network Number
    createTableColumn<NetworkItem>({
      columnId: 'networkNumber',
      renderHeaderCell: () => <span>Number</span>,
      renderCell: (network) => (
        <TableCellLayout>
          {!isEmptyRow(network) && (network.networkNumber ?? '---')}
        </TableCellLayout>
      ),
    }),

    // Column 2: Building Name
    createTableColumn<NetworkItem>({
      columnId: 'buildingName',
      renderHeaderCell: () => <span>Building Name</span>,
      renderCell: (network) => (
        <TableCellLayout>
          {!isEmptyRow(network) && (network.buildingName || '---')}
        </TableCellLayout>
      ),
    }),

    // Column 3: Device Count
    createTableColumn<NetworkItem>({
      columnId: 'deviceCount',
      renderHeaderCell: () => <span>Devices</span>,
      renderCell: (network) => (
        <TableCellLayout>
          {!isEmptyRow(network) && (network.deviceCount ?? 0)}
        </TableCellLayout>
      ),
    }),

    // Column 4: Status
    createTableColumn<NetworkItem>({
      columnId: 'status',
      renderHeaderCell: () => <span>Status</span>,
      renderCell: (network) => (
        <TableCellLayout>
          {!isEmptyRow(network) && (network.status || '---')}
        </TableCellLayout>
      ),
    }),

    // Column 5: Protocol
    createTableColumn<NetworkItem>({
      columnId: 'protocol',
      renderHeaderCell: () => <span>Protocol</span>,
      renderCell: (network) => (
        <TableCellLayout>
          {!isEmptyRow(network) && (network.protocol || '---')}
        </TableCellLayout>
      ),
    }),

    // Column 6: Description
    createTableColumn<NetworkItem>({
      columnId: 'description',
      renderHeaderCell: () => <span>Description</span>,
      renderCell: (network) => (
        <TableCellLayout>
          {!isEmptyRow(network) && (network.description || '---')}
        </TableCellLayout>
      ),
    }),
  ], []);

  // ========================================
  // RENDER: Complete Azure Portal Blade Layout
  // ========================================

  return (
    <div className={styles.container}>
      {/* Blade Content Container */}
      <div className={styles.bladeContentContainer}>
        {/* Blade Content Wrapper */}
        <div className={styles.bladeContentWrapper}>
          {/* Blade Content */}
          <div className={styles.bladeContent}>
            {/* Part Content - Main Content Area */}
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
                  TOOLBAR - Azure Portal Command Bar
                  Matches: ext-overview-assistant-toolbar
                  ======================================== */}
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
                      placeholder="Search networks..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search networks"
                    />
                  </div>

                  {/* Refresh Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleRefresh}
                    disabled={loading}
                    title="Refresh"
                    aria-label="Refresh"
                  >
                    <ArrowClockwiseRegular className={loading ? styles.rotating : ''} />
                    <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                  </button>

                  <div className={styles.toolbarSeparator} role="separator" />

                  {/* Info Button with Tooltip */}
                  {selectedDevice && (
                    <Tooltip
                      content={`Showing network topology for ${selectedDevice.nameShowOnTree} (SN: ${selectedDevice.serialNumber}). This table displays all configured networks and their connection status.`}
                      relationship="description"
                    >
                      <button
                        className={`${styles.toolbarButton} ${styles.marginLeft8}`}
                        title="Information"
                        aria-label="Information about this page"
                      >
                        <InfoRegular />
                      </button>
                    </Tooltip>
                  )}
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
                {loading && networks.length === 0 && (
                  <div className={styles.loadingBar}>
                    <Spinner size="tiny" />
                    <Text size={200} weight="regular">Loading networks...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div style={{ textAlign: 'center' }}>
                      <Text size={400} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={200}>Please select a device from the tree to view network</Text>
                    </div>
                  </div>
                )}

                {/* Data Grid - Always show with header (even when there's an error) */}
                {selectedDevice && !loading && (
                  <>
                    <DataGrid
                      key={sortKey}
                      items={displayNetworks}
                      columns={columns}
                      sortable
                      sortState={sortState}
                      onSortChange={handleSortChange}
                      resizableColumns
                      resizableColumnsOptions={{ autoFitColumns: false }}
                      style={{ width: '100%', border: '1px solid #d1d1d1', borderRadius: 0, backgroundColor: '#fff' }}
                    >
                      <DataGridHeader>
                        <DataGridRow>
                          {({ renderHeaderCell }) => (
                            <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                          )}
                        </DataGridRow>
                      </DataGridHeader>
                      <DataGridBody<NetworkItem>>
                        {({ item, rowId }) => (
                          <DataGridRow<NetworkItem> key={rowId}>
                            {({ renderCell }) => (
                              <DataGridCell>{renderCell(item)}</DataGridCell>
                            )}
                          </DataGridRow>
                        )}
                      </DataGridBody>
                    </DataGrid>

                    {/* No Data Message - Commented out - showing empty grid instead
                    {networks.length === 0 && (
                      <div style={{ marginTop: '24px', textAlign: 'center', padding: '0 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                          </svg>
                          <Text size={400} weight="semibold">No networks found</Text>
                        </div>
                        <Text size={300} style={{ display: 'block', marginBottom: '16px', color: '#605e5c', textAlign: 'center' }}>This device has no configured networks</Text>
                      </div>
                    )}
                    */}
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
