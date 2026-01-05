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
  Switch,
  Tooltip,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ArrowDownloadRegular,
  SettingsRegular,
  SearchRegular,
  ArrowSortUpRegular,
  ArrowSortDownRegular,
  ArrowSortRegular,
  ErrorCircleRegular,
  SaveRegular,
  InfoRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { RangeSelectionDrawer } from '../components/RangeSelectionDrawer';
import { getRangeLabel } from '../data/rangeData';
import { API_BASE_URL } from '../../../config/constants';
import { T3Database } from '../../../../lib/t3-database';
import { PanelDataRefreshService } from '../../../shared/services/panelDataRefreshService';
import { useStatusBarStore } from '../../../store/statusBarStore';
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
  range?: string;
  rangeField?: string;
  calibration?: string;
  sign?: string;
  filterField?: string;
  status?: string;
  signalType?: string;
  digitalAnalog?: string;
  label?: string;
  typeField?: string;
}

export const InputsPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice, getNextDevice, getFilteredDevices } = useDeviceTreeStore();
  const setMessage = useStatusBarStore((state) => state.setMessage);

  const [inputs, setInputs] = useState<InputPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
  const [autoRefreshed, setAutoRefreshed] = useState(false);

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
      console.log('[InputsPage] Auto-select check:', {
        hasSelectedDevice: !!selectedDevice,
        treeDataLength: treeData.length,
        filteredDevicesCount: filteredDevices.length,
        filteredDevicesList: filteredDevices.map(d => `${d.nameShowOnTree} (SN: ${d.serialNumber})`),
      });

      if (filteredDevices.length > 0) {
        const firstDevice = filteredDevices[0];
        console.log(`[InputsPage] Auto-selecting first device: ${firstDevice.nameShowOnTree} (SN: ${firstDevice.serialNumber})`);
        selectDevice(firstDevice);
      }
    }
  }, [selectedDevice, treeData, selectDevice, getFilteredDevices]);
  */

  // Fetch inputs for selected device
  const fetchInputs = useCallback(async () => {
    if (!selectedDevice) {
      setInputs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/input-points`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch inputs: ${response.statusText}`);
      }

      const data = await response.json();
      const fetchedInputs = data.input_points || [];
      setInputs(fetchedInputs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load inputs';
      setError(errorMessage);
      console.error('Error fetching inputs:', err);
      // DON'T clear inputs on database fetch error - preserve what we have
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchInputs();
  }, [fetchInputs]);

  // Reset autoRefreshed flag when device changes
  useEffect(() => {
    setInputs([]);
    setAutoRefreshed(false);
  }, [selectedDevice?.serialNumber]);

  // Auto-refresh once after page load (Trigger #1) - ONLY if database is empty
  useEffect(() => {
    if (loading || !selectedDevice || autoRefreshed) return;

    // Wait for initial load to complete, then check if we need to refresh from device
    // Delay 1000ms to let TreePanel device sync finish first and avoid database locks
    const timer = setTimeout(async () => {
      try {
        // Check if database has input data
        if (inputs.length > 0) {
          console.log('[InputsPage] Database has data, skipping auto-refresh');
          setAutoRefreshed(true);
          return;
        }

        console.log('[InputsPage] Database empty, auto-refreshing from device...');
        setLoading(true);
        setMessage(`Syncing inputs from ${selectedDevice.nameShowOnTree}...`, 'info');

        // Use PanelDataRefreshService which handles Action 17 without needing panel_id from DB
        const result = await PanelDataRefreshService.refreshAllInputs(selectedDevice.serialNumber);

        // Reload from database after refresh
        await fetchInputs();
        setAutoRefreshed(true);
        setLoading(false);
        setMessage(`✓ Synced ${result.itemCount} inputs from ${selectedDevice.nameShowOnTree}`, 'success');
      } catch (error) {
        console.error('[InputsPage] Auto-refresh failed:', error);
        setLoading(false);
        setMessage(`Failed to sync inputs: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        // Don't reload from database on error - preserve existing inputs
        setAutoRefreshed(true); // Mark as attempted to prevent retry loops
      }
    }, 3000); // 3 second delay to let TreePanel device sync finish and avoid database locks

    return () => clearTimeout(timer);
  }, [loading, selectedDevice, autoRefreshed, fetchInputs, inputs.length, setMessage]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInputs();
    setRefreshing(false);
  };

  // Refresh all inputs from device (Trigger #2: Manual "Refresh All" button)
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    setMessage('Refreshing inputs from device...', 'info');

    try {
      console.log('[InputsPage] Refreshing all inputs from device via FFI...');
      const result = await PanelDataRefreshService.refreshAllInputs(selectedDevice.serialNumber);
      console.log('[InputsPage] Refresh result:', result);

      // Reload from database after successful save
      await fetchInputs();
      setMessage(result.message, 'success');
    } catch (error) {
      console.error('[InputsPage] Failed to refresh from device:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to refresh from device';
      setError(errorMsg);
      setMessage(errorMsg, 'error');
    } finally {
      setRefreshing(false);
    }
  };  // Refresh single input from device (Trigger #3: Per-row refresh icon)
  const handleRefreshSingleInput = async (inputIndex: string) => {
    if (!selectedDevice) return;

    const index = parseInt(inputIndex, 10);
    if (isNaN(index)) {
      console.error('[InputsPage] Invalid input index:', inputIndex);
      return;
    }

    setRefreshingItems(prev => new Set(prev).add(inputIndex));
    try {
      console.log(`[InputsPage] Refreshing input ${index} from device via FFI...`);
      const result = await PanelDataRefreshService.refreshSingleInput(selectedDevice.serialNumber, index);
      console.log('[InputsPage] Refresh result:', result);

      // Reload data from database after save
      await fetchInputs();
    } catch (error) {
      console.error(`[InputsPage] Failed to refresh input ${index}:`, error);
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(inputIndex);
        return newSet;
      });
    }
  };

  const handleExport = () => {
    console.log('Export inputs to CSV');
  };

  const handleSettings = () => {
    console.log('Settings clicked');
  };

  // Auto-scroll to next device when reaching bottom
  const loadNextDevice = useCallback(async () => {
    const nextDevice = getNextDevice();

    if (!nextDevice) {
      console.log('[InputsPage] No next device available');
      return;
    }

    console.log(`[InputsPage] Auto-loading next device: ${nextDevice.nameShowOnTree} (SN: ${nextDevice.serialNumber})`);
    setIsLoadingNextDevice(true);

    // Switch device (this will trigger fetchInputs via useEffect)
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

    if (isAtBottom && inputs.length > 0) {
      // Mark that we're at bottom
      isAtBottomRef.current = true;
      console.log('[InputsPage] Reached bottom, scroll again to load next device');
    } else {
      // Not at bottom anymore, reset the flag
      isAtBottomRef.current = false;
    }
  }, [isLoadingNextDevice, loading, inputs.length]);

  // Handle wheel event to detect scroll attempts when already at bottom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (isLoadingNextDevice || loading || inputs.length === 0) {
      return;
    }

    // If user is scrolling down (deltaY > 0) and already at bottom, load next device
    if (e.deltaY > 0 && isAtBottomRef.current) {
      console.log('[InputsPage] User scrolled down while at bottom, loading next device');
      isAtBottomRef.current = false; // Reset
      loadNextDevice();
    }
  }, [isLoadingNextDevice, loading, inputs.length, loadNextDevice]);

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
  const handleCellDoubleClick = (item: InputPoint, field: string, currentValue: string) => {
    setEditingCell({ serialNumber: item.serialNumber, inputIndex: item.inputIndex || '', field });
    setEditValue(currentValue || '');
  };

  // Test function: Update full label using UPDATE_ENTRY (Action 3 - single field)
  // COMMENTED OUT: Action 3 does NOT support fullLabel! It only supports: control, value, auto_manual
  // Keeping the function code for reference but not using it
  /*
  const updateFullLabelUsingAction3 = async (serialNumber: number, inputIndex: string, newLabel: string) => {
    try {
      console.log(`[Action 3] Attempting to update full label for Input ${inputIndex} (SN: ${serialNumber})`);
      console.warn('[Action 3] WARNING: fullLabel is NOT supported by Action 3 in C++!');
      console.warn('[Action 3] C++ only supports: control, value, auto_manual');

      const response = await fetch(
        `/api/t3-device/inputs/${serialNumber}/${inputIndex}/field/fullLabel`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: newLabel })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[Action 3] Response:', result);
      console.warn('[Action 3] The API may return success, but C++ did NOT update the field!');
      return result;
    } catch (error) {
      console.error('[Action 3] Failed (Expected!):', error);
      throw error;
    }
  };
  */

  // Generic function: Update input field using UPDATE_WEBVIEW_LIST (Action 16 - full record)
  // NOTE: Action 16 requires ALL fields to be provided, not just the changed field
  // CRITICAL: Must read current device values first to avoid overwriting with stale database values
  const updateInputFieldUsingAction16 = async (
    serialNumber: number,
    inputIndex: string,
    field: string,
    newValue: string,
    currentInput: InputPoint
  ) => {
    try {
      console.log(`[Action 16] Updating ${field} for Input ${inputIndex} (SN: ${serialNumber})`);

      // Step 1: Use CURRENT UI STATE as baseline (has most recent changes)
      // The currentInput parameter already reflects any previous edits made in the UI
      console.log('[Action 16] Using current UI state as baseline:', currentInput);

      // Step 2: Build payload with current UI values + the one changed field
      const payload = {
        fullLabel: field === 'fullLabel' ? newValue : (currentInput.fullLabel || ''),
        label: field === 'label' ? newValue : (currentInput.label || ''),
        value: field === 'fValue' ? parseFloat(newValue || '0') : parseFloat(currentInput.fValue || '0'),
        range: field === 'range' ? parseInt(newValue || '0', 10) : parseInt(currentInput.rangeField || currentInput.range || '0', 10),
        autoManual: field === 'autoManual' ? parseInt(newValue || '0', 10) : parseInt(currentInput.autoManual || '0', 10),
        control: 0, // control field not typically editable
        filter: parseInt(currentInput.filterField || '0', 10),
        digitalAnalog: parseInt(currentInput.digitalAnalog || '0', 10),
        calibrationSign: parseInt(currentInput.sign || '0', 10),
        calibrationH: parseInt(currentInput.calibration?.split('.')[0] || '0', 10),
        calibrationL: parseInt(currentInput.calibration?.split('.')[1] || '0', 10),
        decom: 0,
      };

      console.log('[Action 16] Full payload:', payload);

      const response = await fetch(
        `${API_BASE_URL}/api/t3_device/inputs/${serialNumber}/${inputIndex}`,
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
      console.log('[Action 16] Success - Device updated via FFI and saved to database:', result);

      return result;
    } catch (error) {
      console.error('[Action 16] Failed:', error);
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
      // Use Action 16 for all editable fields (fullLabel, label, fValue, range, autoManual)
      if (selectedDevice && ['fullLabel', 'label', 'fValue', 'range', 'autoManual'].includes(editingCell.field)) {
        console.log(`=== Updating ${editingCell.field} ===`);
        console.log(`Device: ${selectedDevice.serialNumber}, Input: ${editingCell.inputIndex}, New Value: "${editValue}"`);
        console.log('Using Action 16 (UPDATE_WEBVIEW_LIST)');

        // Find the current input data to pass all fields for Action 16
        const currentInput = inputs.find(
          input => input.serialNumber === editingCell.serialNumber && input.inputIndex === editingCell.inputIndex
        );

        if (!currentInput) {
          throw new Error('Current input data not found');
        }

        // Use Action 16 (UPDATE_WEBVIEW_LIST) for all fields
        await updateInputFieldUsingAction16(
          selectedDevice.serialNumber,
          editingCell.inputIndex,
          editingCell.field,
          editValue,
          currentInput
        );

        console.log(`✅ ${editingCell.field} updated successfully!`);
      }

      // Update local state optimistically
      setInputs(prevInputs =>
        prevInputs.map(input =>
          input.serialNumber === editingCell.serialNumber &&
          input.inputIndex === editingCell.inputIndex
            ? { ...input, [editingCell.field]: editValue }
            : input
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

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ serialNumber: number; inputIndex: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Range drawer state
  const [rangeDrawerOpen, setRangeDrawerOpen] = useState(false);
  const [selectedInputForRange, setSelectedInputForRange] = useState<InputPoint | null>(null);

  // Range selection handlers
  const handleRangeClick = (item: InputPoint) => {
    setSelectedInputForRange(item);
    setRangeDrawerOpen(true);
  };

  const handleRangeSave = async (newRange: number) => {
    if (!selectedInputForRange || !selectedDevice) return;

    try {
      console.log(`=== Updating range ===`);
      console.log(`Device: ${selectedDevice.serialNumber}, Input: ${selectedInputForRange.inputIndex}, New Range: ${newRange}`);

      // Find the current input data to pass all fields for Action 16
      const currentInput = inputs.find(
        input => input.serialNumber === selectedInputForRange.serialNumber && input.inputIndex === selectedInputForRange.inputIndex
      );

      if (!currentInput) {
        throw new Error('Current input data not found');
      }

      // Use Action 16 (UPDATE_WEBVIEW_LIST) for range field
      await updateInputFieldUsingAction16(
        selectedDevice.serialNumber,
        selectedInputForRange.inputIndex,
        'range',
        newRange.toString(),
        currentInput
      );

      // Update local state optimistically
      setInputs(prevInputs =>
        prevInputs.map(input =>
          input.serialNumber === selectedInputForRange.serialNumber &&
          input.inputIndex === selectedInputForRange.inputIndex
            ? { ...input, range: newRange.toString(), rangeField: newRange.toString() }
            : input
        )
      );

      console.log('✅ Range updated successfully!');
    } catch (error) {
      console.error('Failed to update range:', error);
      alert(`Failed to update range: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    console.log('Search query:', e.target.value);
  };

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending');

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
    } else {
      setSortColumn(columnId);
      setSortDirection('ascending');
    }
  };

  // Display data with 10 empty rows when no inputs
  const displayInputs = React.useMemo(() => {
    if (inputs.length === 0) {
      return Array(10).fill(null).map((_, index) => ({
        serialNumber: selectedDevice?.serialNumber || 0,
        inputId: '',
        inputIndex: '',
        panel: '',
        fullLabel: '',
        autoManual: '',
        fValue: '',
        units: '',
        range: '',
        rangeField: '',
        calibration: '',
        sign: '',
        filterField: '',
        status: '',
        signalType: '',
        digitalAnalog: '',
        label: '',
        typeField: '',
      }));
    }
    return inputs;
  }, [inputs, selectedDevice]);

  // Helper to identify empty rows
  const isEmptyRow = (item: InputPoint) => !item.inputIndex && !item.inputId && inputs.length === 0;

  // Column definitions matching the sequence: Panel, Input, Full Label, Label, Auto/Man, Value, Units, Range, Calibration, Sign, Filter, Status, Signal Type, Type
  const columns: TableColumnDefinition<InputPoint>[] = [
    // 1. Panel ID
    createTableColumn<InputPoint>({
      columnId: 'panel',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('panel')}>
          <span>Panel</span>
          {sortColumn === 'panel' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.panel || '---')}
        </TableCellLayout>
      ),
    }),
    // 2. Input (Index/ID)
    createTableColumn<InputPoint>({
      columnId: 'input',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('input')}>
          <span>Input</span>
          {sortColumn === 'input' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => {
        const inputIndex = item.inputIndex || '';
        const isRefreshingThis = refreshingItems.has(inputIndex);

        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              <div className={styles.cellFlexContainer}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefreshSingleInput(inputIndex);
                  }}
                  className={`${styles.refreshIconButton} ${isRefreshingThis ? styles.isRefreshing : ''}`}
                  title="Refresh this input from device"
                  disabled={isRefreshingThis}
                >
                  <ArrowSyncRegular
                    className={`${styles.iconSmall} ${isRefreshingThis ? styles.rotating : ''}`}
                  />
                </button>
                <Text size={200} weight="regular">
                  {item.inputId || (item.inputIndex ? `IN${parseInt(item.inputIndex) + 1}` : '---')}
                </Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 3. Full Label
    createTableColumn<InputPoint>({
      columnId: 'fullLabel',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('fullLabel')}>
          <span>Full Label</span>
          {sortColumn === 'fullLabel' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => {
        const isEditing = editingCell?.serialNumber === item.serialNumber &&
                          editingCell?.inputIndex === item.inputIndex &&
                          editingCell?.field === 'fullLabel';

        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              isEditing ? (
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
                  <Text size={200} weight="regular">{item.fullLabel || 'Unnamed'}</Text>
                </div>
              )
            )}
          </TableCellLayout>
        );
      },
    }),
    // 4. Label (short label)
    createTableColumn<InputPoint>({
      columnId: 'label',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('label')}>
          <span>Label</span>
          {sortColumn === 'label' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => {
        const isEditing = editingCell?.serialNumber === item.serialNumber &&
                          editingCell?.inputIndex === item.inputIndex &&
                          editingCell?.field === 'label';

        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              isEditing ? (
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
                  <Text size={200} weight="regular">{item.label || '---'}</Text>
                </div>
              )
            )}
          </TableCellLayout>
        );
      },
    }),
    // 5. Auto/Man
    createTableColumn<InputPoint>({
      columnId: 'autoManual',
      renderHeaderCell: () => (
        <div className={styles.headerCell}>
          <span>Auto/Man</span>
        </div>
      ),
      renderCell: (item) => {
        // Check if Auto: value could be 'auto', 'Auto', or '1' (Manual is '0')
        const value = item.autoManual?.toString().toLowerCase();
        const isAuto = value === 'auto' || value === '1';

        const handleToggle = async () => {
          const newValue = !isAuto ? '1' : '0';
          console.log('Auto/Man toggled:', item.serialNumber, item.inputIndex, newValue);

          try {
            // Find the current input data to pass all fields for Action 16
            const currentInput = inputs.find(
              input => input.serialNumber === item.serialNumber && input.inputIndex === item.inputIndex
            );

            if (!currentInput) {
              throw new Error('Current input data not found');
            }

            // Use Action 16 (UPDATE_WEBVIEW_LIST) for autoManual field
            await updateInputFieldUsingAction16(
              item.serialNumber,
              item.inputIndex,
              'autoManual',
              newValue,
              currentInput
            );

            // Update local state optimistically
            setInputs(prevInputs =>
              prevInputs.map(input =>
                input.serialNumber === item.serialNumber && input.inputIndex === item.inputIndex
                  ? { ...input, autoManual: newValue }
                  : input
              )
            );

            console.log('✅ Auto/Man updated successfully!');
          } catch (error) {
            console.error('Failed to update Auto/Man:', error);
            alert(`Failed to update Auto/Man: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        };

        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              <div
                onClick={handleToggle}
                className={styles.switchContainer}
              >
                <Switch
                  checked={isAuto}
                  className={styles.switchScale}
                />
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 5. Value
    createTableColumn<InputPoint>({
      columnId: 'value',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('value')}>
          <span>Value</span>
          {sortColumn === 'value' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => {
        const isEditing = editingCell?.serialNumber === item.serialNumber &&
                          editingCell?.inputIndex === item.inputIndex &&
                          editingCell?.field === 'fValue';

        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              isEditing ? (
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
                  onDoubleClick={() => handleCellDoubleClick(item, 'fValue', item.fValue?.toString() || '0')}
                  title="Double-click to edit"
                >
                  <Text size={200} weight="regular">{item.fValue || '---'}</Text>
                </div>
              )
            )}
          </TableCellLayout>
        );
      },
    }),
    // 6. Units
    createTableColumn<InputPoint>({
      columnId: 'units',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('units')}>
          <span>Units</span>
          {sortColumn === 'units' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.units || '---')}
        </TableCellLayout>
      ),
    }),
    // 7. Range
    createTableColumn<InputPoint>({
      columnId: 'range',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('range')}>
          <span>Range</span>
          {sortColumn === 'range' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => {
        // Parse range value and digital_analog type
        const rangeValue = item.range ? parseInt(item.range) : 0;
        const digitalAnalog = item.signalType === 'Digital' ? 1 : 0; // Assume analog if not digital
        const rangeLabel = getRangeLabel(rangeValue, digitalAnalog);

        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              <div
                onClick={() => handleRangeClick(item)}
                className={styles.rangeLink}
                title="Click to change range"
              >
                <Text size={200} weight="regular">{rangeLabel}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 8. Calibration
    createTableColumn<InputPoint>({
      columnId: 'calibration',
      renderHeaderCell: () => (
        <div className={styles.headerCell}>
          <span>Calibration</span>
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.calibration || '0')}
        </TableCellLayout>
      ),
    }),
    // 9. Sign
    createTableColumn<InputPoint>({
      columnId: 'sign',
      renderHeaderCell: () => (
        <div className={styles.headerCell}>
          <span>Sign</span>
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.sign || '+')}
        </TableCellLayout>
      ),
    }),
    // 10. Filter
    createTableColumn<InputPoint>({
      columnId: 'filter',
      renderHeaderCell: () => (
        <div className={styles.headerCell}>
          <span>Filter</span>
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.filterField || '0')}
        </TableCellLayout>
      ),
    }),
    // 11. Status
    createTableColumn<InputPoint>({
      columnId: 'status',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('status')}>
          <span>Status</span>
          {sortColumn === 'status' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => {
        // Map status codes to readable text
        // Common status codes: 0 = Normal/OK, 64 = Normal, other values may indicate errors
        let statusText = 'Normal';
        let statusColor: 'success' | 'danger' | 'warning' = 'success';

        const statusValue = item.status?.toString();
        if (statusValue === '0' || statusValue === '64') {
          statusText = 'Normal';
          statusColor = 'success';
        } else if (statusValue && statusValue !== 'online' && statusValue !== 'normal') {
          statusText = `Code ${statusValue}`;
          statusColor = 'warning';
        } else if (statusValue?.toLowerCase() === 'online' || statusValue?.toLowerCase() === 'normal') {
          statusText = 'Normal';
          statusColor = 'success';
        }

        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              <Badge
                appearance="filled"
                color={statusColor}
              >
                {statusText}
              </Badge>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 12. Signal Type (keep empty for now)
    createTableColumn<InputPoint>({
      columnId: 'signalType',
      renderHeaderCell: () => (
        <div className={styles.headerCell}>
          <span>Signal Type</span>
        </div>
      ),
      renderCell: () => <TableCellLayout></TableCellLayout>,
    }),
    // 13. Type (Digital/Analog)
    createTableColumn<InputPoint>({
      columnId: 'type',
      renderHeaderCell: () => (
        <div className={styles.headerCell}>
          <span>Type</span>
        </div>
      ),
      renderCell: (item) => {
        const isDigital = item.digitalAnalog === '0';
        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              <Badge
                appearance="outline"
                color={isDigital ? 'informative' : 'brand'}
              >
                {isDigital ? 'Digital' : 'Analog'}
              </Badge>
            )}
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
                  {/* Refresh Button - Refresh from Device */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleRefreshFromDevice}
                    disabled={refreshing}
                    title="Refresh all inputs from device"
                    aria-label="Refresh from Device"
                  >
                    <ArrowSyncRegular />
                    <span>{refreshing ? 'Refreshing...' : 'Refresh from Device'}</span>
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
                      placeholder="Search inputs..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search inputs"
                    />
                  </div>

                  {/* Info Button with Tooltip */}
                  <Tooltip
                    content={`Showing input points for ${selectedDevice.nameShowOnTree} (SN: ${selectedDevice.serialNumber}). This table displays all configured input points including digital and analog sensors, their current values, calibration settings, and operational status.`}
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

                {/* Loading State */}
                {loading && inputs.length === 0 && (
                  <div className={styles.loadingBar}>
                    <Spinner size="tiny" />
                    <Text size={200} weight="regular">Loading inputs...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div className={styles.centerText}>
                      <Text size={400} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={200}>Please select a device from the tree to view inputs</Text>
                    </div>
                  </div>
                )}

                {selectedDevice && !loading && (
                  <div
                    ref={scrollContainerRef}
                    className={styles.scrollContainer}
                    onScroll={handleScroll}
                    onWheel={handleWheel}
                  >
                    <DataGrid
                      items={displayInputs}
                      columns={columns}
                      sortable
                      resizableColumns
                      columnSizingOptions={{
                        input: {
                          minWidth: 60,
                          defaultWidth: 80,
                        },
                        panel: {
                          minWidth: 60,
                          defaultWidth: 75,
                        },
                        fullLabel: {
                          minWidth: 180,
                          defaultWidth: 250,
                        },
                        autoManual: {
                          minWidth: 90,
                        defaultWidth: 120,
                      },
                      value: {
                        minWidth: 120,
                        defaultWidth: 180,
                      },
                      units: {
                        minWidth: 100,
                        defaultWidth: 150,
                      },
                      range: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      calibration: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      sign: {
                        minWidth: 50,
                        defaultWidth: 60,
                      },
                      filter: {
                        minWidth: 60,
                        defaultWidth: 80,
                      },
                      status: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      signalType: {
                        minWidth: 90,
                        defaultWidth: 110,
                      },
                      label: {
                        minWidth: 130,
                        defaultWidth: 170,
                      },
                      type: {
                        minWidth: 60,
                        defaultWidth: 75,
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

                  {/* Loading Next Device Indicator */}
                  {isLoadingNextDevice && (
                    <div className={styles.autoLoadIndicator}>
                      <Spinner size="tiny" />
                      <Text size={200} weight="regular">Loading next device...</Text>
                    </div>
                  )}

                  {/* No Data Message - Show below grid when empty */}
                  {/* {inputs.length === 0 && (
                    <div className={styles.emptyStateContainer}>
                      <div className={styles.emptyStateHeader}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.emptyStateIcon}>
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                        </svg>
                        <Text size={400} weight="semibold">No inputs found</Text>
                      </div>
                      <Text size={300} className={styles.emptyStateText}>This device has no configured input points</Text>
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
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Range Selection Drawer */}
      {selectedInputForRange && (
        <RangeSelectionDrawer
          isOpen={rangeDrawerOpen}
          onClose={() => setRangeDrawerOpen(false)}
          currentRange={selectedInputForRange.range ? parseInt(selectedInputForRange.range) : 0}
          digitalAnalog={selectedInputForRange.signalType === 'Digital' ? 1 : 0}
          onSave={handleRangeSave}
          inputLabel={`Input ${selectedInputForRange.inputIndex || selectedInputForRange.inputId} - ${selectedInputForRange.fullLabel || 'Unnamed'}`}
        />
      )}
    </div>
  );
};

export default InputsPage;
