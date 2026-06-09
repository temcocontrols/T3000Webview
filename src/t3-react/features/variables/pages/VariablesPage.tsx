/**
 * Variables Page - Azure Portal Complete Sample
 *
 * Complete Azure Portal blade layout matching Inputs/Outputs pattern
 * Variables are internal system variables used for calculations and logic
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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useResponsive } from '@t3-shared/core/hooks/useResponsive';
import { VariablesPageMobile } from '@t3-mobile/features/variables/pages/VariablesPageMobile';
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
  Switch,
  Tooltip,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  SearchRegular,
  ErrorCircleRegular,
  SaveRegular,
  InfoRegular
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '@t3-react/features/devices/store/deviceTreeStore';
import { RangeSelectionDrawer } from '../components/RangeSelectionDrawer';
import { getRangeLabel, getUnitSymbol } from '../data/rangeData';
import { API_BASE_URL } from '@t3-react/config/constants';
import { PanelDataRefreshService } from '@t3-react/shared/services/panelDataRefreshService';
import { useStatusBarStore } from '@t3-react/store/statusBarStore';
import { SyncStatusBar } from '@t3-react/shared/components/SyncStatusBar';
import { PageSyncStatus } from '@t3-react/shared/components/PageSyncStatus';
import styles from './VariablesPage.module.css';
import { useRegisterCsvHandlers } from '@t3-react/shared/context/CsvOperationsContext';
import { exportToCsv, parseCsvFile, mapCsvToObjects } from '@t3-react/shared/utils/csvUtils';
import { TagsColumnCell } from '../../inputs/components/TagsColumnCell';

// Types based on Rust entity (variable_points.rs)
interface VariablePoint {
  serialNumber: number;
  variableId?: string;
  variableIndex?: string;
  panel?: string;
  fullLabel?: string;
  autoManual?: string;
  fValue?: string;
  units?: string;
  rangeField?: string;
  calibration?: string;
  sign?: string;
  calibrationH?: number | string;
  calibrationL?: number | string;
  calibrationSign?: string;
  control?: string;
  filterField?: string;
  status?: string;
  digitalAnalog?: string;
  label?: string;
  typeField?: string;
}

const VariablesPageDesktop: React.FC = () => {
  const { selectedDevice, treeData, selectDevice, getNextDevice, getFilteredDevices } = useDeviceTreeStore();
  const setMessage = useStatusBarStore((state) => state.setMessage);

  const [variables, setVariables] = useState<VariablePoint[]>([]);
  const [pvariables, setPvariables] = useState<VariablePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPvars, setLoadingPvars] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
  const [autoRefreshed, setAutoRefreshed] = useState(false);
  const [dbChecked, setDbChecked] = useState(false);
  const deviceRefreshedRef = useRef<number | null>(null);
  const hasEverLoadedData = useRef(false);

  // Auto-scroll feature state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingNextDevice, setIsLoadingNextDevice] = useState(false);
  const isAtBottomRef = useRef(false); // Track if user is already at bottom

  // Auto-select first device on page load - DISABLED
  // TreePanel's loadDevicesWithSync already handles auto-selection
  // This prevents conflicts where both components try to select different devices
  /*
  useEffect(() => {
    if (!selectedDevice && treeData.length > 0) {
      // Get the first device from filtered devices list (respects current filters)
      const filteredDevices = getFilteredDevices();
      console.log('[VariablesPage] Auto-select check:', {
        hasSelectedDevice: !!selectedDevice,
        treeDataLength: treeData.length,
        filteredDevicesCount: filteredDevices.length,
        filteredDevicesList: filteredDevices.map(d => `${d.nameShowOnTree} (SN: ${d.serialNumber})`),
      });

      if (filteredDevices.length > 0) {
        const firstDevice = filteredDevices[0];
        console.log(`[VariablesPage] Auto-selecting first device: ${firstDevice.nameShowOnTree} (SN: ${firstDevice.serialNumber})`);
        selectDevice(firstDevice);
      }
    }
  }, [selectedDevice, treeData, selectDevice, getFilteredDevices]);
  */

  // Fetch variables for selected device
  const fetchingRef = useRef(false);

  const fetchVariables = useCallback(async () => {
    if (!selectedDevice) {
      setVariables([]);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/variable-points`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch variables: ${response.statusText}`);
      }

      const data = await response.json();
      const fetchedVariables = data.variable_points || [];
      setVariables(fetchedVariables);

      // Auto-refresh decision: if DB is empty, trigger FFI right here
      if (fetchedVariables.length === 0 && !autoRefreshed) {
        // Check pvariables too (they load in parallel)
        // We'll defer to the auto-refresh effect which checks both
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load variables';
      setError(errorMessage);
      console.error('Error fetching variables:', err);
    } finally {
      setLoading(false);
      setDbChecked(true);
      fetchingRef.current = false;
      if (selectedDevice) {
        hasEverLoadedData.current = true;
      }
    }
  }, [selectedDevice, autoRefreshed]);

  const fetchVariablesRef = useRef(fetchVariables);
  fetchVariablesRef.current = fetchVariables;

  useEffect(() => {
    fetchVariablesRef.current();
  }, [selectedDevice?.serialNumber]);

  // ── PVARS: Program Variables via Action 19 (mock until backend is ready) ──
  const generateMockPvars = useCallback((sn: number, count: number): VariablePoint[] => {
    const mockLabels = ['RunHours', 'StartCount', 'CycleTime', 'LastFault', 'RuntimeAcc', 'SetpointAdj', 'PID_Kp', 'PID_Ki', 'PID_Kd', 'Deadband', 'Hysteresis', 'MinOnTime', 'MinOffTime', 'Interstage', 'CompStaging', 'DefrostInterval'];
    return Array.from({ length: Math.min(count, mockLabels.length) }, (_, i) => ({
      serialNumber: sn,
      variableId: `PVAR${i + 1}`,
      variableIndex: `${80 + i}`,        // offset to avoid collision with VAR indexes
      panel: '1',
      fullLabel: mockLabels[i] || `PVAR_${i + 1}`,
      label: mockLabels[i] || `PV${i + 1}`,
      autoManual: '0',
      fValue: `${(Math.random() * 1000).toFixed(0)}`,
      units: '',
      rangeField: '0',
      calibration: '',
      sign: '',
      calibrationH: 0,
      calibrationL: 0,
      calibrationSign: '',
      control: '0',
      filterField: '0',
      status: '',
      digitalAnalog: '0',
      typeField: 'PVAR',
    }));
  }, []);

  const fetchPvariables = useCallback(async () => {
    if (!selectedDevice) {
      setPvariables([]);
      return;
    }

    setLoadingPvars(true);

    try {
      try {
        // Try Action 19 via FFI
        const response = await fetch(`${API_BASE_URL}/api/t3000/ffi/call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 19,
            panelId: selectedDevice.panelId || 1,
            serialNumber: selectedDevice.serialNumber,
            entryType: 6,   // BAC_PRG
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.program_variables?.length) {
            setPvariables(data.program_variables);
            console.log('[VariablesPage] PVARs fetched via Action 19:', data.program_variables.length);
            return;
          }
        }
        // Fall through to mock if empty or failed
        console.log('[VariablesPage] Action 19 returned no data, using mock PVARs');
      } catch (_err) {
        console.log('[VariablesPage] Action 19 not available, using mock PVARs:', _err);
      }

      // Mock fallback
      setPvariables(generateMockPvars(selectedDevice.serialNumber, 8));
    } finally {
      setLoadingPvars(false);
      if (selectedDevice) {
        hasEverLoadedData.current = true;
      }
    }
  }, [selectedDevice, generateMockPvars]);

  // Fetch PVARs when device changes
  useEffect(() => {
    fetchPvariables();
  }, [fetchPvariables]);

  // Reset auto-refresh state when device changes (don't clear variables to avoid visual flash)
  useEffect(() => {
    setAutoRefreshed(false);
    setDbChecked(false);
    hasEverLoadedData.current = false;
  }, [selectedDevice?.serialNumber]);

  // Auto-refresh once per device — matches InputsPage pattern exactly
  useEffect(() => {
    if (!dbChecked || loading || loadingPvars || !selectedDevice || autoRefreshed) return;
    if (deviceRefreshedRef.current === selectedDevice.serialNumber) return;

    const checkAndRefresh = async () => {
      deviceRefreshedRef.current = selectedDevice.serialNumber;

      if (variables.length > 0 || pvariables.length > 0) {
        console.log('[VariablesPage] Data already present, skipping auto-refresh');
        setAutoRefreshed(true);
        return;
      }

      console.log('[VariablesPage] No data at all, auto-refreshing from device...');
      setLoading(true);

      try {
        const result = await PanelDataRefreshService.refreshFromDevice({
          serialNumber: selectedDevice.serialNumber,
          type: 'variable',
          onLoadingChange: (l) => { if (l) setMessage(`Loading variables from ${selectedDevice.nameShowOnTree} (Action 17)...`, 'info'); }
        });
        console.log('[VariablesPage] Auto-refresh result:', result);
        setMessage(`\u2713 Synced ${result.itemCount} variables from ${selectedDevice.nameShowOnTree}`, 'success');
      } catch (err) {
        console.error('[VariablesPage] Auto-refresh failed:', err);
      } finally {
        await fetchVariables();
        await fetchPvariables();
        setAutoRefreshed(true);
        setLoading(false);
      }
    };

    checkAndRefresh();
  }, [dbChecked, loading, loadingPvars, selectedDevice, autoRefreshed, fetchVariables, fetchPvariables, variables.length, pvariables.length, setMessage]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVariables();
    setRefreshing(false);
  };

  // Refresh all variables from device (Trigger #2: Manual "Refresh All" button)
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    setMessage('Refreshing variables from device...', 'info');

    try {
      console.log('[VariablesPage] Refreshing all variables from device via FFI...');
      // Pass loading callback to show loading state during Action 17 FFI call
      const result = await PanelDataRefreshService.refreshFromDevice({
        serialNumber: selectedDevice.serialNumber,
        type: 'variable',
        onLoadingChange: (loading) => {
          if (loading) {
            setMessage('Loading data from device (Action 17)...', 'info');
          }
        }
      });
      console.log('[VariablesPage] Refresh result:', result);
      setMessage(result.message, 'success');
    } catch (error) {
      console.error('[VariablesPage] Failed to refresh from device:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to refresh from device';
      setError(errorMsg);
      setMessage(errorMsg, 'error');
    } finally {
      // Always reload from database to show what was actually saved
      await fetchVariables();
      await fetchPvariables();
      setRefreshing(false);
    }
  };

  // Refresh single variable from device (Trigger #3: Per-row refresh icon)
  const handleRefreshSingleVariable = async (variableIndex: string) => {
    if (!selectedDevice) return;

    const index = parseInt(variableIndex, 10);
    if (isNaN(index)) {
      console.error('[VariablesPage] Invalid variable index:', variableIndex);
      return;
    }

    setRefreshingItems(prev => new Set(prev).add(variableIndex));
    try {
      console.log(`[VariablesPage] Refreshing variable ${index} from device via FFI...`);
      const result = await PanelDataRefreshService.refreshSingleVariable(selectedDevice.serialNumber, index);
      console.log('[VariablesPage] Refresh result:', result);

      // Reload data from database after save
      await fetchVariables();
    } catch (error) {
      console.error(`[VariablesPage] Failed to refresh variable ${index}:`, error);
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(variableIndex);
        return newSet;
      });
    }
  };

  const handleExport = () => {
    if (variables.length === 0) return;
    const csvColumns: import('@t3-react/shared/utils/csvUtils').CsvColumn<VariablePoint>[] = [
      { header: 'Panel', accessor: v => v.panel },
      { header: 'Variable', accessor: v => v.variableId },
      { header: 'Full Label', accessor: v => v.fullLabel },
      { header: 'Label', accessor: v => v.label },
      { header: 'Auto/Manual', accessor: v => v.autoManual },
      { header: 'Value', accessor: v => v.fValue },
      { header: 'Units', accessor: v => v.units },
      { header: 'Range', accessor: v => v.rangeField },
      { header: 'Calibration', accessor: v => v.calibration },
      { header: 'Sign', accessor: v => v.sign },
      { header: 'Filter', accessor: v => v.filterField },
      { header: 'Status', accessor: v => v.status },
    ];
    exportToCsv(variables, csvColumns, `variables_${selectedDevice?.serialNumber || 'export'}.csv`);
  };

  const handleImport = async (file: File) => {
    const { headers, rows } = await parseCsvFile(file);
    if (rows.length === 0) return;
    const csvColumns: import('@t3-react/shared/utils/csvUtils').CsvColumn<VariablePoint>[] = [
      { header: 'Panel', accessor: v => v.panel, setter: (v, val) => { v.panel = val; } },
      { header: 'Variable', accessor: v => v.variableId, setter: (v, val) => { v.variableId = val; } },
      { header: 'Full Label', accessor: v => v.fullLabel, setter: (v, val) => { v.fullLabel = val; } },
      { header: 'Label', accessor: v => v.label, setter: (v, val) => { v.label = val; } },
      { header: 'Auto/Manual', accessor: v => v.autoManual, setter: (v, val) => { v.autoManual = val; } },
      { header: 'Value', accessor: v => v.fValue, setter: (v, val) => { v.fValue = val; } },
      { header: 'Units', accessor: v => v.units, setter: (v, val) => { v.units = val; } },
      { header: 'Range', accessor: v => v.rangeField, setter: (v, val) => { v.rangeField = val; } },
      { header: 'Calibration', accessor: v => v.calibration, setter: (v, val) => { v.calibration = val; } },
      { header: 'Sign', accessor: v => v.sign, setter: (v, val) => { v.sign = val; } },
      { header: 'Filter', accessor: v => v.filterField, setter: (v, val) => { v.filterField = val; } },
      { header: 'Status', accessor: v => v.status, setter: (v, val) => { v.status = val; } },
    ];
    const imported = mapCsvToObjects(headers, rows, csvColumns, () => ({ serialNumber: selectedDevice?.serialNumber || 0 } as VariablePoint));
    setVariables(imported);
  };

  // Register CSV export/import handlers with global context (Tools menu)
  useRegisterCsvHandlers(handleExport, handleImport);

  // Auto-scroll to next device when reaching bottom
  const loadNextDevice = useCallback(async () => {
    const nextDevice = getNextDevice();

    if (!nextDevice) {
      console.log('[VariablesPage] No next device available');
      return;
    }

    console.log(`[VariablesPage] Auto-loading next device: ${nextDevice.nameShowOnTree} (SN: ${nextDevice.serialNumber})`);
    setIsLoadingNextDevice(true);

    // Switch device (this will trigger fetchVariables via useEffect)
    selectDevice(nextDevice);

    // Reset loading state after a short delay
    setTimeout(() => {
      setIsLoadingNextDevice(false);
    }, 500);
  }, [getNextDevice, selectDevice]);

  // Handle scroll event to detect when user reaches bottom
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isLoadingNextDevice || loading) {
      return;
    }

    const target = e.currentTarget;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    const isAtBottom = scrollBottom <= 1; // At absolute bottom (1px tolerance)

    if (isAtBottom && variables.length > 0) {
      // Mark that we're at bottom
      isAtBottomRef.current = true;
      console.log('[VariablesPage] Reached bottom, scroll again to load next device');
    } else {
      // Not at bottom anymore, reset the flag
      isAtBottomRef.current = false;
    }
  }, [isLoadingNextDevice, loading, variables.length]);

  // Handle wheel event to detect scroll attempts when already at bottom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (isLoadingNextDevice || loading || variables.length === 0) {
      return;
    }

    // If user is scrolling down (deltaY > 0) and already at bottom, load next device
    if (e.deltaY > 0 && isAtBottomRef.current) {
      console.log('[VariablesPage] User scrolled down while at bottom, loading next device');
      isAtBottomRef.current = false; // Reset
      loadNextDevice();
    }
  }, [isLoadingNextDevice, loading, variables.length, loadNextDevice]);

  // Auto-scroll to top when device changes
  useEffect(() => {
    if (selectedDevice && scrollContainerRef.current) {
      // Use smooth scroll for auto-loaded devices, instant for manual selection
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: isLoadingNextDevice ? 'smooth' : 'auto'
      });
    }
  }, [selectedDevice, isLoadingNextDevice]);

  // Inline editing handlers
  const handleCellDoubleClick = (item: VariablePoint, field: string, currentValue: string) => {
    setEditingCell({ serialNumber: item.serialNumber, variableIndex: item.variableIndex || '', field });
    setEditValue(currentValue || '');
  };

  // Step 1: Update device using FFI (Action 16)
  const updateDeviceUsingFFI = async (
    panelId: number,
    serialNumber: number,
    variableIndex: string,
    field: string,
    newValue: string,
    currentVariable: any
  ) => {
    try {
      console.log(`[FFI Action 16] Updating ${field} on device - Variable ${variableIndex} (SN: ${serialNumber})`);

      // Build FFI message for UPDATE_WEBVIEW_LIST (Action 16)
      const ffiMessage = {
        action: 16, // UPDATE_WEBVIEW_LIST
        panelId: panelId,
        serialNumber: serialNumber,
        entryType: 2, // BAC_VAR (VARIABLE)
        entryIndex: parseInt(variableIndex, 10),
        control: parseInt(String(currentVariable.control || '0'), 10),
        value: field === 'fValue' ? parseFloat(newValue || '0') : parseFloat(currentVariable.fValue || '0') / 1000,
        description: field === 'fullLabel' ? newValue : (currentVariable.fullLabel || ''),
        label: currentVariable.label || '',
        range: parseInt(currentVariable.rangeField || '0', 10),
        auto_manual: parseInt(currentVariable.autoManual || '0', 10),
        filter: parseInt(currentVariable.filterField || '0', 10),
        digital_analog: currentVariable.digitalAnalog === '1' ? 1 : 0,
        calibration_sign: parseInt(String(currentVariable.calibrationSign || currentVariable.sign || '0'), 10),
        calibration_h: parseInt(String(currentVariable.calibrationH || '0'), 10),
        calibration_l: parseInt(String(currentVariable.calibrationL || '0'), 10),
        decom: 0,
      };

      console.log('[FFI Action 16] Sending to device:', ffiMessage);

      const response = await fetch(`${API_BASE_URL}/api/t3000/ffi/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ffiMessage)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Device update failed: ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[FFI Action 16] Device updated successfully:', result);
      return result;
    } catch (error) {
      console.error('[FFI Action 16] Device update failed:', error);
      throw error;
    }
  };

  // Step 2: Update database only
  const updateDatabaseOnly = async (
    serialNumber: number,
    variableIndex: string,
    field: string,
    newValue: string,
    currentVariable: any
  ) => {
    try {
      console.log(`[Database] Updating ${field} in database - Variable ${variableIndex} (SN: ${serialNumber})`);

      const payload = {
        fullLabel: field === 'fullLabel' ? newValue : (currentVariable.fullLabel || ''),
        label: currentVariable.label || '',
        value: field === 'fValue' ? parseFloat(newValue || '0') : parseFloat(currentVariable.fValue || '0') / 1000,
        range: parseInt(currentVariable.rangeField || '0', 10),
        autoManual: parseInt(currentVariable.autoManual || '0', 10),
        filter: parseInt(currentVariable.filterField || '0', 10),
        digitalAnalog: currentVariable.digitalAnalog === '1' ? 1 : 0,
        calibrationSign: parseInt(String(currentVariable.calibrationSign || currentVariable.sign || '0'), 10),
        calibrationH: parseInt(String(currentVariable.calibrationH || '0'), 10),
        calibrationL: parseInt(String(currentVariable.calibrationL || '0'), 10),
        control: parseInt(String(currentVariable.control || '0'), 10),
      };

      const response = await fetch(
        `${API_BASE_URL}/api/t3_device/variables/${serialNumber}/${variableIndex}/db`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Database update failed: ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[Database] Database updated successfully:', result);
      return result;
    } catch (error) {
      console.error('[Database] Database update failed:', error);
      throw error;
    }
  };

  const handleEditSave = async () => {
    if (!editingCell) {
      setEditingCell(null);
      return;
    }

    // For value field, allow empty/zero values
    if (editingCell.field !== 'fValue' && !editValue.trim()) {
      setEditingCell(null);
      return;
    }

    setIsSaving(true);
    try {
      // Process for all editable fields
      if (selectedDevice && ['fullLabel', 'label', 'fValue', 'range', 'autoManual'].includes(editingCell.field)) {
        console.log(`=== Updating ${editingCell.field} (Two-Step Process) ===`);
        console.log(`Device: ${selectedDevice.serialNumber}, Variable: ${editingCell.variableIndex}, New Value: "${editValue}"`);

        // Find the current variable data
        const currentVariable = variables.find(
          variable => variable.serialNumber === editingCell.serialNumber && variable.variableIndex === editingCell.variableIndex
        );

        if (!currentVariable) {
          throw new Error('Current variable data not found');
        }

        // Get panel_id for FFI call (assuming it's available in selectedDevice)
        const panelId = selectedDevice.panelId || 1;

        // Step 1: Update device FIRST using FFI (Action 16)
        console.log('Step 1/2: Updating device via FFI...');
        await updateDeviceUsingFFI(
          panelId,
          selectedDevice.serialNumber,
          editingCell.variableIndex,
          editingCell.field,
          editValue,
          currentVariable
        );
        console.log('✅ Device updated successfully');

        // Step 2: Update database SECOND
        console.log('Step 2/2: Updating database...');
        await updateDatabaseOnly(
          selectedDevice.serialNumber,
          editingCell.variableIndex,
          editingCell.field,
          editValue,
          currentVariable
        );
        console.log('✅ Database updated successfully');

        console.log(`✅ ${editingCell.field} updated successfully (device + database)!`);
      }

      // Update local state optimistically
      setVariables(prevVariables =>
        prevVariables.map(variable =>
          variable.serialNumber === editingCell.serialNumber &&
            variable.variableIndex === editingCell.variableIndex
            ? {
              ...variable,
              [editingCell.field]: editingCell.field === 'fValue'
                ? (parseFloat(editValue || '0') * 1000).toString()  // Convert back to raw value for storage
                : editValue
            }
            : variable
        )
      );

      console.log('Updated', editingCell.field, ':', editValue, 'for', editingCell);
      setEditingCell(null);
    } catch (error) {
      console.error('Failed to update:', error);
      alert(`Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  // VAR / PVAR filter — two mutually exclusive options
  const [activeFilter, setActiveFilter] = useState<'VARS' | 'PVARS'>('VARS');

  // Determine if a variable is a PVAR by its id or typeField
  const isPvar = (item: VariablePoint): boolean => {
    const id = (item.variableId || '').toUpperCase();
    const tf = (item.typeField || '').toUpperCase();
    return id.startsWith('PVAR') || tf.includes('PVAR');
  };

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ serialNumber: number; variableIndex: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Range drawer state
  const [rangeDrawerOpen, setRangeDrawerOpen] = useState(false);
  const [selectedVariableForRange, setSelectedVariableForRange] = useState<VariablePoint | null>(null);

  // Range selection handlers
  const handleUnitsClick = (item: VariablePoint) => {
    setSelectedVariableForRange(item);
    setRangeDrawerOpen(true);
  };

  const handleRangeSave = async (newRange: number, newDigitalAnalog: number) => {
    if (!selectedVariableForRange) return;

    try {
      console.log(`[Action 16] Updating Range/Units for Variable ${selectedVariableForRange.variableIndex} (SN: ${selectedVariableForRange.serialNumber}), New DigitalAnalog: ${newDigitalAnalog}`);

      // Action 16 requires ALL fields
      const payload = {
        fullLabel: selectedVariableForRange.fullLabel || '',
        label: selectedVariableForRange.label || '',
        value: parseFloat(selectedVariableForRange.fValue || '0'),
        range: newRange,
        autoManual: parseInt(selectedVariableForRange.autoManual || '0'),
        control: parseInt(String(selectedVariableForRange.control || '0')),
        filter: parseInt(selectedVariableForRange.filterField || '0'),
        digitalAnalog: newDigitalAnalog,
        calibrationSign: parseInt(String(selectedVariableForRange.calibrationSign || selectedVariableForRange.sign || '0')),
        calibrationH: parseInt(String(selectedVariableForRange.calibrationH || '0')),
        calibrationL: parseInt(String(selectedVariableForRange.calibrationL || '0')),
      };

      console.log('[Action 16] Full payload:', payload);

      const response = await fetch(
        `${API_BASE_URL}/api/t3_device/variables/${selectedVariableForRange.serialNumber}/${selectedVariableForRange.variableIndex}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[Action 16] Range/Units updated successfully:', result);

      // Update local state optimistically
      setVariables(prevVariables =>
        prevVariables.map(variable =>
          variable.serialNumber === selectedVariableForRange.serialNumber &&
            variable.variableIndex === selectedVariableForRange.variableIndex
            ? { ...variable, rangeField: newRange.toString(), digitalAnalog: newDigitalAnalog.toString() }
            : variable
        )
      );
    } catch (error) {
      console.error('Failed to update Range/Units:', error);
      alert(`Failed to update Range/Units: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    console.log('Search query:', e.target.value);
  };

  // Controlled sort state for asc→desc→clear
  const [sortState, setSortState] = useState<{ sortColumn: string; sortDirection: 'ascending' | 'descending' } | undefined>();
  const [sortKey, setSortKey] = useState(0);
  const prevSortRef = React.useRef<{ sortColumn: string; sortDirection: string } | undefined>();
  const handleSortChange = (_e: any, newState: { sortColumn: string; sortDirection: 'ascending' | 'descending' }) => {
    const prev = prevSortRef.current;
    prevSortRef.current = newState;
    if (prev?.sortColumn === newState.sortColumn && prev?.sortDirection === 'descending' && newState.sortDirection === 'ascending') {
      setSortState(undefined);
      setSortKey(k => k + 1);
    } else {
      setSortState(newState);
    }
  };

  // Merged VARs + PVARs for unified display
  const allVariables = React.useMemo(() => [...variables, ...pvariables], [variables, pvariables]);

  // Counts for badge labels
  const varCount  = React.useMemo(() => allVariables.filter(v => !isPvar(v)).length, [allVariables]);
  const pvarCount = React.useMemo(() => allVariables.filter(v =>  isPvar(v)).length, [allVariables]);

  // Display data with 18 empty rows when no variables
  const displayVariables = React.useMemo(() => {
    if (allVariables.length === 0) {
      return Array(18).fill(null).map((_, index) => ({
        serialNumber: selectedDevice?.serialNumber || 0,
        variableId: '',
        variableIndex: '',
        panel: '',
        fullLabel: '',
        autoManual: '',
        fValue: '',
        units: '',
        rangeField: '',
        calibration: '',
        sign: '',
        calibrationH: '',
        calibrationL: '',
        calibrationSign: '',
        control: '',
        filterField: '',
        status: '',
        digitalAnalog: '',
        label: '',
        typeField: '',
      }));
    }
    // Apply VAR / PVAR filter
    if (activeFilter === 'VARS')  return allVariables.filter(v => !isPvar(v));
    return allVariables.filter(v => isPvar(v)); // PVARS
  }, [allVariables, selectedDevice, activeFilter]);

  // Helper to identify empty rows
  const isEmptyRow = (item: VariablePoint) => !item.variableIndex && !item.variableId && allVariables.length === 0;

  // Column definitions matching the sequence: Panel, Variable, Full Label, Label, Value, Units, Auto/Manual
  const columns: TableColumnDefinition<VariablePoint>[] = [
    // 1. Panel ID
    createTableColumn<VariablePoint>({
      columnId: 'panel',
      renderHeaderCell: () => (
        <div className={styles.headerCell}>
          <span>Panel</span>
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.panel || '')}
        </TableCellLayout>
      ),
    }),
    // 2. Variable (Index/ID)
    createTableColumn<VariablePoint>({
      columnId: 'variable',
      compare: (a, b) => new Intl.Collator(undefined, { numeric: true }).compare(String(a.variableId || ''), String(b.variableId || '')),
      renderHeaderCell: () => <span>Variable</span>,
      renderCell: (item) => {
        if (isEmptyRow(item)) {
          return <TableCellLayout></TableCellLayout>;
        }

        const isRefreshing = refreshingItems.has(item.variableIndex || '');

        const isItemPvar = isPvar(item);

        return (
          <TableCellLayout>
            <div className={styles.cellFlexContainer}>
              {/* <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefreshSingleVariable(item.variableIndex || '');
                }}
                className={`${styles.refreshIconButton} ${isRefreshing ? styles.isRefreshing : ''}`}
                title="Refresh this variable from device"
                disabled={isRefreshing}
              >
                <ArrowSyncRegular
                  className={`${styles.iconSmall} ${isRefreshing ? styles.rotating : ''}`}
                />
              </button> */}
              <Text size={200} weight="regular">
                {item.variableId || (item.variableIndex ? `VAR${parseInt(item.variableIndex) + 1}` : '')}
              </Text>
            </div>
          </TableCellLayout>
        );
      },
    }),
    // 3. Full Label
    createTableColumn<VariablePoint>({
      columnId: 'fullLabel',
      compare: (a, b) => new Intl.Collator(undefined, { numeric: true }).compare(String(a.fullLabel || ''), String(b.fullLabel || '')),
      renderHeaderCell: () => <span>Full Label</span>,
      renderCell: (item) => {
        if (isEmptyRow(item)) {
          return <TableCellLayout></TableCellLayout>;
        }

        const isEditing = editingCell?.serialNumber === item.serialNumber &&
          editingCell?.variableIndex === item.variableIndex &&
          editingCell?.field === 'fullLabel';

        return (
          <TableCellLayout>
            {isEditing ? (
              <div className={styles.editInputContainer}>
                <input
                  type="text"
                  className={`${styles.editInput} ${styles.flex1}`}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleEditSave}
                  onKeyDown={handleEditKeyDown}
                  autoFocus
                  disabled={isSaving}
                  placeholder="Enter label"
                  aria-label="Edit full label"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSave();
                  }}
                  disabled={isSaving}
                  className={styles.saveButton}
                  title="Save"
                >
                  <SaveRegular className={styles.iconMedium} />
                </button>
              </div>
            ) : (
              <div
                className={styles.editableCell}
                onDoubleClick={() => handleCellDoubleClick(item, 'fullLabel', item.fullLabel || '')}
                title="Double-click to edit"
              >
                <Text size={200} weight="regular">{item.fullLabel || ''}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 3. Label (short label)
    createTableColumn<VariablePoint>({
      columnId: 'label',
      compare: (a, b) => new Intl.Collator(undefined, { numeric: true }).compare(String(a.label || ''), String(b.label || '')),
      renderHeaderCell: () => <span>Label</span>,
      renderCell: (item) => {
        if (isEmptyRow(item)) {
          return <TableCellLayout></TableCellLayout>;
        }

        const isEditing = editingCell?.serialNumber === item.serialNumber &&
          editingCell?.variableIndex === item.variableIndex &&
          editingCell?.field === 'label';

        return (
          <TableCellLayout>
            {isEditing ? (
              <div className={styles.editInputContainer}>
                <input
                  type="text"
                  className={`${styles.editInput} ${styles.flex1}`}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleEditSave}
                  onKeyDown={handleEditKeyDown}
                  autoFocus
                  disabled={isSaving}
                  placeholder="Enter label"
                  aria-label="Edit label"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSave();
                  }}
                  disabled={isSaving}
                  className={styles.saveButton}
                  title="Save"
                >
                  <SaveRegular className={styles.iconMedium} />
                </button>
              </div>
            ) : (
              <div
                className={styles.editableCell}
                onDoubleClick={() => handleCellDoubleClick(item, 'label', item.label || '')}
                title="Double-click to edit"
              >
                <Text size={200} weight="regular">{item.label || ''}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 5. Value
    createTableColumn<VariablePoint>({
      columnId: 'value',
      compare: (a, b) => { const av = parseFloat(a.fValue||'0'); const bv = parseFloat(b.fValue||'0'); return av - bv; },
      renderHeaderCell: () => <span>Value</span>,
      renderCell: (item) => {
        if (isEmptyRow(item)) {
          return <TableCellLayout></TableCellLayout>;
        }

        const isEditing = editingCell?.serialNumber === item.serialNumber &&
          editingCell?.variableIndex === item.variableIndex &&
          editingCell?.field === 'fValue';

        return (
          <TableCellLayout>
            {isEditing ? (
              <div className={styles.editInputContainer}>
                <input
                  type="number"
                  step="0.01"
                  className={`${styles.editInput} ${styles.flex1}`}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleEditSave}
                  onKeyDown={handleEditKeyDown}
                  autoFocus
                  disabled={isSaving}
                  placeholder="Enter value"
                  aria-label="Edit value"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSave();
                  }}
                  disabled={isSaving}
                  className={styles.saveButton}
                  title="Save"
                >
                  <SaveRegular className={styles.iconMedium} />
                </button>
              </div>
            ) : (
              <div
                className={styles.editableCell}
                onDoubleClick={() => handleCellDoubleClick(item, 'fValue', item.fValue ? (parseFloat(item.fValue) / 1000).toFixed(2) : '0')}
                title="Double-click to edit"
              >
                <span className={styles.valueBadge}>{item.fValue ? (parseFloat(item.fValue) / 1000).toFixed(2) : ''}</span>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 6. Units
    createTableColumn<VariablePoint>({
      columnId: 'units',
      compare: (a, b) => new Intl.Collator(undefined, { numeric: true }).compare(String(a.units || ''), String(b.units || '')),
      renderHeaderCell: () => <span>Units</span>,
      renderCell: (item) => {
        if (isEmptyRow(item)) {
          return <TableCellLayout></TableCellLayout>;
        }

        // Parse range value and digital_analog type
        const rangeValue = item.rangeField ? parseInt(item.rangeField) : 0;
        const digitalAnalog = item.digitalAnalog === '1' ? 1 : 0;
        const rangeLabel = getRangeLabel(rangeValue, digitalAnalog);
        const unitSymbol = getUnitSymbol(rangeValue, digitalAnalog);

        return (
          <TableCellLayout>
            <div
              onClick={() => handleUnitsClick(item)}
              className={styles.rangeLink}
              title="Click to change range/units"
            >
              <span className={styles.unitBadge}>{unitSymbol !== '---' ? unitSymbol : rangeLabel}</span>
            </div>
          </TableCellLayout>
        );
      },
    }),
    // 7. Auto/Manual
    createTableColumn<VariablePoint>({
      columnId: 'autoManual',
      renderHeaderCell: () => (
        <div className={styles.headerCell}>
          <span>Auto/Manual</span>
        </div>
      ),
      renderCell: (item) => {
        if (isEmptyRow(item)) {
          return <TableCellLayout></TableCellLayout>;
        }

        // Check if Auto: value could be 'auto', 'Auto', or '1' (Manual is '0')
        const value = item.autoManual?.toString().toLowerCase();
        const isAuto = value === 'auto' || value === '1';

        const handleToggle = async () => {
          const newValue = !isAuto ? '1' : '0';
          console.log('Auto/Man toggled:', item.serialNumber, item.variableIndex, newValue);

          try {
            // Find the current variable data to pass all fields for Action 16
            const currentVariable = variables.find(
              variable => variable.serialNumber === item.serialNumber && variable.variableIndex === item.variableIndex
            );

            if (!currentVariable) {
              throw new Error('Current variable data not found');
            }

            // Use Action 16 (UPDATE_WEBVIEW_LIST) - requires ALL fields
            const payload = {
              fullLabel: currentVariable.fullLabel || '',
              label: currentVariable.label || '',
              value: parseFloat(currentVariable.fValue || '0'),
              range: parseInt(currentVariable.rangeField || '0'),
              autoManual: parseInt(newValue),
              control: parseInt(String(currentVariable.control || '0')),
              filter: parseInt(currentVariable.filterField || '0'),
              digitalAnalog: currentVariable.digitalAnalog === '1' ? 1 : 0,
              calibrationSign: parseInt(String(currentVariable.calibrationSign || currentVariable.sign || '0')),
              calibrationH: parseInt(String(currentVariable.calibrationH || '0')),
              calibrationL: parseInt(String(currentVariable.calibrationL || '0')),
            };

            console.log('[Action 16] Updating Auto/Man:', payload);

            const response = await fetch(
              `${API_BASE_URL}/api/t3_device/variables/${item.serialNumber}/${item.variableIndex}`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('[Action 16] Auto/Man updated successfully:', result);

            // Update local state optimistically
            setVariables(prevVariables =>
              prevVariables.map(variable =>
                variable.serialNumber === item.serialNumber && variable.variableIndex === item.variableIndex
                  ? { ...variable, autoManual: newValue }
                  : variable
              )
            );
          } catch (error) {
            console.error('Failed to update Auto/Man:', error);
            alert(`Failed to update Auto/Man: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        };

        return (
          <TableCellLayout>
            <div
              onClick={handleToggle}
              className={styles.switchContainer}
            >
              <Switch
                checked={isAuto}
                className={styles.switchScale}
              />
            </div>
          </TableCellLayout>
        );
      },
    }),
    // TAGS
    createTableColumn<VariablePoint>({
      columnId: 'tags',
      renderHeaderCell: () => (
        <div className={styles.headerCell}><span>TAGS</span></div>
      ),
      renderCell: (item) => {
        if (isEmptyRow(item)) return <TableCellLayout>—</TableCellLayout>;
        const idx = item.variableIndex || '';
        const pid = `dev${item.serialNumber}.var${idx}`;
        return (
          <TagsColumnCell
            serialNumber={item.serialNumber}
            pointType="VARIABLE"
            pointIndex={idx}
            pointId={pid}
            pointLabel={item.label || item.fullLabel || `VAR${idx}`}
            deviceName={selectedDevice?.nameShowOnTree || selectedDevice?.productName}
            isEmpty={isEmptyRow(item)}
          />
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
                <>
                  <div className={styles.toolbar}>
                    <div className={styles.toolbarContainer}>
                      {/* Search Input Box */}
                      <div className={styles.searchInputWrapper}>
                        <SearchRegular className={styles.searchIcon} />
                        <input
                          className={styles.searchInput}
                          type="text"
                          placeholder="Search variables..."
                          value={searchQuery}
                          onChange={handleSearchChange}
                          spellCheck="false"
                          role="searchbox"
                          aria-label="Search variables"
                        />
                      </div>

                      <div className={styles.toolbarSeparator} role="separator" />

                      {/* VAR / PVAR radio filter */}
                      <div className={styles.varTabBar} role="radiogroup" aria-label="Variable type filter">
                        <button
                          role="radio"
                          aria-checked={activeFilter === 'VARS'}
                          className={`${styles.varRadio} ${activeFilter === 'VARS' ? styles.varRadioActive : ''}`}
                          onClick={() => setActiveFilter('VARS')}
                          title="Vars: Regular system variables. These are global values used across the device."
                        >
                          <span className={styles.varRadioCircle} />
                          Vars
                          <span className={styles.varRadioCount}>{varCount}</span>
                        </button>
                        <button
                          role="radio"
                          aria-checked={activeFilter === 'PVARS'}
                          className={`${styles.varRadio} ${activeFilter === 'PVARS' ? styles.varRadioActive : ''}`}
                          onClick={() => setActiveFilter('PVARS')}
                          title="PVars: Program variables. These are local values used inside control programs (e.g., timers, counters, setpoints)."
                        >
                          <span className={styles.varRadioCircle} />
                          PVars
                          <span className={styles.varRadioCount}>{pvarCount}</span>
                        </button>
                      </div>

                      <div className={styles.toolbarSeparator} role="separator" />

                      {/* Refresh Button */}
                      <button
                        className={styles.toolbarButton}
                        onClick={handleRefreshFromDevice}
                        disabled={refreshing}
                        title="Refresh all variables from device"
                        aria-label="Refresh from Device"
                      >
                        <ArrowSyncRegular />
                        <span>{refreshing ? 'Refreshing...' : 'Refresh from Device'}</span>
                      </button>

                      <div className={styles.toolbarSeparator} role="separator" />

                      {/* Info Button with Tooltip */}
                      <Tooltip
                        content={`Showing variable points for ${selectedDevice.nameShowOnTree} (SN: ${selectedDevice.serialNumber}). This table displays all configured variable points used for internal calculations, logic operations, and data storage within the building automation system.`}
                        relationship="description"
                      >
                        <button
                          // className={`${styles.toolbarButton} ${styles.marginLeft8}`}
                          className={`${styles.toolbarButton}`}
                          title="Information"
                          aria-label="Information about this page"
                        >
                          <InfoRegular />
                        </button>
                      </Tooltip>

                      <div className={styles.toolbarSeparator} role="separator" />

                      {/* <PageSyncStatus
                        dataType="VARIABLES"
                        serialNumber={selectedDevice.serialNumber.toString()}
                        onRefresh={handleRefreshFromDevice}
                      /> */}
                    </div>
                  </div>

                  {/* ========================================
                  HORIZONTAL DIVIDER
                  Matches: ext-overview-hr
                  ======================================== */}
                  <div className={styles.noPadding}>
                    <hr className={styles.overviewHr} />
                  </div>
                </>
              )}

              {/* ========================================
                  DOCKING BODY - Main Content
                  Matches: msportalfx-docking-body
                  ======================================== */}
              <div className={styles.dockingBody}>

                {/* Loading State — only on first load */}
                {(loading || loadingPvars) && !hasEverLoadedData.current && (
                  <div className={styles.loadingBar}>
                    <Spinner size="tiny" />
                    <Text size={200} weight="regular">Loading variables...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !loading && !loadingPvars && (
                  <div className={styles.noData}>
                    <div className={styles.centerText}>
                      <Text size={400} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={200}>Please select a device from the tree to view variables</Text>
                    </div>
                  </div>
                )}

                {/* Data Grid — show once device is selected AND initial load is done OR we have data */ }
                {selectedDevice && (!loading || hasEverLoadedData.current) && (!loadingPvars || hasEverLoadedData.current) && (
                  <div
                    ref={scrollContainerRef}
                    className={styles.scrollContainer}
                    onScroll={handleScroll}
                    onWheel={handleWheel}
                  >
                    <DataGrid
                      key={sortKey}
                      items={displayVariables}
                      columns={columns}
                      resizableColumns
                      resizableColumnsOptions={{ autoFitColumns: false }}
                      sortable
                      sortState={sortState}
                      onSortChange={handleSortChange}
                      style={{ width: '100%', border: '1px solid #d1d1d1', borderRadius: 0, backgroundColor: '#fff' }}
                      columnSizingOptions={{
                        panel: { idealWidth: 60, minWidth: 40 },
                        variable: { idealWidth: 90, minWidth: 60 },
                        fullLabel: { idealWidth: 250, minWidth: 140 },
                        label: { idealWidth: 190, minWidth: 110 },
                        value: { idealWidth: 120, minWidth: 80 },
                        units: { idealWidth: 90, minWidth: 60 },
                        autoManual: { idealWidth: 110, minWidth: 75 },
                        tags: { idealWidth: 120, minWidth: 80 },
                      }}
                    >
                      <DataGridHeader style={{ backgroundColor: '#e0e0e0' }}>
                        <DataGridRow>
                          {({ renderHeaderCell }) => (
                            <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                          )}
                        </DataGridRow>
                      </DataGridHeader>
                      <DataGridBody<VariablePoint>>
                        {({ item, rowId }) => (
                          <DataGridRow<VariablePoint> key={rowId}>
                            {({ renderCell }) => (
                              <DataGridCell>{renderCell(item)}</DataGridCell>
                            )}
                          </DataGridRow>
                        )}
                      </DataGridBody>
                    </DataGrid>

                    {/* Loading Next Device Indicator */}
                    {isLoadingNextDevice && (
                      <div className={styles.autoLoadIndicator}>
                        <Spinner size="tiny" />
                        <Text size={200} weight="regular">Loading next device...</Text>
                      </div>
                    )}

                    {/* No Data Message - Show below grid when empty */}
                    {/* {variables.length === 0 && (
                    <div className={styles.emptyStateContainer}>
                      <div className={styles.emptyStateHeader}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.emptyStateIcon}>
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                        </svg>
                        <Text size={400} weight="semibold">No variables found</Text>
                      </div>
                      <Text size={300} className={styles.emptyStateText}>This device has no configured variable points</Text>
                      <Button
                        appearance="subtle"
                        icon={<ArrowSyncRegular />}
                        onClick={handleRefresh}
                        className={styles.refreshButton}
                      >
                        Refresh
                      </Button>
                      </div>
                    )} */}
                  </div>
                )}              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Range Selection Drawer */}
      {selectedVariableForRange && (
        <RangeSelectionDrawer
          isOpen={rangeDrawerOpen}
          onClose={() => {
            setRangeDrawerOpen(false);
            setSelectedVariableForRange(null);
          }}
          currentRange={selectedVariableForRange.rangeField ? parseInt(selectedVariableForRange.rangeField) : 0}
          digitalAnalog={selectedVariableForRange.digitalAnalog === '1' ? 1 : 0}
          onSave={handleRangeSave}
          inputLabel={selectedVariableForRange.fullLabel || 'Variable'}
        />
      )}
    </div>
  );
};

export const VariablesPage: React.FC = () => {
  const { isMobile } = useResponsive();
  if (isMobile) return <VariablesPageMobile />;
  return <VariablesPageDesktop />;
};

export default VariablesPage;
