/**
 * TrendLogsPage Component
 *
 * Manage trend log configurations with device refresh
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { PanelDataRefreshService } from '../../../shared/services/panelDataRefreshService';
import { API_BASE_URL } from '../../../config/constants';
import { TrendChartDrawer } from '../components/TrendChartDrawer';
import styles from './TrendLogsPage.module.css';
import { useRegisterCsvHandlers } from '@t3-react/shared/context/CsvOperationsContext';
import { exportToCsv, parseCsvFile, mapCsvToObjects } from '@t3-react/shared/utils/csvUtils';

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
  dataSizeKb?: string;
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
  const [dbChecked, setDbChecked] = useState(false);
  const deviceRefreshedRef = useRef<number | null>(null);
  const autoRefreshInProgressRef = useRef(false);
  const fetchRequestIdRef = useRef(0);
  const [selectedMonitor, setSelectedMonitor] = useState<TrendLogData | null>(null);
  const [monitorInputs, setMonitorInputs] = useState<TrendLogInput[]>([]);
  const [loadingInputs, setLoadingInputs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const selectedSerial = selectedDevice?.serialNumber;
  const selectedPanelId = selectedDevice?.panelId;

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

              // Fetch actual digital_analog and units from point endpoints
              const pointTypeMap: Record<number, string> = { 0: 'input-points', 1: 'output-points', 2: 'variable-points' };
              const pointKeyMap: Record<number, string> = { 0: 'input_points', 1: 'output_points', 2: 'variable_points' };
              const pointsCache: Record<number, any[]> = {};

              // Fetch each unique point type once
              const neededTypes = [...new Set(inputItems.map((item: any) => item.point_type as number))];
              await Promise.all(neededTypes.map(async (pt) => {
                try {
                  const endpoint = pointTypeMap[pt];
                  const resp = await fetch(`${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/${endpoint}`);
                  if (resp.ok) {
                    const data = await resp.json();
                    pointsCache[pt] = data[pointKeyMap[pt]] || [];
                  }
                } catch { /* ignore fetch errors */ }
              }));

              rangeItems = inputItems.map((item: any) => {
                const points = pointsCache[item.point_type] || [];
                const pointNumber = item.point_number; // 0-based
                const point = points.find((p: any) => {
                  const idx = parseInt(p.inputIndex || p.outputIndex || p.variableIndex || '0', 10);
                  return idx === pointNumber + 1; // point data uses 1-based
                });
                const rawDA = point?.digitalAnalog ?? point?.digital_analog;
                return {
                  digital_analog: (rawDA === '1' || rawDA === 1) ? 1 : 0,
                  units: point?.units || point?.unit || '',
                };
              });
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
    const requestId = ++fetchRequestIdRef.current;

    if (!selectedSerial) {
      setTrendLogs([]);
      setSelectedMonitor(null);
      setMonitorInputs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let url = `${API_BASE_URL}/api/t3_device/devices/${selectedSerial}/trendlogs`;
      if (selectedPanelId) {
        url += `?panel_id=${selectedPanelId}`;
      }
      let response: Response | null = null;
      let lastFetchErr: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await fetch(url);
          break;
        } catch (fetchErr) {
          lastFetchErr = fetchErr;
          if (attempt === 0) {
            // brief backoff for transient transport resets while refresh is in progress
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
      }

      if (!response) {
        throw lastFetchErr || new Error('Failed to fetch trendlogs');
      }

      // Ignore stale responses from previous device/refresh cycles.
      if (requestId !== fetchRequestIdRef.current) {
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch trendlogs: ${response.statusText}`);
      }

      const data = await response.json();
      const fetchedTrendLogs = data.trendlogs || [];

      // Deduplicate by trendlogId: a device has only one set of trendlogs.
      // Multiple DB rows can exist for the same trendlogId with different panelIds
      // (from old sync code). Keep the entry with the highest panelId (real device panel).
      const deduped = new Map<string, any>();
      for (const log of fetchedTrendLogs) {
        const id = log.trendlogId || log.trendlogIndex;
        if (!id) continue;
        const existing = deduped.get(id);
        if (!existing || (log.panelId || 0) > (existing.panelId || 0)) {
          deduped.set(id, log);
        }
      }
      const filtered = Array.from(deduped.values());
      console.log(`[TrendLogsPage] Dedup: ${fetchedTrendLogs.length} API rows → ${filtered.length} unique trendlogs`);

      // Add unique index to each trendlog to ensure unique keys
      const trendlogsWithIndex = filtered.map((log: any, idx: number) => ({
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
      if (requestId !== fetchRequestIdRef.current) {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to load trendlogs';
      setError(errorMessage);
      console.error('Error fetching trendlogs:', err);
    } finally {
      if (requestId !== fetchRequestIdRef.current) {
        return;
      }
      setLoading(false);
      setDbChecked(true);
    }
  }, [selectedPanelId, selectedSerial]);

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
    if (!selectedSerial || !trendlog.trendlogId) {
      console.log('⚠️ [TrendLogsPage] Missing device or trendlog ID');
      setSelectedMonitor(trendlog);
      setMonitorInputs([]);
      return;
    }

    console.log('📡 [TrendLogsPage] Loading inputs for trendlog:', trendlog.trendlogId);
    setSelectedMonitor(trendlog);
    await loadTrendlogInputsInternal(trendlog);
  }, [selectedSerial]);

  useEffect(() => {
    fetchTrendLogs();
  }, [fetchTrendLogs]);

  // Reset auto-refresh state when device changes (don't clear data to avoid visual flash)
  useEffect(() => {
    setAutoRefreshed(false);
    setDbChecked(false);
  }, [selectedDevice?.serialNumber]);

  // Auto-refresh once per device - ONLY after initial DB fetch completes
  useEffect(() => {
    if (!dbChecked || loading || !selectedSerial || autoRefreshed) return;
    if (deviceRefreshedRef.current === selectedSerial) return;
    if (autoRefreshInProgressRef.current) return;

    const checkAndRefresh = async () => {
      autoRefreshInProgressRef.current = true;
      deviceRefreshedRef.current = selectedSerial;

      try {
        const serial = selectedSerial;
        // Pre-refresh inputs/outputs/variables so label resolution uses current names
        console.log('[TrendLogsPage] Pre-refreshing inputs/outputs/variables for label resolution...');
        await PanelDataRefreshService.refreshAllInputs(serial);
        await PanelDataRefreshService.refreshAllOutputs(serial);
        await PanelDataRefreshService.refreshAllVariables(serial);
        console.log('[TrendLogsPage] Auto-refreshing from device...');
        const refreshResponse = await TrendlogRefreshApi.refreshAllFromDevice(serial);
        console.log('[TrendLogsPage] Refresh response:', refreshResponse);
        await fetchTrendLogs();
        setAutoRefreshed(true);
      } catch (error) {
        console.error('[TrendLogsPage] Auto-refresh failed:', error);
        setAutoRefreshed(true);
      } finally {
        autoRefreshInProgressRef.current = false;
      }
    };

    checkAndRefresh();
  }, [autoRefreshed, dbChecked, fetchTrendLogs, loading, selectedSerial]);

  // Refresh all trendlogs from device (Trigger #2: Manual "Refresh All" button)
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    try {
      const serial = selectedDevice.serialNumber;
      // Pre-refresh inputs/outputs/variables so label resolution uses current names
      console.log('[TrendLogsPage] Pre-refreshing inputs/outputs/variables for label resolution...');
      await PanelDataRefreshService.refreshAllInputs(serial);
      await PanelDataRefreshService.refreshAllOutputs(serial);
      await PanelDataRefreshService.refreshAllVariables(serial);
      console.log('[TrendLogsPage] Refreshing all trendlogs from device...');
      const refreshResponse = await TrendlogRefreshApi.refreshAllFromDevice(serial);
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

    // Extract numeric index from MON string (e.g., "MON3" → 2, zero-based for C++)
    const match = trendlogIndex.match(/^MON(\d+)$/i);
    const index = match ? parseInt(match[1], 10) - 1 : parseInt(trendlogIndex, 10);
    if (isNaN(index) || index < 0) {
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
    if (trendLogs.length === 0) return;
    const csvColumns: import('@t3-react/shared/utils/csvUtils').CsvColumn<TrendLogData>[] = [
      { header: 'Trendlog ID', accessor: t => t.trendlogId },
      { header: 'Label', accessor: t => t.trendlogLabel },
      { header: 'Interval (sec)', accessor: t => t.intervalSeconds },
      { header: 'Buffer Size', accessor: t => t.bufferSize },
      { header: 'Data Size', accessor: t => t.dataSizeKb },
      { header: 'Auto/Manual', accessor: t => t.autoManual },
      { header: 'Status', accessor: t => t.status },
    ];
    exportToCsv(trendLogs, csvColumns, `trendlogs_${selectedDevice?.serialNumber || 'export'}.csv`);
  };

  const handleImport = async (file: File) => {
    const { headers, rows } = await parseCsvFile(file);
    if (rows.length === 0) return;
    const csvColumns: import('@t3-react/shared/utils/csvUtils').CsvColumn<TrendLogData>[] = [
      { header: 'Trendlog ID', accessor: t => t.trendlogId, setter: (t, v) => { t.trendlogId = v; } },
      { header: 'Label', accessor: t => t.trendlogLabel, setter: (t, v) => { t.trendlogLabel = v; } },
      { header: 'Interval (sec)', accessor: t => t.intervalSeconds, setter: (t, v) => { t.intervalSeconds = parseInt(v) || 0; } },
      { header: 'Buffer Size', accessor: t => t.bufferSize, setter: (t, v) => { t.bufferSize = parseInt(v) || 0; } },
      { header: 'Auto/Manual', accessor: t => t.autoManual, setter: (t, v) => { t.autoManual = v; } },
      { header: 'Status', accessor: t => t.status, setter: (t, v) => { t.status = v; } },
    ];
    const imported = mapCsvToObjects(headers, rows, csvColumns, () => ({ serialNumber: selectedDevice?.serialNumber || 0 } as TrendLogData));
    setTrendLogs(imported);
  };

  // Register CSV export/import handlers with global context (Tools menu)
  useRegisterCsvHandlers(handleExport, handleImport);

  const handleMonitorSelect = useCallback(async (monitor: TrendLogData) => {
    console.log('🔵 [TrendLogsPage] handleMonitorSelect called with:', monitor);
    console.log('🔵 [TrendLogsPage] VERSION: 2026-04-14-v3 - FIXED loading spinner');

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

  // Display all 12 trendlog slots (matching T3000 desktop), merge actual data
  const displayTrendLogs = React.useMemo(() => {
    const totalSlots = 12;
    const serial = selectedDevice?.serialNumber || 0;
    const panel = selectedDevice?.panelId;

    // Build a map of actual trendlog data keyed by MON index (1-12)
    const dataMap = new Map<number, TrendLogData>();
    for (const log of trendLogs) {
      const id = log.trendlogId || log.trendlogIndex || '';
      const match = id.match(/^MON(\d+)$/i);
      if (match) {
        dataMap.set(parseInt(match[1], 10), log);
      }
    }

    // Generate all 12 slots, merging actual data where available
    const slots: TrendLogData[] = [];
    for (let i = 1; i <= totalSlots; i++) {
      const existing = dataMap.get(i);
      if (existing) {
        slots.push(existing);
      } else {
        slots.push({
          serialNumber: serial,
          trendlogId: `MON${i}`,
          trendlogIndex: `MON${i}`,
          trendlogLabel: '',
          intervalSeconds: 900, // Default 00:15:00 like T3000
          bufferSize: undefined,
          autoManual: '',
          status: 'OFF',
          _uniqueIndex: 10000 + i,
          panelId: panel,
        });
      }
    }

    return slots;
  }, [trendLogs, selectedDevice]);

  // Helper to identify empty/padding rows
  const isEmptyRow = (item: TrendLogData) => !item.trendlogId && !item.trendlogIndex;

  // Column definitions
  const columns: TableColumnDefinition<TrendLogData>[] = [
    createTableColumn<TrendLogData>({
      columnId: 'trendlogId',
      compare: (a, b) => {
        const aVal = Number(a.trendlogId || a.trendlogIndex || 0);
        const bVal = Number(b.trendlogId || b.trendlogIndex || 0);
        return aVal - bVal;
      },
      renderHeaderCell: () => <span>Trendlog ID</span>,
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
      renderHeaderCell: () => <span>Label</span>,
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && <Text size={200}>{item.trendlogLabel || '---'}</Text>}
        </TableCellLayout>
      ),
    }),
    createTableColumn<TrendLogData>({
      columnId: 'intervalSeconds',
      renderHeaderCell: () => <span>Interval</span>,
      renderCell: (item) => {
        const sec = item.intervalSeconds;
        let display = '---';
        if (sec != null) {
          const h = Math.floor(sec / 3600);
          const m = Math.floor((sec % 3600) / 60);
          const s = sec % 60;
          display = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return (
          <TableCellLayout>
            {!isEmptyRow(item) && <Text size={200}>{display}</Text>}
          </TableCellLayout>
        );
      },
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
      columnId: 'dataSizeKb',
      renderHeaderCell: () => <span>Data Size</span>,
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && <Text size={200}>{item.dataSizeKb || '0KB'}</Text>}
        </TableCellLayout>
      ),
    }),
    createTableColumn<TrendLogData>({
      columnId: 'autoManual',
      renderHeaderCell: () => <span>Auto/Manual</span>,
      renderCell: (item) => {
        const val = (item.autoManual || '').toUpperCase();
        const isAuto = val === 'AUTO' || val === '1';
        const isManual = val === 'MANUAL' || val === '0';
        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              <Badge appearance={isAuto ? 'filled' : 'outline'} color="informative">
                {isAuto ? 'Auto' : isManual ? 'Manual' : '---'}
              </Badge>
            )}
          </TableCellLayout>
        );
      },
      compare: (a, b) => (a.autoManual || '').localeCompare(b.autoManual || ''),
    }),
    createTableColumn<TrendLogData>({
      columnId: 'status',
      renderHeaderCell: () => <span>Status</span>,
      renderCell: (item) => {
        const isOn = (item.status || '').toUpperCase() === 'ON';
        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              <Badge appearance="tint" color={isOn ? 'success' : 'subtle'}>
                {isOn ? 'ON' : 'OFF'}
              </Badge>
            )}
          </TableCellLayout>
        );
      },
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

                  <div className={styles.toolbarSeparator} role="separator" />

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
                    <div className={styles.mainGrid}>
                      <DataGrid
                        key="trendlogs-grid-v5"
                        items={displayTrendLogs}
                        columns={columns}
                        sortable
                        selectionMode="single"
                        selectedItems={selectedItems}
                        onSelectionChange={(_e, data) => {
                          setSelectedItems(data.selectedItems as Set<string>);
                        }}
                        className={styles.fullWidth}
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
                              input.pointType === 'INPUT' ? 'IN' :
                              input.pointType === 'OUTPUT' ? 'OUT' :
                              input.pointType === 'VARIABLE' ? 'VAR' :
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
