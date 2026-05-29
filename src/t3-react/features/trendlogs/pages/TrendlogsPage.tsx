/**
 * TrendLogsPage Component
 *
 * Manage trend log configurations with device refresh
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  ChartMultipleRegular,
  FullScreenMaximizeRegular,
  InfoRegular,
  ChevronUpRegular,
  ChevronDownRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { TrendlogRefreshApi } from '../services/trendlogRefreshApi';
import { PanelDataRefreshService } from '../../../shared/services/panelDataRefreshService';
import { API_BASE_URL } from '../../../config/constants';
import { TrendChartContent } from '../components/TrendChartContent';
import { TrendPolicyPage } from './TrendPolicyPage';
import styles from './TrendlogsPage.module.css';
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

interface DevicePointSyncSummary {
  inputs: number;
  outputs: number;
  variables: number;
  syncedTypes: number;
  backendSyncedTypes: number;
  backendRecordsSynced: number;
  trendlogDetailCount: number | null;
  trendlogLatestSyncInserted: number | null;
  trendlogLatestTimestamp: string | null;
  lastSyncedAt: number | null;
  lastSyncedFmt: string;
  lastSyncMethod: string;
}

interface SyncStatusRow {
  dataType?: string;
  syncMethod?: string;
  success?: boolean;
  recordsSynced?: number;
  syncTime?: number;
  syncTimeFmt?: string;
}

const EMPTY_POINT_SYNC_SUMMARY: DevicePointSyncSummary = {
  inputs: 0,
  outputs: 0,
  variables: 0,
  syncedTypes: 0,
  backendSyncedTypes: 0,
  backendRecordsSynced: 0,
  trendlogDetailCount: null,
  trendlogLatestSyncInserted: null,
  trendlogLatestTimestamp: null,
  lastSyncedAt: null,
  lastSyncedFmt: 'N/A',
  lastSyncMethod: 'N/A',
};

const TRACKED_POINT_SYNC_TYPES = ['INPUTS', 'OUTPUTS', 'VARIABLES'] as const;

type TrendCenterTab = 'overview' | 'default' | 'global' | 'points-tags' | 'chart';

interface GlobalPointItem {
  key: string;
  type: 'INPUT' | 'OUTPUT' | 'VARIABLE';
  index: string;
  label: string;
}

interface GlobalWatchlistSet {
  name: string;
  selectedKeys: string[];
  pointTags: Record<string, string[]>;
  updatedAt?: number;
}

const COMMON_HAYSTACK_TAGS = ['ahu', 'temp', 'critical', 'floor1'] as const;
const TREND_POLICY_STORAGE_KEY = 't3000.trend.policy.state.v2';

const isTrendCenterTab = (value: string | null): value is TrendCenterTab => {
  return value === 'overview' || value === 'default' || value === 'global' || value === 'points-tags' || value === 'chart';
};

export const TrendLogsPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();
  const [searchParams, setSearchParams] = useSearchParams();

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
  const [pointSummaryLoading, setPointSummaryLoading] = useState(false);
  const [devicePointSyncSummary, setDevicePointSyncSummary] = useState<DevicePointSyncSummary>(EMPTY_POINT_SYNC_SUMMARY);
  const [, setSyncingPointTypes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const selectedSerial = selectedDevice?.serialNumber;
  const selectedPanelId = selectedDevice?.panelId;
  const rawTab = searchParams.get('tab');
  const activeTab: TrendCenterTab = isTrendCenterTab(rawTab) ? rawTab : 'default';
  const requestedSerial = searchParams.get('serial');
  const requestedMonitorId = searchParams.get('monitorId');
  const requestedTrendlogId = searchParams.get('trendlogId');

  // Helper function to get row ID for a trendlog
  const getRowIdForItem = useCallback((item: TrendLogData) => {
    return `${item.serialNumber}-${item.trendlogId || item.trendlogIndex}-${item._uniqueIndex}`;
  }, []);

  const navigate = useNavigate();
  const [globalPoints, setGlobalPoints] = useState<GlobalPointItem[]>([]);
  const [globalPointsLoading, setGlobalPointsLoading] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalSelectedKeys, setGlobalSelectedKeys] = useState<Set<string>>(new Set());
  const [globalSelectedOrder, setGlobalSelectedOrder] = useState<string[]>([]);
  const [globalTagFilter, setGlobalTagFilter] = useState<string>('all');
  const [globalPointTags, setGlobalPointTags] = useState<Record<string, string[]>>({});
  const [globalSetName, setGlobalSetName] = useState('');
  const [selectedSavedSetName, setSelectedSavedSetName] = useState('');
  const [savedGlobalSets, setSavedGlobalSets] = useState<GlobalWatchlistSet[]>([]);
  const [globalRebuildLoading, setGlobalRebuildLoading] = useState(false);
  const [globalRebuildMessage, setGlobalRebuildMessage] = useState('');
  const [globalReloadRevision, setGlobalReloadRevision] = useState(0);
  const [isPointPickerOpen, setIsPointPickerOpen] = useState(false);
  const [draggingPointKey, setDraggingPointKey] = useState<string | null>(null);
  const [isTemporarySetMode, setIsTemporarySetMode] = useState(false);
  const [globalSetSort, setGlobalSetSort] = useState<'recent' | 'name'>('recent');
  const [globalSetSearch, setGlobalSetSearch] = useState('');
  const [globalSetActionMessage, setGlobalSetActionMessage] = useState('');
  const pointSetSerialNumber = React.useMemo(() => {
    if (typeof selectedDevice?.serialNumber === 'number' && Number.isFinite(selectedDevice.serialNumber)) {
      return selectedDevice.serialNumber;
    }
    const fromQuery = requestedSerial ? Number(requestedSerial) : NaN;
    if (Number.isFinite(fromQuery) && fromQuery > 0) {
      return fromQuery;
    }
    return null;
  }, [requestedSerial, selectedDevice?.serialNumber]);

  const listPointSetsFromDb = useCallback(async (serialNumber: number): Promise<GlobalWatchlistSet[]> => {
    const response = await fetch(`${API_BASE_URL}/api/point-sets/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ serialNumber }),
    });

    if (!response.ok) {
      throw new Error(`List point sets failed: ${response.status}`);
    }

    const payload = await response.json() as { sets?: Array<GlobalWatchlistSet> };
    const sets = Array.isArray(payload?.sets) ? payload.sets : [];

    return sets
      .filter((setItem) => setItem && typeof setItem.name === 'string')
      .map((setItem) => ({
        name: String(setItem.name || '').trim(),
        selectedKeys: Array.isArray(setItem.selectedKeys) ? Array.from(new Set(setItem.selectedKeys.filter((key) => typeof key === 'string' && key.trim()))) : [],
        pointTags: setItem.pointTags && typeof setItem.pointTags === 'object' ? setItem.pointTags : {},
        updatedAt: typeof setItem.updatedAt === 'number' ? setItem.updatedAt : undefined,
      }))
      .filter((setItem) => !!setItem.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const savePointSetToDb = useCallback(async (serialNumber: number, setItem: GlobalWatchlistSet): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/api/point-sets/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serialNumber,
        name: setItem.name,
        selectedKeys: setItem.selectedKeys,
        pointTags: setItem.pointTags,
      }),
    });

    if (!response.ok) {
      throw new Error(`Save point set failed: ${response.status}`);
    }

    const payload = await response.json() as { success?: boolean; source?: string; message?: string };
    if (!payload?.success) {
      throw new Error(payload?.message || 'Save point set failed: invalid API response');
    }
    return typeof payload.source === 'string' && payload.source.trim()
      ? payload.source.trim()
      : 'api';
  }, []);

  const deletePointSetFromDb = useCallback(async (serialNumber: number, setName: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/point-sets/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serialNumber,
        name: setName,
      }),
    });

    if (!response.ok) {
      throw new Error(`Delete point set failed: ${response.status}`);
    }
  }, []);

  const renamePointSetInDb = useCallback(async (
    serialNumber: number,
    oldName: string,
    newName: string,
    replaceExisting: boolean,
  ): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/point-sets/rename`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serialNumber,
        oldName,
        newName,
        replaceExisting,
      }),
    });

    if (!response.ok) {
      throw new Error(`Rename point set failed: ${response.status}`);
    }
  }, []);

  useEffect(() => {
    if (!globalSetActionMessage) return;
    const timer = window.setTimeout(() => {
      setGlobalSetActionMessage('');
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [globalSetActionMessage]);

  const setActiveTab = useCallback((tab: TrendCenterTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const syncMonitorQuery = useCallback((trendlog: TrendLogData) => {
    const next = new URLSearchParams(searchParams);
    next.set('serial', String(selectedDevice?.serialNumber || trendlog.serialNumber || ''));
    next.set('panel', String(selectedDevice?.panelId || trendlog.panelId || 1));
    next.set('monitorId', trendlog.trendlogIndex || trendlog.trendlogId || '0');
    next.set('trendlogId', trendlog.trendlogId || trendlog.trendlogIndex || '0');
    next.set('tab', activeTab);
    setSearchParams(next, { replace: true });
  }, [activeTab, searchParams, selectedDevice?.panelId, selectedDevice?.serialNumber, setSearchParams]);

  const setPointTypeSyncing = useCallback((type: string, isSyncing: boolean) => {
    setSyncingPointTypes((prev) => {
      const next = new Set(prev);
      if (isSyncing) {
        next.add(type);
      } else {
        next.delete(type);
      }
      return next;
    });
  }, []);

  const fetchPointSyncSummary = useCallback(async () => {
    if (!selectedSerial) {
      setDevicePointSyncSummary(EMPTY_POINT_SYNC_SUMMARY);
      return;
    }

    setPointSummaryLoading(true);
    try {
      const [inputsResponse, outputsResponse, variablesResponse, syncStatusResponse, trendlogStatsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/t3_device/devices/${selectedSerial}/input-points`),
        fetch(`${API_BASE_URL}/api/t3_device/devices/${selectedSerial}/output-points`),
        fetch(`${API_BASE_URL}/api/t3_device/devices/${selectedSerial}/variable-points`),
        fetch(`${API_BASE_URL}/api/sync-status/${selectedSerial}`),
        fetch(`${API_BASE_URL}/api/t3_device/devices/${selectedSerial}/trendlog-data/stats?panel_id=${selectedPanelId || 1}`),
      ]);

      const inputsData = inputsResponse.ok ? await inputsResponse.json() : {};
      const outputsData = outputsResponse.ok ? await outputsResponse.json() : {};
      const variablesData = variablesResponse.ok ? await variablesResponse.json() : {};
      const syncRows: SyncStatusRow[] = syncStatusResponse.ok ? await syncStatusResponse.json() : [];
      const trendlogStatsData = trendlogStatsResponse.ok ? await trendlogStatsResponse.json() : {};
      const trackedRows = (syncRows || []).filter((row) => TRACKED_POINT_SYNC_TYPES.includes(String(row.dataType || '').toUpperCase() as any));

      const latestByType = new Map<string, SyncStatusRow>();
      (syncRows || []).forEach((row) => {
        const key = String(row.dataType || '').toUpperCase();
        if (!latestByType.has(key)) {
          latestByType.set(key, row);
        }
      });

      let syncedTypes = 0;
      let backendSyncedTypes = 0;
      let backendRecordsSynced = 0;
      const latestSuccessfulRow = trackedRows.find((row) => !!row.success) || null;

      TRACKED_POINT_SYNC_TYPES.forEach((type) => {
        const latest = latestByType.get(type);
        if (latest?.success) {
          syncedTypes += 1;
        }
        if (latest?.success && String(latest.syncMethod || '').toUpperCase() === 'FFI_BACKEND') {
          backendSyncedTypes += 1;
          backendRecordsSynced += Number(latest.recordsSynced || 0);
        }
      });

      setDevicePointSyncSummary({
        inputs: (inputsData.input_points || []).length,
        outputs: (outputsData.output_points || []).length,
        variables: (variablesData.variable_points || []).length,
        syncedTypes,
        backendSyncedTypes,
        backendRecordsSynced,
        trendlogDetailCount: typeof trendlogStatsData.total_data_points === 'number' ? trendlogStatsData.total_data_points : null,
        trendlogLatestSyncInserted: typeof trendlogStatsData.latest_sync_records_inserted === 'number' ? trendlogStatsData.latest_sync_records_inserted : null,
        trendlogLatestTimestamp: typeof trendlogStatsData.latest_timestamp === 'string' ? trendlogStatsData.latest_timestamp : null,
        lastSyncedAt: latestSuccessfulRow?.syncTime ?? null,
        lastSyncedFmt: latestSuccessfulRow?.syncTimeFmt || 'N/A',
        lastSyncMethod: latestSuccessfulRow?.syncMethod || 'N/A',
      });
    } catch (summaryError) {
      console.error('[TrendLogsPage] Failed to load point sync summary:', summaryError);
      setDevicePointSyncSummary(EMPTY_POINT_SYNC_SUMMARY);
    } finally {
      setPointSummaryLoading(false);
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

  // Handle opening trend chart drawer - construct itemData from trendlog info
  const handleViewChart = useCallback(
    async (trendlog: TrendLogData) => {
      if (!selectedDevice) return;

      const monitorIndex = trendlog.trendlogIndex || '0';
      // Label is already available in the row data — no extra API call needed
      const title = trendlog.trendlogLabel || `Monitor ${monitorIndex}`;

      const buildItemData = () => ({
        title,
        t3Entry: {
          id: `MON${monitorIndex}`,
          pid: selectedDevice.panelId || 1,
          label: title,
          command: `${selectedDevice.panelId || 1}MON${monitorIndex}`,
        },
      });

      // If this trendlog's inputs are already loaded in page state, open immediately
      const alreadyLoaded =
        monitorInputs.length > 0 &&
        monitorInputs.some(
          (m) => m.trendlogId === trendlog.trendlogId || m.trendlogId === trendlog.trendlogIndex
        );

      if (alreadyLoaded) {
        navigate('/t3000/trends/chart', {
          state: {
            serialNumber: selectedDevice.serialNumber,
            panelId: selectedDevice.panelId || 1,
            trendlogId: trendlog.trendlogId || '0',
            monitorId: monitorIndex,
            itemData: buildItemData(),
            monitorInputs,
          },
        });
        return;
      }

      // Inputs not yet loaded — fetch TRENDLOG_INPUTS only (never touch /trendlogs/MON*)
      try {
        await loadTrendlogInputsInternal(trendlog);

        // Read fresh inputs inline since state update won't be visible yet
        const inputsUrl = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/table/TRENDLOG_INPUTS`;
        const inputsResponse = await fetch(inputsUrl);
        let freshInputs: typeof monitorInputs = [];
        if (inputsResponse.ok) {
          const inputsData = await inputsResponse.json();
          const filtered = (inputsData.data || []).filter(
            (input: any) => input.trendlogId === trendlog.trendlogId || input.Trendlog_ID === trendlog.trendlogId
          );
          freshInputs = filtered.map((input: any) => ({
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
        }

        navigate('/t3000/trends/chart', {
          state: {
            serialNumber: selectedDevice.serialNumber,
            panelId: selectedDevice.panelId || 1,
            trendlogId: trendlog.trendlogId || '0',
            monitorId: monitorIndex,
            itemData: buildItemData(),
            monitorInputs: freshInputs,
          },
        });
      } catch (error) {
        console.error('❌ [TrendLogsPage] Failed to load inputs for chart:', error);
        navigate('/t3000/trends/chart', {
          state: {
            serialNumber: selectedDevice.serialNumber,
            panelId: selectedDevice.panelId || 1,
            trendlogId: trendlog.trendlogId || '0',
            monitorId: monitorIndex,
            itemData: buildItemData(),
            monitorInputs,
          },
        });
      }
    },
    [selectedDevice, monitorInputs, loadTrendlogInputsInternal]
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

      const findDeviceBySerial = (nodes: any[], serial: number): any => {
        for (const node of nodes) {
          if (node.data?.serialNumber === serial) return node;
          if (node.children && node.children.length > 0) {
            const found = findDeviceBySerial(node.children, serial);
            if (found) return found;
          }
        }
        return null;
      };

      const requestedSerialNum = requestedSerial ? Number(requestedSerial) : null;
      if (requestedSerialNum && !Number.isNaN(requestedSerialNum)) {
        const requestedDeviceNode = findDeviceBySerial(treeData, requestedSerialNum);
        if (requestedDeviceNode?.data) {
          selectDevice(requestedDeviceNode.data);
          return;
        }
      }

      const firstDeviceNode = findFirstDevice(treeData);
      if (firstDeviceNode?.data) {
        selectDevice(firstDeviceNode.data);
      }
    }
  }, [requestedSerial, selectedDevice, treeData, selectDevice]);

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

      // Auto-select trendlog from query (if provided), else select first trendlog
      if (trendlogsWithIndex.length > 0) {
        const normalizeMonitorId = (value?: string | null) => (value || '').toUpperCase().replace(/^MON/, '');
        const requestedNormalized = normalizeMonitorId(requestedMonitorId || requestedTrendlogId);

        const queriedTrendlog = requestedNormalized
          ? trendlogsWithIndex.find((item: TrendLogData) => {
              const itemA = normalizeMonitorId(item.trendlogId);
              const itemB = normalizeMonitorId(item.trendlogIndex);
              return itemA === requestedNormalized || itemB === requestedNormalized;
            })
          : null;

        const initialTrendlog = queriedTrendlog || trendlogsWithIndex[0];

        console.log('🎯 [TrendLogsPage] Auto-selecting trendlog:', initialTrendlog);

        // Use loadTrendlogInputs to handle the loading with deduplication
        setSelectedMonitor(initialTrendlog);

        // Select the first row's radio button
        const firstRowId = `${initialTrendlog.serialNumber}-${initialTrendlog.trendlogId || initialTrendlog.trendlogIndex}-${initialTrendlog._uniqueIndex}`;
        setSelectedItems(new Set([firstRowId]));

        if (initialTrendlog.trendlogId) {
          await loadTrendlogInputsInternal(initialTrendlog);
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
  }, [requestedMonitorId, requestedTrendlogId, selectedPanelId, selectedSerial]);

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

  useEffect(() => {
    if (!rawTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'default');
      setSearchParams(next, { replace: true });
    }
  }, [rawTab, searchParams, setSearchParams]);

  useEffect(() => {
    fetchPointSyncSummary();
  }, [fetchPointSyncSummary]);

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
        setPointTypeSyncing('INPUTS', true);
        try {
          await PanelDataRefreshService.refreshAllInputs(serial);
        } finally {
          setPointTypeSyncing('INPUTS', false);
        }
        setPointTypeSyncing('OUTPUTS', true);
        try {
          await PanelDataRefreshService.refreshAllOutputs(serial);
        } finally {
          setPointTypeSyncing('OUTPUTS', false);
        }
        setPointTypeSyncing('VARIABLES', true);
        try {
          await PanelDataRefreshService.refreshAllVariables(serial);
        } finally {
          setPointTypeSyncing('VARIABLES', false);
        }
        console.log('[TrendLogsPage] Auto-refreshing from device...');
        const refreshResponse = await TrendlogRefreshApi.refreshAllFromDevice(serial);
        console.log('[TrendLogsPage] Refresh response:', refreshResponse);
        await fetchTrendLogs();
        await fetchPointSyncSummary();
        setAutoRefreshed(true);
      } catch (error) {
        console.error('[TrendLogsPage] Auto-refresh failed:', error);
        setAutoRefreshed(true);
      } finally {
        setSyncingPointTypes(new Set());
        await fetchPointSyncSummary();
        autoRefreshInProgressRef.current = false;
      }
    };

    checkAndRefresh();
  }, [autoRefreshed, dbChecked, fetchPointSyncSummary, fetchTrendLogs, loading, selectedSerial, setPointTypeSyncing]);

  // Refresh all trendlogs from device (Trigger #2: Manual "Refresh All" button)
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    try {
      const serial = selectedDevice.serialNumber;
      // Pre-refresh inputs/outputs/variables so label resolution uses current names
      console.log('[TrendLogsPage] Pre-refreshing inputs/outputs/variables for label resolution...');
      setPointTypeSyncing('INPUTS', true);
      try {
        await PanelDataRefreshService.refreshAllInputs(serial);
      } finally {
        setPointTypeSyncing('INPUTS', false);
      }
      setPointTypeSyncing('OUTPUTS', true);
      try {
        await PanelDataRefreshService.refreshAllOutputs(serial);
      } finally {
        setPointTypeSyncing('OUTPUTS', false);
      }
      setPointTypeSyncing('VARIABLES', true);
      try {
        await PanelDataRefreshService.refreshAllVariables(serial);
      } finally {
        setPointTypeSyncing('VARIABLES', false);
      }
      console.log('[TrendLogsPage] Refreshing all trendlogs from device...');
      const refreshResponse = await TrendlogRefreshApi.refreshAllFromDevice(serial);
      console.log('[TrendLogsPage] Refresh response:', refreshResponse);
      await fetchTrendLogs();
      await fetchPointSyncSummary();
    } catch (error) {
      console.error('[TrendLogsPage] Failed to refresh from device:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh from device');
    } finally {
      setSyncingPointTypes(new Set());
      await fetchPointSyncSummary();
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
    syncMonitorQuery(monitor);

    await loadTrendlogInputs(monitor);
  }, [loadTrendlogInputs, getRowIdForItem, syncMonitorQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const selectedMonitorIndex = selectedMonitor?.trendlogIndex || selectedMonitor?.trendlogId || '0';
  const selectedTrendlogId = selectedMonitor?.trendlogId || '0';
  const selectedMonitorTitle = selectedMonitor?.trendlogLabel || `Monitor ${selectedMonitorIndex}`;
  const activeMonitorCount = trendLogs.filter((item) => (item.status || '').toUpperCase() === 'ON').length;
  const autoModeCount = trendLogs.filter((item) => {
    const value = (item.autoManual || '').toUpperCase();
    return value === 'AUTO' || value === '1';
  }).length;
  const monitorsWithLabel = trendLogs.filter((item) => !!item.trendlogLabel?.trim()).length;
  const intervalValues = trendLogs
    .map((item) => item.intervalSeconds)
    .filter((value): value is number => typeof value === 'number' && value > 0);
  const avgIntervalSeconds = intervalValues.length > 0
    ? Math.round(intervalValues.reduce((sum, value) => sum + value, 0) / intervalValues.length)
    : null;
  const formatTimeAgo = (timestampSeconds: number | null) => {
    if (!timestampSeconds) return 'N/A';
    const diffSeconds = Math.max(0, Math.floor(Date.now() / 1000) - timestampSeconds);
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };
  const parseDateToEpochSeconds = (value: string | null): number | null => {
    if (!value) return null;
    const parsed = Date.parse(value.replace(' ', 'T'));
    if (Number.isNaN(parsed)) return null;
    return Math.floor(parsed / 1000);
  };
  const trendlogLastSyncedAt = parseDateToEpochSeconds(devicePointSyncSummary.trendlogLatestTimestamp);
  const lastSyncedAgo = formatTimeAgo(trendlogLastSyncedAt ?? devicePointSyncSummary.lastSyncedAt);
  const lastSyncedFmt = devicePointSyncSummary.trendlogLatestTimestamp || devicePointSyncSummary.lastSyncedFmt;
  const syncSourceLabel = devicePointSyncSummary.lastSyncMethod === 'FFI_BACKEND'
    ? 'Backend Auto'
    : devicePointSyncSummary.lastSyncMethod === 'UI_REFRESH'
      ? 'Manual Refresh'
      : (pointSummaryLoading ? '...' : 'Unknown');
  const formatSeconds = (totalSeconds: number | null) => {
    if (totalSeconds == null) return 'N/A';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  const selectedMonitorItemData = selectedMonitor
    ? {
      title: selectedMonitorTitle,
      t3Entry: {
        id: `MON${selectedMonitorIndex}`,
        pid: selectedDevice?.panelId || 1,
        label: selectedMonitorTitle,
        command: `${selectedDevice?.panelId || 1}MON${selectedMonitorIndex}`,
      },
    }
    : undefined;

  const selectedGlobalPoints = React.useMemo(
    () => {
      const byKey = new Map(globalPoints.map((point) => [point.key, point]));
      const ordered: GlobalPointItem[] = [];

      globalSelectedOrder.forEach((key) => {
        if (!globalSelectedKeys.has(key)) return;
        const point = byKey.get(key);
        if (point) ordered.push(point);
      });

      // Backward compatibility for sets saved before ordered sets existed.
      globalPoints.forEach((point) => {
        if (!globalSelectedKeys.has(point.key)) return;
        if (ordered.some((item) => item.key === point.key)) return;
        ordered.push(point);
      });

      return ordered;
    },
    [globalPoints, globalSelectedKeys, globalSelectedOrder]
  );

  const availableGlobalTags = React.useMemo(() => {
    const tags = new Set<string>();
    Object.values(globalPointTags).forEach((pointTags) => {
      pointTags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [globalPointTags]);

  const filteredGlobalPoints = React.useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return globalPoints.filter((point) => {
      const tags = globalPointTags[point.key] || [];
      const tagMatch = globalTagFilter === 'all' || tags.includes(globalTagFilter);
      if (!tagMatch) return false;
      if (!q) return true;
      return (
        point.label.toLowerCase().includes(q) ||
        point.type.toLowerCase().includes(q) ||
        point.index.toLowerCase().includes(q) ||
        tags.some((tag) => tag.includes(q))
      );
    });
  }, [globalPoints, globalPointTags, globalSearch, globalTagFilter]);

  const sortedSavedGlobalSets = React.useMemo(() => {
    const next = [...savedGlobalSets];
    if (globalSetSort === 'name') {
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    }
    next.sort((a, b) => {
      const aTime = typeof a.updatedAt === 'number' ? a.updatedAt : 0;
      const bTime = typeof b.updatedAt === 'number' ? b.updatedAt : 0;
      if (bTime !== aTime) return bTime - aTime;
      return a.name.localeCompare(b.name);
    });
    return next;
  }, [globalSetSort, savedGlobalSets]);

  const filteredSavedGlobalSets = React.useMemo(() => {
    const q = globalSetSearch.trim().toLowerCase();
    if (!q) return sortedSavedGlobalSets;
    return sortedSavedGlobalSets.filter((setItem) => {
      return setItem.name.toLowerCase().includes(q);
    });
  }, [globalSetSearch, sortedSavedGlobalSets]);

  const currentOrderedSelectedKeys = React.useMemo(() => {
    const ordered = globalSelectedOrder.filter((key) => globalSelectedKeys.has(key));
    if (ordered.length > 0) return ordered;
    return Array.from(globalSelectedKeys);
  }, [globalSelectedKeys, globalSelectedOrder]);

  const activeSavedSet = React.useMemo(() => {
    if (!selectedSavedSetName) return null;
    return savedGlobalSets.find((setItem) => setItem.name === selectedSavedSetName) || null;
  }, [savedGlobalSets, selectedSavedSetName]);

  const isCurrentSetDirty = React.useMemo(() => {
    const normalizedName = globalSetName.trim();
    if (!activeSavedSet) {
      return normalizedName.length > 0 || currentOrderedSelectedKeys.length > 0;
    }

    if (normalizedName !== activeSavedSet.name) {
      return true;
    }

    if (activeSavedSet.selectedKeys.length !== currentOrderedSelectedKeys.length) {
      return true;
    }

    for (let i = 0; i < activeSavedSet.selectedKeys.length; i += 1) {
      if (activeSavedSet.selectedKeys[i] !== currentOrderedSelectedKeys[i]) {
        return true;
      }
    }

    return false;
  }, [activeSavedSet, currentOrderedSelectedKeys, globalSetName]);

  const confirmDiscardUnsavedSetChanges = useCallback(() => {
    if (!isCurrentSetDirty) return true;
    const ok = window.confirm('You have unsaved set changes. Continue and discard them?');
    if (!ok) {
      setGlobalSetActionMessage('Stayed on current set.');
      return false;
    }
    return true;
  }, [isCurrentSetDirty]);

  const toggleGlobalPointSelection = useCallback((key: string) => {
    setGlobalSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setGlobalSelectedOrder((orderPrev) => orderPrev.filter((value) => value !== key));
      } else {
        next.add(key);
        setGlobalSelectedOrder((orderPrev) => (orderPrev.includes(key) ? orderPrev : [...orderPrev, key]));
      }
      return next;
    });
  }, []);

  const applyGlobalSelectionToChart = useCallback(() => {
    if (!selectedDevice || selectedGlobalPoints.length === 0) return;

    const syntheticMonitor: TrendLogData = {
      serialNumber: selectedDevice.serialNumber,
      trendlogId: 'GLOBAL',
      trendlogIndex: 'GLOBAL',
      trendlogLabel: 'Point Set',
      status: 'ON',
      _uniqueIndex: 99999,
      panelId: selectedDevice.panelId,
    };

    const syntheticInputs: TrendLogInput[] = selectedGlobalPoints.map((point) => ({
      serialNumber: selectedDevice.serialNumber,
      panelId: selectedDevice.panelId || 1,
      trendlogId: 'GLOBAL',
      pointType: point.type,
      pointIndex: point.index,
      pointLabel: point.label,
    }));

    setSelectedMonitor(syntheticMonitor);
    setSelectedItems(new Set());
    setMonitorInputs(syntheticInputs);
    syncMonitorQuery(syntheticMonitor);
    setActiveTab('chart');
  }, [selectedDevice, selectedGlobalPoints, setActiveTab, syncMonitorQuery]);

  const applyCommonTag = useCallback((tag: string) => {
    setGlobalTagFilter(tag);
  }, []);

  const selectAllVisibleGlobalPoints = useCallback(() => {
    setGlobalSelectedKeys((prev) => {
      const next = new Set(prev);
      const additions: string[] = [];
      filteredGlobalPoints.forEach((point) => next.add(point.key));
      filteredGlobalPoints.forEach((point) => {
        if (!prev.has(point.key)) additions.push(point.key);
      });
      if (additions.length > 0) {
        setGlobalSelectedOrder((orderPrev) => {
          const seen = new Set(orderPrev);
          const merged = [...orderPrev];
          additions.forEach((key) => {
            if (seen.has(key)) return;
            seen.add(key);
            merged.push(key);
          });
          return merged;
        });
      }
      return next;
    });
  }, [filteredGlobalPoints]);

  const clearGlobalSelection = useCallback(() => {
    setGlobalSelectedKeys(new Set());
    setGlobalSelectedOrder([]);
  }, []);

  const removePointFromCurrentSet = useCallback((key: string) => {
    setGlobalSelectedKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setGlobalSelectedOrder((prev) => prev.filter((value) => value !== key));
  }, []);

  const movePointWithinSet = useCallback((draggedKey: string, targetKey: string) => {
    if (!draggedKey || !targetKey || draggedKey === targetKey) return;
    setGlobalSelectedOrder((prev) => {
      const base = prev.filter((key) => globalSelectedKeys.has(key));
      const from = base.indexOf(draggedKey);
      const to = base.indexOf(targetKey);
      if (from < 0 || to < 0) return prev;
      const next = [...base];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, [globalSelectedKeys]);

  const movePointByOffset = useCallback((key: string, offset: number) => {
    if (!key || offset === 0) return;
    setGlobalSelectedOrder((prev) => {
      const base = prev.filter((value) => globalSelectedKeys.has(value));
      const from = base.indexOf(key);
      if (from < 0) return prev;
      const to = Math.min(base.length - 1, Math.max(0, from + offset));
      if (to === from) return prev;
      const next = [...base];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, [globalSelectedKeys]);

  const saveCurrentGlobalSet = useCallback(async () => {
    setGlobalSetActionMessage('Save click received...');
    const normalizedName = globalSetName.trim();
    if (!normalizedName) {
      setGlobalSetActionMessage('Set name is required.');
      return;
    }

    const orderedKeys = globalSelectedOrder.filter((key) => globalSelectedKeys.has(key));
    const fallbackOrderedKeys = orderedKeys.length > 0 ? orderedKeys : Array.from(globalSelectedKeys);
    if (fallbackOrderedKeys.length === 0) {
      setGlobalSetActionMessage('Current set is empty. Add points before saving.');
      return;
    }

    const existing = savedGlobalSets.find((setItem) => setItem.name === normalizedName);
    if (existing && existing.name !== selectedSavedSetName) {
      const ok = window.confirm(`A set named "${normalizedName}" already exists. Replace it?`);
      if (!ok) {
        setGlobalSetActionMessage('Save canceled.');
        return;
      }
    }

    const compactPointTags: Record<string, string[]> = {};
    fallbackOrderedKeys.forEach((key) => {
      const tags = globalPointTags[key];
      if (!Array.isArray(tags) || tags.length === 0) return;
      const normalizedTags = Array.from(new Set(tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim().toLowerCase())));
      if (normalizedTags.length > 0) {
        compactPointTags[key] = normalizedTags;
      }
    });

    const newSet: GlobalWatchlistSet = {
      name: normalizedName,
      selectedKeys: fallbackOrderedKeys,
      pointTags: compactPointTags,
      updatedAt: Date.now(),
    };

    const serialNumber = pointSetSerialNumber;
    if (!serialNumber) {
      setGlobalSetActionMessage('No device selected.');
      return;
    }

    try {
      console.info('[TrendLogsPage] Save Set click', {
        serialNumber,
        setName: normalizedName,
        selectedCount: fallbackOrderedKeys.length,
      });
      setGlobalSetActionMessage('Saving set...');
      const saveSource = await savePointSetToDb(serialNumber, newSet);
      setSavedGlobalSets((prev) => {
        const withoutSame = prev.filter((setItem) => setItem.name !== normalizedName);
        return [...withoutSame, newSet].sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelectedSavedSetName(normalizedName);
      setIsTemporarySetMode(false);
      setGlobalSetActionMessage(`Saved set "${normalizedName}" via ${saveSource}.`);
    } catch (error) {
      console.error('[TrendLogsPage] Failed to save set to DB:', error);
      setGlobalSetActionMessage('Failed to save set to database.');
    }
  }, [globalPointTags, globalSelectedKeys, globalSelectedOrder, globalSetName, pointSetSerialNumber, savePointSetToDb, savedGlobalSets, selectedSavedSetName]);

  const renameSelectedGlobalSet = useCallback(async () => {
    const nextName = globalSetName.trim();
    if (!selectedSavedSetName) {
      setGlobalSetActionMessage('Select a set before renaming.');
      return;
    }
    if (!nextName) {
      setGlobalSetActionMessage('New set name is required.');
      return;
    }
    if (nextName === selectedSavedSetName) {
      setGlobalSetActionMessage('Name is unchanged.');
      return;
    }

    const existing = savedGlobalSets.find((setItem) => setItem.name === nextName);
    const replaceExisting = !!existing && existing.name !== selectedSavedSetName;
    if (replaceExisting) {
      const ok = window.confirm(`A set named "${nextName}" already exists. Replace it?`);
      if (!ok) {
        setGlobalSetActionMessage('Rename canceled.');
        return;
      }
    }

    const serialNumber = pointSetSerialNumber;
    if (!serialNumber) {
      setGlobalSetActionMessage('No device selected.');
      return;
    }

    const target = savedGlobalSets.find((setItem) => setItem.name === selectedSavedSetName);
    if (!target) {
      setGlobalSetActionMessage('Selected set was not found.');
      return;
    }

    const renamed: GlobalWatchlistSet = {
      ...target,
      name: nextName,
      updatedAt: Date.now(),
    };

    try {
      setGlobalSetActionMessage('Renaming set...');
      await renamePointSetInDb(serialNumber, selectedSavedSetName, nextName, replaceExisting);
      setSavedGlobalSets((prev) => {
        const withoutOld = prev.filter((setItem) => setItem.name !== selectedSavedSetName && setItem.name !== nextName);
        return [...withoutOld, renamed].sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelectedSavedSetName(nextName);
      setIsTemporarySetMode(false);
      setGlobalSetActionMessage(`Renamed to "${nextName}".`);
    } catch (error) {
      console.error('[TrendLogsPage] Failed to rename set in DB:', error);
      setGlobalSetActionMessage('Failed to rename set in database.');
    }
  }, [globalSetName, pointSetSerialNumber, renamePointSetInDb, savedGlobalSets, selectedSavedSetName]);

  const duplicateSelectedGlobalSet = useCallback(async () => {
    if (!selectedSavedSetName) {
      setGlobalSetActionMessage('Select a set before duplicating.');
      return;
    }

    const serialNumber = pointSetSerialNumber;
    if (!serialNumber) {
      setGlobalSetActionMessage('No device selected.');
      return;
    }

    const target = savedGlobalSets.find((setItem) => setItem.name === selectedSavedSetName);
    if (!target) {
      setGlobalSetActionMessage('Selected set was not found.');
      return;
    }

    const usedNames = new Set(savedGlobalSets.map((setItem) => setItem.name));
    let suffix = 1;
    let candidate = `${target.name} Copy`;
    while (usedNames.has(candidate)) {
      suffix += 1;
      candidate = `${target.name} Copy ${suffix}`;
    }

    const duplicated: GlobalWatchlistSet = {
      ...target,
      name: candidate,
      updatedAt: Date.now(),
    };

    try {
      setGlobalSetActionMessage('Duplicating set...');
      await savePointSetToDb(serialNumber, duplicated);
      setSavedGlobalSets((prev) => [...prev.filter((setItem) => setItem.name !== candidate), duplicated].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedSavedSetName(candidate);
      setGlobalSetName(candidate);
      setIsTemporarySetMode(false);
      setGlobalSetActionMessage(`Duplicated as "${candidate}".`);
    } catch (error) {
      console.error('[TrendLogsPage] Failed to duplicate set in DB:', error);
      setGlobalSetActionMessage('Failed to duplicate set in database.');
    }
  }, [pointSetSerialNumber, savePointSetToDb, savedGlobalSets, selectedSavedSetName]);

  const resetPointPickerFilters = useCallback(() => {
    setGlobalSearch('');
    setGlobalTagFilter('all');
  }, []);

  const removeSelectedGlobalSet = useCallback(async () => {
    if (!selectedSavedSetName) {
      setGlobalSetActionMessage('Select a set before deleting.');
      return;
    }
    const ok = window.confirm(`Delete set "${selectedSavedSetName}"? This cannot be undone.`);
    if (!ok) {
      setGlobalSetActionMessage('Delete canceled.');
      return;
    }

    const serialNumber = pointSetSerialNumber;
    if (!serialNumber) {
      setGlobalSetActionMessage('No device selected.');
      return;
    }

    try {
      setGlobalSetActionMessage('Deleting set...');
      await deletePointSetFromDb(serialNumber, selectedSavedSetName);
      setSavedGlobalSets((prev) => prev.filter((setItem) => setItem.name !== selectedSavedSetName));
      setGlobalSetName('');
      setSelectedSavedSetName('');
      setIsTemporarySetMode(false);
      setGlobalSetActionMessage(`Deleted set "${selectedSavedSetName}".`);
    } catch (error) {
      console.error('[TrendLogsPage] Failed to delete set from DB:', error);
      setGlobalSetActionMessage('Failed to delete set from database.');
    }
  }, [deletePointSetFromDb, pointSetSerialNumber, selectedSavedSetName]);

  const createNewGlobalSet = useCallback(() => {
    if (!confirmDiscardUnsavedSetChanges()) return;
    setSelectedSavedSetName('');
    setGlobalSetName('');
    setGlobalSelectedKeys(new Set());
    setGlobalSelectedOrder([]);
    setGlobalTagFilter('all');
    setIsTemporarySetMode(true);
    setGlobalSetActionMessage('New temporary set started.');
  }, [confirmDiscardUnsavedSetChanges]);

  const loadGlobalSetByName = useCallback((setName: string) => {
    if (!setName) return;
    if (setName === selectedSavedSetName) return;
    if (!confirmDiscardUnsavedSetChanges()) return;
    const target = savedGlobalSets.find((setItem) => setItem.name === setName);
    if (!target) return;
    setSelectedSavedSetName(setName);
    setGlobalSelectedKeys(new Set(target.selectedKeys));
    setGlobalSelectedOrder(target.selectedKeys || []);
    setGlobalPointTags((prev) => ({
      ...prev,
      ...(target.pointTags || {}),
    }));
    setGlobalTagFilter('all');
    setGlobalSetName(target.name);
    setIsTemporarySetMode(false);
    setGlobalSetActionMessage(`Loaded set "${target.name}".`);
  }, [confirmDiscardUnsavedSetChanges, savedGlobalSets, selectedSavedSetName]);

  const triggerGlobalReload = useCallback(() => {
    setGlobalReloadRevision((prev) => prev + 1);
  }, []);

  const rebuildGlobalHaystack = useCallback(async () => {
    if (!selectedDevice?.serialNumber || globalRebuildLoading) {
      return;
    }

    setGlobalRebuildLoading(true);
    setGlobalRebuildMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/haystack/rebuild`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serialNumbers: [selectedDevice.serialNumber],
        }),
      });

      if (!response.ok) {
        throw new Error(`Haystack rebuild failed with status ${response.status}`);
      }

      setGlobalRebuildMessage('Haystack tags rebuilt from backend device data.');
      triggerGlobalReload();
    } catch (error) {
      console.error('[TrendLogsPage] Failed to rebuild Haystack tags:', error);
      setGlobalRebuildMessage('Failed to rebuild Haystack tags.');
    } finally {
      setGlobalRebuildLoading(false);
    }
  }, [globalRebuildLoading, selectedDevice?.serialNumber, triggerGlobalReload]);

  const headerActionsTarget = document.getElementById('page-header-actions');
  const trendTabs = (
    <div className={styles.headerTabBar}>
      <button
        className={`${styles.tabButton} ${activeTab === 'overview' ? styles.tabButtonActive : ''}`}
        onClick={() => setActiveTab('overview')}
      >
        Overview
      </button>
      <button
        className={`${styles.tabButton} ${activeTab === 'default' ? styles.tabButtonActive : ''}`}
        onClick={() => setActiveTab('default')}
      >
        Default
      </button>
      <button
        className={`${styles.tabButton} ${activeTab === 'global' ? styles.tabButtonActive : ''}`}
        onClick={() => setActiveTab('global')}
      >
        Point Sets
      </button>
      <button
        className={`${styles.tabButton} ${activeTab === 'points-tags' ? styles.tabButtonActive : ''}`}
        onClick={() => setActiveTab('points-tags')}
      >
        Points and Tags
      </button>
      <button
        className={`${styles.tabButton} ${activeTab === 'chart' ? styles.tabButtonActive : ''}`}
        onClick={() => setActiveTab('chart')}
      >
        Chart
      </button>
    </div>
  );

  useEffect(() => {
    if (activeTab !== 'global') {
      return;
    }

    const loadGlobalPoints = async () => {
      if (!selectedDevice?.serialNumber) {
        setGlobalPoints([]);
        setGlobalPointTags({});
        setGlobalSelectedKeys(new Set());
        setGlobalSelectedOrder([]);
        return;
      }

      setGlobalPointsLoading(true);
      try {
        const serial = selectedDevice.serialNumber;
        const [inputsResponse, outputsResponse, variablesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/t3_device/devices/${serial}/input-points`),
          fetch(`${API_BASE_URL}/api/t3_device/devices/${serial}/output-points`),
          fetch(`${API_BASE_URL}/api/t3_device/devices/${serial}/variable-points`),
        ]);

        const inputsData = inputsResponse.ok ? await inputsResponse.json() : {};
        const outputsData = outputsResponse.ok ? await outputsResponse.json() : {};
        const variablesData = variablesResponse.ok ? await variablesResponse.json() : {};

        const mapRows = (rows: any[], type: 'INPUT' | 'OUTPUT' | 'VARIABLE'): GlobalPointItem[] => {
          return rows.map((row: any, idx: number) => {
            const rawIndex =
              row.inputIndex ?? row.outputIndex ?? row.variableIndex ?? row.pointIndex ?? row.Point_Index ?? row.index ?? row.number ?? idx + 1;
            const index = String(rawIndex);
            const label = String(row.label ?? row.name ?? row.pointLabel ?? row.Point_Label ?? `${type} ${index}`);
            return {
              key: `${type}:${index}`,
              type,
              index,
              label,
            };
          });
        };

        const merged = [
          ...mapRows(inputsData.input_points || [], 'INPUT'),
          ...mapRows(outputsData.output_points || [], 'OUTPUT'),
          ...mapRows(variablesData.variable_points || [], 'VARIABLE'),
        ];

        const seededTags: Record<string, string[]> = {};
        merged.forEach((point) => {
          seededTags[point.key] = [point.type.toLowerCase()];
        });

        // Import backend Haystack tags first so Watchlist reflects Rust-generated entities.
        try {
          const haystackResponse = await fetch(`${API_BASE_URL}/api/haystack/read`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              serialNumbers: [selectedDevice.serialNumber],
            }),
          });

          if (haystackResponse.ok) {
            const haystackPayload = await haystackResponse.json();
            const rows: any[] = Array.isArray(haystackPayload?.rows) ? haystackPayload.rows : [];

            rows.forEach((row) => {
              const pointTable = String(row?.pointTable ?? row?.point_table ?? '').trim().toUpperCase();
              const pointIndex = String(row?.pointIndex ?? row?.point_index ?? '').trim();
              if (!pointTable || !pointIndex) return;

              const mappedType =
                pointTable === 'INPUTS' ? 'INPUT' :
                pointTable === 'OUTPUTS' ? 'OUTPUT' :
                pointTable === 'VARIABLES' ? 'VARIABLE' :
                '';
              if (!mappedType) return;

              const globalKey = `${mappedType}:${pointIndex}`;
              const tagsObj = row?.tags && typeof row.tags === 'object' && !Array.isArray(row.tags)
                ? row.tags as Record<string, any>
                : null;
              if (!tagsObj) return;

              const existing = new Set(seededTags[globalKey] || []);
              Object.entries(tagsObj).forEach(([tagKey, tagValue]) => {
                if (!tagKey) return;
                if (tagValue === 'M') {
                  existing.add(tagKey.toLowerCase());
                } else if (typeof tagValue === 'string' || typeof tagValue === 'number' || typeof tagValue === 'boolean') {
                  existing.add(`${tagKey.toLowerCase()}:${String(tagValue).toLowerCase()}`);
                }
              });
              seededTags[globalKey] = Array.from(existing);
            });
          }
        } catch (haystackLoadError) {
          console.warn('[TrendLogsPage] Failed to load backend Haystack tags:', haystackLoadError);
        }

        // Import persisted Haystack tags authored in Points and Tags workspace.
        // TrendPolicyPage stores keys as "serial:type:index" where type is input/output/variable.
        try {
          const rawPolicy = localStorage.getItem(TREND_POLICY_STORAGE_KEY);
          if (rawPolicy) {
            const parsedPolicy = JSON.parse(rawPolicy) as { pointTags?: Record<string, string[]> };
            const sourcePointTags = parsedPolicy?.pointTags || {};
            Object.entries(sourcePointTags).forEach(([policyKey, tags]) => {
              const parts = policyKey.split(':');
              if (parts.length !== 3) return;
              const [serialRaw, typeRaw, indexRaw] = parts;
              if (Number(serialRaw) !== selectedDevice.serialNumber) return;
              const mappedType =
                typeRaw === 'input' ? 'INPUT' :
                typeRaw === 'output' ? 'OUTPUT' :
                typeRaw === 'variable' ? 'VARIABLE' :
                '';
              if (!mappedType) return;
              const globalKey = `${mappedType}:${indexRaw}`;
              const existing = new Set(seededTags[globalKey] || []);
              (tags || []).forEach((tag) => {
                if (typeof tag === 'string' && tag.trim()) {
                  existing.add(tag.trim().toLowerCase());
                }
              });
              seededTags[globalKey] = Array.from(existing);
            });
          }
        } catch (policyLoadError) {
          console.warn('[TrendLogsPage] Failed to load tags from Points and Tags workspace:', policyLoadError);
        }

        setGlobalPoints(merged);
        setGlobalPointTags(seededTags);
        setGlobalSelectedKeys(new Set());
        setGlobalSelectedOrder([]);
      } catch (globalPointsError) {
        console.error('[TrendLogsPage] Failed to load global points:', globalPointsError);
        setGlobalPoints([]);
        setGlobalPointTags({});
        setGlobalSelectedOrder([]);
      } finally {
        setGlobalPointsLoading(false);
      }
    };

    loadGlobalPoints();
  }, [activeTab, globalReloadRevision, selectedDevice?.serialNumber]);

  useEffect(() => {
    if (!selectedDevice?.serialNumber) {
      setSavedGlobalSets([]);
      setSelectedSavedSetName('');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const rows = await listPointSetsFromDb(selectedDevice.serialNumber);
        if (cancelled) return;
        setSavedGlobalSets(rows);
        setSelectedSavedSetName('');
        setIsTemporarySetMode(false);
      } catch (error) {
        console.error('[TrendLogsPage] Failed to load point sets from DB:', error);
        if (cancelled) return;
        setSavedGlobalSets([]);
        setSelectedSavedSetName('');
        setIsTemporarySetMode(false);
        setGlobalSetActionMessage('Failed to load point sets from database.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listPointSetsFromDb, selectedDevice?.serialNumber]);

  useEffect(() => {
    if (activeTab !== 'global') return;
    if (isTemporarySetMode) return;
    if (selectedSavedSetName) return;
    if (sortedSavedGlobalSets.length === 0) return;
    loadGlobalSetByName(sortedSavedGlobalSets[0].name);
  }, [activeTab, isTemporarySetMode, loadGlobalSetByName, selectedSavedSetName, sortedSavedGlobalSets]);

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

  const filteredDisplayTrendLogs = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return displayTrendLogs;
    return displayTrendLogs.filter((item) => {
      const id = (item.trendlogId || item.trendlogIndex || '').toLowerCase();
      const label = (item.trendlogLabel || '').toLowerCase();
      return id.includes(q) || label.includes(q);
    });
  }, [displayTrendLogs, searchQuery]);

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
      renderHeaderCell: () => <div className={styles.noWrapHeader}>Auto/Manual</div>,
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
              onClick={async () => {
                await handleMonitorSelect(item);
                setActiveTab('chart');
              }}
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
      {headerActionsTarget ? createPortal(trendTabs, headerActionsTarget) : null}
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

              {!headerActionsTarget && (
                <div className={styles.tabBar}>
                  {trendTabs}
                </div>
              )}

              {activeTab === 'overview' && (
                <div className={styles.overviewWrap}>
                  <div className={styles.summaryGrid}>
                    <div className={styles.summaryCard}>
                      <div className={styles.metricTitleRow}>
                        <Text size={200}>Selected Device</Text>
                        <Tooltip content="Current panel context for all trendlog metrics and actions on this page." relationship="description">
                          <button type="button" className={styles.metricInfoButton} aria-label="Selected Device help">
                            <InfoRegular className={styles.metricInfoIcon} />
                          </button>
                        </Tooltip>
                      </div>
                      <Text size={400} weight="semibold">{selectedDevice?.nameShowOnTree || selectedDevice?.productName || 'None'}</Text>
                      <Text size={200}>SN {selectedDevice?.serialNumber || 'N/A'} · Panel {selectedDevice?.panelId || 'N/A'}</Text>
                    </div>
                    <div className={styles.summaryCard}>
                      <div className={styles.metricTitleRow}>
                        <Text size={200}>Configured Monitors</Text>
                        <Tooltip content="Total monitors detected from database/device sync; ON/OFF shows runtime state split." relationship="description">
                          <button type="button" className={styles.metricInfoButton} aria-label="Configured Monitors help">
                            <InfoRegular className={styles.metricInfoIcon} />
                          </button>
                        </Tooltip>
                      </div>
                      <Text size={500} weight="semibold">{trendLogs.length}</Text>
                      <div className={styles.summaryMetaRow}>
                        <Badge color="success" appearance="tint">{activeMonitorCount} ON</Badge>
                        <Badge color="subtle" appearance="tint">{Math.max(trendLogs.length - activeMonitorCount, 0)} OFF</Badge>
                      </div>
                    </div>
                    <div className={styles.summaryCard}>
                      <div className={styles.metricTitleRow}>
                        <Text size={200}>Monitor Configuration Quality</Text>
                        <Tooltip content="Shows how many monitors have labels and how many are running in Auto mode." relationship="description">
                          <button type="button" className={styles.metricInfoButton} aria-label="Monitor Configuration Quality help">
                            <InfoRegular className={styles.metricInfoIcon} />
                          </button>
                        </Tooltip>
                      </div>
                      <Text size={500} weight="semibold">{monitorsWithLabel}/{trendLogs.length || 0}</Text>
                      <Text size={200}>labeled monitors · {autoModeCount} auto mode</Text>
                    </div>
                    <div className={styles.summaryCard}>
                      <div className={styles.metricTitleRow}>
                        <Text size={200}>Inputs In Selected Monitor</Text>
                        <Tooltip content="Number of points currently assigned to the selected monitor and the average logging interval across monitors." relationship="description">
                          <button type="button" className={styles.metricInfoButton} aria-label="Inputs In Selected Monitor help">
                            <InfoRegular className={styles.metricInfoIcon} />
                          </button>
                        </Tooltip>
                      </div>
                      <Text size={500} weight="semibold">{monitorInputs.length}</Text>
                      <Text size={200}>Average interval: {formatSeconds(avgIntervalSeconds)}</Text>
                    </div>
                  </div>

                  <div className={styles.overviewMiddleCard}>
                    <div className={styles.middleSnapshotPanelOnly}>
                      <div className={styles.middleSectionTitleRow}>
                        <Text size={300} weight="semibold">Current Monitor Snapshot</Text>
                        {selectedMonitor && (
                          <Badge appearance="outline" color="informative">
                            {(selectedMonitor.trendlogId || selectedMonitor.trendlogIndex)} · {selectedMonitor.trendlogLabel || 'No label'}
                          </Badge>
                        )}
                      </div>
                      {loadingInputs && selectedMonitor ? (
                        <div className={styles.snapshotLoadingState}>
                          <Spinner size="tiny" />
                          <Text size={200}>Loading selected monitor snapshot...</Text>
                        </div>
                      ) : selectedMonitor ? (
                        <>
                          <Text size={200}>Review current collection parameters before validation or charting.</Text>
                          <div className={styles.summaryMetaRow}>
                            <Badge appearance="outline">Interval {formatSeconds(selectedMonitor.intervalSeconds ?? null)}</Badge>
                            <Badge appearance="outline">Buffer {selectedMonitor.bufferSize ?? 'N/A'}</Badge>
                            <Badge appearance="outline">Inputs {monitorInputs.length}</Badge>
                          </div>
                          <div className={styles.summaryMetaRow}>
                            <Badge appearance="tint" color={(selectedMonitor.status || '').toUpperCase() === 'ON' ? 'success' : 'subtle'}>
                              Status {(selectedMonitor.status || 'OFF').toUpperCase()}
                            </Badge>
                            <Badge appearance="tint" color="informative">
                              Mode {((selectedMonitor.autoManual || '').toUpperCase() === 'AUTO' || selectedMonitor.autoManual === '1') ? 'Auto' : 'Manual'}
                            </Badge>
                          </div>
                        </>
                      ) : (
                        <Text size={200}>Select a monitor in the Monitors tab to view its runtime snapshot and readiness.</Text>
                      )}
                    </div>
                  </div>

                  <div className={styles.overviewFooterPanel}>
                    <div className={styles.globalSummaryHeader}>
                      <Text size={200}>Selected device: SN {selectedDevice?.serialNumber || 'N/A'} · Panel {selectedDevice?.panelId || 'N/A'}</Text>
                    </div>

                    <div className={styles.globalMetricGrid}>
                      <div className={styles.globalMetricTile}>
                        <Text className={styles.globalMetricValue}>{trendLogs.length}/12</Text>
                        <Text className={styles.globalMetricLabel}>Configured slots</Text>
                      </div>
                      <div className={styles.globalMetricTile}>
                        <Text className={styles.globalMetricValue}>{activeMonitorCount}</Text>
                        <Text className={styles.globalMetricLabel}>Active monitors</Text>
                      </div>
                      <div className={styles.globalMetricTile}>
                        <Text className={styles.globalMetricValue}>
                          {pointSummaryLoading
                            ? '...'
                            : `${devicePointSyncSummary.inputs}/${devicePointSyncSummary.outputs}/${devicePointSyncSummary.variables}`}
                        </Text>
                        <Text className={styles.globalMetricLabel}>Sensor points inventory (IN / OUT / VAR)</Text>
                      </div>
                      <div className={styles.globalMetricTile}>
                        <Text className={styles.globalMetricValue}>{pointSummaryLoading ? '...' : lastSyncedAgo}</Text>
                        <Text className={styles.globalMetricLabel}>Last synced · {lastSyncedFmt}</Text>
                      </div>
                      <div className={styles.globalMetricTile}>
                        <Text className={styles.globalMetricValue}>
                          {pointSummaryLoading
                            ? '...'
                            : devicePointSyncSummary.trendlogDetailCount == null
                              ? 'N/A'
                              : `${devicePointSyncSummary.trendlogDetailCount}`}
                        </Text>
                        <Text className={styles.globalMetricLabel}>Synced value count (total)</Text>
                      </div>
                      <div className={styles.globalMetricTile}>
                        <Text className={styles.globalMetricValue}>{syncSourceLabel}</Text>
                        <Text className={styles.globalMetricLabel}>Sync source</Text>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'points-tags' && (
                <div className={styles.embeddedPolicyWrap}>
                  <TrendPolicyPage embedded />
                </div>
              )}

              {activeTab === 'chart' && (
                <div className={styles.chartTabWrap}>
                  {!selectedDevice || !selectedMonitor ? (
                    <div className={styles.placeholderPanel}>
                      <Text size={400} weight="semibold">Chart Workspace</Text>
                      <Text size={300}>
                        Select a monitor in the Default tab first, then return here for in-page analysis.
                      </Text>
                      <Button appearance="primary" onClick={() => setActiveTab('default')}>
                        Go To Default
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className={styles.embeddedChartFrame}>
                        <TrendChartContent
                          serialNumber={selectedDevice.serialNumber}
                          panelId={selectedDevice.panelId || 1}
                          trendlogId={selectedTrendlogId}
                          monitorId={selectedMonitorIndex}
                          itemData={selectedMonitorItemData}
                          monitorInputs={monitorInputs}
                          isDrawerMode={false}
                          toolbarActionBeforeBack={
                            <Tooltip content="Open Full Chart Page" relationship="label">
                              <Button
                                appearance="subtle"
                                icon={<FullScreenMaximizeRegular />}
                                onClick={() => handleViewChart(selectedMonitor)}
                                size="small"
                                aria-label="Open Full Chart Page"
                                title="Open Full Chart Page"
                              />
                            </Tooltip>
                          }
                          onBack={() => setActiveTab('default')}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ========================================
                  TOOLBAR - Azure Portal Command Bar
                  Matches: ext-overview-assistant-toolbar
                  ======================================== */}
              {activeTab === 'default' && selectedDevice && (
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

              {activeTab === 'global' && selectedDevice && (
              <div className={styles.toolbar}>
                <div className={styles.toolbarContainer}>
                  <button
                    className={styles.toolbarButton}
                    onClick={() => setIsPointPickerOpen(true)}
                    title="Add or remove points using point picker"
                  >
                    Add Points
                  </button>
                  <button
                    className={styles.toolbarButton}
                    onClick={applyGlobalSelectionToChart}
                    disabled={globalSelectedKeys.size === 0}
                    title="Open chart with selected points from current set"
                  >
                    Open Chart
                  </button>
                  <Text size={200} className={styles.globalToolbarHint}>
                    {selectedSavedSetName ? `Editing set: ${selectedSavedSetName}` : 'Editing temporary set'}
                  </Text>
                  <div className={styles.toolbarSeparator} role="separator" />
                  <button
                    className={styles.toolbarButton}
                    onClick={() => setActiveTab('points-tags')}
                    title="Open Points and Tags to add or edit Haystack tags"
                  >
                    Manage Tags
                  </button>
                  <button
                    className={styles.toolbarButton}
                    onClick={rebuildGlobalHaystack}
                    disabled={globalRebuildLoading}
                    title="Rebuild Haystack tags from backend point metadata"
                  >
                    {globalRebuildLoading ? 'Rebuilding...' : 'Rebuild Haystack'}
                  </button>
                  {globalRebuildMessage && (
                    <Text size={200}>{globalRebuildMessage}</Text>
                  )}
                </div>
              </div>
              )}

              {/* ========================================
                  DOCKING BODY - Main Content (Dual Grid Layout)
                  Matches: msportalfx-docking-body
                  ======================================== */}
              {activeTab === 'default' && (
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
                    <div className={styles.centerText}>
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
                        items={filteredDisplayTrendLogs}
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
              )}

              {activeTab === 'global' && (
              <div className={styles.globalTabSurface}>
                <div className={styles.dockingBody}>
                  {!selectedDevice && !loading && (
                    <div className={styles.noData}>
                      <div className={styles.centerText}>
                        <Text size={400} weight="semibold">No device selected</Text>
                        <br />
                        <Text size={200}>Please select a device from the tree to build point sets</Text>
                      </div>
                    </div>
                  )}

                  {selectedDevice && (
                    <div className={styles.globalLayout}>
                      <div className={styles.globalSetExplorerPanel}>
                        <div className={styles.globalPanelHeader}>
                          <Text size={300} weight="semibold">Point Sets</Text>
                          <div className={styles.globalSetHeaderActions}>
                            <div className={styles.globalSetSortGroup} role="group" aria-label="Sort point sets">
                              <button
                                type="button"
                                className={`${styles.smallActionButton} ${globalSetSort === 'recent' ? styles.smallActionButtonActive : ''}`}
                                onClick={() => setGlobalSetSort('recent')}
                                title="Sort sets by recently updated"
                              >
                                Recent
                              </button>
                              <button
                                type="button"
                                className={`${styles.smallActionButton} ${globalSetSort === 'name' ? styles.smallActionButtonActive : ''}`}
                                onClick={() => setGlobalSetSort('name')}
                                title="Sort sets by name"
                              >
                                Name
                              </button>
                            </div>
                            <button
                              type="button"
                              className={styles.smallActionButton}
                              onClick={createNewGlobalSet}
                              title="Start a new temporary set"
                            >
                              New Set
                            </button>
                          </div>
                        </div>

                        <div className={styles.globalSetList}>
                          {sortedSavedGlobalSets.length === 0 ? (
                            <div className={styles.centerPaddingMuted}>
                              <Text size={200}>No saved sets yet. Build one on the right and click Save Set.</Text>
                            </div>
                          ) : filteredSavedGlobalSets.length === 0 ? (
                            <div className={styles.centerPaddingMuted}>
                              <Text size={200}>No sets matched your search.</Text>
                            </div>
                          ) : (
                            filteredSavedGlobalSets.map((setItem) => (
                              <button
                                key={setItem.name}
                                type="button"
                                className={`${styles.globalSetListItem} ${selectedSavedSetName === setItem.name ? styles.globalSetListItemActive : ''}`}
                                onClick={() => loadGlobalSetByName(setItem.name)}
                                title={`Load ${setItem.name}`}
                              >
                                <Text size={200} weight="semibold" className={styles.globalSetNameText}>{setItem.name}</Text>
                                <div className={styles.globalSetMetaRow}>
                                  <span className={styles.globalSetMetaBadge}>{setItem.selectedKeys.length} pts</span>
                                  <Text size={100} className={styles.globalSetMetaText}>
                                    {setItem.updatedAt ? `Updated ${new Date(setItem.updatedAt).toLocaleString()}` : 'Updated time unavailable'}
                                  </Text>
                                </div>
                              </button>
                            ))
                          )}
                        </div>

                        <div className={styles.globalSetActions}>
                          <Text size={200} weight="semibold">Find Set</Text>
                          <input
                            className={styles.tagInput}
                            type="text"
                            placeholder="Search saved sets"
                            value={globalSetSearch}
                            onChange={(e) => setGlobalSetSearch(e.target.value)}
                            aria-label="Search saved point sets"
                          />
                          <Text size={200} weight="semibold">Set Name</Text>
                          <input
                            className={styles.tagInput}
                            type="text"
                            placeholder="Type set name"
                            value={globalSetName}
                            onChange={(e) => setGlobalSetName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && globalSetName.trim()) {
                                saveCurrentGlobalSet();
                              }
                            }}
                            aria-label="Point set name"
                          />
                          <div className={styles.globalSetActionGrid}>
                            <button
                              type="button"
                              className={styles.smallActionButton}
                              onClick={saveCurrentGlobalSet}
                              title="Save current points into this set name"
                            >
                              Save Set
                            </button>
                            <button
                              type="button"
                              className={styles.smallActionButton}
                              onClick={renameSelectedGlobalSet}
                              disabled={!selectedSavedSetName || !globalSetName.trim()}
                              title="Rename selected set to current name"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              className={styles.smallActionButton}
                              onClick={duplicateSelectedGlobalSet}
                              disabled={!selectedSavedSetName}
                              title="Duplicate selected set"
                            >
                              Duplicate
                            </button>
                            <button
                              type="button"
                              className={`${styles.smallActionButton} ${styles.destructiveActionButton}`}
                              onClick={removeSelectedGlobalSet}
                              disabled={!selectedSavedSetName}
                              title="Remove selected set"
                            >
                              Delete
                            </button>
                          </div>
                          {globalSetActionMessage && (
                            <Text size={100} className={styles.globalSetActionMessage}>{globalSetActionMessage}</Text>
                          )}
                        </div>
                      </div>

                      <div className={styles.globalCurrentSetPanel}>
                        <div className={styles.globalPanelHeader}>
                          <div className={styles.globalCurrentSetHeaderTitle}>
                            <Text size={300} weight="semibold">Current Set Points</Text>
                            <div className={styles.globalCurrentSetHeaderMeta}>
                              <Text size={200}>{selectedSavedSetName || 'Unsaved Set'}</Text>
                              {isCurrentSetDirty && (
                                <span className={styles.unsavedBadge}>Unsaved changes</span>
                              )}
                            </div>
                          </div>
                          <div className={styles.globalPanelHeaderActions}>
                            <Text size={200}>{selectedGlobalPoints.length} selected</Text>
                            <button
                              className={styles.smallActionButton}
                              onClick={() => setIsPointPickerOpen(true)}
                              title="Open point picker drawer"
                            >
                              Add Points
                            </button>
                            <button
                              className={styles.smallActionButton}
                              onClick={clearGlobalSelection}
                              disabled={globalSelectedKeys.size === 0}
                              title="Clear all points from current set"
                            >
                              Clear Set
                            </button>
                          </div>
                        </div>
                        <div className={styles.globalPanelBody}>
                          {selectedGlobalPoints.length === 0 ? (
                            <div className={styles.centerPaddingMuted}>
                              <Text size={200}>No points in current set. Click Add Points to start building this set.</Text>
                            </div>
                          ) : (
                            selectedGlobalPoints.map((point, index) => (
                              <div
                                key={point.key}
                                className={styles.watchlistRow}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (draggingPointKey) {
                                    movePointWithinSet(draggingPointKey, point.key);
                                  }
                                  setDraggingPointKey(null);
                                }}
                              >
                                <button
                                  type="button"
                                  className={styles.dragHandleButton}
                                  draggable
                                  onDragStart={() => setDraggingPointKey(point.key)}
                                  onDragEnd={() => setDraggingPointKey(null)}
                                  title="Drag to reorder"
                                >
                                  ⋮⋮
                                </button>
                                <Text size={200}>{index + 1}.</Text>
                                <Badge appearance="outline">{point.type}</Badge>
                                <Text size={200}>{point.index}</Text>
                                <Text
                                  size={200}
                                  weight="semibold"
                                  className={`${styles.globalPointLabel} ${draggingPointKey === point.key ? styles.draggingPointLabel : ''}`}
                                >
                                  {point.label}
                                </Text>
                                <div className={styles.reorderButtonsGroup}>
                                  <button
                                    type="button"
                                    className={styles.reorderButton}
                                    onClick={() => movePointByOffset(point.key, -1)}
                                    disabled={index === 0}
                                    title="Move up"
                                  >
                                    <ChevronUpRegular />
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.reorderButton}
                                    onClick={() => movePointByOffset(point.key, 1)}
                                    disabled={index === selectedGlobalPoints.length - 1}
                                    title="Move down"
                                  >
                                    <ChevronDownRegular />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  className={styles.pointRemoveButton}
                                  onClick={() => removePointFromCurrentSet(point.key)}
                                  title="Remove point from current set"
                                >
                                  Remove
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {isPointPickerOpen && selectedDevice && (
                  <div className={styles.pointPickerOverlay} onClick={() => setIsPointPickerOpen(false)}>
                    <aside className={styles.pointPickerDrawer} onClick={(e) => e.stopPropagation()}>
                      <div className={styles.pointPickerHeader}>
                        <Text size={400} weight="semibold">Add Points to Current Set</Text>
                        <button
                          type="button"
                          className={styles.smallActionButton}
                          onClick={() => setIsPointPickerOpen(false)}
                        >
                          Done
                        </button>
                      </div>

                      <div className={styles.pointPickerSearchRow}>
                        <div className={`${styles.searchInputWrapper} ${styles.globalPanelSearchWrapper}`}>
                          <SearchRegular className={styles.searchIcon} />
                          <input
                            className={`${styles.searchInput} ${styles.globalPanelSearchInput}`}
                            type="text"
                            placeholder="Search points or tags..."
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            spellCheck="false"
                            role="searchbox"
                            aria-label="Search points in picker"
                          />
                        </div>
                        <Text size={200}>{globalPointsLoading ? 'Loading...' : `${filteredGlobalPoints.length} points`}</Text>
                      </div>

                      <div className={styles.globalTagBar}>
                        <button
                          className={`${styles.tagChip} ${globalTagFilter === 'all' ? styles.tagChipActive : ''}`}
                          onClick={() => setGlobalTagFilter('all')}
                        >
                          All
                        </button>
                        {COMMON_HAYSTACK_TAGS.map((tag) => (
                          <button
                            key={tag}
                            className={styles.tagChip}
                            onClick={() => applyCommonTag(tag)}
                            title={`Filter by #${tag}`}
                          >
                            #{tag}
                          </button>
                        ))}
                        {availableGlobalTags.map((tag) => (
                          <button
                            key={tag}
                            className={`${styles.tagChip} ${globalTagFilter === tag ? styles.tagChipActive : ''}`}
                            onClick={() => setGlobalTagFilter(tag)}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>

                      <div className={styles.pointPickerBody}>
                        {globalPointsLoading ? (
                          <div className={styles.centerPadding}>
                            <Spinner size="extra-small" />
                            <Text size={200}>Loading point library...</Text>
                          </div>
                        ) : filteredGlobalPoints.length === 0 ? (
                          <div className={styles.centerPaddingMuted}>
                            <Text size={200}>No points matched your filter</Text>
                          </div>
                        ) : (
                          filteredGlobalPoints.map((point) => {
                            const tags = globalPointTags[point.key] || [];
                            const selected = globalSelectedKeys.has(point.key);
                            return (
                              <button
                                key={point.key}
                                type="button"
                                className={`${styles.globalPointRow} ${selected ? styles.globalPointRowSelected : ''}`}
                                onClick={() => toggleGlobalPointSelection(point.key)}
                              >
                                <div className={styles.globalPointMain}>
                                  <Badge appearance="outline">{point.type}</Badge>
                                  <Text size={200}>{point.index}</Text>
                                  <Text size={200} weight="semibold" className={styles.globalPointLabel}>{point.label}</Text>
                                  <Text size={200} className={styles.pointPickerSelectState}>{selected ? 'Selected' : 'Tap to add'}</Text>
                                </div>
                                <div className={styles.globalPointTags}>
                                  {tags.map((tag) => (
                                    <span key={`${point.key}-${tag}`} className={styles.pointTagPill}>
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>

                      <div className={styles.pointPickerFooter}>
                        <button
                          type="button"
                          className={styles.smallActionButton}
                          onClick={selectAllVisibleGlobalPoints}
                          disabled={filteredGlobalPoints.length === 0}
                        >
                          Select All Visible
                        </button>
                        <button
                          type="button"
                          className={styles.smallActionButton}
                          onClick={resetPointPickerFilters}
                        >
                          Reset Filters
                        </button>
                      </div>
                    </aside>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};
