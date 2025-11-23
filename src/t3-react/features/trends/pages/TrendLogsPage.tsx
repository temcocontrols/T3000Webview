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
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { TrendlogRefreshApiService } from '../../../services/trendlogRefreshApi';
import { API_BASE_URL } from '../../../config/constants';
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

  // Column definitions
  const columns: TableColumnDefinition<TrendLogData>[] = [
    createTableColumn<TrendLogData>({
      columnId: 'trendlogId',
      renderHeaderCell: () => <span>Trendlog ID</span>,
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
      renderHeaderCell: () => <span>Label</span>,
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
    }),
  ];

  // Render content
  if (!selectedDevice) {
    return (
      <div className={styles.container}>
        <div className={styles.noData}>
          <Text size={300} weight="semibold">No Device Selected</Text>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Spinner size="medium" label="Loading trend logs..." />
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
                <div className={styles.toolbarContainer}>
                  <button
                    className={styles.toolbarButton}
                    onClick={handleRefreshFromDevice}
                    disabled={refreshing}
                  >
                    {refreshing ? <Spinner size="tiny" /> : <ArrowSyncRegular />}
                    <span>Refresh from Device</span>
                  </button>
                  <div className={styles.toolbarSeparator} />
                  <button className={styles.toolbarButton} onClick={handleExport}>
                    <ArrowDownloadRegular />
                    <span>Export</span>
                  </button>
                  <button className={styles.toolbarButton} onClick={handleSettings}>
                    <SettingsRegular />
                    <span>Settings</span>
                  </button>
                </div>
              </div>

              <hr className={styles.overviewHr} />

              {/* Description */}
              <div className={styles.bladeDescription}>
                <p>
                  Manage trend log configurations for {selectedDevice.productName || `Device ${selectedDevice.serialNumber}`}.
                  Click the refresh icon next to each trendlog to sync from the device.
                </p>
              </div>

              {/* Loading/Error bars */}
              {refreshing && (
                <div className={styles.loadingBar}>
                  <Spinner size="extra-tiny" />
                  <span>Refreshing trendlogs from device...</span>
                </div>
              )}

              {error && (
                <div className={styles.errorBar}>
                  {error}
                </div>
              )}

              {/* Data Grid */}
              <div className={styles.dockingBody}>
                {trendLogs.length === 0 ? (
                  <div className={styles.noData}>
                    <Text size={300}>No trend logs configured</Text>
                  </div>
                ) : (
                  <DataGrid
                    items={trendLogs}
                    columns={columns}
                    sortable
                    getRowId={(item) => `${item.serialNumber}-${item.trendlogId || item.trendlogIndex}`}
                  >
                    <DataGridHeader>
                      <DataGridRow>
                        {({ renderHeaderCell }) => (
                          <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                        )}
                      </DataGridRow>
                    </DataGridHeader>
                    <DataGridBody<TrendLogData>>
                      {({ item, rowId }) => (
                        <DataGridRow<TrendLogData> key={rowId}>
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
