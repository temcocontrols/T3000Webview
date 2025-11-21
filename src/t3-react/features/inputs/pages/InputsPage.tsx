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
  Switch,
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
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { RangeSelectionDrawer } from '../components/RangeSelectionDrawer';
import { getRangeLabel } from '../data/rangeData';
import { API_BASE_URL } from '../../../config/constants';
import { InputRefreshApiService } from '../../../services/inputRefreshApi';
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
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();

  const [inputs, setInputs] = useState<InputPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
  const [autoRefreshed, setAutoRefreshed] = useState(false);

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

  // Auto-refresh once after page load (Trigger #1)
  useEffect(() => {
    if (loading || !selectedDevice || autoRefreshed) return;

    // Wait for initial load to complete, then auto-refresh from device
    const timer = setTimeout(async () => {
      try {
        console.log('[InputsPage] Auto-refreshing from device...');
        const refreshResponse = await InputRefreshApiService.refreshAllInputs(selectedDevice.serialNumber);
        console.log('[InputsPage] Refresh response:', refreshResponse);

        // Save to database
        if (refreshResponse.items && refreshResponse.items.length > 0) {
          await InputRefreshApiService.saveRefreshedInputs(selectedDevice.serialNumber, refreshResponse.items);
          // Only reload from database if save was successful
          await fetchInputs();
        } else {
          console.warn('[InputsPage] Auto-refresh: No items received, keeping existing data');
        }
        setAutoRefreshed(true);
      } catch (error) {
        console.error('[InputsPage] Auto-refresh failed:', error);
        // Don't reload from database on error - preserve existing inputs
        setAutoRefreshed(true); // Mark as attempted to prevent retry loops
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [loading, selectedDevice, autoRefreshed, fetchInputs]);

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
    try {
      console.log('[InputsPage] Refreshing all inputs from device...');
      const refreshResponse = await InputRefreshApiService.refreshAllInputs(selectedDevice.serialNumber);
      console.log('[InputsPage] Refresh response:', refreshResponse);

      // Save to database
      if (refreshResponse.items && refreshResponse.items.length > 0) {
        const saveResponse = await InputRefreshApiService.saveRefreshedInputs(
          selectedDevice.serialNumber,
          refreshResponse.items
        );
        console.log('[InputsPage] Save response:', saveResponse);

        // Only reload from database if save was successful
        await fetchInputs();
      } else {
        console.warn('[InputsPage] No items received from refresh, keeping existing data');
      }
    } catch (error) {
      console.error('[InputsPage] Failed to refresh from device:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh from device');
      // Don't call fetchInputs() on error - preserve existing inputs in UI
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
      console.log(`[InputsPage] Refreshing input ${index} from device...`);
      const refreshResponse = await InputRefreshApiService.refreshInput(selectedDevice.serialNumber, index);
      console.log('[InputsPage] Refresh response:', refreshResponse);

      // Save to database
      if (refreshResponse.items && refreshResponse.items.length > 0) {
        const saveResponse = await InputRefreshApiService.saveRefreshedInputs(
          selectedDevice.serialNumber,
          refreshResponse.items
        );
        console.log('[InputsPage] Save response:', saveResponse);
      }

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

  // Test function: Update full label using UPDATE_WEBVIEW_LIST (Action 16 - full record)
  // NOTE: Action 16 requires ALL fields to be provided, not just the changed field
  const updateFullLabelUsingAction16 = async (serialNumber: number, inputIndex: string, newLabel: string, currentInput: InputPoint) => {
    try {
      console.log(`[Action 16] Updating full label for Input ${inputIndex} (SN: ${serialNumber})`);

      // Action 16 requires ALL fields, so we send current values + the new label
      const payload = {
        fullLabel: newLabel, // New value
        label: currentInput.label || '',
        value: parseFloat(currentInput.fValue || '0'),
        range: parseInt(currentInput.range || '0'),
        autoManual: parseInt(currentInput.autoManual || '0'),
        control: 0, // Not in UI, use default
        filter: parseInt(currentInput.filterField || '0'),
        digitalAnalog: currentInput.digitalAnalog === '0' ? 0 : 1,
        calibrationSign: parseInt(currentInput.sign || '0'),
        calibrationH: 0, // Not in UI, use default
        calibrationL: 0, // Not in UI, use default
        decom: 0, // Not in UI, use default
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
      console.log('[Action 16] Success:', result);
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
      // Test both methods for fullLabel field
      if (editingCell.field === 'fullLabel' && selectedDevice) {
        console.log('=== Updating Full Label ===');
        console.log(`Device: ${selectedDevice.serialNumber}, Input: ${editingCell.inputIndex}, New Label: "${editValue}"`);
        console.log('Using Action 16 (UPDATE_WEBVIEW_LIST) - the only method that supports fullLabel');

        // Find the current input data to pass all fields for Action 16
        const currentInput = inputs.find(
          input => input.serialNumber === editingCell.serialNumber && input.inputIndex === editingCell.inputIndex
        );

        if (!currentInput) {
          throw new Error('Current input data not found');
        }

        // Use Action 16 (UPDATE_WEBVIEW_LIST) - This is the ONLY way to update fullLabel
        await updateFullLabelUsingAction16(
          selectedDevice.serialNumber,
          editingCell.inputIndex,
          editValue,
          currentInput
        );

        console.log('✅ Full label updated successfully!');
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

  const handleRangeSave = (newRange: number) => {
    if (!selectedInputForRange) return;

    // Update local state optimistically
    setInputs(prevInputs =>
      prevInputs.map(input =>
        input.serialNumber === selectedInputForRange.serialNumber &&
        input.inputIndex === selectedInputForRange.inputIndex
          ? { ...input, range: newRange.toString() }
          : input
      )
    );

    console.log('Range updated:', selectedInputForRange.serialNumber, selectedInputForRange.inputIndex, newRange);
    // TODO: Call API to update range value
    // Example: await updateInputRange(selectedInputForRange.serialNumber, selectedInputForRange.inputIndex, newRange);
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

  // Column definitions matching the sequence: Input, Panel, Full Label, Label, Auto/Man, Value, Units, Range, Calibration, Sign, Filter, Status, Signal Type, Type
  const columns: TableColumnDefinition<InputPoint>[] = [
    // 1. Input (Index/ID)
    createTableColumn<InputPoint>({
      columnId: 'input',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('input')}>
          <span>Input</span>
          {sortColumn === 'input' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => {
        const inputIndex = item.inputIndex || '';
        const isRefreshingThis = refreshingItems.has(inputIndex);

        return (
          <TableCellLayout>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefreshSingleInput(inputIndex);
                }}
                className={styles.saveButton}
                title="Refresh this input from device"
                style={{ padding: '2px 4px' }}
                disabled={isRefreshingThis}
              >
                <ArrowSyncRegular
                  style={{ fontSize: '14px' }}
                  className={isRefreshingThis ? styles.rotating : ''}
                />
              </button>
              <Text size={200} weight="regular">{item.inputId || item.inputIndex || '---'}</Text>
            </div>
          </TableCellLayout>
        );
      },
    }),
    // 2. Panel
    createTableColumn<InputPoint>({
      columnId: 'panel',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('panel')}>
          <span>Panel</span>
          {sortColumn === 'panel' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.panel || '---'}</TableCellLayout>,
    }),
    // 3. Full Label
    createTableColumn<InputPoint>({
      columnId: 'fullLabel',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('fullLabel')}>
          <span>Full Label</span>
          {sortColumn === 'fullLabel' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => {
        const isEditing = editingCell?.serialNumber === item.serialNumber &&
                          editingCell?.inputIndex === item.inputIndex &&
                          editingCell?.field === 'fullLabel';

        return (
          <TableCellLayout>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                <input
                  type="text"
                  className={styles.editInput}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleEditSave}
                  onKeyDown={handleEditKeyDown}
                  autoFocus
                  disabled={isSaving}
                  placeholder="Enter label"
                  aria-label="Edit full label"
                  style={{ flex: 1 }}
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
                  <SaveRegular style={{ fontSize: '18px' }} />
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
    // 4. Label (short label)
    createTableColumn<InputPoint>({
      columnId: 'label',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('label')}>
          <span>Label</span>
          {sortColumn === 'label' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => {
        const isEditing = editingCell?.serialNumber === item.serialNumber &&
                          editingCell?.inputIndex === item.inputIndex &&
                          editingCell?.field === 'label';

        return (
          <TableCellLayout>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                <input
                  type="text"
                  className={styles.editInput}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleEditSave}
                  onKeyDown={handleEditKeyDown}
                  autoFocus
                  disabled={isSaving}
                  placeholder="Enter label"
                  aria-label="Edit label"
                  style={{ flex: 1 }}
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
                  <SaveRegular style={{ fontSize: '18px' }} />
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
    // 5. Auto/Man
    createTableColumn<InputPoint>({
      columnId: 'autoManual',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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

            // Use Action 16 (UPDATE_WEBVIEW_LIST) - requires ALL fields
            const payload = {
              fullLabel: currentInput.fullLabel || '',
              label: currentInput.label || '',
              value: parseFloat(currentInput.fValue || '0'),
              range: parseInt(currentInput.range || '0'),
              autoManual: parseInt(newValue),
              control: 0,
              filter: parseInt(currentInput.filterField || '0'),
              digitalAnalog: currentInput.digitalAnalog === '0' ? 0 : 1,
              calibrationSign: parseInt(currentInput.sign || '0'),
              calibrationH: 0,
              calibrationL: 0,
              decom: 0,
            };

            console.log('[Action 16] Updating Auto/Man:', payload);

            const response = await fetch(
              `${API_BASE_URL}/api/t3_device/inputs/${item.serialNumber}/${item.inputIndex}`,
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
            setInputs(prevInputs =>
              prevInputs.map(input =>
                input.serialNumber === item.serialNumber && input.inputIndex === item.inputIndex
                  ? { ...input, autoManual: newValue }
                  : input
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
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Switch
                checked={isAuto}
                style={{ transform: 'scale(0.8)' }}
              />
            </div>
          </TableCellLayout>
        );
      },
    }),
    // 5. Value
    createTableColumn<InputPoint>({
      columnId: 'value',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('value')}>
          <span>Value</span>
          {sortColumn === 'value' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => {
        const isEditing = editingCell?.serialNumber === item.serialNumber &&
                          editingCell?.inputIndex === item.inputIndex &&
                          editingCell?.field === 'fValue';

        return (
          <TableCellLayout>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                <input
                  type="number"
                  step="0.01"
                  className={styles.editInput}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleEditSave}
                  onKeyDown={handleEditKeyDown}
                  autoFocus
                  disabled={isSaving}
                  placeholder="Enter value"
                  aria-label="Edit value"
                  style={{ flex: 1 }}
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
                  <SaveRegular style={{ fontSize: '18px' }} />
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
    // 6. Units
    createTableColumn<InputPoint>({
      columnId: 'units',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('units')}>
          <span>Units</span>
          {sortColumn === 'units' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.units || '---'}</TableCellLayout>,
    }),
    // 7. Range
    createTableColumn<InputPoint>({
      columnId: 'range',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('range')}>
          <span>Range</span>
          {sortColumn === 'range' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
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
            <div
              onClick={() => handleRangeClick(item)}
              style={{ cursor: 'pointer', color: '#0078d4' }}
              title="Click to change range"
            >
              <Text size={200} weight="regular">{rangeLabel}</Text>
            </div>
          </TableCellLayout>
        );
      },
    }),
    // 8. Calibration
    createTableColumn<InputPoint>({
      columnId: 'calibration',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Calibration</span>
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.calibration || '0'}</TableCellLayout>,
    }),
    // 9. Sign
    createTableColumn<InputPoint>({
      columnId: 'sign',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Sign</span>
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.sign || '+'}</TableCellLayout>,
    }),
    // 10. Filter
    createTableColumn<InputPoint>({
      columnId: 'filter',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Filter</span>
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.filterField || '0'}</TableCellLayout>,
    }),
    // 11. Status
    createTableColumn<InputPoint>({
      columnId: 'status',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('status')}>
          <span>Status</span>
          {sortColumn === 'status' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
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
            <Badge
              appearance="filled"
              color={statusColor}
            >
              {statusText}
            </Badge>
          </TableCellLayout>
        );
      },
    }),
    // 12. Signal Type (keep empty for now)
    createTableColumn<InputPoint>({
      columnId: 'signalType',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Signal Type</span>
        </div>
      ),
      renderCell: () => <TableCellLayout>---</TableCellLayout>,
    }),
    // 13. Type (Digital/Analog)
    createTableColumn<InputPoint>({
      columnId: 'type',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Type</span>
        </div>
      ),
      renderCell: (item) => {
        const isDigital = item.digitalAnalog === '0';
        return (
          <TableCellLayout>
            <Badge
              appearance="outline"
              color={isDigital ? 'informative' : 'brand'}
            >
              {isDigital ? 'Digital' : 'Analog'}
            </Badge>
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
                    Showing input points for <b>{selectedDevice.nameShowOnTree} (SN: {selectedDevice.serialNumber})</b>.
                    {' '}This table displays all configured input points including digital and analog sensors, their current values,
                    calibration settings, and operational status.
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
                    title="Refresh All from Device"
                    aria-label="Refresh All from Device"
                  >
                    <ArrowSyncRegular />
                    <span>{refreshing ? 'Refreshing...' : 'Refresh All'}</span>
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
                </div>
              </div>
              )}

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
                {loading && inputs.length === 0 && (
                  <div className={styles.loadingBar}>
                    <Spinner size="tiny" />
                    <Text>Loading inputs...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div style={{ textAlign: 'center' }}>
                      <Text size={500} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={300}>Please select a device from the tree to view inputs</Text>
                    </div>
                  </div>
                )}

                {/* Data Grid - Always show with header (even when there's an error) */}
                {selectedDevice && !loading && (
                  <>
                    <DataGrid
                      items={inputs}
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

                  {/* No Data Message - Show below grid when empty */}
                  {inputs.length === 0 && (
                    <div style={{ marginTop: '24px', textAlign: 'center', padding: '0 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                        </svg>
                        <Text size={400} weight="semibold">No inputs found</Text>
                      </div>
                      <Text size={300} style={{ display: 'block', marginBottom: '16px', color: '#605e5c', textAlign: 'center' }}>This device has no configured input points</Text>
                      <Button
                        appearance="subtle"
                        icon={<ArrowSyncRegular />}
                        onClick={handleRefresh}
                        style={{ minWidth: '120px', fontWeight: 'normal' }}
                      >
                        Refresh
                      </Button>
                    </div>
                  )}
                  </>
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
