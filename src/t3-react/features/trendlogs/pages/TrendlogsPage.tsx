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
  Tooltip,
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
  InfoRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { TrendlogRefreshApi } from '../services/trendlogRefreshApi';
import { API_BASE_URL } from '../../../config/constants';
import { TrendChartDrawer } from '../components/TrendChartDrawer';
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
  _uniqueIndex?: number;
  panelId?: number;
}

interface TrendLogInput {
  id?: number;
  serialNumber?: number;
  panelId?: number;
  trendlogId?: string;
  pointType: string;
  pointIndex: string;
  pointPanel?: string;
  pointLabel?: string;
  status?: string;
  viewType?: string;
  viewNumber?: number;
  isSelected?: number;
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
  const [monitorInputs, setMonitorInputs] = useState<TrendLogInput[]>([]);
  const [loadingInputs, setLoadingInputs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Helper function to get row ID for a trendlog
  const getRowIdForItem = useCallback((item: TrendLogData) => {
    return `${item.serialNumber}-${item.trendlogId || item.trendlogIndex}-${item._uniqueIndex}`;
  }, []);

  // Chart drawer state
  const [chartDrawerOpen, setChartDrawerOpen] = useState(false);
  const [chartParams, setChartParams] = useState<{
    serialNumber?: number;
    panelId?: number;
    trendlogId?: string;
    monitorId?: string;
    itemData?: any; // Complete monitor configuration data (Vue pattern)
    monitorInputs?: any[]; // Monitor inputs for the selected trendlog
  }>({});

  // Handle opening trend chart drawer - construct itemData from trendlog info
  const handleViewChart = useCallback(
    async (trendlog: TrendLogData) => {
      if (!selectedDevice) return;

      console.log('📊 [TrendLogsPage] Opening chart drawer - Fetching trendlog config:', {
        serialNumber: selectedDevice.serialNumber,
        panelId: selectedDevice.panelId,
        trendlogId: trendlog.trendlogId,
        monitorIndex: trendlog.trendlogIndex,
      });

      const monitorIndex = trendlog.trendlogIndex || '0';

      try {
        // Step 1: Fetch trendlog info
        const trendlogUrl = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/trendlogs/${trendlog.trendlogId}`;
        console.log('📡 [TrendLogsPage] Fetching trendlog from:', trendlogUrl);

        const trendlogResponse = await fetch(trendlogUrl);
        if (!trendlogResponse.ok) {
          throw new Error(`Failed to fetch trendlog: ${trendlogResponse.statusText}`);
        }

        const trendlogData = await trendlogResponse.json();
        console.log('✅ [TrendLogsPage] Trendlog received:', trendlogData);

        // Step 2: Fetch TRENDLOG_INPUTS using the generic table endpoint
        const inputsUrl = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/table/TRENDLOG_INPUTS`;
        console.log('📡 [TrendLogsPage] Fetching TRENDLOG_INPUTS from:', inputsUrl);

        const inputsResponse = await fetch(inputsUrl);

        let inputItems: any[] = [];
        let rangeItems: any[] = [];

        if (inputsResponse.ok) {
          const inputsData = await inputsResponse.json();
          console.log('✅ [TrendLogsPage] Raw inputs data received:', inputsData);

          // Filter inputs for this specific trendlog and transform to expected format
          if (inputsData.data && Array.isArray(inputsData.data)) {
            const trendlogInputs = inputsData.data.filter(
              (input: any) => input.trendlogId === trendlog.trendlogId || input.Trendlog_ID === trendlog.trendlogId
            );

            console.log('✅ [TrendLogsPage] Filtered inputs for this trendlog:', trendlogInputs);

            if (trendlogInputs.length > 0) {
              inputItems = trendlogInputs.map((input: any) => ({
                panel: input.pointPanel || input.point_panel ? parseInt(input.pointPanel || input.point_panel) : selectedDevice.panelId,
                point_number: parseInt(input.pointIndex || input.point_index || '1') - 1, // Convert 1-based to 0-based
                point_type: (input.pointType || input.point_type) === 'INPUT' ? 0 : (input.pointType || input.point_type) === 'OUTPUT' ? 1 : 2,
                network: 0,
                sub_panel: 0,
              }));

              // TODO: Fetch range data from another table or FFI
              // For now, create default range items
              rangeItems = inputItems.map(() => ({
                digital_analog: 0, // Assume analog
                units: '',
              }));
            }
          }
        } else {
          console.warn('⚠️ [TrendLogsPage] Failed to fetch inputs:', inputsResponse.status, inputsResponse.statusText);
        }

        // Step 3: Construct itemData
        const itemData = {
          title: trendlogData?.trendlog?.trendlogLabel || trendlog.trendlogLabel || `Monitor ${monitorIndex}`,
          t3Entry: {
            id: `MON${monitorIndex}`,
            pid: selectedDevice.panelId || 1,
            label: trendlogData?.trendlog?.trendlogLabel || trendlog.trendlogLabel || `MON${monitorIndex}`,
            command: `${selectedDevice.panelId || 1}MON${monitorIndex}`,
            input: inputItems.length > 0 ? inputItems : undefined,
            range: rangeItems.length > 0 ? rangeItems : undefined,
          },
        };

        console.log('✅ [TrendLogsPage] Opening drawer with itemData:', {
          title: itemData.title,
          hasInputConfig: inputItems.length > 0,
          inputCount: inputItems.length,
          rangeCount: rangeItems.length,
        });

        // Step 4: Open drawer
        setChartParams({
          serialNumber: selectedDevice.serialNumber,
          panelId: selectedDevice.panelId || 1,
          trendlogId: trendlog.trendlogId || '0',
          monitorId: monitorIndex,
          itemData,
          monitorInputs: monitorInputs, // Pass the loaded monitor inputs
        });
        setChartDrawerOpen(true);
      } catch (error) {
        console.error('❌ [TrendLogsPage] Failed to fetch trendlog config:', error);
        // Fallback: Open drawer with basic structure (will show sample data)
        const itemData = {
          title: trendlog.trendlogLabel || `Monitor ${monitorIndex}`,
          t3Entry: {
            id: `MON${monitorIndex}`,
            pid: selectedDevice.panelId || 1,
            label: trendlog.trendlogLabel || `MON${monitorIndex}`,
            command: `${selectedDevice.panelId || 1}MON${monitorIndex}`,
          },
        };

        setChartParams({
          serialNumber: selectedDevice.serialNumber,
          panelId: selectedDevice.panelId || 1,
          trendlogId: trendlog.trendlogId || '0',
          monitorId: monitorIndex,
          itemData,
          monitorInputs: monitorInputs, // Pass the loaded monitor inputs
        });
        setChartDrawerOpen(true);
      }
    },
    [selectedDevice, monitorInputs]
  );  // Debug log to verify new component is loading
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
      setSelectedMonitor(null);
      setMonitorInputs([]);
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

      // Debug: Check for duplicate trendlogIds
      const idCounts = fetchedTrendLogs.reduce((acc: any, log: any) => {
        const id = log.trendlogId || log.trendlogIndex;
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});
      const duplicates = Object.entries(idCounts).filter(([_, count]) => (count as number) > 1);
      if (duplicates.length > 0) {
        console.warn('⚠️ [TrendLogsPage] Duplicate trendlogIds found:', duplicates);
        console.log('📊 [TrendLogsPage] Full trendlog data:', fetchedTrendLogs);
      }

      // Add unique index to each trendlog to ensure unique keys
      const trendlogsWithIndex = fetchedTrendLogs.map((log: any, idx: number) => ({
        ...log,
        _uniqueIndex: idx
      }));

      setTrendLogs(trendlogsWithIndex);

      // Auto-select first trendlog and load its inputs
      if (trendlogsWithIndex.length > 0) {
        console.log('🎯 [TrendLogsPage] Auto-selecting first trendlog:', trendlogsWithIndex[0]);
        const firstTrendlog = trendlogsWithIndex[0];

        // Use loadTrendlogInputs to handle the loading with deduplication
        setSelectedMonitor(firstTrendlog);

        // Select the first row's radio button
        const firstRowId = `${firstTrendlog.serialNumber}-${firstTrendlog.trendlogId || firstTrendlog.trendlogIndex}-${firstTrendlog._uniqueIndex}`;
        setSelectedItems(new Set([firstRowId]));

        if (firstTrendlog.trendlogId) {
          await loadTrendlogInputsInternal(firstTrendlog);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load trendlogs';
      setError(errorMessage);
      console.error('Error fetching trendlogs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  // Internal function to load inputs with deduplication
  const loadTrendlogInputsInternal = async (trendlog: TrendLogData) => {
    if (!selectedDevice || !trendlog.trendlogId) {
      setMonitorInputs([]);
      return;
    }

    setLoadingInputs(true);
    try {
      const fallbackUrl = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/table/TRENDLOG_INPUTS`;
      const fallbackResponse = await fetch(fallbackUrl);

      if (fallbackResponse.ok) {
        const inputsData = await fallbackResponse.json();

        const trendlogInputs = (inputsData.data || []).filter(
          (input: any) => {
            const trendlogMatch = input.trendlogId === trendlog.trendlogId || input.Trendlog_ID === trendlog.trendlogId;
            const viewMatch = input.viewType === 'MAIN' || input.view_type === 'MAIN' ||
                             input.viewType === 'VIEW' || input.view_type === 'VIEW' ||
                             !input.viewType;
            return trendlogMatch && viewMatch;
          }
        );

        // Remove duplicates
        const uniqueInputsMap = new Map<string, any>();
        trendlogInputs.forEach((input: any) => {
          const pointType = input.Point_Type || input.pointType;
          const pointIndex = input.Point_Index || input.pointIndex;
          const key = `${pointType}-${pointIndex}`;

          if (!uniqueInputsMap.has(key)) {
            uniqueInputsMap.set(key, input);
          } else {
            const existing = uniqueInputsMap.get(key);
            const existingViewType = existing.view_type || existing.viewType;
            const currentViewType = input.view_type || input.viewType;

            if (currentViewType === 'MAIN' && existingViewType !== 'MAIN') {
              uniqueInputsMap.set(key, input);
            }
          }
        });

        const uniqueInputs = Array.from(uniqueInputsMap.values());

        const formattedInputs: TrendLogInput[] = uniqueInputs.map((input: any) => ({
          id: input.id,
          serialNumber: input.SerialNumber || input.serialNumber,
          panelId: input.PanelId || input.panelId,
          trendlogId: input.Trendlog_ID || input.trendlogId,
          pointType: input.Point_Type || input.pointType,
          pointIndex: input.Point_Index || input.pointIndex,
          pointPanel: input.Point_Panel || input.pointPanel,
          pointLabel: input.Point_Label || input.pointLabel,
          status: input.Status || input.status,
          viewType: input.view_type || input.viewType,
          viewNumber: input.view_number || input.viewNumber,
          isSelected: input.is_selected || input.isSelected,
        }));

        setMonitorInputs(formattedInputs);
      } else {
        setMonitorInputs([]);
      }
    } catch (error) {
      console.error('❌ [TrendLogsPage] Error loading inputs:', error);
      setMonitorInputs([]);
    } finally {
      setLoadingInputs(false);
    }
  };

  // Load inputs for a specific trendlog
  const loadTrendlogInputs = useCallback(async (trendlog: TrendLogData) => {
    if (!selectedDevice || !trendlog.trendlogId) {
      console.log('⚠️ [TrendLogsPage] Missing device or trendlog ID');
      setSelectedMonitor(trendlog);
      setMonitorInputs([]);
      return;
    }

    console.log('📡 [TrendLogsPage] Loading inputs for trendlog:', trendlog.trendlogId);
    setSelectedMonitor(trendlog);
    await loadTrendlogInputsInternal(trendlog);
  }, [selectedDevice]);

  useEffect(() => {
    fetchTrendLogs();
  }, [fetchTrendLogs]);

  // Auto-refresh once after page load (Trigger #1)
  useEffect(() => {
    if (loading || !selectedDevice || autoRefreshed) return;

    const checkAndRefresh = async () => {
      try {
        console.log('[TrendLogsPage] Auto-refreshing from device...');
        const refreshResponse = await TrendlogRefreshApi.refreshAllFromDevice(selectedDevice.serialNumber);
        console.log('[TrendLogsPage] Refresh response:', refreshResponse);
        await fetchTrendLogs();
        setAutoRefreshed(true);
      } catch (error) {
        console.error('[TrendLogsPage] Auto-refresh failed:', error);
        setAutoRefreshed(true);
      }
    };

    checkAndRefresh();
  }, [loading, selectedDevice, autoRefreshed, fetchTrendLogs]);

  // Refresh all trendlogs from device (Trigger #2: Manual "Refresh All" button)
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    try {
      console.log('[TrendLogsPage] Refreshing all trendlogs from device...');
      const refreshResponse = await TrendlogRefreshApi.refreshAllFromDevice(selectedDevice.serialNumber);
      console.log('[TrendLogsPage] Refresh response:', refreshResponse);
      await fetchTrendLogs();
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
      const refreshResponse = await TrendlogRefreshApi.refreshSingleFromDevice(selectedDevice.serialNumber, index);
      console.log('[TrendLogsPage] Refresh response:', refreshResponse);
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
    console.log('🔵 [TrendLogsPage] handleMonitorSelect called with:', monitor);
    console.log('🔵 [TrendLogsPage] VERSION: 2025-12-12-v2 - Using NEW input loading code');

    // Update radio button selection
    const rowId = getRowIdForItem(monitor);
    setSelectedItems(new Set([rowId]));

    await loadTrendlogInputs(monitor);
  }, [loadTrendlogInputs, getRowIdForItem]);

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

  // Display data with 10 empty rows when no trendlogs
  const displayTrendLogs = React.useMemo(() => {
    if (trendLogs.length === 0) {
      return Array(10).fill(null).map((_, index) => ({
        serialNumber: selectedDevice?.serialNumber || 0,
        trendlogId: '',
        trendlogIndex: '',
        trendlogLabel: '',
        intervalSeconds: undefined,
        bufferSize: undefined,
        autoManual: '',
        status: '',
        _uniqueIndex: index,
        panelId: selectedDevice?.panelId,
      }));
    }
    return trendLogs;
  }, [trendLogs, selectedDevice]);

  // Helper to identify empty rows
  const isEmptyRow = (item: TrendLogData) => !item.trendlogId && !item.trendlogIndex && trendLogs.length === 0;

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
        <div className={styles.headerCellSort} onClick={() => handleSort('trendlogId')}>
          <span>Trendlog ID</span>
          {sortColumn === 'trendlogId' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => {
        const trendlogIndex = item.trendlogId || item.trendlogIndex || '';
        const isRefreshingThis = refreshingItems.has(trendlogIndex);

        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
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
                    className={`${styles.iconSmall} ${isRefreshingThis ? styles.rotating : ''}`}
                  />
                </button>
                <Text size={200} weight="regular">{trendlogIndex || '---'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<TrendLogData>({
      columnId: 'trendlogLabel',
      compare: (a, b) => (a.trendlogLabel || '').localeCompare(b.trendlogLabel || ''),
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('trendlogLabel')}>
          <span>Label</span>
          {sortColumn === 'trendlogLabel' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && <Text size={200}>{item.trendlogLabel || '---'}</Text>}
        </TableCellLayout>
      ),
    }),
    createTableColumn<TrendLogData>({
      columnId: 'intervalSeconds',
      renderHeaderCell: () => <span>Interval (sec)</span>,
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && <Text size={200}>{item.intervalSeconds ?? '---'}</Text>}
        </TableCellLayout>
      ),
    }),
    createTableColumn<TrendLogData>({
      columnId: 'bufferSize',
      renderHeaderCell: () => <span>Buffer Size</span>,
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && <Text size={200}>{item.bufferSize ?? '---'}</Text>}
        </TableCellLayout>
      ),
      compare: (a, b) => (a.bufferSize || 0) - (b.bufferSize || 0),
    }),
    createTableColumn<TrendLogData>({
      columnId: 'autoManual',
      renderHeaderCell: () => <span>Auto/Manual</span>,
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (
            <Badge appearance={item.autoManual === '1' ? 'filled' : 'outline'} color="informative">
              {item.autoManual === '1' ? 'Auto' : item.autoManual === '0' ? 'Manual' : '---'}
            </Badge>
          )}
        </TableCellLayout>
      ),
      compare: (a, b) => (a.autoManual || '').localeCompare(b.autoManual || ''),
    }),
    createTableColumn<TrendLogData>({
      columnId: 'status',
      renderHeaderCell: () => <span>Status</span>,
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (
            <Badge appearance="tint" color={item.status === 'ON' ? 'success' : 'subtle'}>
              {item.status || 'OFF'}
            </Badge>
          )}
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
          {!isEmptyRow(item) && (
            <Button
              size="small"
              icon={<ChartMultipleRegular className={styles.iconSmall} />}
              onClick={() => handleViewChart(item)}
              title="View trend chart for this trendlog"
            >
              View Graphic
            </Button>
          )}
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
          <div style={{ textAlign: 'center' }}>
            <Text size={400} weight="semibold">No device selected</Text>
            <br />
            <Text size={200}>Please select a device from the tree to view trendlogs</Text>
          </div>
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
                <div className={styles.errorNotice}>
                  <ErrorCircleRegular className={styles.iconError} />
                  <Text className={styles.textError}>
                    {error}
                  </Text>
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

                  {/* Info Button with Tooltip */}
                  <Tooltip
                    content={`Showing trend log monitors for ${selectedDevice.nameShowOnTree || selectedDevice.productName} (SN: ${selectedDevice.serialNumber}). This table displays all configured trendlog/monitor data collection points. Click the refresh icon next to each trendlog to sync from the device.`}
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
                    <Text size={200} weight="regular">Loading trendlogs...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div style={{ textAlign: 'center' }}>
                      <Text size={400} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={200}>Please select a device from the tree to view trendlogs</Text>
                    </div>
                  </div>
                )}

                {/* Dual Grid Layout - Main Grid (80%) + Input Grid (20%) */}
                {selectedDevice && !loading && !error && (
                  <div className={styles.gridContainer}>
                    {/* Main Monitor List - Left Side (80%) */}
                    <div className={`${styles.mainGrid} ${styles.scrollContainerAuto}`}>
                      <DataGrid
                        key="trendlogs-grid-v5"
                        items={displayTrendLogs}
                        columns={columns}
                        sortable
                        resizableColumns
                        selectionMode="single"
                        selectedItems={selectedItems}
                        onSelectionChange={(_e, data) => {
                          setSelectedItems(data.selectedItems as Set<string>);
                        }}
                        className={styles.fullWidth}
                        columnSizingOptions={{
                          __selection__: {
                            idealWidth: '5%',
                            minWidth: 44,
                          },
                          trendlogId: {
                            idealWidth: '12%',
                            minWidth: 95,
                          },
                          trendlogLabel: {
                            idealWidth: '26%',
                            minWidth: 150,
                          },
                          intervalSeconds: {
                            idealWidth: '12%',
                            minWidth: 80,
                          },
                          bufferSize: {
                            idealWidth: '10%',
                            minWidth: 90,
                          },
                          autoManual: {
                            idealWidth: '12%',
                            minWidth: 90,
                          },
                          status: {
                            idealWidth: '8%',
                            minWidth: 70,
                          },
                          actions: {
                            idealWidth: '15%',
                            minWidth: 120,
                          },
                        }}
                        getRowId={(item) => `${item.serialNumber}-${item.trendlogId || item.trendlogIndex}-${item._uniqueIndex}`}
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
                            <DataGridRow<TrendLogData>
                              key={rowId}
                              onClick={() => handleMonitorSelect(item)}
                              className={selectedMonitor?.trendlogId === item.trendlogId ? styles.rowSelected : styles.rowClickable}
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
                        <Text size={300} weight="semibold">
                          Monitor Inputs {loadingInputs && <Spinner size="tiny" className={styles.marginLeft8} />}
                        </Text>
                        {monitorInputs.length > 0 && (
                          <Badge appearance="filled" color="informative" size="small">
                            {monitorInputs.length} inputs
                          </Badge>
                        )}
                      </div>
                      <div className={styles.subGridBody}>
                        {loadingInputs ? (
                          <div className={styles.centerPadding}>
                            <Spinner size="small" label="Loading inputs..." />
                          </div>
                        ) : monitorInputs.length > 0 ? (
                          monitorInputs.map((input, index) => {
                            const pointTypeShort =
                              input.pointType === 'IN' ? 'IN' :
                              input.pointType === 'OUT' ? 'OUT' :
                              input.pointType === 'VAR' ? 'VAR' :
                              input.pointType;

                            const displayLabel = input.pointLabel ||
                              `${pointTypeShort}${input.pointIndex}`;

                            return (
                              <div key={`${input.pointType}-${input.pointIndex}-${index}`} className={styles.inputRow}>
                                <div className={styles.inputNum}>{index + 1}</div>
                                <Tooltip
                                  content={`${pointTypeShort}${input.pointIndex}: ${input.pointLabel || 'No label'}`}
                                  relationship="label"
                                >
                                  <div className={styles.inputValue}>{displayLabel}</div>
                                </Tooltip>
                              </div>
                            );
                          })
                        ) : (
                          <div className={styles.centerPaddingMuted}>
                            <Text size={200}>No inputs configured</Text>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* No Data Message - Show when device selected but no trendlogs */}
                {/* {selectedDevice && !loading && !error && trendLogs.length === 0 && (
                  <div className={styles.emptyStateContainer}>
                    <div className={styles.emptyStateHeader}>
                      <Text size={400} weight="semibold">No trendlogs found</Text>
                    </div>
                    <Text size={300} className={styles.emptyStateText}>
                      This device has no configured trendlog monitors
                    </Text>
                  </div>
                )} */}

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
        itemData={chartParams.itemData}
        monitorInputs={chartParams.monitorInputs}
      />
    </div>
  );
};
