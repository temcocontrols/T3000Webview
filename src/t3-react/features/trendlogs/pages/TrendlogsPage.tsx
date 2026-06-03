/**
 * TrendLogsPage Component
 *
 * Manage trend log configurations with device refresh
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Input,
  Switch,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  SearchRegular,
  DismissRegular,
  ErrorCircleRegular,
  ChartMultipleRegular,
  FullScreenMaximizeRegular,
  InfoRegular,
  ChevronUpRegular,
  ChevronDownRegular,
  ArrowRightRegular,
  OpenRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { TrendlogRefreshApi } from '../services/trendlogRefreshApi';
import { PanelDataRefreshService } from '../../../shared/services/panelDataRefreshService';
import { API_BASE_URL } from '../../../config/constants';
import { TrendChartContent } from '../components/TrendChartContent';
import { TrendPolicyPage } from './TrendPolicyPage';
import { TrendlogVerifyDrawer } from '../components/TrendlogVerifyDrawer';
import { FlowLogTab } from '../../logs/components/FlowLogTab';
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
  // Per-type logged record counts (from trendlog-data/stats)
  inputDataPoints: number;
  outputDataPoints: number;
  variableDataPoints: number;
  // How many distinct points have been tracked in TRENDLOG_DATA parent rows
  trackedInputs: number;
  trackedOutputs: number;
  trackedVariables: number;
  inputLastSyncAt: number | null;
  outputLastSyncAt: number | null;
  variableLastSyncAt: number | null;
  inputLastSyncFmt: string;
  outputLastSyncFmt: string;
  variableLastSyncFmt: string;
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
  inputDataPoints: 0,
  outputDataPoints: 0,
  variableDataPoints: 0,
  trackedInputs: 0,
  trackedOutputs: 0,
  trackedVariables: 0,
  inputLastSyncAt: null,
  outputLastSyncAt: null,
  variableLastSyncAt: null,
  inputLastSyncFmt: 'N/A',
  outputLastSyncFmt: 'N/A',
  variableLastSyncFmt: 'N/A',
};

const TRACKED_POINT_SYNC_TYPES = ['INPUTS', 'OUTPUTS', 'VARIABLES'] as const;

type TrendCenterTab = 'overview' | 'default' | 'point-sets' | 'haystack-tags' | 'chart' | 'backend';

interface PointSetPointItem {
  key: string;
  type: 'INPUT' | 'OUTPUT' | 'VARIABLE';
  index: string;
  label: string;
  shortLabel?: string;
  fullLabel?: string;
}

interface SavedPointSet {
  name: string;
  selectedKeys: string[];
  pointTags: Record<string, string[]>;
  updatedAt?: number;
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  content: string;
  confirmText: string;
  cancelText: string;
}

interface PromptDialogState {
  open: boolean;
  title: string;
  content: string;
  confirmText: string;
  cancelText: string;
  placeholder: string;
}

const COMMON_HAYSTACK_TAGS = ['ahu', 'temp', 'critical', 'floor1'] as const;
const TREND_POLICY_STORAGE_KEY = 't3000.trend.policy.state.v2';

const isTrendCenterTab = (value: string | null): value is TrendCenterTab => {
  return value === 'overview' || value === 'default' || value === 'point-sets' || value === 'haystack-tags' || value === 'chart' || value === 'backend';
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
  const hasEverLoadedData = useRef(false);
  const autoRefreshInProgressRef = useRef(false);
  const fetchRequestIdRef = useRef(0);
  const embeddedChartTimeBaseRef = useRef<string>('5m');
  const [selectedMonitor, setSelectedMonitor] = useState<TrendLogData | null>(null);
  const [monitorInputs, setMonitorInputs] = useState<TrendLogInput[]>([]);
  const [loadingInputs, setLoadingInputs] = useState(false);
  const [pointSummaryLoading, setPointSummaryLoading] = useState(false);
  const [devicePointSyncSummary, setDevicePointSyncSummary] = useState<DevicePointSyncSummary>(EMPTY_POINT_SYNC_SUMMARY);
  const [, setSyncingPointTypes] = useState<Set<string>>(new Set());
  const [verifyDrawerOpen, setVerifyDrawerOpen] = useState(false);
  const [infoBannerDismissed, setInfoBannerDismissed] = useState(() =>
    sessionStorage.getItem('tl-infobanner-v1') === '1'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const selectedSerial = selectedDevice?.serialNumber;
  const selectedPanelId = selectedDevice?.panelId;

  const rawTab = searchParams.get('tab');
  const activeTab: TrendCenterTab = isTrendCenterTab(rawTab) ? rawTab : 'default';
  const requestedSerial = searchParams.get('serial');
  const requestedMonitorId = searchParams.get('monitorId');
  const requestedTrendlogId = searchParams.get('trendlogId');
  const requestedPointSetName = searchParams.get('pointSetName');

  const normalizeMonitorToken = useCallback((value?: string | null) => {
    return (value || '').toUpperCase().replace(/^(MON|TLOG)/, '');
  }, []);

  const isPointSetChartMode = React.useMemo(() => {
    if (activeTab !== 'chart') return false;
    const requested = normalizeMonitorToken(requestedMonitorId || requestedTrendlogId);
    const selected = normalizeMonitorToken(selectedMonitor?.trendlogId || selectedMonitor?.trendlogIndex || '');
    return requested === 'GLOBAL' || selected === 'GLOBAL';
  }, [activeTab, normalizeMonitorToken, requestedMonitorId, requestedTrendlogId, selectedMonitor?.trendlogId, selectedMonitor?.trendlogIndex]);

  // Helper function to get row ID for a trendlog
  const getRowIdForItem = useCallback((item: TrendLogData) => {
    return `${item.serialNumber}-${item.trendlogId || item.trendlogIndex}-${item._uniqueIndex}`;
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const [pointSetPoints, setPointSetPoints] = useState<PointSetPointItem[]>([]);
  const [pointSetPointsLoading, setPointSetPointsLoading] = useState(false);
  const [pointPickerSearch, setPointPickerSearch] = useState('');
  const [pointSetSelectedKeys, setPointSetSelectedKeys] = useState<Set<string>>(new Set());
  const [pointSetSelectedOrder, setPointSetSelectedOrder] = useState<string[]>([]);
  const [pointSetTagFilter, setPointSetTagFilter] = useState<string>('all');
  const [pointSetPointTags, setPointSetPointTags] = useState<Record<string, string[]>>({});
  const [pointSetName, setPointSetName] = useState('');
  const [selectedPointSetName, setSelectedSavedSetName] = useState('');
  const [savedPointSets, setSavedPointSets] = useState<SavedPointSet[]>([]);
  const [pointSetReloadRevision, setPointSetReloadRevision] = useState(0);
  const [isPointPickerOpen, setIsPointPickerOpen] = useState(false);
  const [draggingPointKey, setDraggingPointKey] = useState<string | null>(null);
  const [, setIsTemporarySetMode] = useState(false);
  const [pointSetSort, setPointSetSort] = useState<'recent' | 'name'>('recent');
  const [pointSetSearch, setPointSetSearch] = useState('');
  const [pointSetActionMessage, setPointSetActionMessage] = useState('');
  const [pointSetInitialized, setPointSetInitialized] = useState(false);
  const [inlineRenamePointSetName, setInlineRenamePointSetName] = useState('');
  const [inlineRenameValue, setInlineRenameValue] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    content: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
  });
  const [promptDialog, setPromptDialog] = useState<PromptDialogState>({
    open: false,
    title: '',
    content: '',
    confirmText: 'Save',
    cancelText: 'Cancel',
    placeholder: 'Set name',
  });
  const [promptInputValue, setPromptInputValue] = useState('');
  const confirmResolverRef = useRef<((result: boolean) => void) | null>(null);
  const promptResolverRef = useRef<((result: string | null) => void) | null>(null);

  const requestConfirmDialog = useCallback((options: {
    title: string;
    content: string;
    confirmText?: string;
    cancelText?: string;
  }) => {
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmDialog({
        open: true,
        title: options.title,
        content: options.content,
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Cancel',
      });
    });
  }, []);

  const settleConfirmDialog = useCallback((result: boolean) => {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
    const resolver = confirmResolverRef.current;
    confirmResolverRef.current = null;
    if (resolver) {
      resolver(result);
    }
  }, []);

  const requestPromptDialog = useCallback((options: {
    title: string;
    content: string;
    initialValue?: string;
    confirmText?: string;
    cancelText?: string;
    placeholder?: string;
  }) => {
    return new Promise<string | null>((resolve) => {
      promptResolverRef.current = resolve;
      setPromptInputValue(options.initialValue || '');
      setPromptDialog({
        open: true,
        title: options.title,
        content: options.content,
        confirmText: options.confirmText || 'Save',
        cancelText: options.cancelText || 'Cancel',
        placeholder: options.placeholder || 'Set name',
      });
    });
  }, []);

  const settlePromptDialog = useCallback((result: string | null) => {
    setPromptDialog((prev) => ({ ...prev, open: false }));
    const resolver = promptResolverRef.current;
    promptResolverRef.current = null;
    if (resolver) {
      resolver(result);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (confirmResolverRef.current) {
        confirmResolverRef.current(false);
        confirmResolverRef.current = null;
      }
      if (promptResolverRef.current) {
        promptResolverRef.current(null);
        promptResolverRef.current = null;
      }
    };
  }, []);
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

  const listPointSetsFromDb = useCallback(async (serialNumber: number): Promise<SavedPointSet[]> => {
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

    const payload = await response.json() as { sets?: Array<SavedPointSet> };
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

  const savePointSetToDb = useCallback(async (serialNumber: number, setItem: SavedPointSet): Promise<string> => {
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
    if (!pointSetActionMessage) return;
    const timer = window.setTimeout(() => {
      setPointSetActionMessage('');
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [pointSetActionMessage]);

  const setActiveTab = useCallback((tab: TrendCenterTab, monitor?: TrendLogData) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (tab === 'chart' && monitor) {
      const mIdx = monitor.trendlogIndex || monitor.trendlogId || '0';
      const mId  = monitor.trendlogId   || monitor.trendlogIndex || '0';
      next.set('monitorId', mIdx);
      next.set('trendlogId', mId);
    } else if (tab !== 'chart') {
      next.delete('monitorId');
      next.delete('trendlogId');
      next.delete('pointSetName');
    }
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

      const trackedInputs = typeof trendlogStatsData.input_tracked_points === 'number' ? trendlogStatsData.input_tracked_points : 0;
      const trackedOutputs = typeof trendlogStatsData.output_tracked_points === 'number' ? trendlogStatsData.output_tracked_points : 0;
      const trackedVariables = typeof trendlogStatsData.variable_tracked_points === 'number' ? trendlogStatsData.variable_tracked_points : 0;

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
      const inputLatest = latestByType.get('INPUTS');
      const outputLatest = latestByType.get('OUTPUTS');
      const variableLatest = latestByType.get('VARIABLES');

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
        inputDataPoints: typeof trendlogStatsData.input_data_points === 'number' ? trendlogStatsData.input_data_points : 0,
        outputDataPoints: typeof trendlogStatsData.output_data_points === 'number' ? trendlogStatsData.output_data_points : 0,
        variableDataPoints: typeof trendlogStatsData.variable_data_points === 'number' ? trendlogStatsData.variable_data_points : 0,
        trackedInputs,
        trackedOutputs,
        trackedVariables,
        inputLastSyncAt: typeof inputLatest?.syncTime === 'number' ? inputLatest.syncTime : null,
        outputLastSyncAt: typeof outputLatest?.syncTime === 'number' ? outputLatest.syncTime : null,
        variableLastSyncAt: typeof variableLatest?.syncTime === 'number' ? variableLatest.syncTime : null,
        inputLastSyncFmt: inputLatest?.syncTimeFmt || 'N/A',
        outputLastSyncFmt: outputLatest?.syncTimeFmt || 'N/A',
        variableLastSyncFmt: variableLatest?.syncTimeFmt || 'N/A',
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

        // Normalize trendlog ID for matching (API returns MON, display uses TLOG)
        const trendlogNum = (trendlog.trendlogId || trendlog.trendlogIndex || '')
          .replace(/^(MON|TLOG)/i, '');

        const trendlogInputs = (inputsData.data || []).filter(
          (input: any) => {
            const inputId = (input.trendlogId || input.Trendlog_ID || '').replace(/^(MON|TLOG)/i, '');
            const trendlogMatch = inputId === trendlogNum
              || input.trendlogId === trendlog.trendlogId
              || input.Trendlog_ID === trendlog.trendlogId;
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

      const monitorIndex = trendlog.trendlogIndex || trendlog.trendlogId || '0';
      // Label is already available in the row data — no extra API call needed
      const title = trendlog.trendlogLabel || `TrendLog ${monitorIndex}`;

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

      // Build deterministic return URL and keep chart context (including GLOBAL)
      // so minimizing from full-page returns to the exact chart route.
      const returnSearchParams = new URLSearchParams(searchParams);
      returnSearchParams.set('serial', String(selectedDevice.serialNumber));
      returnSearchParams.set('panel', String(selectedDevice.panelId || 1));
      returnSearchParams.set('tab', 'chart');
      returnSearchParams.set('monitorId', monitorIndex);
      returnSearchParams.set('trendlogId', trendlog.trendlogId || monitorIndex);
      // Preserve point set name so minimize restores the correct set
      const currentPointSetName = searchParams.get('pointSetName');
      if (monitorIndex === 'GLOBAL' && currentPointSetName) {
        returnSearchParams.set('pointSetName', currentPointSetName);
      } else {
        returnSearchParams.delete('pointSetName');
      }
      const returnUrl = `${location.pathname}?${returnSearchParams.toString()}`;
      const fullPageSearchParams = new URLSearchParams();
      fullPageSearchParams.set('mode', 'full');
      fullPageSearchParams.set('tab', 'chart');
      fullPageSearchParams.set('serial', String(selectedDevice.serialNumber));
      fullPageSearchParams.set('panel', String(selectedDevice.panelId || 1));
      fullPageSearchParams.set('monitorId', monitorIndex);
      fullPageSearchParams.set('trendlogId', trendlog.trendlogId || monitorIndex);
      if (monitorIndex === 'GLOBAL' && currentPointSetName) {
        fullPageSearchParams.set('pointSetName', currentPointSetName);
      }
      const fullPageUrl = `/t3000/trends/chart?${fullPageSearchParams.toString()}`;

      if (alreadyLoaded) {
        navigate(fullPageUrl, {
          state: {
            serialNumber: selectedDevice.serialNumber,
            panelId: selectedDevice.panelId || 1,
            trendlogId: trendlog.trendlogId || '0',
            monitorId: monitorIndex,
            itemData: buildItemData(),
            monitorInputs,
            initialTimeBase: embeddedChartTimeBaseRef.current,
            returnUrl,
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

        navigate(fullPageUrl, {
          state: {
            serialNumber: selectedDevice.serialNumber,
            panelId: selectedDevice.panelId || 1,
            trendlogId: trendlog.trendlogId || '0',
            monitorId: monitorIndex,
            itemData: buildItemData(),
            monitorInputs: freshInputs,
            initialTimeBase: embeddedChartTimeBaseRef.current,
            returnUrl,
          },
        });
      } catch (error) {
        console.error('❌ [TrendLogsPage] Failed to load inputs for chart:', error);
        navigate(fullPageUrl, {
          state: {
            serialNumber: selectedDevice.serialNumber,
            panelId: selectedDevice.panelId || 1,
            trendlogId: trendlog.trendlogId || '0',
            monitorId: monitorIndex,
            itemData: buildItemData(),
            monitorInputs,
            initialTimeBase: embeddedChartTimeBaseRef.current,
            returnUrl,
          },
        });
      }
    },
    [selectedDevice, monitorInputs, loadTrendlogInputsInternal, location, normalizeMonitorToken, searchParams]
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
        const requestedNormalized = normalizeMonitorToken(requestedMonitorId || requestedTrendlogId);
        const isChartContext = activeTab === 'chart';

        // Point Sets chart mode uses a synthetic GLOBAL monitor with specific_points.
        // Do not auto-fallback to first physical monitor (MON1), or history calls will use MON1 path.
        if (requestedNormalized === 'GLOBAL') {
          console.log('[TrendLogsPage] GLOBAL chart context detected; skipping trendlog auto-select fallback.');
          // Clear stale physical monitor state while GLOBAL hydration resolves selected point set.
          setSelectedMonitor(null);
          setMonitorInputs([]);
          setSelectedItems(new Set());
          return;
        }

        const queriedTrendlog = requestedNormalized
          ? trendlogsWithIndex.find((item: TrendLogData) => {
              const itemA = normalizeMonitorToken(item.trendlogId);
              const itemB = normalizeMonitorToken(item.trendlogIndex);
              return itemA === requestedNormalized || itemB === requestedNormalized;
            })
          : null;

        // In chart context with an explicit requested monitor, never fallback to MON1.
        if (isChartContext && requestedNormalized && !queriedTrendlog) {
          console.warn('[TrendLogsPage] Requested monitor not found in chart context; skipping fallback selection.', {
            requestedMonitorId,
            requestedTrendlogId,
          });
          setSelectedMonitor(null);
          setMonitorInputs([]);
          setSelectedItems(new Set());
          return;
        }

        const initialTrendlog = queriedTrendlog || trendlogsWithIndex[0];
        // Normalize to TLOG for display matching
        const displayTrendlog = {
          ...initialTrendlog,
          trendlogId: `TLOG${normalizeMonitorToken(initialTrendlog.trendlogId || initialTrendlog.trendlogIndex || '1')}`,
          trendlogIndex: `TLOG${normalizeMonitorToken(initialTrendlog.trendlogId || initialTrendlog.trendlogIndex || '1')}`,
        };
        console.log('🎯 [TrendLogsPage] Auto-selecting trendlog:', displayTrendlog);
        setSelectedMonitor(displayTrendlog);

        // Select the first row's radio button using display format
        const firstRowId = `${displayTrendlog.serialNumber}-${displayTrendlog.trendlogId}-${displayTrendlog._uniqueIndex}`;
        setSelectedItems(new Set([firstRowId]));

        await loadTrendlogInputsInternal(displayTrendlog);
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
      hasEverLoadedData.current = true;
    }
  }, [selectedPanelId, selectedSerial]);

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
    if (activeTab === 'point-sets' || isPointSetChartMode) return;
    fetchTrendLogs();
  }, [activeTab, fetchTrendLogs, isPointSetChartMode]);

  useEffect(() => {
    if (!rawTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'default');
      setSearchParams(next, { replace: true });
    }
  }, [rawTab, searchParams, setSearchParams]);

  // Keep chart tab stable during reload/rehydration. Falling back to default/point-sets
  // here causes URL churn and breaks full-page return behavior.

  useEffect(() => {
    if (activeTab === 'point-sets' || isPointSetChartMode) return;
    fetchPointSyncSummary();
  }, [activeTab, fetchPointSyncSummary, isPointSetChartMode]);

  // Reset auto-refresh state when device changes (don't clear data to avoid visual flash)
  useEffect(() => {
    setAutoRefreshed(false);
    setDbChecked(false);
    hasEverLoadedData.current = false;
  }, [selectedDevice?.serialNumber]);

  // Auto-refresh once per device - ONLY after initial DB fetch completes
  useEffect(() => {
    if (activeTab === 'point-sets' || isPointSetChartMode) return;
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
  }, [activeTab, autoRefreshed, dbChecked, fetchPointSyncSummary, fetchTrendLogs, isPointSetChartMode, loading, selectedSerial, setPointTypeSyncing]);

  // Refresh all trendlogs from device (Trigger #2: Manual "Refresh All" button)
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    setError(null);
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
      { header: 'Data Size (KB)', accessor: t => t.dataSizeKb },
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
    const rowId = getRowIdForItem(monitor);
    setSelectedItems(new Set([rowId]));
    setSelectedMonitor(monitor);
    // Persist selection in URL (safe now — fetchTrendLogs no longer depends on URL params)
    syncMonitorQuery(monitor);
    await loadTrendlogInputsInternal(monitor);
  }, [getRowIdForItem, syncMonitorQuery]);

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
  const handleChartBack = useCallback(() => {
    setActiveTab(isPointSetChartMode ? 'point-sets' : 'default');
  }, [isPointSetChartMode, setActiveTab]);

  const coverageRows = [
    {
      key: 'inputs',
      label: 'Inputs',
      total: devicePointSyncSummary.inputs,
      tracked: devicePointSyncSummary.trackedInputs,
      records: devicePointSyncSummary.inputDataPoints,
      lastSyncAt: devicePointSyncSummary.inputLastSyncAt,
      lastSyncFmt: devicePointSyncSummary.inputLastSyncFmt,
    },
    {
      key: 'outputs',
      label: 'Outputs',
      total: devicePointSyncSummary.outputs,
      tracked: devicePointSyncSummary.trackedOutputs,
      records: devicePointSyncSummary.outputDataPoints,
      lastSyncAt: devicePointSyncSummary.outputLastSyncAt,
      lastSyncFmt: devicePointSyncSummary.outputLastSyncFmt,
    },
    {
      key: 'variables',
      label: 'Variables',
      total: devicePointSyncSummary.variables,
      tracked: devicePointSyncSummary.trackedVariables,
      records: devicePointSyncSummary.variableDataPoints,
      lastSyncAt: devicePointSyncSummary.variableLastSyncAt,
      lastSyncFmt: devicePointSyncSummary.variableLastSyncFmt,
    },
  ];

  const getCoverageAgeStatus = (syncAt: number | null): 'fresh' | 'warning' | 'stale' => {
    if (!syncAt) return 'stale';
    const diffMin = Math.floor((Date.now() / 1000 - syncAt) / 60);
    if (diffMin < 5) return 'fresh';
    if (diffMin <= 15) return 'warning';
    return 'stale';
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

  const selectedPointSetPoints = React.useMemo(
    () => {
      const byKey = new Map(pointSetPoints.map((point) => [point.key, point]));
      const ordered: PointSetPointItem[] = [];

      pointSetSelectedOrder.forEach((key) => {
        if (!pointSetSelectedKeys.has(key)) return;
        const point = byKey.get(key);
        if (point) ordered.push(point);
      });

      // Backward compatibility for sets saved before ordered sets existed.
      pointSetPoints.forEach((point) => {
        if (!pointSetSelectedKeys.has(point.key)) return;
        if (ordered.some((item) => item.key === point.key)) return;
        ordered.push(point);
      });

      return ordered;
    },
    [pointSetPoints, pointSetSelectedKeys, pointSetSelectedOrder]
  );

  const availablePointTags = React.useMemo(() => {
    const tags = new Set<string>();
    Object.values(pointSetPointTags).forEach((pointTags) => {
      pointTags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [pointSetPointTags]);

  const filteredPointSetPoints = React.useMemo(() => {
    const q = pointPickerSearch.trim().toLowerCase();
    return pointSetPoints.filter((point) => {
      const tags = pointSetPointTags[point.key] || [];
      const tagMatch = pointSetTagFilter === 'all' || tags.includes(pointSetTagFilter);
      if (!tagMatch) return false;
      if (!q) return true;
      return (
        point.label.toLowerCase().includes(q) ||
        (point.fullLabel || '').toLowerCase().includes(q) ||
        point.type.toLowerCase().includes(q) ||
        point.index.toLowerCase().includes(q) ||
        tags.some((tag) => tag.includes(q))
      );
    });
  }, [pointSetPoints, pointSetPointTags, pointPickerSearch, pointSetTagFilter]);

  const sortedSavedPointSets = React.useMemo(() => {
    const next = [...savedPointSets];
    if (pointSetSort === 'name') {
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
  }, [pointSetSort, savedPointSets]);

  const filteredSavedPointSets = React.useMemo(() => {
    const q = pointSetSearch.trim().toLowerCase();
    if (!q) return sortedSavedPointSets;
    return sortedSavedPointSets.filter((setItem) => {
      return setItem.name.toLowerCase().includes(q);
    });
  }, [pointSetSearch, sortedSavedPointSets]);

  const currentOrderedSelectedKeys = React.useMemo(() => {
    const ordered = pointSetSelectedOrder.filter((key) => pointSetSelectedKeys.has(key));
    if (ordered.length > 0) return ordered;
    return Array.from(pointSetSelectedKeys);
  }, [pointSetSelectedKeys, pointSetSelectedOrder]);

  const activeSavedSet = React.useMemo(() => {
    if (!selectedPointSetName) return null;
    return savedPointSets.find((setItem) => setItem.name === selectedPointSetName) || null;
  }, [savedPointSets, selectedPointSetName]);

  const isCurrentSetDirty = React.useMemo(() => {
    if (!pointSetInitialized) {
      return false;
    }

    const normalizedName = pointSetName.trim();
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
  }, [activeSavedSet, currentOrderedSelectedKeys, pointSetInitialized, pointSetName]);

  const confirmDiscardUnsavedPointSetChanges = useCallback(async () => {
    if (!isCurrentSetDirty) return true;
    const ok = await requestConfirmDialog({
      title: 'Discard changes?',
      content: 'You have unsaved set changes. Continue and discard them?',
      confirmText: 'Discard',
      cancelText: 'Keep editing',
    });
    if (!ok) {
      setPointSetActionMessage('Stayed on current set.');
      return false;
    }
    return true;
  }, [isCurrentSetDirty, requestConfirmDialog]);

  const togglePointSetSelection = useCallback((key: string) => {
    setPointSetSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setPointSetSelectedOrder((orderPrev) => orderPrev.filter((value) => value !== key));
      } else {
        next.add(key);
        setPointSetSelectedOrder((orderPrev) => (orderPrev.includes(key) ? orderPrev : [...orderPrev, key]));
      }
      return next;
    });
  }, []);

  const applyCommonTag = useCallback((tag: string) => {
    setPointSetTagFilter(tag);
  }, []);

  const selectAllVisiblePointSetPoints = useCallback(() => {
    setPointSetSelectedKeys((prev) => {
      const next = new Set(prev);
      const additions: string[] = [];
      filteredPointSetPoints.forEach((point) => next.add(point.key));
      filteredPointSetPoints.forEach((point) => {
        if (!prev.has(point.key)) additions.push(point.key);
      });
      if (additions.length > 0) {
        setPointSetSelectedOrder((orderPrev) => {
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
  }, [filteredPointSetPoints]);

  const clearPointSetSelection = useCallback(() => {
    setPointSetSelectedKeys(new Set());
    setPointSetSelectedOrder([]);
  }, []);

  const removePointFromCurrentSet = useCallback((key: string) => {
    setPointSetSelectedKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setPointSetSelectedOrder((prev) => prev.filter((value) => value !== key));
  }, []);

  const movePointWithinPointSet = useCallback((draggedKey: string, targetKey: string) => {
    if (!draggedKey || !targetKey || draggedKey === targetKey) return;
    setPointSetSelectedOrder((prev) => {
      const base = prev.filter((key) => pointSetSelectedKeys.has(key));
      const from = base.indexOf(draggedKey);
      const to = base.indexOf(targetKey);
      if (from < 0 || to < 0) return prev;
      const next = [...base];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, [pointSetSelectedKeys]);

  const movePointByOffset = useCallback((key: string, offset: number) => {
    if (!key || offset === 0) return;
    setPointSetSelectedOrder((prev) => {
      const base = prev.filter((value) => pointSetSelectedKeys.has(value));
      const from = base.indexOf(key);
      if (from < 0) return prev;
      const to = Math.min(base.length - 1, Math.max(0, from + offset));
      if (to === from) return prev;
      const next = [...base];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, [pointSetSelectedKeys]);

  const saveCurrentPointSet = useCallback(async () => {
    setPointSetActionMessage('Save click received...');
    const candidateName = (selectedPointSetName || pointSetName || '').trim();
    let normalizedName = candidateName;
    if (!normalizedName) {
      const entered = await requestPromptDialog({
        title: 'Save Set',
        content: 'Enter a name for this point set.',
        initialValue: pointSetName || '',
        confirmText: 'Save',
        cancelText: 'Cancel',
        placeholder: 'Set name',
      });
      normalizedName = (entered || '').trim();
    }
    if (!normalizedName) {
      setPointSetActionMessage('Set name is required.');
      return;
    }

    const orderedKeys = pointSetSelectedOrder.filter((key) => pointSetSelectedKeys.has(key));
    const fallbackOrderedKeys = orderedKeys.length > 0 ? orderedKeys : Array.from(pointSetSelectedKeys);
    if (fallbackOrderedKeys.length === 0) {
      setPointSetActionMessage('Current set is empty. Add points before saving.');
      return;
    }

    const existing = savedPointSets.find((setItem) => setItem.name === normalizedName);
    if (existing && existing.name !== selectedPointSetName) {
      const ok = await requestConfirmDialog({
        title: 'Replace existing set?',
        content: `A set named "${normalizedName}" already exists. Replace it?`,
        confirmText: 'Replace',
        cancelText: 'Cancel',
      });
      if (!ok) {
        setPointSetActionMessage('Save canceled.');
        return;
      }
    }

    const compactPointTags: Record<string, string[]> = {};
    fallbackOrderedKeys.forEach((key) => {
      const tags = pointSetPointTags[key];
      if (!Array.isArray(tags) || tags.length === 0) return;
      const normalizedTags = Array.from(new Set(tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim().toLowerCase())));
      if (normalizedTags.length > 0) {
        compactPointTags[key] = normalizedTags;
      }
    });

    const newSet: SavedPointSet = {
      name: normalizedName,
      selectedKeys: fallbackOrderedKeys,
      pointTags: compactPointTags,
      updatedAt: Date.now(),
    };

    const serialNumber = pointSetSerialNumber;
    if (!serialNumber) {
      setPointSetActionMessage('No device selected.');
      return;
    }

    try {
      console.info('[TrendLogsPage] Save Set click', {
        serialNumber,
        setName: normalizedName,
        selectedCount: fallbackOrderedKeys.length,
      });
      setPointSetActionMessage('Saving set...');
      await savePointSetToDb(serialNumber, newSet);
      setSavedPointSets((prev) => {
        const withoutSame = prev.filter((setItem) => setItem.name !== normalizedName);
        return [...withoutSame, newSet].sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelectedSavedSetName(normalizedName);
      setPointSetName(normalizedName);
      setIsTemporarySetMode(false);
      setPointSetActionMessage(`Set "${normalizedName}" saved successfully.`);
    } catch (error) {
      console.error('[TrendLogsPage] Failed to save set to DB:', error);
      setPointSetActionMessage('Failed to save set to database.');
    }
  }, [pointSetPointTags, pointSetSelectedKeys, pointSetSelectedOrder, pointSetName, pointSetSerialNumber, requestConfirmDialog, requestPromptDialog, savePointSetToDb, savedPointSets, selectedPointSetName]);

  const renamePointSetByName = useCallback(async (setName: string, nextNameRaw: string) => {
    const baseName = (setName || '').trim();
    if (!baseName) return;

    const nextName = (nextNameRaw || '').trim();
    if (!nextName) {
      setPointSetActionMessage('New set name is required.');
      return;
    }
    if (nextName === baseName) {
      setPointSetActionMessage('Name is unchanged.');
      return;
    }

    const existing = savedPointSets.find((setItem) => setItem.name === nextName);
    const replaceExisting = !!existing && existing.name !== baseName;
    if (replaceExisting) {
      const ok = await requestConfirmDialog({
        title: 'Replace existing set?',
        content: `A set named "${nextName}" already exists. Replace it?`,
        confirmText: 'Replace',
        cancelText: 'Cancel',
      });
      if (!ok) {
        setPointSetActionMessage('Rename canceled.');
        return;
      }
    }

    const serialNumber = pointSetSerialNumber;
    if (!serialNumber) {
      setPointSetActionMessage('No device selected.');
      return;
    }

    const target = savedPointSets.find((setItem) => setItem.name === baseName);
    if (!target) {
      setPointSetActionMessage('Selected set was not found.');
      return;
    }

    const renamed: SavedPointSet = {
      ...target,
      name: nextName,
      updatedAt: Date.now(),
    };

    try {
      setPointSetActionMessage('Renaming set...');
      await renamePointSetInDb(serialNumber, baseName, nextName, replaceExisting);
      setSavedPointSets((prev) => {
        const withoutOld = prev.filter((setItem) => setItem.name !== baseName && setItem.name !== nextName);
        return [...withoutOld, renamed].sort((a, b) => a.name.localeCompare(b.name));
      });
      if (selectedPointSetName === baseName) {
        setSelectedSavedSetName(nextName);
        setPointSetName(nextName);
      }
      setIsTemporarySetMode(false);
      setInlineRenamePointSetName('');
      setInlineRenameValue('');
      setPointSetActionMessage(`Renamed to "${nextName}".`);
    } catch (error) {
      console.error('[TrendLogsPage] Failed to rename set in DB:', error);
      setPointSetActionMessage('Failed to rename set in database.');
    }
  }, [pointSetSerialNumber, renamePointSetInDb, requestConfirmDialog, savedPointSets, selectedPointSetName]);

  const resetPointPickerFilters = useCallback(() => {
    setPointPickerSearch('');
    setPointSetTagFilter('all');
  }, []);

  const removePointSetByName = useCallback(async (setName: string) => {
    const targetName = (setName || '').trim();
    if (!targetName) return;

    const target = savedPointSets.find((setItem) => setItem.name === targetName);
    const pointsCount = target?.selectedKeys.length ?? 0;
    const ok = await requestConfirmDialog({
      title: 'Delete point set?',
      content: `Delete set "${targetName}" (${pointsCount} points)? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (!ok) {
      setPointSetActionMessage('Delete canceled.');
      return;
    }

    const serialNumber = pointSetSerialNumber;
    if (!serialNumber) {
      setPointSetActionMessage('No device selected.');
      return;
    }

    try {
      setPointSetActionMessage('Deleting set...');
      await deletePointSetFromDb(serialNumber, targetName);
      setSavedPointSets((prev) => prev.filter((setItem) => setItem.name !== targetName));
      if (selectedPointSetName === targetName) {
        setPointSetName('');
        setSelectedSavedSetName('');
      }
      if (inlineRenamePointSetName === targetName) {
        setInlineRenamePointSetName('');
        setInlineRenameValue('');
      }
      setIsTemporarySetMode(false);
      setPointSetActionMessage(`Deleted set "${targetName}".`);
    } catch (error) {
      console.error('[TrendLogsPage] Failed to delete set from DB:', error);
      setPointSetActionMessage('Failed to delete set from database.');
    }
  }, [deletePointSetFromDb, inlineRenamePointSetName, pointSetSerialNumber, requestConfirmDialog, savedPointSets, selectedPointSetName]);

  const createNewPointSet = useCallback(async () => {
    if (!(await confirmDiscardUnsavedPointSetChanges())) return;

    const baseName = 'New Set';
    const existingNames = new Set(savedPointSets.map((setItem) => setItem.name.toLowerCase()));
    let nextName = baseName;
    let suffix = 2;
    while (existingNames.has(nextName.toLowerCase())) {
      nextName = `${baseName} ${suffix}`;
      suffix += 1;
    }

    const draftSet: SavedPointSet = {
      name: nextName,
      selectedKeys: [],
      pointTags: {},
      updatedAt: Date.now(),
    };

    setSavedPointSets((prev) => {
      const withoutSame = prev.filter((setItem) => setItem.name !== nextName);
      return [...withoutSame, draftSet].sort((a, b) => a.name.localeCompare(b.name));
    });
    setSelectedSavedSetName(nextName);
    setPointSetName(nextName);
    setPointSetSelectedKeys(new Set());
    setPointSetSelectedOrder([]);
    setPointSetPointTags({});
    setPointSetTagFilter('all');
    setPointSetSearch('');
    setInlineRenamePointSetName('');
    setInlineRenameValue('');
    setIsTemporarySetMode(true);
    setPointSetInitialized(true);
    setPointSetActionMessage(`New set "${nextName}" created. Add points and click Save Set.`);
  }, [confirmDiscardUnsavedPointSetChanges, savedPointSets]);

  const startInlineRename = useCallback((setName: string) => {
    setInlineRenamePointSetName(setName);
    setInlineRenameValue(setName);
  }, []);

  const cancelInlineRename = useCallback(() => {
    setInlineRenamePointSetName('');
    setInlineRenameValue('');
    setPointSetActionMessage('Rename canceled.');
  }, []);

  const applyPointSetSelection = useCallback((target: SavedPointSet, showMessage = true) => {
    setSelectedSavedSetName(target.name);
    setPointSetSelectedKeys(new Set(target.selectedKeys));
    setPointSetSelectedOrder(target.selectedKeys || []);
    setPointSetPointTags((prev) => ({
      ...prev,
      ...(target.pointTags || {}),
    }));
    setPointSetTagFilter('all');
    setPointSetName(target.name);
    setIsTemporarySetMode(false);
    if (showMessage) {
      setPointSetActionMessage(`Loaded set "${target.name}".`);
    }
  }, []);

  const loadPointSetByName = useCallback(async (setName: string) => {
    if (!setName) return;
    if (setName === selectedPointSetName) return;
    const serialNumber = pointSetSerialNumber;

    if (!serialNumber) {
      setPointSetActionMessage('No device selected.');
      return;
    }

    if (!(await confirmDiscardUnsavedPointSetChanges())) return;

    try {
      const rows = await listPointSetsFromDb(serialNumber);
      setSavedPointSets(rows);

      const target = rows.find((setItem) => setItem.name === setName);
      if (!target) {
        setPointSetActionMessage(`Set "${setName}" was not found.`);
        return;
      }

      applyPointSetSelection(target);
    } catch (error) {
      console.error('[TrendLogsPage] Failed to refresh point sets on selection:', error);
      const fallback = savedPointSets.find((setItem) => setItem.name === setName);
      if (!fallback) {
        setPointSetActionMessage('Failed to load selected set from database.');
        return;
      }
      applyPointSetSelection(fallback);
      setPointSetActionMessage('Loaded set from local cache (refresh failed).');
    }
  }, [applyPointSetSelection, confirmDiscardUnsavedPointSetChanges, listPointSetsFromDb, pointSetSerialNumber, savedPointSets, selectedPointSetName]);

  const openPointSetChartByName = useCallback(async (setName: string) => {
    if (!setName) return;
    const target = savedPointSets.find((setItem) => setItem.name === setName);
    if (!target) return;

    if (setName !== selectedPointSetName) {
      if (!(await confirmDiscardUnsavedPointSetChanges())) return;
      applyPointSetSelection(target, false);
    }

    if (!selectedDevice) {
      setPointSetActionMessage('No device selected.');
      return;
    }

    const pointsByKey = new Map(pointSetPoints.map((point) => [point.key, point]));
    const orderedPoints = (target.selectedKeys || [])
      .map((key) => pointsByKey.get(key))
      .filter((point): point is PointSetPointItem => !!point);

    if (orderedPoints.length === 0) {
      setPointSetActionMessage(`Set "${target.name}" has no valid points to chart.`);
      return;
    }

    const syntheticMonitor: TrendLogData = {
      serialNumber: selectedDevice.serialNumber,
      trendlogId: 'GLOBAL',
      trendlogIndex: 'GLOBAL',
      trendlogLabel: `Point Set: ${target.name}`,
      status: 'ON',
      _uniqueIndex: 99999,
      panelId: selectedDevice.panelId,
    };

    const syntheticInputs: TrendLogInput[] = orderedPoints.map((point) => ({
      serialNumber: selectedDevice.serialNumber,
      panelId: selectedDevice.panelId || 1,
      trendlogId: 'GLOBAL',
      pointType: point.type,
      pointIndex: point.index,
      pointLabel: point.label,
    }));

    setSelectedMonitor(syntheticMonitor);
    setMonitorInputs(syntheticInputs);

    const next = new URLSearchParams(searchParams);
    next.set('serial', String(selectedDevice.serialNumber));
    next.set('panel', String(selectedDevice.panelId || 1));
    next.set('monitorId', 'GLOBAL');
    next.set('trendlogId', 'GLOBAL');
    next.set('pointSetName', target.name);
    next.set('tab', 'chart');
    setSearchParams(next, { replace: true });
  }, [applyPointSetSelection, confirmDiscardUnsavedPointSetChanges, pointSetPoints, savedPointSets, searchParams, selectedDevice, selectedPointSetName, setSearchParams]);

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
        className={`${styles.tabButton} ${activeTab === 'point-sets' ? styles.tabButtonActive : ''}`}
        onClick={() => setActiveTab('point-sets')}
      >
        Point Sets
      </button>
      <button
        className={`${styles.tabButton} ${activeTab === 'haystack-tags' ? styles.tabButtonActive : ''}`}
        onClick={() => setActiveTab('haystack-tags')}
      >
        Haystack Tags
      </button>
      <button
        className={`${styles.tabButton} ${activeTab === 'backend' ? styles.tabButtonActive : ''}`}
        onClick={() => setActiveTab('backend')}
      >
        Backend
      </button>
    </div>
  );

  useEffect(() => {
    const isGlobalChartMode =
      activeTab === 'chart' &&
      normalizeMonitorToken(requestedMonitorId || requestedTrendlogId) === 'GLOBAL';

    if (activeTab !== 'point-sets' && !isGlobalChartMode) {
      return;
    }

    const loadPointSetPoints = async () => {
      if (!selectedDevice?.serialNumber) {
        setPointSetPoints([]);
        setPointSetPointTags({});
        setPointSetSelectedKeys(new Set());
        setPointSetSelectedOrder([]);
        return;
      }

      setPointSetPointsLoading(true);
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

        const mapRows = (rows: any[], type: 'INPUT' | 'OUTPUT' | 'VARIABLE'): PointSetPointItem[] => {
          const normalizePointIndex = (rawValue: unknown, fallbackValue?: unknown): string => {
            const source = String(rawValue ?? fallbackValue ?? '').trim();
            if (!source) return '';
            const numericMatch = source.match(/(\d+)/);
            if (numericMatch) {
              const parsed = Number.parseInt(numericMatch[1], 10);
              if (!Number.isNaN(parsed)) {
                return String(parsed);
              }
            }
            return source.toUpperCase();
          };

          const pickDisplayText = (...candidates: unknown[]): string => {
            for (const candidate of candidates) {
              if (typeof candidate === 'string' && candidate.trim()) {
                return candidate.trim();
              }
              if (typeof candidate === 'number' && Number.isFinite(candidate)) {
                return String(candidate);
              }
            }
            return '';
          };

          return rows.map((row: any, idx: number) => {
            const rawIndex =
              row.inputIndex ?? row.outputIndex ?? row.variableIndex ?? row.pointIndex ?? row.Point_Index ?? row.index ?? row.number ?? idx + 1;
            const index = normalizePointIndex(rawIndex, idx + 1);
            const shortLabel = pickDisplayText(
              row.label,
              row.name,
              row.pointLabel,
              row.point_label,
              row.Point_Label,
              row.pointName,
              row.point_name,
            );
            const fullLabel = pickDisplayText(
              row.fullLabel,
              row.full_label,
              row.Full_Label,
              row.description,
              row.Description,
              row.displayLabel,
              row.display_label,
            );
            const label = shortLabel || `${type} ${index}`;
            return {
              key: `${type}:${index}`,
              type,
              index,
              label,
              shortLabel: shortLabel || undefined,
              fullLabel: fullLabel || undefined,
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
              const normalizePointIndex = (rawValue: unknown): string => {
                const source = String(rawValue ?? '').trim();
                if (!source) return '';
                const numericMatch = source.match(/(\d+)/);
                if (numericMatch) {
                  const parsed = Number.parseInt(numericMatch[1], 10);
                  if (!Number.isNaN(parsed)) {
                    return String(parsed);
                  }
                }
                return source.toUpperCase();
              };

              const pointIndex = normalizePointIndex(row?.pointIndex ?? row?.point_index);
              if (!pointTable || !pointIndex) return;

              const mappedType =
                pointTable === 'INPUTS' ? 'INPUT' :
                pointTable === 'OUTPUTS' ? 'OUTPUT' :
                pointTable === 'VARIABLES' ? 'VARIABLE' :
                '';
              if (!mappedType) return;

              const pointTagKey = `${mappedType}:${pointIndex}`;
              const parseTagsObject = (value: unknown): Record<string, unknown> | null => {
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                  return value as Record<string, unknown>;
                }
                if (typeof value === 'string' && value.trim()) {
                  try {
                    const parsed = JSON.parse(value);
                    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                      ? parsed as Record<string, unknown>
                      : null;
                  } catch {
                    return null;
                  }
                }
                return null;
              };

              const tagsObj = parseTagsObject(row?.tags);
              if (!tagsObj) return;

              const existing = new Set(seededTags[pointTagKey] || []);
              Object.entries(tagsObj).forEach(([tagKey, tagValue]) => {
                if (!tagKey) return;
                if (typeof tagValue === 'string' && tagValue.toUpperCase() === 'M') {
                  existing.add(tagKey.toLowerCase());
                } else if (typeof tagValue === 'string' || typeof tagValue === 'number' || typeof tagValue === 'boolean') {
                  existing.add(`${tagKey.toLowerCase()}:${String(tagValue).toLowerCase()}`);
                }
              });
              seededTags[pointTagKey] = Array.from(existing);
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
              const normalizedIndex = (() => {
                const source = String(indexRaw ?? '').trim();
                if (!source) return source;
                const numericMatch = source.match(/(\d+)/);
                if (!numericMatch) return source;
                const parsed = Number.parseInt(numericMatch[1], 10);
                return Number.isNaN(parsed) ? source : String(parsed);
              })();
              const globalKey = `${mappedType}:${normalizedIndex || indexRaw}`;
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

        setPointSetPoints(merged);
        setPointSetPointTags(seededTags);
      } catch (pointSetPointsError) {
        console.error('[TrendLogsPage] Failed to load global points:', pointSetPointsError);
        setPointSetPoints([]);
        setPointSetPointTags({});
      } finally {
        setPointSetPointsLoading(false);
      }
    };

    loadPointSetPoints();
  }, [activeTab, normalizeMonitorToken, pointSetReloadRevision, requestedMonitorId, requestedTrendlogId, selectedDevice?.serialNumber]);

  useEffect(() => {
    if (!selectedDevice?.serialNumber) {
      setSavedPointSets([]);
      setSelectedSavedSetName('');
      setPointSetInitialized(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const rows = await listPointSetsFromDb(selectedDevice.serialNumber);
        if (cancelled) return;
        setSavedPointSets(rows);

        if (rows.length > 0) {
          const selectedFromRows = rows.find((setItem) => setItem.name === selectedPointSetName);
          applyPointSetSelection(selectedFromRows || rows[0], false);
        } else {
          setSelectedSavedSetName('');
          setPointSetName('');
          setPointSetSelectedKeys(new Set());
          setPointSetSelectedOrder([]);
          setIsTemporarySetMode(false);
          setPointSetInitialized(false);
        }
      } catch (error) {
        console.error('[TrendLogsPage] Failed to load point sets from DB:', error);
        if (cancelled) return;
        setSavedPointSets([]);
        setSelectedSavedSetName('');
        setIsTemporarySetMode(false);
        setPointSetInitialized(false);
        setPointSetActionMessage('Failed to load point sets from database.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyPointSetSelection, listPointSetsFromDb, selectedDevice?.serialNumber]);

  useEffect(() => {
    if (activeTab !== 'point-sets' && !isPointSetChartMode) return;
    if (!selectedDevice?.serialNumber) return;
    if (pointSetPoints.length === 0) return;
    if (savedPointSets.length === 0) return;

    // In GLOBAL chart mode, use the URL's pointSetName to restore the exact set
    const selectedName = (isPointSetChartMode && requestedPointSetName && savedPointSets.some((s) => s.name === requestedPointSetName))
      ? requestedPointSetName
      : selectedPointSetName && savedPointSets.some((setItem) => setItem.name === selectedPointSetName)
        ? selectedPointSetName
        : savedPointSets[0].name;

    if (!selectedName) return;

    if (pointSetInitialized && selectedPointSetName === selectedName) return;

    const target = savedPointSets.find((setItem) => setItem.name === selectedName);
    if (!target) return;

    applyPointSetSelection(target, false);
  }, [activeTab, applyPointSetSelection, isPointSetChartMode, pointSetPoints.length, pointSetInitialized, requestedPointSetName, savedPointSets, selectedDevice?.serialNumber, selectedPointSetName]);

  useEffect(() => {
    if (activeTab !== 'chart') return;
    const requested = normalizeMonitorToken(requestedMonitorId || requestedTrendlogId);
    if (requested !== 'GLOBAL') return;
    if (!selectedDevice) return;
    if (pointSetPoints.length === 0) return;
    if (selectedPointSetPoints.length === 0) return; // wait for applyPointSetSelection to run first
    // When a specific set name is requested via URL, wait until that set is active
    if (requestedPointSetName && selectedPointSetName !== requestedPointSetName) return;

    const syntheticMonitor: TrendLogData = {
      serialNumber: selectedDevice.serialNumber,
      trendlogId: 'GLOBAL',
      trendlogIndex: 'GLOBAL',
      trendlogLabel: selectedPointSetName ? `Point Set: ${selectedPointSetName}` : 'Point Set Chart',
      status: 'ON',
      _uniqueIndex: 99999,
      panelId: selectedDevice.panelId,
    };

    const syntheticInputs: TrendLogInput[] = selectedPointSetPoints.map((point) => ({
      serialNumber: selectedDevice.serialNumber,
      panelId: selectedDevice.panelId || 1,
      trendlogId: 'GLOBAL',
      pointType: point.type,
      pointIndex: point.index,
      pointLabel: point.label,
    }));

    setSelectedMonitor(syntheticMonitor);
    setMonitorInputs(syntheticInputs);
  }, [
    activeTab,
    normalizeMonitorToken,
    requestedMonitorId,
    requestedTrendlogId,
    requestedPointSetName,
    selectedDevice,
    selectedPointSetName,
    pointSetPoints.length,
    selectedPointSetPoints,
  ]);

  // Display all 12 trendlog slots (matching T3000 desktop), merge actual data
  const displayTrendLogs = React.useMemo(() => {
    const totalSlots = 12;
    const serial = selectedDevice?.serialNumber || 0;
    const panel = selectedDevice?.panelId;

    // Build a map keyed by MON index (1-12). Display normalized to TLOG.
    const dataMap = new Map<number, TrendLogData>();
    for (const log of trendLogs) {
      const id = log.trendlogId || log.trendlogIndex || '';
      const match = id.match(/^MON(\d+)$/i);
      if (match) {
        const idx = parseInt(match[1], 10);
        dataMap.set(idx, { ...log, trendlogId: `TLOG${idx}`, trendlogIndex: `TLOG${idx}` });
      }
    }

    const slots: TrendLogData[] = [];
    for (let i = 1; i <= totalSlots; i++) {
      const existing = dataMap.get(i);
      if (existing) {
        slots.push({ ...existing, trendlogIndex: existing.trendlogIndex || `TLOG${i}` });
      } else {
        slots.push({
          serialNumber: serial,
          trendlogId: `TLOG${i}`,
          trendlogIndex: `TLOG${i}`,
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
                {/* <button
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
                </button> */}
                <Text size={200} weight="regular">{trendlogIndex || ''}</Text>
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
          {!isEmptyRow(item) && <Text size={200}>{item.trendlogLabel || ''}</Text>}
        </TableCellLayout>
      ),
    }),
    createTableColumn<TrendLogData>({
      columnId: 'intervalSeconds',
      renderHeaderCell: () => <span>Interval</span>,
      renderCell: (item) => {
        const sec = item.intervalSeconds;
        let display = '';
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
      columnId: 'dataSizeKb',
      renderHeaderCell: () => <span>Data Size (KB)</span>,
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && <Text size={200}>{item.dataSizeKb || '0'}</Text>}
        </TableCellLayout>
      ),
    }),
    createTableColumn<TrendLogData>({
      columnId: 'status',
      renderHeaderCell: () => <span>Status</span>,
      renderCell: (item) => {
        const isOn = (item.status || '').toUpperCase() === 'ON';
        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              <div
                className={styles.switchContainer}
                onClick={(e) => e.stopPropagation()}
              >
                <Switch
                  defaultChecked={isOn}
                  className={styles.switchScale}
                />
                <Text size={200}>{isOn ? 'ON' : 'OFF'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
      compare: (a, b) => (a.status || '').localeCompare(b.status || ''),
    }),
    // View column
    createTableColumn<TrendLogData>({
      columnId: 'actions',
      renderHeaderCell: () => <span>View</span>,
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (
            <button
              className={styles.viewArrowButton}
              onClick={async () => {
                await handleMonitorSelect(item);
                setActiveTab('chart', item);
              }}
              title="View trend chart"
            >
              <ArrowRightRegular fontSize={18} className={styles.viewArrowIcon} />
            </button>
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

                  {/* ── Device / sync context bar ── */}
                  <div className={styles.overviewContextBar}>
                    <div className={styles.overviewContextLeft}>
                      <span className={styles.overviewDeviceName}>
                        {selectedDevice?.nameShowOnTree || selectedDevice?.productName || 'No device selected'}
                      </span>
                      {selectedDevice && (
                        <span className={styles.overviewDeviceMeta}>
                          SN {selectedDevice.serialNumber} · Panel {selectedDevice.panelId || 'N/A'}
                        </span>
                      )}
                    </div>
                    {selectedDevice && (
                      <div className={styles.overviewContextRight}>
                        {(() => {
                          const rawTs = trendlogLastSyncedAt ?? devicePointSyncSummary.lastSyncedAt;
                          const diffH = rawTs ? Math.floor((Date.now() / 1000 - rawTs) / 3600) : null;
                          const dotCls = diffH == null ? styles.syncDotUnknown : diffH < 1 ? styles.syncDotGreen : diffH < 24 ? styles.syncDotYellow : styles.syncDotRed;
                          return <span className={`${styles.syncDot} ${dotCls}`} title={`Last synced: ${lastSyncedFmt || 'unknown'}`} />;
                        })()}
                        <span className={styles.overviewSyncLabel}>
                          {pointSummaryLoading ? 'Syncing…' : `Last synced ${lastSyncedAgo}`}
                        </span>
                        <span className={styles.overviewSyncSep}>·</span>
                        <span className={styles.overviewSyncSource}>{syncSourceLabel}</span>
                      </div>
                    )}
                  </div>

                  {/* ── 3-column stat cards ── */}
                  <div className={styles.overviewStatGrid}>

                    {/* Monitors */}
                    <div className={styles.overviewStatCard}>
                      <div className={styles.overviewStatHeader}>
                        <span className={styles.overviewStatLabel}>Configured Monitors</span>
                        <Tooltip content="Total monitors detected from database/device sync. ON/OFF shows runtime state split." relationship="description">
                          <button type="button" className={styles.metricInfoButton} aria-label="Configured Monitors info">
                            <InfoRegular className={styles.metricInfoIcon} />
                          </button>
                        </Tooltip>
                      </div>
                      <span className={styles.overviewStatValue}>{trendLogs.length}</span>
                      <div className={styles.overviewStatMeta}>
                        <span className={styles.overviewStatSlots}>{trendLogs.length}/12 slots</span>
                        <Badge color="success" appearance="tint" size="small">{activeMonitorCount} ON</Badge>
                        <Badge color="subtle" appearance="tint" size="small">{Math.max(trendLogs.length - activeMonitorCount, 0)} OFF</Badge>
                        {avgIntervalSeconds != null && (
                          <span className={styles.overviewStatSlots}>avg {formatSeconds(avgIntervalSeconds)}</span>
                        )}
                      </div>
                    </div>

                    {/* Sensor Inventory */}
                    <div className={styles.overviewStatCard}>
                      <div className={styles.overviewStatHeader}>
                        <span className={styles.overviewStatLabel}>Sensor Points</span>
                        <Tooltip content="Total input, output, and variable points synced from this device." relationship="description">
                          <button type="button" className={styles.metricInfoButton} aria-label="Sensor Points info">
                            <InfoRegular className={styles.metricInfoIcon} />
                          </button>
                        </Tooltip>
                      </div>
                      <span className={styles.overviewStatValue}>
                        {pointSummaryLoading ? '…' : devicePointSyncSummary.inputs + devicePointSyncSummary.outputs + devicePointSyncSummary.variables}
                      </span>
                      <div className={styles.overviewStatMeta}>
                        <button
                          type="button"
                          className={styles.overviewInventoryPillLink}
                          onClick={() => navigate(`/t3000/inputs?backTo=${encodeURIComponent(location.pathname + location.search)}`)}
                          title="Go to Inputs"
                        >
                          IN {pointSummaryLoading ? '…' : devicePointSyncSummary.inputs} <OpenRegular style={{ fontSize: 10 }} />
                        </button>
                        <button
                          type="button"
                          className={styles.overviewInventoryPillLink}
                          onClick={() => navigate(`/t3000/outputs?backTo=${encodeURIComponent(location.pathname + location.search)}`)}
                          title="Go to Outputs"
                        >
                          OUT {pointSummaryLoading ? '…' : devicePointSyncSummary.outputs} <OpenRegular style={{ fontSize: 10 }} />
                        </button>
                        <button
                          type="button"
                          className={styles.overviewInventoryPillLink}
                          onClick={() => navigate(`/t3000/variables?backTo=${encodeURIComponent(location.pathname + location.search)}`)}
                          title="Go to Variables"
                        >
                          VAR {pointSummaryLoading ? '…' : devicePointSyncSummary.variables} <OpenRegular style={{ fontSize: 10 }} />
                        </button>
                      </div>
                    </div>

                    {/* Sync Health */}
                    <div className={styles.overviewStatCard}>
                      <div className={styles.overviewStatHeader}>
                        <span className={styles.overviewStatLabel}>Sync Health</span>
                        <Tooltip content="Total trend values stored and time of last successful sync." relationship="description">
                          <button type="button" className={styles.metricInfoButton} aria-label="Sync Health info">
                            <InfoRegular className={styles.metricInfoIcon} />
                          </button>
                        </Tooltip>
                      </div>
                      <span className={styles.overviewStatValue}>
                        {pointSummaryLoading ? '…' : devicePointSyncSummary.trendlogDetailCount == null ? 'N/A' : devicePointSyncSummary.trendlogDetailCount.toLocaleString()}
                      </span>
                      <div className={styles.overviewStatMeta}>
                        <span className={styles.overviewStatSlots}>stored values</span>
                        {!pointSummaryLoading && lastSyncedFmt && (
                          <span className={styles.overviewStatTimestamp}>· {lastSyncedFmt}</span>
                        )}
                         {selectedDevice && (
                        <div className={styles.overviewStatActions}>
                          <button
                            type="button"
                            className={styles.overviewStatAction}
                            onClick={() => setVerifyDrawerOpen(true)}
                          >
                            Verify Data →
                          </button>
                          <button
                            type="button"
                            className={styles.overviewStatAction}
                            onClick={() => setActiveTab('backend')}
                          >
                            Detail →
                          </button>
                        </div>
                      )}
                      </div> 
                    </div> 
                  </div>

                  {/* ── Logging Coverage Health ── */}
                  {selectedDevice && (
                    <div className={styles.overviewCoverageCard}>
                      <div className={styles.overviewDetailHeader}>
                        <span className={styles.overviewDetailTitle}>Logging Coverage Health</span>
                        <div className={styles.overviewCoverageHeaderRight}>
                          {!pointSummaryLoading && (
                            <span className={styles.overviewCoverageSub}>
                              Legend: Age &lt;5m = Fresh, 5–15m = Warning, &gt;15m = Stale
                            </span>
                          )}
                        </div>
                      </div>
                      {pointSummaryLoading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0' }}>
                          <Spinner size="tiny" />
                          <Text size={200}>Loading…</Text>
                        </div>
                      )}
                      {!pointSummaryLoading && (
                        <div className={styles.coverageHealthTableWrap}>
                          <div className={styles.coverageHealthTableHeader}>
                            <span>Type</span>
                            <span>Coverage</span>
                            <span>Tracked / Total</span>
                            <span>Records</span>
                            <span>Last Sync Time</span>
                            <span>Age</span>
                          </div>
                          {coverageRows.map((row) => {
                            const total = Math.max(0, row.total || 0);
                            const tracked = Math.max(0, Math.min(total, row.tracked || 0));
                            const pct = total > 0 ? Math.round((tracked / total) * 100) : 0;
                            const ageStatus = getCoverageAgeStatus(row.lastSyncAt);

                            return (
                              <div key={row.key} className={styles.coverageHealthTableRow}>
                                <span className={styles.coverageHealthType}>{row.label}</span>
                                <div className={styles.coverageHealthBarCell}>
                                  <div className={styles.coverageHealthBarTrack}>
                                    <div className={styles.coverageHealthBarFill} style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className={styles.coverageHealthPercent}>{pct}%</span>
                                </div>
                                <span className={styles.coverageHealthMetric}>{tracked} / {total}</span>
                                <span className={styles.coverageHealthMetric}>{(row.records || 0).toLocaleString()}</span>
                                <span className={styles.coverageHealthTime}>{row.lastSyncFmt || 'N/A'}</span>
                                <span className={`${styles.coverageHealthAge} ${ageStatus === 'fresh' ? styles.coverageHealthAgeFresh : ageStatus === 'warning' ? styles.coverageHealthAgeWarning : styles.coverageHealthAgeStale}`}>
                                  {formatTimeAgo(row.lastSyncAt)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── 2-column bottom row ── */}
                  <div className={styles.overviewBottomRow}>

                    {/* Monitor Snapshot */}
                    <div className={styles.overviewDetailCard}>
                      <div className={styles.overviewDetailHeader}>
                        <span className={styles.overviewDetailTitle}>Current Monitor Snapshot</span>
                        {selectedMonitor && (
                          <Badge appearance="outline" color="informative">
                            {selectedMonitor.trendlogId || selectedMonitor.trendlogIndex} · {selectedMonitor.trendlogLabel || 'No label'}
                          </Badge>
                        )}
                      </div>
                      {loadingInputs && selectedMonitor ? (
                        <div className={styles.snapshotLoadingState}>
                          <Spinner size="tiny" />
                          <Text size={200}>Loading…</Text>
                        </div>
                      ) : selectedMonitor ? (
                        <div className={styles.overviewSnapshotGrid}>
                          <div className={styles.overviewSnapshotTile}>
                            <span className={styles.overviewSnapshotKey}>Status</span>
                            <span className={`${styles.overviewStatusChip} ${(selectedMonitor.status || '').toUpperCase() === 'ON' ? styles.overviewStatusOn : styles.overviewStatusOff}`}>
                              {(selectedMonitor.status || 'OFF').toUpperCase()}
                            </span>
                          </div>
                          <div className={styles.overviewSnapshotTile}>
                            <span className={styles.overviewSnapshotKey}>Mode</span>
                            <span className={styles.overviewSnapshotVal}>
                              {((selectedMonitor.autoManual || '').toUpperCase() === 'AUTO' || selectedMonitor.autoManual === '1') ? 'Auto' : 'Manual'}
                            </span>
                          </div>
                          <div className={styles.overviewSnapshotTile}>
                            <span className={styles.overviewSnapshotKey}>Interval</span>
                            <span className={styles.overviewSnapshotVal}>{formatSeconds(selectedMonitor.intervalSeconds ?? null)}</span>
                          </div>
                          <div className={styles.overviewSnapshotTile}>
                            <span className={styles.overviewSnapshotKey}>Buffer</span>
                            <span className={styles.overviewSnapshotVal}>{selectedMonitor.bufferSize ?? 'N/A'}</span>
                          </div>
                          <div className={styles.overviewSnapshotTile}>
                            <span className={styles.overviewSnapshotKey}>Inputs</span>
                            <span className={styles.overviewSnapshotVal}>{monitorInputs.length}</span>
                          </div>
                          <div className={styles.overviewSnapshotTile}>
                            <span className={styles.overviewSnapshotKey}>Slot #</span>
                            <span className={styles.overviewSnapshotVal}>{selectedMonitor.trendlogIndex ?? 'N/A'}</span>
                          </div>
                          <div className={styles.overviewSnapshotTile}>
                            <span className={styles.overviewSnapshotKey}>Label</span>
                            <span className={styles.overviewSnapshotVal}>{selectedMonitor.trendlogLabel?.trim() || <em style={{ color: '#8a8886', fontStyle: 'normal' }}>No label</em>}</span>
                          </div>
                          <div className={styles.overviewSnapshotTile}>
                            <span className={styles.overviewSnapshotKey}>Mon ID</span>
                            <span className={styles.overviewSnapshotVal}>{selectedMonitor.trendlogId || 'N/A'}</span>
                          </div>
                          <div className={styles.overviewSnapshotTile}>
                            <span className={styles.overviewSnapshotKey}>Data size</span>
                            <span className={styles.overviewSnapshotVal}>{selectedMonitor.dataSizeKb != null ? `${selectedMonitor.dataSizeKb} KB` : 'N/A'}</span>
                          </div>
                        </div>
                      ) : (
                        <Text size={200} style={{ color: '#8a8886' }}>Select a monitor in the Default tab to see its snapshot here.</Text>
                      )}
                    </div>

                    {/* Device Stats */}
                    <div className={styles.overviewDetailCard}>
                      <div className={styles.overviewDetailHeader}>
                        <span className={styles.overviewDetailTitle}>Device Stats</span>
                      </div>
                      <div className={styles.overviewSnapshotGrid}>
                        <div className={styles.overviewSnapshotTile}>
                          <span className={styles.overviewSnapshotKey}>Active monitors</span>
                          <span className={styles.overviewSnapshotVal}>{activeMonitorCount}</span>
                        </div>
                        <div className={styles.overviewSnapshotTile}>
                          <span className={styles.overviewSnapshotKey}>Avg interval</span>
                          <span className={styles.overviewSnapshotVal}>{formatSeconds(avgIntervalSeconds)}</span>
                        </div>
                        <div className={styles.overviewSnapshotTile}>
                          <span className={styles.overviewSnapshotKey}>Labeled monitors</span>
                          <span className={styles.overviewSnapshotVal}>{monitorsWithLabel} / {trendLogs.length}</span>
                        </div>
                        <div className={styles.overviewSnapshotTile}>
                          <span className={styles.overviewSnapshotKey}>Auto mode</span>
                          <span className={styles.overviewSnapshotVal}>{autoModeCount}</span>
                        </div>
                        <div className={styles.overviewSnapshotTile}>
                          <span className={styles.overviewSnapshotKey}>Last synced</span>
                          <span className={styles.overviewSnapshotVal}>{pointSummaryLoading ? '…' : lastSyncedAgo}</span>
                        </div>
                        <div className={styles.overviewSnapshotTile}>
                          <span className={styles.overviewSnapshotKey}>Sync source</span>
                          <span className={styles.overviewSnapshotVal}>{pointSummaryLoading ? '…' : syncSourceLabel}</span>
                        </div>
                        <div className={styles.overviewSnapshotTile}>
                          <span className={styles.overviewSnapshotKey}>Slots free</span>
                          <span className={styles.overviewSnapshotVal}>{Math.max(12 - trendLogs.length, 0)} / 12</span>
                        </div>
                        <div className={styles.overviewSnapshotTile}>
                          <span className={styles.overviewSnapshotKey}>Sync time</span>
                          <span className={`${styles.overviewSnapshotVal} ${styles.overviewSnapshotValSm}`}>{pointSummaryLoading ? '…' : (lastSyncedFmt || 'N/A')}</span>
                        </div>
                        <div className={styles.overviewSnapshotTile}>
                          <span className={styles.overviewSnapshotKey}>Mon. inputs</span>
                          <span className={styles.overviewSnapshotVal}>{selectedMonitor ? monitorInputs.length : '—'}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {activeTab === 'haystack-tags' && (
                <div className={styles.embeddedPolicyWrap}>
                  <TrendPolicyPage embedded />
                </div>
              )}

              {/* ── Backend tab ── */}
              {activeTab === 'backend' && (
                <div className={styles.backendTabWrap}>
                  {selectedDevice && (
                    <div className={styles.backendConfigCard}>
                      <div className={styles.backendConfigField}>
                        <span className={styles.backendConfigLabel}>Device:</span>
                        <span className={styles.backendConfigValue}>
                          {selectedDevice.nameShowOnTree || selectedDevice.productName} — SN {selectedDevice.serialNumber}
                        </span>
                      </div>
                      <div className={styles.backendConfigField}>
                        <span className={styles.backendConfigLabel}>Stored Values:</span>
                        <span className={styles.backendConfigValue}>
                          {pointSummaryLoading
                            ? '…'
                            : devicePointSyncSummary.trendlogDetailCount == null
                              ? 'N/A'
                              : devicePointSyncSummary.trendlogDetailCount.toLocaleString()}
                        </span>
                      </div>
                      <div className={styles.backendConfigField}>
                        <span className={styles.backendConfigLabel}>Last Sync:</span>
                        <span className={styles.backendConfigValue}>{lastSyncedFmt || 'N/A'}</span>
                      </div>
                      <div className={styles.backendConfigField}>
                        <span className={styles.backendConfigLabel}>Method:</span>
                        <span className={styles.backendConfigValue}>{syncSourceLabel}</span>
                      </div>
                      <div className={styles.backendConfigField}>
                        <span className={styles.backendConfigLabel}>Tracked Points:</span>
                        <span className={styles.backendConfigValue}>
                          {devicePointSyncSummary.trackedInputs} IN · {devicePointSyncSummary.trackedOutputs} OUT · {devicePointSyncSummary.trackedVariables} VAR
                        </span>
                      </div>
                    </div>
                  )}
                  <div className={styles.backendFlowSection}>
                    <FlowLogTab forceTypeFilter="TRENDLOG_BACKEND" />
                  </div>
                </div>
              )}

              {activeTab === 'chart' && (
                <div className={styles.chartTabWrap}>
                  {!selectedDevice ? (
                    <div className={styles.placeholderPanel}>
                      <Text size={400} weight="semibold">Chart Workspace</Text>
                      <Text size={300}>
                        No device selected. Select a device from the device tree.
                      </Text>
                    </div>
                  ) : !selectedMonitor && !requestedMonitorId ? (
                    <div className={styles.placeholderPanel}>
                      <Text size={400} weight="semibold">Chart Workspace</Text>
                      <Text size={300}>
                        Select a monitor in the Default tab first, then return here for in-page analysis.
                      </Text>
                      <Button appearance="primary" onClick={() => setActiveTab('default')}>
                        Go To Default
                      </Button>
                    </div>
                  ) : !selectedMonitor ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px' }}>
                      <Spinner size="extra-small" />
                      <Text size={200}>Loading chart...</Text>
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
                          onTimeBaseChange={(tb) => { embeddedChartTimeBaseRef.current = tb; }}
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
                          onBack={handleChartBack}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Info banner (backend sampling notice) ── */}
              {activeTab === 'default' /*&& !infoBannerDismissed*/ && selectedDevice && (
                <div className={styles.infoBanner}>
                  <InfoRegular className={styles.infoBannerIcon} />
                  <span className={styles.infoBannerText}>
                    <strong>Backend Sampling is active</strong> — sensor values are collected automatically by the background sync service
                    {devicePointSyncSummary.lastSyncMethod === 'FFI_BACKEND' && lastSyncedAgo && (
                      <> · {lastSyncedAgo}</>
                    )}
                  </span>
                  <button
                    type="button"
                    className={styles.infoBannerAction}
                    onClick={() => setActiveTab('backend')}
                  >
                    View Backend →
                  </button>
                  <button
                    type="button"
                    className={styles.infoBannerDismiss}
                    aria-label="Dismiss"
                    onClick={() => {
                      /* Comment out for now since this banner is meant to be persistent until user clicks the "View Backend" button. If we want to allow dismissal without navigating, we can uncomment this code.
                      setInfoBannerDismissed(true);
                      sessionStorage.setItem('tl-infobanner-v1', '1');
                      */
                    }}
                  >
                    ×
                  </button>
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

              {activeTab === 'point-sets' && selectedDevice && (
              <div className={styles.globalInfoBar}>
                <div className={styles.globalInfoBarLeft}>
                  <InfoRegular className={styles.globalInfoBarIcon} />
                  <div className={styles.globalInfoBarTextBlock}>
                    <Text size={200} className={styles.globalInfoBarText}>
                      Select a saved point set from the left list, then use <strong>Add Points</strong> in Current Set Points to edit it and click <strong>Save Set</strong> to persist changes.
                    </Text>
                    <div className={styles.globalInfoBarInlineRow}>
                      <Text size={200} className={styles.globalInfoBarText}>Open</Text>
                      <button
                        className={styles.infoBarLinkButton}
                        onClick={() => setActiveTab('haystack-tags')}
                        title="Open the dedicated Haystack page to manage tags"
                      >
                        Haystack Tags
                      </button>
                      <Text size={200} className={styles.globalInfoBarText}>to manage semantic tags. Rebuild Tags is available inside that page.</Text>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* ========================================
                  DOCKING BODY - Main Content (Dual Grid Layout)
                  Matches: msportalfx-docking-body
                  ======================================== */}
              {activeTab === 'default' && (
              <div className={styles.dockingBody}>

                {/* Loading State — only on first load */}
                {loading && !hasEverLoadedData.current && trendLogs.length === 0 && (
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

                {/* Dual Grid — show once device selected & data ever loaded */}
                {selectedDevice && (hasEverLoadedData.current || !loading) && (
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

              {activeTab === 'point-sets' && (
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
                              <span className={styles.globalSetSortLabel}>Sort by:</span>
                              <button
                                type="button"
                                className={`${styles.globalSetSortTextButton} ${pointSetSort === 'recent' ? styles.globalSetSortTextButtonActive : ''}`}
                                onClick={() => setPointSetSort('recent')}
                                title="Sort by most recently updated"
                              >
                                Recently Updated
                              </button>
                              <span className={styles.globalSetSortDivider}>|</span>
                              <button
                                type="button"
                                className={`${styles.globalSetSortTextButton} ${pointSetSort === 'name' ? styles.globalSetSortTextButtonActive : ''}`}
                                onClick={() => setPointSetSort('name')}
                                title="Sort by name (A to Z)"
                              >
                                Name (A-Z)
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className={styles.globalSetSearchRow}>
                          <div className={styles.globalSetSearchInputWrap}>
                            <input
                              className={`${styles.tagInput} ${styles.globalSetSearchInput}`}
                              type="text"
                              placeholder="Search saved sets"
                              value={pointSetSearch}
                              onChange={(e) => setPointSetSearch(e.target.value)}
                              aria-label="Search saved point sets"
                            />
                            {pointSetSearch.trim() ? (
                              <button
                                type="button"
                                className={styles.globalSetSearchClearButton}
                                onClick={() => setPointSetSearch('')}
                                aria-label="Clear set search"
                                title="Clear"
                              >
                                <DismissRegular fontSize={14} />
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className={styles.globalSetList}>
                          {sortedSavedPointSets.length === 0 ? (
                            <div className={`${styles.centerPaddingMuted} ${styles.globalSetEmptyState}`}>
                              <Text size={200}>No saved sets yet. Build one on the right and click Save Set.</Text>
                            </div>
                          ) : filteredSavedPointSets.length === 0 ? (
                            <div className={styles.centerPaddingMuted}>
                              <Text size={200}>No sets matched your search.</Text>
                            </div>
                          ) : (
                            filteredSavedPointSets.map((setItem) => {
                              const isRenaming = inlineRenamePointSetName === setItem.name;
                              return (
                                <div
                                  key={setItem.name}
                                  className={`${styles.globalSetListItem} ${selectedPointSetName === setItem.name ? styles.globalSetListItemActive : ''}`}
                                  onClick={() => {
                                    if (isRenaming) return;
                                    void loadPointSetByName(setItem.name);
                                  }}
                                  onKeyDown={(e) => {
                                    if (isRenaming) return;
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      void loadPointSetByName(setItem.name);
                                    }
                                  }}
                                  role="button"
                                  tabIndex={0}
                                >
                                  <div className={styles.globalSetItemHeaderRow}>
                                    {isRenaming ? (
                                      <input
                                        type="text"
                                        className={styles.globalSetRenameInput}
                                        value={inlineRenameValue}
                                        onChange={(e) => setInlineRenameValue(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            renamePointSetByName(setItem.name, inlineRenameValue);
                                          }
                                          if (e.key === 'Escape') {
                                            e.preventDefault();
                                            cancelInlineRename();
                                          }
                                        }}
                                        autoFocus
                                        aria-label={`Rename ${setItem.name}`}
                                      />
                                    ) : (
                                      <button
                                        type="button"
                                        className={styles.globalSetItemMainButton}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void loadPointSetByName(setItem.name);
                                        }}
                                        title={`Load ${setItem.name}`}
                                      >
                                        <Text size={200} weight="semibold" className={styles.globalSetNameText}>{setItem.name}</Text>
                                      </button>
                                    )}
                                  </div>
                                  <div className={styles.globalSetMetaRow}>
                                    <span className={styles.globalSetMetaBadge}>{setItem.selectedKeys.length} pts</span>
                                    <Text size={100} className={styles.globalSetMetaText}>
                                      {setItem.updatedAt ? `Updated ${new Date(setItem.updatedAt).toLocaleString()}` : 'Updated time unavailable'}
                                    </Text>
                                  </div>
                                  <div className={styles.globalSetItemActions}>
                                    {isRenaming ? (
                                      <>
                                        <button
                                          type="button"
                                          className={styles.globalSetItemActionLink}
                                          onClick={() => renamePointSetByName(setItem.name, inlineRenameValue)}
                                          title={`Save new name for ${setItem.name}`}
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          className={styles.globalSetItemActionLink}
                                          onClick={cancelInlineRename}
                                          title="Cancel rename"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <Tooltip content={`Open chart for set "${setItem.name}"`} relationship="label">
                                          <button
                                            type="button"
                                            className={styles.globalSetItemActionLink}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openPointSetChartByName(setItem.name);
                                            }}
                                            title={`Open chart for ${setItem.name}`}
                                          >
                                            Open Chart
                                          </button>
                                        </Tooltip>
                                        <button
                                          type="button"
                                          className={styles.globalSetItemActionLink}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startInlineRename(setItem.name);
                                          }}
                                          title={`Rename ${setItem.name}`}
                                        >
                                          Rename
                                        </button>
                                        <button
                                          type="button"
                                          className={`${styles.globalSetItemActionLink} ${styles.globalSetItemActionDelete}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removePointSetByName(setItem.name);
                                          }}
                                          title={`Delete ${setItem.name}`}
                                        >
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                        <div className={styles.globalSetFooterActions}>
                          <Text size={100} className={styles.globalSetFooterHint}>Create and manage saved sets</Text>
                          <button
                            type="button"
                            className={`${styles.smallActionButton} ${styles.smallPrimaryActionButton}`}
                            onClick={createNewPointSet}
                          >
                            New Set
                          </button>
                        </div>
                      </div>

                      <div className={styles.globalCurrentSetPanel}>
                        <div className={styles.globalPanelHeader}>
                          <div className={styles.globalCurrentSetHeaderTitle}>
                            <Text size={300} weight="semibold">Current Set Points</Text>
                            <div className={styles.globalCurrentSetHeaderMeta}>
                              <Text size={200}>{selectedPointSetName || pointSetName || 'Unsaved Set'}</Text>
                              {isCurrentSetDirty && (
                                <span className={styles.unsavedBadge}>Unsaved changes</span>
                              )}
                            </div>
                          </div>
                          <div className={styles.globalPanelHeaderActions}>
                            <Text size={200}>{selectedPointSetPoints.length} selected</Text>
                            <button
                              className={styles.smallActionButton}
                              onClick={saveCurrentPointSet}
                              title="Save current set"
                            >
                              Save Set
                            </button>
                            <button
                              className={styles.smallActionButton}
                              onClick={() => {
                                setPointSetReloadRevision((prev) => prev + 1);
                                setIsPointPickerOpen(true);
                              }}
                              title="Open point picker drawer"
                            >
                              Add Points
                            </button>
                            <button
                              className={styles.smallActionButton}
                              onClick={clearPointSetSelection}
                              disabled={pointSetSelectedKeys.size === 0}
                              title="Clear all points from current set"
                            >
                              Clear Set
                            </button>
                          </div>
                        </div>
                        {pointSetActionMessage && (
                          <div className={styles.globalSetInlineMessageBar}>
                            <Text size={100} className={styles.globalSetActionMessage}>{pointSetActionMessage}</Text>
                          </div>
                        )}
                        <div className={styles.globalPanelBody}>
                          {selectedPointSetPoints.length === 0 ? (
                            <div className={styles.centerPaddingMuted}>
                              <Text size={200}>No points in current set. Click Add Points to start building this set.</Text>
                            </div>
                          ) : (
                            selectedPointSetPoints.map((point, index) => (
                              <div
                                key={point.key}
                                className={styles.watchlistRow}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (draggingPointKey) {
                                    movePointWithinPointSet(draggingPointKey, point.key);
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
                                <div className={`${styles.watchlistLabelBlock} ${draggingPointKey === point.key ? styles.draggingPointLabel : ''}`}>
                                  <Text size={200} weight="semibold" className={styles.globalPointLabel}>{point.label}</Text>
                                  {point.fullLabel && (
                                    <span className={styles.pointFullLabel}>{point.fullLabel}</span>
                                  )}
                                </div>
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
                                    disabled={index === selectedPointSetPoints.length - 1}
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
                            value={pointPickerSearch}
                            onChange={(e) => setPointPickerSearch(e.target.value)}
                            spellCheck="false"
                            role="searchbox"
                            aria-label="Search points in picker"
                          />
                        </div>
                        <Text size={200}>{pointSetPointsLoading ? 'Loading...' : `${filteredPointSetPoints.length} points`}</Text>
                      </div>

                      <div className={styles.globalTagBar}>
                        <button
                          className={`${styles.tagChip} ${pointSetTagFilter === 'all' ? styles.tagChipActive : ''}`}
                          onClick={() => setPointSetTagFilter('all')}
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
                        {availablePointTags.map((tag) => (
                          <button
                            key={tag}
                            className={`${styles.tagChip} ${pointSetTagFilter === tag ? styles.tagChipActive : ''}`}
                            onClick={() => setPointSetTagFilter(tag)}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>

                      <div className={styles.pointPickerBody}>
                        {pointSetPointsLoading ? (
                          <div className={styles.centerPadding}>
                            <Spinner size="extra-small" />
                            <Text size={200}>Loading point library...</Text>
                          </div>
                        ) : filteredPointSetPoints.length === 0 ? (
                          <div className={styles.centerPaddingMuted}>
                            <Text size={200}>No points matched your filter</Text>
                          </div>
                        ) : (
                          filteredPointSetPoints.map((point) => {
                            const tags = pointSetPointTags[point.key] || [];
                            const selected = pointSetSelectedKeys.has(point.key);
                            return (
                              <button
                                key={point.key}
                                type="button"
                                className={`${styles.globalPointRow} ${selected ? styles.globalPointRowSelected : ''}`}
                                onClick={() => togglePointSetSelection(point.key)}
                              >
                                <div className={styles.globalPointMain}>
                                  <Badge appearance="outline">{point.type}</Badge>
                                  <Text size={200}>{point.index}</Text>
                                  <div className={styles.pointPickerLabelBlock}>
                                    <Text size={200} className={styles.pointPickerLabel} title={point.fullLabel || point.label}>{point.label}</Text>
                                    {point.fullLabel && (
                                      <span className={styles.pointFullLabel}>{point.fullLabel}</span>
                                    )}
                                  </div>
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
                          onClick={selectAllVisiblePointSetPoints}
                          disabled={filteredPointSetPoints.length === 0}
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

      <Dialog
        open={confirmDialog.open}
        onOpenChange={(_, data) => {
          if (!data.open) {
            settleConfirmDialog(false);
          }
        }}
      >
        <DialogSurface
          className={styles.compactDialogSurface}
          style={{ width: 'min(380px, calc(100vw - 28px))', maxWidth: '380px' }}
        >
          <DialogBody>
            <DialogTitle
              className={styles.compactDialogTitle}
              style={{ fontSize: '16px', lineHeight: 1.25, fontWeight: 600 }}
            >
              {confirmDialog.title}
            </DialogTitle>
            <DialogContent>
              <Text className={styles.compactDialogContentText}>{confirmDialog.content}</Text>
            </DialogContent>
            <DialogActions className={styles.compactDialogActions}>
              <Button
                className={styles.compactDialogButton}
                size="small"
                appearance="secondary"
                style={{ fontSize: '12px', fontWeight: 400, minHeight: '28px', height: '28px', minWidth: 'max-content', whiteSpace: 'nowrap', padding: '0 12px' }}
                onClick={() => settleConfirmDialog(false)}
              >
                {confirmDialog.cancelText}
              </Button>
              <Button
                className={styles.compactDialogButton}
                size="small"
                appearance="primary"
                style={{ fontSize: '12px', fontWeight: 400, minHeight: '28px', height: '28px', minWidth: 'max-content', whiteSpace: 'nowrap', padding: '0 12px' }}
                onClick={() => settleConfirmDialog(true)}
              >
                {confirmDialog.confirmText}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={promptDialog.open}
        onOpenChange={(_, data) => {
          if (!data.open) {
            settlePromptDialog(null);
          }
        }}
      >
        <DialogSurface
          className={styles.compactDialogSurface}
          style={{ width: 'min(380px, calc(100vw - 28px))', maxWidth: '380px' }}
        >
          <DialogBody>
            <DialogTitle
              className={styles.compactDialogTitle}
              style={{ fontSize: '16px', lineHeight: 1.25, fontWeight: 600 }}
            >
              {promptDialog.title}
            </DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Text className={styles.compactDialogContentText}>{promptDialog.content}</Text>
                <Input
                  value={promptInputValue}
                  onChange={(_, data) => setPromptInputValue(data.value)}
                  placeholder={promptDialog.placeholder}
                  aria-label={promptDialog.placeholder}
                />
              </div>
            </DialogContent>
            <DialogActions className={styles.compactDialogActions}>
              <Button
                className={styles.compactDialogButton}
                size="small"
                appearance="secondary"
                style={{ fontSize: '12px', fontWeight: 400, minHeight: '28px', height: '28px', minWidth: '80px' }}
                onClick={() => settlePromptDialog(null)}
              >
                {promptDialog.cancelText}
              </Button>
              <Button
                className={styles.compactDialogButton}
                size="small"
                appearance="primary"
                style={{ fontSize: '12px', fontWeight: 400, minHeight: '28px', height: '28px', minWidth: '80px' }}
                onClick={() => settlePromptDialog(promptInputValue)}
                disabled={!promptInputValue.trim()}
              >
                {promptDialog.confirmText}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* ── Verify Data Drawer ── */}
      {verifyDrawerOpen && selectedDevice && (
        <TrendlogVerifyDrawer
          isOpen={verifyDrawerOpen}
          onClose={() => setVerifyDrawerOpen(false)}
          serialNumber={selectedDevice.serialNumber}
          panelId={(selectedDevice as any).panelId || 1}
        />
      )}

    </div>
  );
};
