/**
 * Trendlogs Page - Azure Portal Complete Sample
 *
 * Complete Azure Portal blade layout matching Cost Management + Billing
 * Extracted from: https://portal.azure.com/#view/Microsoft_Azure_GTM/ModernBillingMenuBlade/~/BillingAccounts
 *
 * Based on C++ BacnetMonitor.cpp structure and Rust entity (trendlogs.rs):
 * - 5 columns: ID, Label, Interval, Status, Data Size (KB)
 * - Status display with badges
 * - Read-only data display
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
  Spinner,
  Text,
  Badge,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ArrowDownloadRegular,
  SettingsRegular,
  SearchRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import styles from './TrendlogsPage.module.css';

// Types based on Rust entity (trendlogs.rs)
interface TrendlogPoint {
  serialNumber: number;
  trendlogId?: string;
  trendlogLabel?: string;
  intervalSeconds?: number;
  status?: string;
  dataSizeKb?: string;
}

export const TrendlogsPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();

  const [trendlogs, setTrendlogs] = useState<TrendlogPoint[]>([]);
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

  // Fetch trendlogs for selected device
  const fetchTrendlogs = useCallback(async () => {
    if (!selectedDevice) {
      setTrendlogs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/t3_device/devices/${selectedDevice.serialNumber}/trendlogs`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch trendlogs: ${response.statusText}`);
      }

      const data = await response.json();
      setTrendlogs(data.trendlogs || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load trendlogs';
      setError(errorMessage);
      console.error('Error fetching trendlogs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchTrendlogs();
  }, [fetchTrendlogs]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTrendlogs();
    setRefreshing(false);
  };

  const handleExport = () => {
    console.log('Export trendlogs to CSV');
  };

  const handleSettings = () => {
    console.log('Settings clicked');
  };

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    console.log('Search query:', e.target.value);
  };

  // Column definitions based on Rust entity (5 columns)
  const columns: TableColumnDefinition<TrendlogPoint>[] = [
    // Column 0: Trendlog ID
    createTableColumn<TrendlogPoint>({
      columnId: 'trendlogId',
      renderHeaderCell: () => <span>ID</span>,
      renderCell: (item) => <TableCellLayout>{item.trendlogId || '---'}</TableCellLayout>,
    }),

    // Column 1: Label
    createTableColumn<TrendlogPoint>({
      columnId: 'trendlogLabel',
      renderHeaderCell: () => <span>Label</span>,
      renderCell: (item) => (
        <TableCellLayout>
          {item.trendlogLabel || 'Unnamed'}
        </TableCellLayout>
      ),
    }),

    // Column 2: Interval (seconds)
    createTableColumn<TrendlogPoint>({
      columnId: 'intervalSeconds',
      renderHeaderCell: () => <span>Interval (s)</span>,
      renderCell: (item) => (
        <TableCellLayout>
          {item.intervalSeconds ?? '---'}
        </TableCellLayout>
      ),
    }),

    // Column 3: Status
    createTableColumn<TrendlogPoint>({
      columnId: 'status',
      renderHeaderCell: () => <span>Status</span>,
      renderCell: (item) => {
        const isActive = item.status?.toLowerCase() === 'active' || item.status === '1';

        return (
          <TableCellLayout>
            <Badge
              appearance={isActive ? 'filled' : 'outline'}
              color={isActive ? 'success' : 'subtle'}
              size="small"
            >
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </TableCellLayout>
        );
      },
    }),

    // Column 4: Data Size (KB)
    createTableColumn<TrendlogPoint>({
      columnId: 'dataSizeKb',
      renderHeaderCell: () => <span>Data Size (KB)</span>,
      renderCell: (item) => (
        <TableCellLayout>
          {item.dataSizeKb || '0'}
        </TableCellLayout>
      ),
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
                    Showing trendlog monitors for <b>{selectedDevice.nameShowOnTree} (SN: {selectedDevice.serialNumber})</b>.
                    {' '}This table displays all configured trendlog/monitor data collection points including status, intervals, and data sizes.
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
                      placeholder="Search trendlogs..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search trendlogs"
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
                {loading && trendlogs.length === 0 && (
                  <div className={styles.loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spinner size="large" />
                    <Text style={{ marginLeft: '12px' }}>Loading trendlogs...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div style={{ textAlign: 'center' }}>
                      <Text size={500} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={300}>Please select a device from the tree to view trendlogs</Text>
                    </div>
                  </div>
                )}

                {/* Data Grid - Always show with header */}
                {selectedDevice && !loading && !error && (
                  <>
                    <DataGrid
                      items={trendlogs}
                      columns={columns}
                      sortable
                      resizableColumns
                      columnSizingOptions={{
                        trendlogId: {
                          minWidth: 80,
                          defaultWidth: 100,
                        },
                        trendlogLabel: {
                          minWidth: 150,
                          defaultWidth: 200,
                        },
                        intervalSeconds: {
                          minWidth: 100,
                          defaultWidth: 120,
                        },
                        status: {
                          minWidth: 100,
                          defaultWidth: 120,
                        },
                        dataSizeKb: {
                          minWidth: 120,
                          defaultWidth: 150,
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
                    <DataGridBody<TrendlogPoint>>
                      {({ item, rowId }) => (
                        <DataGridRow<TrendlogPoint> key={rowId}>
                          {({ renderCell }) => (
                            <DataGridCell>{renderCell(item)}</DataGridCell>
                          )}
                        </DataGridRow>
                      )}
                    </DataGridBody>
                  </DataGrid>

                  {/* No Data Message - Show below grid when empty */}
                  {trendlogs.length === 0 && (
                    <div style={{ marginTop: '24px', textAlign: 'center', padding: '0 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                        </svg>
                        <Text size={400} weight="semibold">No trendlogs found</Text>
                      </div>
                      <Text size={300} style={{ display: 'block', marginBottom: '16px', color: '#605e5c', textAlign: 'center' }}>This device has no configured trendlog monitors</Text>
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

export default TrendlogsPage;
