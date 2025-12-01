/**
 * TrendLogsPage Component
 *
 * Manage trend log configurations with device refresh
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
  SettingsRegular,
  SearchRegular,
  ErrorCircleRegular,
  ArrowSortUpRegular,
  ArrowSortDownRegular,
  ArrowSortRegular,
  ChartMultipleRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { TrendlogRefreshApiService } from '../services/trendlogRefreshApi';
import { API_BASE_URL } from '../../../config/constants';
import { TrendChartDrawer } from '../../trends/components/TrendChartDrawer';
import styles from './TrendLogsPage.module.css';

interface TrendLogData {
  serialNumber: number;
  trendlogId?: string;
  trendlogIndex?: string;
  trendlogLabel?: string;
  intervalSeconds?: number;
  bufferSize?: number;
  autoManual?: string;
  status?: string;
}

export const TrendLogsPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();

  const [trendLogs, setTrendLogs] = useState<TrendLogData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
  const [autoRefreshed, setAutoRefreshed] = useState(false);
  const [selectedMonitor, setSelectedMonitor] = useState<TrendLogData | null>(null);
  const [monitorInputs, setMonitorInputs] = useState<string[]>(Array(14).fill(''));
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending');

  // Chart drawer state
  const [chartDrawerOpen, setChartDrawerOpen] = useState(false);
  const [chartParams, setChartParams] = useState<{
    serialNumber?: number;
    panelId?: number;
    trendlogId?: string;
    monitorId?: string;
  }>({});

  // Handle opening trend chart drawer
  const handleViewChart = useCallback(
    (trendlog: TrendLogData) => {
      if (!selectedDevice) return;

      console.log('📊 [TrendLogsPage] Opening chart drawer:', {
        trendlog: trendlog.trendlogId,
        monitor: trendlog.trendlogIndex,
      });

      setChartParams({
        serialNumber: selectedDevice.serialNumber,
        panelId: selectedDevice.panelId || 1,
        trendlogId: trendlog.trendlogId || '0',
        monitorId: trendlog.trendlogIndex || '0',
      });
      setChartDrawerOpen(true);
    },
    [selectedDevice]
  );

  // Debug log to verify new component is loading
  useEffect(() => {
    console.log('🔍 [TrendLogsPage] NEW DataGrid version loaded!', {
      selectedDevice: selectedDevice?.serialNumber,
      trendLogsCount: trendLogs.length
    });
  }, [selectedDevice, trendLogs.length]);

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
  const fetchTrendLogs = useCallback(async () => {
    if (!selectedDevice) {
      setTrendLogs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/trendlogs`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch trendlogs: ${response.statusText}`);
      }

      const data = await response.json();
      const fetchedTrendLogs = data.trendlogs || [];
      setTrendLogs(fetchedTrendLogs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load trendlogs';
      setError(errorMessage);
      console.error('Error fetching trendlogs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchTrendLogs();
  }, [fetchTrendLogs]);

  // Auto-refresh once after page load (Trigger #1)
  useEffect(() => {
    if (loading || !selectedDevice || autoRefreshed) return;

    const timer = setTimeout(async () => {
      try {
        console.log('[TrendLogsPage] Auto-refreshing from device...');
        const refreshResponse = await TrendlogRefreshApiService.refreshAllTrendlogs(selectedDevice.serialNumber);
        console.log('[TrendLogsPage] Refresh response:', refreshResponse);

        if (refreshResponse.items && refreshResponse.items.length > 0) {
          await TrendlogRefreshApiService.saveRefreshedTrendlogs(selectedDevice.serialNumber, refreshResponse.items);
          await fetchTrendLogs();
        } else {
          console.warn('[TrendLogsPage] Auto-refresh: No items received, keeping existing data');
        }
        setAutoRefreshed(true);
      } catch (error) {
        console.error('[TrendLogsPage] Auto-refresh failed:', error);
        setAutoRefreshed(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [loading, selectedDevice, autoRefreshed, fetchTrendLogs]);

  // Refresh all trendlogs from device (Trigger #2: Manual "Refresh All" button)
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    try {
      console.log('[TrendLogsPage] Refreshing all trendlogs from device...');
      const refreshResponse = await TrendlogRefreshApiService.refreshAllTrendlogs(selectedDevice.serialNumber);
      console.log('[TrendLogsPage] Refresh response:', refreshResponse);

      if (refreshResponse.items && refreshResponse.items.length > 0) {
        const saveResponse = await TrendlogRefreshApiService.saveRefreshedTrendlogs(
          selectedDevice.serialNumber,
          refreshResponse.items
        );
        console.log('[TrendLogsPage] Save response:', saveResponse);
        await fetchTrendLogs();
      } else {
        console.warn('[TrendLogsPage] No items received from refresh, keeping existing data');
      }
    } catch (error) {
      console.error('[TrendLogsPage] Failed to refresh from device:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh from device');
    } finally {
      setRefreshing(false);
    }
  };

  // Refresh single trendlog from device (Trigger #3: Per-row refresh icon)
  const handleRefreshSingleTrendlog = async (trendlogIndex: string) => {
    if (!selectedDevice) return;

    const index = parseInt(trendlogIndex, 10);
    if (isNaN(index)) {
      console.error('[TrendLogsPage] Invalid trendlog index:', trendlogIndex);
      return;
    }

    setRefreshingItems(prev => new Set(prev).add(trendlogIndex));
    try {
      console.log(`[TrendLogsPage] Refreshing trendlog ${index} from device...`);
      const refreshResponse = await TrendlogRefreshApiService.refreshTrendlog(selectedDevice.serialNumber, index);
      console.log('[TrendLogsPage] Refresh response:', refreshResponse);

      if (refreshResponse.items && refreshResponse.items.length > 0) {
        const saveResponse = await TrendlogRefreshApiService.saveRefreshedTrendlogs(
          selectedDevice.serialNumber,
          refreshResponse.items
        );
        console.log('[TrendLogsPage] Save response:', saveResponse);
      }

      await fetchTrendLogs();
    } catch (error) {
      console.error(`[TrendLogsPage] Failed to refresh trendlog ${index}:`, error);
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(trendlogIndex);
        return newSet;
      });
    }
  };

  const handleExport = () => {
    console.log('Export trendlogs to CSV');
  };

  const handleSettings = () => {
    console.log('Settings clicked');
  };

  const handleMonitorSelect = useCallback(async (monitor: TrendLogData) => {
    setSelectedMonitor(monitor);
    // Fetch monitor inputs for the selected monitor
    if (!selectedDevice) return;

    try {
      const url = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/trendlogs/${monitor.trendlogId}/inputs`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setMonitorInputs(data.inputs || Array(14).fill(''));
      } else {
        // If API not implemented yet, use empty inputs
        setMonitorInputs(Array(14).fill(''));
      }
    } catch (err) {
      console.error('Error fetching monitor inputs:', err);
      setMonitorInputs(Array(14).fill(''));
    }
  }, [selectedDevice]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
    } else {
      setSortColumn(columnId);
      setSortDirection('ascending');
    }
  };

  // Column definitions
  const columns: TableColumnDefinition<TrendLogData>[] = [
    createTableColumn<TrendLogData>({
      columnId: 'trendlogId',
      compare: (a, b) => {
        const aVal = Number(a.trendlogId || a.trendlogIndex || 0);
        const bVal = Number(b.trendlogId || b.trendlogIndex || 0);
        return aVal - bVal;
      },
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('trendlogId')}>
          <span>Trendlog ID</span>
          {sortColumn === 'trendlogId' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => {
        const trendlogIndex = item.trendlogId || item.trendlogIndex || '';
        const isRefreshingThis = refreshingItems.has(trendlogIndex);

        return (
          <TableCellLayout>
            <div className={styles.refreshContainer}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefreshSingleTrendlog(trendlogIndex);
                }}
                className={`${styles.refreshIconButton} ${isRefreshingThis ? styles.isRefreshing : ''}`}
                title="Refresh this trendlog from device"
                disabled={isRefreshingThis}
              >
                <ArrowSyncRegular
                  style={{ fontSize: '14px' }}
                  className={isRefreshingThis ? styles.rotating : ''}
                />
              </button>
              <Text size={200} weight="regular">{trendlogIndex || '---'}</Text>
            </div>
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<TrendLogData>({
      columnId: 'trendlogLabel',
      compare: (a, b) => (a.trendlogLabel || '').localeCompare(b.trendlogLabel || ''),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('trendlogLabel')}>
          <span>Label</span>
          {sortColumn === 'trendlogLabel' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          <Text size={200}>{item.trendlogLabel || '---'}</Text>
        </TableCellLayout>
      ),
    }),
    createTableColumn<TrendLogData>({
      columnId: 'intervalSeconds',
      renderHeaderCell: () => <span>Interval (sec)</span>,
      renderCell: (item) => (
        <TableCellLayout>
          <Text size={200}>{item.intervalSeconds ?? '---'}</Text>
        </TableCellLayout>
      ),
    }),
    createTableColumn<TrendLogData>({
      columnId: 'bufferSize',
      renderHeaderCell: () => <span>Buffer Size</span>,
      renderCell: (item) => (
        <TableCellLayout>
          <Text size={200}>{item.bufferSize ?? '---'}</Text>
        </TableCellLayout>
      ),
      compare: (a, b) => (a.bufferSize || 0) - (b.bufferSize || 0),
    }),
    createTableColumn<TrendLogData>({
      columnId: 'autoManual',
      renderHeaderCell: () => <span>Auto/Manual</span>,
      renderCell: (item) => (
        <TableCellLayout>
          <Badge appearance={item.autoManual === '1' ? 'filled' : 'outline'} color="informative">
            {item.autoManual === '1' ? 'Auto' : item.autoManual === '0' ? 'Manual' : '---'}
          </Badge>
        </TableCellLayout>
      ),
      compare: (a, b) => (a.autoManual || '').localeCompare(b.autoManual || ''),
    }),
    createTableColumn<TrendLogData>({
      columnId: 'status',
      renderHeaderCell: () => <span>Status</span>,
      renderCell: (item) => (
        <TableCellLayout>
          <Badge appearance="tint" color={item.status === 'ON' ? 'success' : 'subtle'}>
            {item.status || 'OFF'}
          </Badge>
        </TableCellLayout>
      ),
      compare: (a, b) => (a.status || '').localeCompare(b.status || ''),
    }),
    // Actions column - View Chart (moved to last)
    createTableColumn<TrendLogData>({
      columnId: 'actions',
      renderHeaderCell: () => <span>Actions</span>,
      renderCell: (item) => (
        <TableCellLayout>
          <Button
            size="small"
            icon={<ChartMultipleRegular style={{ fontSize: '14px' }} />}
            onClick={() => handleViewChart(item)}
            title="View trend chart for this trendlog"
          >
            View Graphic
          </Button>
        </TableCellLayout>
      ),
    }),
  ];

  // Render content
  if (!selectedDevice) {
    console.log('⚠️ [TrendLogsPage] No device selected - showing empty state');
    return (
      <div className={styles.container}>
        <div className={styles.noData}>
          <Text size={300} weight="semibold">No Device Selected</Text>
        </div>
      </div>
    );
  }

  if (loading) {
    console.log('⏳ [TrendLogsPage] Loading state active');
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Spinner size="medium" label="Loading trend logs..." />
        </div>
      </div>
    );
  }

  console.log('✅ [TrendLogsPage] Rendering full page with toolbar', {
    trendLogsCount: trendLogs.length,
    refreshing,
    selectedDevice: selectedDevice.serialNumber
  });

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
                    Showing trend log monitors for <b>{selectedDevice.nameShowOnTree || selectedDevice.productName} (SN: {selectedDevice.serialNumber})</b>.
                    {' '}This table displays all configured trendlog/monitor data collection points. Click the refresh icon next to each trendlog to sync from the device.
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
                  {/* Refresh Button - Refresh from Device */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleRefreshFromDevice}
                    disabled={refreshing}
                    title="Refresh all trendlogs from device"
                    aria-label="Refresh from Device"
                  >
                    <ArrowSyncRegular />
                    <span>{refreshing ? 'Refreshing...' : 'Refresh from Device'}</span>
                  </button>

                  {/* Vertical Separator */}
                  <div className={styles.toolbarSeparator}></div>

                  {/* Export to CSV Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleExport}
                    disabled={!selectedDevice}
                    title="Export trendlogs to CSV"
                    aria-label="Export to CSV"
                  >
                    <ArrowDownloadRegular />
                    <span>Export</span>
                  </button>

                  {/* Settings Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleSettings}
                    disabled={!selectedDevice}
                    title="Configure trendlog settings"
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
              )}

              {/* ========================================
                  DOCKING BODY - Main Content (Dual Grid Layout)
                  Matches: msportalfx-docking-body
                  ======================================== */}
              <div className={styles.dockingBody}>

                {/* Loading State */}
                {loading && trendLogs.length === 0 && (
                  <div className={styles.loadingBar}>
                    <Spinner size="tiny" />
                    <Text>Loading trendlogs...</Text>
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

                {/* Dual Grid Layout - Main Grid (80%) + Input Grid (20%) */}
                {selectedDevice && !loading && !error && trendLogs.length > 0 && (
                  <div className={styles.gridContainer}>
                    {/* Main Monitor List - Left Side (80%) */}
                    <div className={styles.mainGrid}>
                      <DataGrid
                        items={trendLogs}
                        columns={columns}
                        sortable
                        resizableColumns
                        selectionMode="single"
                        columnSizingOptions={{
                          trendlogId: {
                            minWidth: 120,
                            defaultWidth: 150,
                          },
                          trendlogLabel: {
                            minWidth: 150,
                            defaultWidth: 200,
                          },
                          intervalSeconds: {
                            minWidth: 100,
                            defaultWidth: 120,
                          },
                          bufferSize: {
                            minWidth: 90,
                            defaultWidth: 110,
                          },
                          autoManual: {
                            minWidth: 100,
                            defaultWidth: 130,
                          },
                          status: {
                            minWidth: 70,
                            defaultWidth: 80,
                          },
                          actions: {
                            minWidth: 150,
                            defaultWidth: 180,
                          },
                        }}
                        getRowId={(item) => `${item.serialNumber}-${item.trendlogId || item.trendlogIndex}`}
                      >
                        <DataGridHeader>
                          <DataGridRow selectionCell={{ renderHeaderCell: () => <span>#</span> }}>
                            {({ renderHeaderCell }) => (
                              <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                            )}
                          </DataGridRow>
                        </DataGridHeader>
                        <DataGridBody<TrendLogData>>
                          {({ item, rowId }) => (
                            <DataGridRow<TrendLogData>
                              key={rowId}
                              onClick={() => handleMonitorSelect(item)}
                              style={{
                                cursor: 'pointer',
                                backgroundColor: selectedMonitor?.trendlogId === item.trendlogId ? '#e6f2ff' : undefined
                              }}
                            >
                              {({ renderCell }) => (
                                <DataGridCell>{renderCell(item)}</DataGridCell>
                              )}
                            </DataGridRow>
                          )}
                        </DataGridBody>
                      </DataGrid>
                    </div>

                    {/* Monitor Input List - Right Side (20%) */}
                    <div className={styles.subGrid}>
                      <div className={styles.subGridHeader}>
                        <Text size={300} weight="semibold">Monitor Inputs</Text>
                      </div>
                      <div className={styles.subGridBody}>
                        {monitorInputs.map((input, index) => (
                          <div key={index} className={styles.inputRow}>
                            <div className={styles.inputNum}>{index + 1}</div>
                            <div className={styles.inputValue}>{input || '-'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* No Data Message - Show when device selected but no trendlogs */}
                {selectedDevice && !loading && !error && trendLogs.length === 0 && (
                  <div style={{ marginTop: '24px', textAlign: 'center', padding: '0 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Text size={400} weight="semibold">No trendlogs found</Text>
                    </div>
                    <Text size={300} style={{ display: 'block', marginBottom: '16px', color: '#605e5c', textAlign: 'center' }}>
                      This device has no configured trendlog monitors
                    </Text>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Chart Drawer */}
      <TrendChartDrawer
        isOpen={chartDrawerOpen}
        onClose={() => setChartDrawerOpen(false)}
        serialNumber={chartParams.serialNumber}
        panelId={chartParams.panelId}
        trendlogId={chartParams.trendlogId}
        monitorId={chartParams.monitorId}
      />
    </div>
  );
};
