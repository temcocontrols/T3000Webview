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
import { PanelDataRefreshService } from '../../../shared/services/panelDataRefreshService';
import { useStatusBarStore } from '../../../store/statusBarStore';
import { SyncStatusBar } from '../../../shared/components/SyncStatusBar';
import styles from './VariablesPage.module.css';

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
  filterField?: string;
  status?: string;
  digitalAnalog?: string;
  label?: string;
  typeField?: string;
}

export const VariablesPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice, getNextDevice, getFilteredDevices } = useDeviceTreeStore();
  const setMessage = useStatusBarStore((state) => state.setMessage);

  const [variables, setVariables] = useState<VariablePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
  const [autoRefreshed, setAutoRefreshed] = useState(false);

  // Auto-scroll feature state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingNextDevice, setIsLoadingNextDevice] = useState(false);
  const isAtBottomRef = useRef(false); // Track if user is already at bottom

  // Auto-select first device on page load if no device is selected
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

  // Fetch variables for selected device
  const fetchVariables = useCallback(async () => {
    if (!selectedDevice) {
      setVariables([]);
      return;
    }

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load variables';
      setError(errorMessage);
      console.error('Error fetching variables:', err);
      // DON'T clear variables on database fetch error - preserve what we have
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  // Auto-refresh once after page load (Trigger #1) - ONLY if database is empty
  useEffect(() => {
    if (loading || !selectedDevice || autoRefreshed) return;

    // Wait for initial load to complete, then check if we need to refresh from device
    const timer = setTimeout(async () => {
      try {
        // Check if database has variable data
        if (variables.length > 0) {
          console.log('[VariablesPage] Database has data, skipping auto-refresh');
          setAutoRefreshed(true);
          return;
        }

        console.log('[VariablesPage] Database empty, auto-refreshing from device...');
        const refreshResponse = await VariableRefreshApiService.refreshAllVariables(selectedDevice.serialNumber);
        console.log('[VariablesPage] Refresh response:', refreshResponse);

        // Save to database
        if (refreshResponse.items && refreshResponse.items.length > 0) {
          await VariableRefreshApiService.saveRefreshedVariables(selectedDevice.serialNumber, refreshResponse.items);
          // Only reload from database if save was successful
          await fetchVariables();
        } else {
          console.warn('[VariablesPage] Auto-refresh: No items received, keeping existing data');
        }
        setAutoRefreshed(true);
      } catch (error) {
        console.error('[VariablesPage] Auto-refresh failed:', error);
        // Don't reload from database on error - preserve existing variables
        setAutoRefreshed(true); // Mark as attempted to prevent retry loops
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [loading, selectedDevice, autoRefreshed, fetchVariables, variables.length]);

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
      const result = await PanelDataRefreshService.refreshAllVariables(selectedDevice.serialNumber);
      console.log('[VariablesPage] Refresh result:', result);

      // Reload from database after successful save
      await fetchVariables();
      setMessage(result.message, 'success');
    } catch (error) {
      console.error('[VariablesPage] Failed to refresh from device:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to refresh from device';
      setError(errorMsg);
      setMessage(errorMsg, 'error');
    } finally {
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
    console.log('Export variables to CSV');
  };

  const handleSettings = () => {
    console.log('Settings clicked');
  };

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
      // Use Action 16 for editable fields (fullLabel, fValue)
      if (selectedDevice && ['fullLabel', 'fValue'].includes(editingCell.field)) {
        console.log(`=== Updating ${editingCell.field} ===`);
        console.log(`Device: ${selectedDevice.serialNumber}, Variable: ${editingCell.variableIndex}, New Value: "${editValue}"`);
        console.log('Using Action 16 (UPDATE_WEBVIEW_LIST)');

        // Find the current variable data to pass all fields for Action 16
        const currentVariable = variables.find(
          variable => variable.serialNumber === editingCell.serialNumber && variable.variableIndex === editingCell.variableIndex
        );

        if (!currentVariable) {
          throw new Error('Current variable data not found');
        }

        // Prepare payload with all required fields
        const payload = {
          fullLabel: editingCell.field === 'fullLabel' ? editValue : (currentVariable.fullLabel || ''),
          label: currentVariable.label || '',
          value: editingCell.field === 'fValue' ? parseFloat(editValue || '0') : parseFloat(currentVariable.fValue || '0'),
          range: parseInt(currentVariable.rangeField || '0'),
          autoManual: parseInt(currentVariable.autoManual || '0'),
          control: 0,
          filter: parseInt(currentVariable.filterField || '0'),
          digitalAnalog: currentVariable.digitalAnalog === '1' ? 1 : 0,
          calibrationSign: parseInt(currentVariable.sign || '0'),
          calibrationH: 0,
          calibrationL: 0,
        };

        console.log('[Action 16] Full payload:', payload);

        const response = await fetch(
          `${API_BASE_URL}/api/t3_device/variables/${selectedDevice.serialNumber}/${editingCell.variableIndex}`,
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
        console.log(`✅ ${editingCell.field} updated successfully!`, result);
      }

      // Update local state optimistically
      setVariables(prevVariables =>
        prevVariables.map(variable =>
          variable.serialNumber === editingCell.serialNumber &&
          variable.variableIndex === editingCell.variableIndex
            ? { ...variable, [editingCell.field]: editValue }
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

  const handleRangeSave = async (newRange: number) => {
    if (!selectedVariableForRange) return;

    try {
      console.log(`[Action 16] Updating Range/Units for Variable ${selectedVariableForRange.variableIndex} (SN: ${selectedVariableForRange.serialNumber})`);

      // Action 16 requires ALL fields
      const payload = {
        fullLabel: selectedVariableForRange.fullLabel || '',
        label: selectedVariableForRange.label || '',
        value: parseFloat(selectedVariableForRange.fValue || '0'),
        range: newRange,
        autoManual: parseInt(selectedVariableForRange.autoManual || '0'),
        control: 0,
        filter: parseInt(selectedVariableForRange.filterField || '0'),
        digitalAnalog: selectedVariableForRange.digitalAnalog === '1' ? 1 : 0,
        calibrationSign: parseInt(selectedVariableForRange.sign || '0'),
        calibrationH: 0,
        calibrationL: 0,
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
            ? { ...variable, rangeField: newRange.toString() }
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

  // Display data with 10 empty rows when no variables
  const displayVariables = React.useMemo(() => {
    if (variables.length === 0) {
      return Array(10).fill(null).map((_, index) => ({
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
        filterField: '',
        status: '',
        digitalAnalog: '',
        label: '',
        typeField: '',
      }));
    }
    return variables;
  }, [variables, selectedDevice]);

  // Helper to identify empty rows
  const isEmptyRow = (item: VariablePoint) => !item.variableIndex && !item.variableId && variables.length === 0;

  // Column definitions matching the sequence: Panel, Variable, Full Label, Label, Auto/Manual, Value, Units
  const columns: TableColumnDefinition<VariablePoint>[] = [
    // 1. Panel ID
    createTableColumn<VariablePoint>({
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
    // 2. Variable (Index/ID)
    createTableColumn<VariablePoint>({
      columnId: 'variable',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('variable')}>
          <span>Variable</span>
          {sortColumn === 'variable' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => {
        if (isEmptyRow(item)) {
          return <TableCellLayout></TableCellLayout>;
        }

        const isRefreshing = refreshingItems.has(item.variableIndex || '');

        return (
          <TableCellLayout>
            <div className={styles.cellFlexContainer}>
              <button
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
              </button>
              <Text size={200} weight="regular">
                {item.variableId || (item.variableIndex ? `VAR${parseInt(item.variableIndex) + 1}` : '---')}
              </Text>
            </div>
          </TableCellLayout>
        );
      },
    }),
    // 3. Full Label
    createTableColumn<VariablePoint>({
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
                <Text size={200} weight="regular">{item.fullLabel || 'Unnamed'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 3. Label (short label)
    createTableColumn<VariablePoint>({
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
                <Text size={200} weight="regular">{item.label || '---'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 4. Auto/Manual
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
              control: 0,
              filter: parseInt(currentVariable.filterField || '0'),
              digitalAnalog: currentVariable.digitalAnalog === '1' ? 1 : 0,
              calibrationSign: parseInt(currentVariable.sign || '0'),
              calibrationH: 0,
              calibrationL: 0,
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
    // 5. Value
    createTableColumn<VariablePoint>({
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
                onDoubleClick={() => handleCellDoubleClick(item, 'fValue', item.fValue?.toString() || '0')}
                title="Double-click to edit"
              >
                <Text size={200} weight="regular">{item.fValue || '---'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 7. Units
    createTableColumn<VariablePoint>({
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
      renderCell: (item) => {
        if (isEmptyRow(item)) {
          return <TableCellLayout></TableCellLayout>;
        }

        // Parse range value and digital_analog type
        const rangeValue = item.rangeField ? parseInt(item.rangeField) : 0;
        const digitalAnalog = item.digitalAnalog === '1' ? 1 : 0;
        const rangeLabel = getRangeLabel(rangeValue, digitalAnalog);

        return (
          <TableCellLayout>
            <div
              onClick={() => handleUnitsClick(item)}
              className={styles.rangeLink}
              title="Click to change range/units"
            >
              <Text size={200} weight="regular">{rangeLabel}</Text>
            </div>
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
                      placeholder="Search variables..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search variables"
                    />
                  </div>

                  {/* Info Button with Tooltip */}
                  <Tooltip
                    content={`Showing variable points for ${selectedDevice.nameShowOnTree} (SN: ${selectedDevice.serialNumber}). This table displays all configured variable points used for internal calculations, logic operations, and data storage within the building automation system.`}
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
                {loading && variables.length === 0 && (
                  <div className={styles.loadingBar}>
                    <Spinner size="tiny" />
                    <Text size={200} weight="regular">Loading variables...</Text>
                    <Text>Loading variables...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div className={styles.centerText}>
                      <Text size={400} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={200}>Please select a device from the tree to view variables</Text>
                    </div>
                  </div>
                )}

                {/* Data Grid - Always show with header (even when there's an error) */}
                {selectedDevice && !loading && (
                  <div
                    ref={scrollContainerRef}
                    className={styles.scrollContainer}
                    onScroll={handleScroll}
                    onWheel={handleWheel}
                  >
                  <DataGrid
                    items={displayVariables}
                    columns={columns}
                    sortable
                    resizableColumns
                    columnSizingOptions={{
                      variable: {
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
                      label: {
                        minWidth: 130,
                        defaultWidth: 170,
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
                    }}
                  >
                    <DataGridHeader>
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

export default VariablesPage;
