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
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ArrowDownloadRegular,
  PersonFeedbackRegular,
  SearchRegular,
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

  const handleFeedback = () => {
    console.log('Feedback clicked');
  };

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    console.log('Search query:', e.target.value);
  };

  // Column definitions matching Azure Portal grid
  const columns: TableColumnDefinition<InputPoint>[] = [
    createTableColumn<InputPoint>({
      columnId: 'index',
      renderHeaderCell: () => '#',
      renderCell: (_item) => {
        const index = inputs.findIndex(inp => inp.serialNumber === _item.serialNumber && inp.inputIndex === _item.inputIndex);
        return <TableCellLayout>{index + 1}</TableCellLayout>;
      },
    }),
    createTableColumn<InputPoint>({
      columnId: 'inputName',
      renderHeaderCell: () => 'Input Name',
      renderCell: (item) => (
        <TableCellLayout>
          <Text weight="semibold">{item.fullLabel || item.label || 'Unnamed'}</Text>
        </TableCellLayout>
      ),
    }),
    createTableColumn<InputPoint>({
      columnId: 'value',
      renderHeaderCell: () => 'Value',
      renderCell: (item) => (
        <TableCellLayout>
          {item.fValue || '---'} {item.units || ''}
        </TableCellLayout>
      ),
    }),
    createTableColumn<InputPoint>({
      columnId: 'autoManual',
      renderHeaderCell: () => 'Auto/Man',
      renderCell: (item) => {
        const isAuto = item.autoManual?.toLowerCase() === 'auto';
        return (
          <TableCellLayout>
            <Badge
              appearance={isAuto ? 'filled' : 'outline'}
              color={isAuto ? 'success' : 'warning'}
            >
              {item.autoManual || 'Auto'}
            </Badge>
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<InputPoint>({
      columnId: 'calibration',
      renderHeaderCell: () => 'Calibration',
      renderCell: (item) => {
        const cal = item.calibration || '0';
        const sign = item.sign || '';
        return (
          <TableCellLayout>
            {sign}{cal}
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<InputPoint>({
      columnId: 'range',
      renderHeaderCell: () => 'Range',
      renderCell: (item) => (
        <TableCellLayout>
          <Text wrap={false}>{item.rangeField || 'Not Set'}</Text>
        </TableCellLayout>
      ),
    }),
    createTableColumn<InputPoint>({
      columnId: 'digitalAnalog',
      renderHeaderCell: () => 'Type',
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

                  {/* Feedback Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleFeedback}
                    title="Feedback"
                    aria-label="Feedback"
                  >
                    <PersonFeedbackRegular />
                    <span>Feedback</span>
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
                      index: {
                        minWidth: 50,
                        defaultWidth: 60,
                      },
                      inputName: {
                        minWidth: 150,
                        defaultWidth: 250,
                      },
                      value: {
                        minWidth: 100,
                        defaultWidth: 150,
                      },
                      autoManual: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      calibration: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      range: {
                        minWidth: 120,
                        defaultWidth: 180,
                      },
                      digitalAnalog: {
                        minWidth: 80,
                        defaultWidth: 100,
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
