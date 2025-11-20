import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DataGrid,
  DataGridBody,
  DataGridRow,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridCell,
  TableCellLayout,
  TableColumnDefinition,
  createTableColumn,
  Spinner,
  Text,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ArrowDownloadRegular,
  SettingsRegular,
  SearchRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import styles from './ArrayPage.module.css';

// Array interface matching C++ CBacnetArray structure (4 columns)
interface ArrayItem {
  item: string;              // Item # (Column 0)
  array_name: string;        // Array Name (Column 1 - EditBox)
  length: string;            // Length (Column 2 - EditBox)
  value: string;             // Value (Column 3 - Normal/ReadOnly)
}

const ArrayPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();

  const [arrays, setArrays] = useState<ArrayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch arrays for selected device
  const fetchArrays = useCallback(async () => {
    if (!selectedDevice) {
      setArrays([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Using generic table API (ARRAY table doesn't have entity yet)
      const response = await fetch(`${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/table/ARRAY_TABLE`);

      if (!response.ok) {
        throw new Error(`Failed to fetch arrays: ${response.statusText}`);
      }

      const result = await response.json();
      setArrays(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load arrays';
      setError(errorMessage);
      console.error('Error fetching arrays:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchArrays();
  }, [fetchArrays]);

  // Handlers
  const handleRefresh = () => {
    fetchArrays();
  };

  const handleExport = () => {
    console.log('Export arrays to CSV');
  };

  const handleSettings = () => {
    console.log('Settings clicked');
  };

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Column definitions based on C++ CBacnetArray.cpp (4 columns)
  const columns: TableColumnDefinition<ArrayItem>[] = useMemo(() => [
    // Column 0: Item #
    createTableColumn<ArrayItem>({
      columnId: 'item',
      renderHeaderCell: () => <span>Item#</span>,
      renderCell: (arrayItem) => <TableCellLayout>{arrayItem.item}</TableCellLayout>,
    }),

    // Column 1: Array Name
    createTableColumn<ArrayItem>({
      columnId: 'array_name',
      renderHeaderCell: () => <span>Array Name</span>,
      renderCell: (arrayItem) => (
        <TableCellLayout>
          {arrayItem.array_name}
        </TableCellLayout>
      ),
    }),

    // Column 2: Length
    createTableColumn<ArrayItem>({
      columnId: 'length',
      renderHeaderCell: () => <span>Length</span>,
      renderCell: (arrayItem) => (
        <TableCellLayout>
          {arrayItem.length}
        </TableCellLayout>
      ),
    }),

    // Column 3: Value (ReadOnly)
    createTableColumn<ArrayItem>({
      columnId: 'value',
      renderHeaderCell: () => <span>Value</span>,
      renderCell: (arrayItem) => (
        <TableCellLayout>
          {arrayItem.value}
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
                  BLADE DESCRIPTION
                  Matches: ext-blade-description
                  ======================================== */}
              {selectedDevice && (
                <div className={styles.bladeDescription}>
                  <span>
                    Showing arrays for <b>{selectedDevice.nameShowOnTree} (SN: {selectedDevice.serialNumber})</b>.
                    {' '}This table displays all configured array variables for the device.
                    {' '}<a href="#" onClick={(e) => { e.preventDefault(); console.log('Learn more clicked'); }}>Learn more</a>
                  </span>
                </div>
              )}

              {/* ========================================
                  TOOLBAR - Azure Portal Command Bar
                  Matches: ext-overview-assistant-toolbar
                  ======================================== */}
              {selectedDevice && (
              <div className={styles.toolbar}>
                <div className={styles.toolbarContainer}>
                  {/* Refresh Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleRefresh}
                    disabled={loading}
                    title="Refresh"
                    aria-label="Refresh"
                  >
                    <ArrowSyncRegular />
                    <span>Refresh</span>
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
                      placeholder="Search arrays..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search arrays"
                    />
                  </div>
                </div>
              </div>
              )}

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
                {loading && arrays.length === 0 && (
                  <div className={styles.loadingBar}>
                    <Spinner size="tiny" />
                    <Text>Loading arrays...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div style={{ textAlign: 'center' }}>
                      <Text size={500} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={300}>Please select a device from the tree to view arrays</Text>
                    </div>
                  </div>
                )}

                {/* Data Grid - Always show with header */}
                {selectedDevice && !loading && !error && (
                  <>
                    <DataGrid
                      items={arrays}
                      columns={columns}
                      sortable
                      resizableColumns
                      columnSizingOptions={{
                        item: {
                          minWidth: 60,
                          defaultWidth: 80,
                        },
                        array_name: {
                          minWidth: 180,
                          defaultWidth: 250,
                        },
                        length: {
                          minWidth: 80,
                          defaultWidth: 100,
                        },
                        value: {
                          minWidth: 120,
                          defaultWidth: 180,
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
                      <DataGridBody<ArrayItem>>
                        {({ item, rowId }) => (
                          <DataGridRow<ArrayItem> key={rowId}>
                            {({ renderCell }) => (
                              <DataGridCell>{renderCell(item)}</DataGridCell>
                            )}
                          </DataGridRow>
                        )}
                      </DataGridBody>
                    </DataGrid>

                    {/* No Data Message - Show below grid when empty */}
                    {arrays.length === 0 && (
                      <div style={{ marginTop: '24px', textAlign: 'center', padding: '0 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                            <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" fill="currentColor"/>
                          </svg>
                          <Text size={400} weight="semibold">No arrays found</Text>
                        </div>
                        <Text size={300} style={{ display: 'block', marginBottom: '16px', color: '#605e5c', textAlign: 'center' }}>This device has no configured array variables</Text>
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

export default ArrayPage;
