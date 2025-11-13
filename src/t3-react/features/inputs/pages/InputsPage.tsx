/**
 * Inputs Page - Azure Portal Complete Sample
 *
 * Complete Azure Portal blade layout matching Cost Management + Billing
 * Extracted from: https://portal.azure.com/#view/Microsoft_Azure_GTM/ModernBillingMenuBlade/~/BillingAccounts
 *
 * This is a fully functional Azure Portal-style page that can be used as a sample
 * Update with real input fields as needed
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

import React, { useState, useEffect, useCallback } from 'react';
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
  Button,
  Spinner,
  Text,
  Badge,
  Switch,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ArrowDownloadRegular,
  SettingsRegular,
  SearchRegular,
  ArrowSortUpRegular,
  ArrowSortDownRegular,
  ArrowSortRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import styles from './InputsPage.module.css';

// Types based on Rust entity (input_points.rs)
interface InputPoint {
  serialNumber: number;
  inputId?: string;
  inputIndex?: string;
  panel?: string;
  fullLabel?: string;
  autoManual?: string;
  fValue?: string;
  units?: string;
  rangeField?: string;
  calibration?: string;
  sign?: string;
  filterField?: string;
  status?: string;
  digitalAnalog?: string;
  label?: string;
  typeField?: string;
}

export const InputsPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();

  const [inputs, setInputs] = useState<InputPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-select first device on page load if no device is selected
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

  // Fetch inputs for selected device
  const fetchInputs = useCallback(async () => {
    if (!selectedDevice) {
      setInputs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/t3_device/devices/${selectedDevice.serialNumber}/input-points`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch inputs: ${response.statusText}`);
      }

      const data = await response.json();
      setInputs(data.input_points || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load inputs';
      setError(errorMessage);
      console.error('Error fetching inputs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchInputs();
  }, [fetchInputs]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInputs();
    setRefreshing(false);
  };

  const handleExport = () => {
    console.log('Export inputs to CSV');
  };

  const handleSettings = () => {
    console.log('Settings clicked');
  };

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    console.log('Search query:', e.target.value);
  };

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending');

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
    } else {
      setSortColumn(columnId);
      setSortDirection('ascending');
    }
  };

  // Column definitions matching the sequence: Input, Panel, Full Label, Auto/Man, Value, Units, Range, Calibration, Sign, Filter, Status, Signal Type, Label, Type
  const columns: TableColumnDefinition<InputPoint>[] = [
    // 1. Input (Index/ID)
    createTableColumn<InputPoint>({
      columnId: 'input',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('input')}>
          <span>Input</span>
          {sortColumn === 'input' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.inputId || item.inputIndex || '---'}</TableCellLayout>,
    }),
    // 2. Panel
    createTableColumn<InputPoint>({
      columnId: 'panel',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('panel')}>
          <span>Panel</span>
          {sortColumn === 'panel' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.panel || '---'}</TableCellLayout>,
    }),
    // 3. Full Label
    createTableColumn<InputPoint>({
      columnId: 'fullLabel',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('fullLabel')}>
          <span>Full Label</span>
          {sortColumn === 'fullLabel' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          <Text size={200} weight="regular">{item.fullLabel || 'Unnamed'}</Text>
        </TableCellLayout>
      ),
    }),
    // 4. Auto/Man
    createTableColumn<InputPoint>({
      columnId: 'autoManual',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Auto/Man</span>
        </div>
      ),
      renderCell: (item) => {
        // Check if Auto: value could be 'auto', 'Auto', or '1' (Manual is '0')
        const value = item.autoManual?.toString().toLowerCase();
        const isAuto = value === 'auto' || value === '1';
        return (
          <TableCellLayout>
            <Switch
              checked={isAuto}
              style={{ transform: 'scale(0.8)' }}
            />
          </TableCellLayout>
        );
      },
    }),
    // 5. Value
    createTableColumn<InputPoint>({
      columnId: 'value',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('value')}>
          <span>Value</span>
          {sortColumn === 'value' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.fValue || '---'}</TableCellLayout>,
    }),
    // 6. Units
    createTableColumn<InputPoint>({
      columnId: 'units',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('units')}>
          <span>Units</span>
          {sortColumn === 'units' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.units || '---'}</TableCellLayout>,
    }),
    // 7. Range
    createTableColumn<InputPoint>({
      columnId: 'range',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('range')}>
          <span>Range</span>
          {sortColumn === 'range' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          <Text wrap={false}>{item.rangeField || 'Not Set'}</Text>
        </TableCellLayout>
      ),
    }),
    // 8. Calibration
    createTableColumn<InputPoint>({
      columnId: 'calibration',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Calibration</span>
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.calibration || '0'}</TableCellLayout>,
    }),
    // 9. Sign
    createTableColumn<InputPoint>({
      columnId: 'sign',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Sign</span>
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.sign || '+'}</TableCellLayout>,
    }),
    // 10. Filter
    createTableColumn<InputPoint>({
      columnId: 'filter',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Filter</span>
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.filterField || '0'}</TableCellLayout>,
    }),
    // 11. Status
    createTableColumn<InputPoint>({
      columnId: 'status',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('status')}>
          <span>Status</span>
          {sortColumn === 'status' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => {
        // Map status codes to readable text
        // Common status codes: 0 = Normal/OK, 64 = Normal, other values may indicate errors
        let statusText = 'Normal';
        let statusColor: 'success' | 'danger' | 'warning' = 'success';

        const statusValue = item.status?.toString();
        if (statusValue === '0' || statusValue === '64') {
          statusText = 'Normal';
          statusColor = 'success';
        } else if (statusValue && statusValue !== 'online' && statusValue !== 'normal') {
          statusText = `Code ${statusValue}`;
          statusColor = 'warning';
        } else if (statusValue?.toLowerCase() === 'online' || statusValue?.toLowerCase() === 'normal') {
          statusText = 'Normal';
          statusColor = 'success';
        }

        return (
          <TableCellLayout>
            <Badge
              appearance="filled"
              color={statusColor}
            >
              {statusText}
            </Badge>
          </TableCellLayout>
        );
      },
    }),
    // 12. Signal Type (keep empty for now)
    createTableColumn<InputPoint>({
      columnId: 'signalType',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Signal Type</span>
        </div>
      ),
      renderCell: () => <TableCellLayout>---</TableCellLayout>,
    }),
    // 13. Label (short label)
    createTableColumn<InputPoint>({
      columnId: 'label',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('label')}>
          <span>Label</span>
          {sortColumn === 'label' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.label || '---'}</TableCellLayout>,
    }),
    // 14. Type (Digital/Analog)
    createTableColumn<InputPoint>({
      columnId: 'type',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Type</span>
        </div>
      ),
      renderCell: (item) => {
        const isDigital = item.digitalAnalog === '0';
        return (
          <TableCellLayout>
            <Badge
              appearance="outline"
              color={isDigital ? 'informative' : 'brand'}
            >
              {isDigital ? 'Digital' : 'Analog'}
            </Badge>
          </TableCellLayout>
        );
      },
    }),
  ];

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
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#fef0f1', border: '1px solid #d13438', borderRadius: '2px' }}>
                    <Text style={{ color: '#d13438' }} weight="semibold">Error loading inputs</Text>
                    <br />
                    <Text style={{ color: '#d13438' }} size={300}>{error}</Text>
                  </div>
                </div>
              )}

              {/* ========================================
                  BLADE DESCRIPTION
                  Matches: ext-blade-description
                  ======================================== */}
              {selectedDevice && (
                <div className={styles.bladeDescription}>
                  <span>
                    Showing input points for <b>{selectedDevice.panelName || `Device ${selectedDevice.serialNumber}`}</b>.
                    {' '}This table displays all configured input points including digital and analog sensors, their current values,
                    calibration settings, and operational status.
                    {' '}<a href="#" onClick={(e) => { e.preventDefault(); console.log('Learn more clicked'); }}>Learn more</a>
                  </span>
                </div>
              )}

              {/* ========================================
                  TOOLBAR - Azure Portal Command Bar
                  Matches: ext-overview-assistant-toolbar
                  ======================================== */}
              <div className={styles.toolbar}>
                <div className={styles.toolbarContainer}>
                  {/* Refresh Button */}
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

                  {/* Export to CSV Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleExport}
                    title="Export to CSV"
                    aria-label="Export to CSV"
                  >
                    <ArrowDownloadRegular />
                    <span>Export to CSV</span>
                  </button>

                  {/* Toolbar Separator */}
                  <div className={styles.toolbarSeparator} role="separator" />

                  {/* Settings Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleSettings}
                    title="Settings"
                    aria-label="Settings"
                  >
                    <SettingsRegular />
                    <span>Settings</span>
                  </button>

                  {/* Search Input Box */}
                  <div className={styles.searchInputWrapper}>
                    <SearchRegular className={styles.searchIcon} />
                    <input
                      className={styles.searchInput}
                      type="text"
                      placeholder="Search inputs..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search inputs"
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

              {/* ========================================
                  DOCKING BODY - Main Content
                  Matches: msportalfx-docking-body
                  ======================================== */}
              <div className={styles.dockingBody}>

                {/* Loading State */}
                {loading && inputs.length === 0 && (
                  <div className={styles.loading}>
                    <Spinner size="large" />
                    <Text>Loading inputs...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div style={{ textAlign: 'center' }}>
                      <Text size={500} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={300}>Please select a device from the tree to view inputs</Text>
                    </div>
                  </div>
                )}

                {/* Data Grid - Azure Portal Style */}
                {selectedDevice && !loading && !error && inputs.length === 0 && (
                  <div className={styles.noData}>
                    <div style={{ textAlign: 'center' }}>
                      <Text size={500}>No inputs found</Text>
                      <br />
                      <Text size={300}>This device has no configured input points</Text>
                      <br /><br />
                      <Button
                        appearance="primary"
                        icon={<ArrowSyncRegular />}
                        onClick={handleRefresh}
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>
                )}

                {/* Data Grid with Data */}
                {selectedDevice && !loading && !error && inputs.length > 0 && (
                  <DataGrid
                    items={inputs}
                    columns={columns}
                    sortable
                    resizableColumns
                    columnSizingOptions={{
                      input: {
                        minWidth: 60,
                        defaultWidth: 80,
                      },
                      panel: {
                        minWidth: 60,
                        defaultWidth: 75,
                      },
                      fullLabel: {
                        minWidth: 180,
                        defaultWidth: 250,
                      },
                      autoManual: {
                        minWidth: 90,
                        defaultWidth: 120,
                      },
                      value: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      units: {
                        minWidth: 90,
                        defaultWidth: 130,
                      },
                      range: {
                        minWidth: 120,
                        defaultWidth: 150,
                      },
                      calibration: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      sign: {
                        minWidth: 50,
                        defaultWidth: 60,
                      },
                      filter: {
                        minWidth: 60,
                        defaultWidth: 80,
                      },
                      status: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      signalType: {
                        minWidth: 90,
                        defaultWidth: 110,
                      },
                      label: {
                        minWidth: 130,
                        defaultWidth: 170,
                      },
                      type: {
                        minWidth: 60,
                        defaultWidth: 75,
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
                    <DataGridBody<InputPoint>>
                      {({ item, rowId }) => (
                        <DataGridRow<InputPoint> key={rowId}>
                          {({ renderCell }) => (
                            <DataGridCell>{renderCell(item)}</DataGridCell>
                          )}
                        </DataGridRow>
                      )}
                    </DataGridBody>
                  </DataGrid>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputsPage;
