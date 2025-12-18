/**
 * Outputs Page - Azure Portal Complete Sample
 *
 * Complete Azure Portal blade layout matching Cost Management + Billing
 * Extracted from: https://portal.azure.com/#view/Microsoft_Azure_GTM/ModernBillingMenuBlade/~/BillingAccounts
 *
 * This is a fully functional Azure Portal-style page that can be used as a sample
 * Update with real output fields as needed
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
import { PanelDataRefreshService } from '../../../shared/services/panelDataRefreshService';
import { useStatusBarStore } from '../../../store/statusBarStore';
import styles from './OutputsPage.module.css';

// Types based on Rust entity (output_points.rs)
interface OutputPoint {
  serialNumber: number;
  outputId?: string;
  outputIndex?: string;
  panel?: string;
  fullLabel?: string;
  autoManual?: string;
  hwSwitchStatus?: string;  // HOA Switch: 0=MAN-OFF, 1=AUTO, 2=MAN-ON
  fValue?: string;
  units?: string;
  range?: string;
  rangeField?: string;
  lowVoltage?: string;
  highVoltage?: string;
  pwmPeriod?: string;
  status?: string;
  signalType?: string;
  digitalAnalog?: string;
  label?: string;
  typeField?: string;
}

export const OutputsPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice, getNextDevice, getFilteredDevices } = useDeviceTreeStore();
  const setMessage = useStatusBarStore((state) => state.setMessage);

  const [outputs, setOutputs] = useState<OutputPoint[]>([]);
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
      console.log('[OutputsPage] Auto-select check:', {
        hasSelectedDevice: !!selectedDevice,
        treeDataLength: treeData.length,
        filteredDevicesCount: filteredDevices.length,
        filteredDevicesList: filteredDevices.map(d => `${d.nameShowOnTree} (SN: ${d.serialNumber})`),
      });

      if (filteredDevices.length > 0) {
        const firstDevice = filteredDevices[0];
        console.log(`[OutputsPage] Auto-selecting first device: ${firstDevice.nameShowOnTree} (SN: ${firstDevice.serialNumber})`);
        selectDevice(firstDevice);
      }
    }
  }, [selectedDevice, treeData, selectDevice, getFilteredDevices]);

  // Fetch outputs for selected device
  const fetchOutputs = useCallback(async () => {
    if (!selectedDevice) {
      setOutputs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/output-points`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch outputs: ${response.statusText}`);
      }

      const data = await response.json();
      const fetchedOutputs = data.output_points || [];
      setOutputs(fetchedOutputs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load outputs';
      setError(errorMessage);
      console.error('Error fetching outputs:', err);
      // DON'T clear outputs on database fetch error - preserve what we have
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchOutputs();
  }, [fetchOutputs]);

  // Auto-refresh once after page load (Trigger #1)
  useEffect(() => {
    if (loading || !selectedDevice || autoRefreshed) return;

    // Wait for initial load to complete, then auto-refresh from device
    const timer = setTimeout(async () => {
      try {
        console.log('[OutputsPage] Auto-refreshing from device...');
        const refreshResponse = await OutputRefreshApiService.refreshAllOutputs(selectedDevice.serialNumber);
        console.log('[OutputsPage] Refresh response:', refreshResponse);

        // Save to database
        if (refreshResponse.items && refreshResponse.items.length > 0) {
          await OutputRefreshApiService.saveRefreshedOutputs(selectedDevice.serialNumber, refreshResponse.items);
          // Only reload from database if save was successful
          await fetchOutputs();
        } else {
          console.warn('[OutputsPage] Auto-refresh: No items received, keeping existing data');
        }
        setAutoRefreshed(true);
      } catch (error) {
        console.error('[OutputsPage] Auto-refresh failed:', error);
        // Don't reload from database on error - preserve existing outputs
        setAutoRefreshed(true); // Mark as attempted to prevent retry loops
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [loading, selectedDevice, autoRefreshed, fetchOutputs]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOutputs();
    setRefreshing(false);
  };

  // Refresh all outputs from device (Trigger #2: Manual "Refresh All" button)
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    setMessage('Refreshing outputs from device...', 'info');

    try {
      console.log('[OutputsPage] Refreshing all outputs from device via FFI...');
      const result = await PanelDataRefreshService.refreshAllOutputs(selectedDevice.serialNumber);
      console.log('[OutputsPage] Refresh result:', result);

      // Reload from database after successful save
      await fetchOutputs();
      setMessage(result.message, 'success');
    } catch (error) {
      console.error('[OutputsPage] Failed to refresh from device:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to refresh from device';
      setError(errorMsg);
      setMessage(errorMsg, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Refresh single output from device (Trigger #3: Per-row refresh icon)
  const handleRefreshSingleOutput = async (outputIndex: string) => {
    if (!selectedDevice) return;

    const index = parseInt(outputIndex, 10);
    if (isNaN(index)) {
      console.error('[OutputsPage] Invalid output index:', outputIndex);
      return;
    }

    setRefreshingItems(prev => new Set(prev).add(outputIndex));
    try {
      console.log(`[OutputsPage] Refreshing output ${index} from device via FFI...`);
      const result = await PanelDataRefreshService.refreshSingleOutput(selectedDevice.serialNumber, index);
      console.log('[OutputsPage] Refresh result:', result);

      // Reload data from database after save
      await fetchOutputs();
    } catch (error) {
      console.error(`[OutputsPage] Failed to refresh output ${index}:`, error);
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(outputIndex);
        return newSet;
      });
    }
  };

  const handleExport = () => {
    console.log('Export outputs to CSV');
  };

  const handleSettings = () => {
    console.log('Settings clicked');
  };

  // Auto-scroll to next device when reaching bottom
  const loadNextDevice = useCallback(async () => {
    const nextDevice = getNextDevice();

    if (!nextDevice) {
      console.log('[OutputsPage] No next device available');
      return;
    }

    console.log(`[OutputsPage] Auto-loading next device: ${nextDevice.nameShowOnTree} (SN: ${nextDevice.serialNumber})`);
    setIsLoadingNextDevice(true);

    // Switch device (this will trigger fetchOutputs via useEffect)
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

    if (isAtBottom && outputs.length > 0) {
      // Mark that we're at bottom
      isAtBottomRef.current = true;
      console.log('[OutputsPage] Reached bottom, scroll again to load next device');
    } else {
      // Not at bottom anymore, reset the flag
      isAtBottomRef.current = false;
    }
  }, [isLoadingNextDevice, loading, outputs.length]);

  // Handle wheel event to detect scroll attempts when already at bottom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (isLoadingNextDevice || loading || outputs.length === 0) {
      return;
    }

    // If user is scrolling down (deltaY > 0) and already at bottom, load next device
    if (e.deltaY > 0 && isAtBottomRef.current) {
      console.log('[OutputsPage] User scrolled down while at bottom, loading next device');
      isAtBottomRef.current = false; // Reset
      loadNextDevice();
    }
  }, [isLoadingNextDevice, loading, outputs.length, loadNextDevice]);

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
  const handleCellDoubleClick = (item: OutputPoint, field: string, currentValue: string) => {
    setEditingCell({ serialNumber: item.serialNumber, outputIndex: item.outputIndex || '', field });
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
        console.log(`Device: ${selectedDevice.serialNumber}, Output: ${editingCell.outputIndex}, New Value: "${editValue}"`);
        console.log('Using Action 16 (UPDATE_WEBVIEW_LIST)');

        // Find the current output data to pass all fields for Action 16
        const currentOutput = outputs.find(
          output => output.serialNumber === editingCell.serialNumber && output.outputIndex === editingCell.outputIndex
        );

        if (!currentOutput) {
          throw new Error('Current output data not found');
        }

        // Prepare payload with all required fields
        const payload = {
          fullLabel: editingCell.field === 'fullLabel' ? editValue : (currentOutput.fullLabel || ''),
          label: currentOutput.label || '',
          value: editingCell.field === 'fValue' ? parseFloat(editValue || '0') : parseFloat(currentOutput.fValue || '0'),
          range: parseInt(currentOutput.range || '0'),
          autoManual: parseInt(currentOutput.autoManual || '0'),
          control: 0,
          lowVoltage: parseFloat(currentOutput.lowVoltage || '0'),
          highVoltage: parseFloat(currentOutput.highVoltage || '0'),
          pwmPeriod: parseInt(currentOutput.pwmPeriod || '0'),
        };

        console.log('[Action 16] Full payload:', payload);

        const response = await fetch(
          `${API_BASE_URL}/api/t3_device/outputs/${selectedDevice.serialNumber}/${editingCell.outputIndex}`,
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
      setOutputs(prevOutputs =>
        prevOutputs.map(output =>
          output.serialNumber === editingCell.serialNumber &&
          output.outputIndex === editingCell.outputIndex
            ? { ...output, [editingCell.field]: editValue }
            : output
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
  const [editingCell, setEditingCell] = useState<{ serialNumber: number; outputIndex: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Range drawer state
  const [rangeDrawerOpen, setRangeDrawerOpen] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<OutputPoint | null>(null);

  // Range selection handlers
  const handleRangeClick = (item: OutputPoint) => {
    setSelectedOutput(item);
    setRangeDrawerOpen(true);
  };

  const handleRangeSave = async (newRange: number) => {
    if (!selectedOutput) return;

    try {
      console.log(`[Action 16] Updating Range for Output ${selectedOutput.outputIndex} (SN: ${selectedOutput.serialNumber})`);

      // Action 16 requires ALL fields
      const payload = {
        fullLabel: selectedOutput.fullLabel || '',
        label: selectedOutput.label || '',
        value: parseFloat(selectedOutput.fValue || '0'),
        range: newRange,
        autoManual: parseInt(selectedOutput.autoManual || '0'),
        control: 0,
        lowVoltage: parseFloat(selectedOutput.lowVoltage || '0'),
        highVoltage: parseFloat(selectedOutput.highVoltage || '0'),
        pwmPeriod: parseInt(selectedOutput.pwmPeriod || '0'),
      };

      console.log('[Action 16] Full payload:', payload);

      const response = await fetch(
        `${API_BASE_URL}/api/t3_device/outputs/${selectedOutput.serialNumber}/${selectedOutput.outputIndex}`,
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
      console.log('[Action 16] Range updated successfully:', result);

      // Update local state optimistically
      setOutputs(prevOutputs =>
        prevOutputs.map(output =>
          output.serialNumber === selectedOutput.serialNumber &&
          output.outputIndex === selectedOutput.outputIndex
            ? { ...output, range: newRange.toString() }
            : output
        )
      );
    } catch (error) {
      console.error('Failed to update Range:', error);
      alert(`Failed to update Range: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Column definitions matching the sequence: Panel, Output, Full Label, Label, Auto/Man, HOA Switch, Value, Units, Range, Low V, High V, PWM Period, Status, Type
  const columns: TableColumnDefinition<OutputPoint>[] = [
    // 1. Panel ID
    createTableColumn<OutputPoint>({
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
      renderCell: (item) => <TableCellLayout>{item.panel || '---'}</TableCellLayout>,
    }),
    // 2. Output (Index/ID)
    createTableColumn<OutputPoint>({
      columnId: 'output',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('output')}>
          <span>Output</span>
          {sortColumn === 'output' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => {
        const isRefreshing = refreshingItems.has(item.outputIndex || '');

        return (
          <TableCellLayout>
            <div className={styles.cellFlexContainer}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefreshSingleOutput(item.outputIndex || '');
                }}
                className={`${styles.refreshIconButton} ${isRefreshing ? styles.isRefreshing : ''}`}
                title="Refresh this output from device"
                disabled={isRefreshing}
              >
                <ArrowSyncRegular
                  className={`${styles.iconSmall} ${isRefreshing ? styles.rotating : ''}`}
                />
              </button>
              <Text size={200} weight="regular">{item.outputId || item.outputIndex || '---'}</Text>
            </div>
          </TableCellLayout>
        );
      },
    }),
    // 3. Full Label
    createTableColumn<OutputPoint>({
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
                          editingCell?.outputIndex === item.outputIndex &&
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
    // 4. Label (short label)
    createTableColumn<OutputPoint>({
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
                          editingCell?.outputIndex === item.outputIndex &&
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
    // 5. Auto/Man
    createTableColumn<OutputPoint>({
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
          console.log('Auto/Man toggled:', item.serialNumber, item.outputIndex, newValue);

          try {
            // Find the current output data to pass all fields for Action 16
            const currentOutput = outputs.find(
              output => output.serialNumber === item.serialNumber && output.outputIndex === item.outputIndex
            );

            if (!currentOutput) {
              throw new Error('Current output data not found');
            }

            // Use Action 16 (UPDATE_WEBVIEW_LIST) - requires ALL fields
            const payload = {
              fullLabel: currentOutput.fullLabel || '',
              label: currentOutput.label || '',
              value: parseFloat(currentOutput.fValue || '0'),
              range: parseInt(currentOutput.range || '0'),
              autoManual: parseInt(newValue),
              control: 0,
              lowVoltage: parseFloat(currentOutput.lowVoltage || '0'),
              highVoltage: parseFloat(currentOutput.highVoltage || '0'),
              pwmPeriod: parseInt(currentOutput.pwmPeriod || '0'),
            };

            console.log('[Action 16] Updating Auto/Man:', payload);

            const response = await fetch(
              `${API_BASE_URL}/api/t3_device/outputs/${item.serialNumber}/${item.outputIndex}`,
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
            setOutputs(prevOutputs =>
              prevOutputs.map(output =>
                output.serialNumber === item.serialNumber && output.outputIndex === item.outputIndex
                  ? { ...output, autoManual: newValue }
                  : output
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
    // 6. HOA Switch
    createTableColumn<OutputPoint>({
      columnId: 'hoaSwitch',
      renderHeaderCell: () => (
        <div className={styles.headerCell}>
          <span>HOA Switch</span>
        </div>
      ),
      renderCell: (item) => {
        // HOA Switch values: 0=MAN-OFF, 1=AUTO, 2=MAN-ON
        const switchValue = item.hwSwitchStatus?.toString() || '1';
        let switchText = 'AUTO';
        let badgeColor: 'success' | 'warning' | 'danger' = 'success';

        if (switchValue === '0') {
          switchText = 'MAN-OFF';
          badgeColor = 'danger';
        } else if (switchValue === '2') {
          switchText = 'MAN-ON';
          badgeColor = 'warning';
        } else {
          switchText = 'AUTO';
          badgeColor = 'success';
        }

        return (
          <TableCellLayout>
            <Badge appearance="filled" color={badgeColor} size="small">
              {switchText}
            </Badge>
          </TableCellLayout>
        );
      },
    }),
    // 7. Value
    createTableColumn<OutputPoint>({
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
                          editingCell?.outputIndex === item.outputIndex &&
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
    // 8. Units
    createTableColumn<OutputPoint>({
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
      renderCell: (item) => <TableCellLayout>{item.units || '---'}</TableCellLayout>,
    }),
    // 7. Range
    createTableColumn<OutputPoint>({
      columnId: 'range',
      compare: (a, b) => {
        const aVal = a.range || '';
        const bVal = b.range || '';
        return aVal.localeCompare(bVal);
      },
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
            <div
              onClick={() => handleRangeClick(item)}
              className={styles.rangeLink}
              title="Click to change range"
            >
              <Text size={200} weight="regular">{rangeLabel}</Text>
            </div>
          </TableCellLayout>
        );
      },
    }),
    // 10. Low V
    createTableColumn<OutputPoint>({
      columnId: 'lowVoltage',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('lowVoltage')}>
          <span>Low V</span>
          {sortColumn === 'lowVoltage' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => {
        const isEditing = editingCell?.serialNumber === item.serialNumber &&
                          editingCell?.outputIndex === item.outputIndex &&
                          editingCell?.field === 'lowVoltage';

        return (
          <TableCellLayout>
            {isEditing ? (
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
                placeholder="Enter voltage"
                aria-label="Edit low voltage"
              />
            ) : (
              <div
                className={styles.editableCell}
                onDoubleClick={() => handleCellDoubleClick(item, 'lowVoltage', item.lowVoltage?.toString() || '0')}
                title="Double-click to edit"
              >
                <Text size={200} weight="regular">{item.lowVoltage || '---'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 11. High V
    createTableColumn<OutputPoint>({
      columnId: 'highVoltage',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('highVoltage')}>
          <span>High V</span>
          {sortColumn === 'highVoltage' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => {
        const isEditing = editingCell?.serialNumber === item.serialNumber &&
                          editingCell?.outputIndex === item.outputIndex &&
                          editingCell?.field === 'highVoltage';

        return (
          <TableCellLayout>
            {isEditing ? (
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
                placeholder="Enter voltage"
                aria-label="Edit high voltage"
              />
            ) : (
              <div
                className={styles.editableCell}
                onDoubleClick={() => handleCellDoubleClick(item, 'highVoltage', item.highVoltage?.toString() || '0')}
                title="Double-click to edit"
              >
                <Text size={200} weight="regular">{item.highVoltage || '---'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 12. PWM Period
    createTableColumn<OutputPoint>({
      columnId: 'pwmPeriod',
      renderHeaderCell: () => (
        <div className={styles.headerCell}>
          <span>PWM Period</span>
        </div>
      ),
      renderCell: (item) => {
        const isEditing = editingCell?.serialNumber === item.serialNumber &&
                          editingCell?.outputIndex === item.outputIndex &&
                          editingCell?.field === 'pwmPeriod';

        return (
          <TableCellLayout>
            {isEditing ? (
              <input
                type="number"
                step="1"
                className={styles.editInput}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleEditSave}
                onKeyDown={handleEditKeyDown}
                autoFocus
                disabled={isSaving}
                placeholder="Enter period"
                aria-label="Edit PWM period"
              />
            ) : (
              <div
                className={styles.editableCell}
                onDoubleClick={() => handleCellDoubleClick(item, 'pwmPeriod', item.pwmPeriod?.toString() || '0')}
                title="Double-click to edit"
              >
                <Text size={200} weight="regular">{item.pwmPeriod || '---'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 13. Status
    createTableColumn<OutputPoint>({
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
    // 14. Type
    createTableColumn<OutputPoint>({
      columnId: 'signalType',
      renderHeaderCell: () => (
        <div className={styles.headerCell}>
          <span>Type</span>
        </div>
      ),
      renderCell: (item) => {
        // Type values: 0=Virtual, 1=Digital, 2=Analog, 3=Extend Digital, 4=Extend Analog, 5=Internal
        const typeValue = item.typeField || '0';
        let typeText = 'Virtual';
        let badgeColor: 'success' | 'informative' | 'brand' | 'warning' = 'success';

        switch (typeValue) {
          case '0':
            typeText = 'Virtual';
            badgeColor = 'success';
            break;
          case '1':
            typeText = 'Digital';
            badgeColor = 'informative';
            break;
          case '2':
            typeText = 'Analog';
            badgeColor = 'brand';
            break;
          case '3':
            typeText = 'Extend Digital';
            badgeColor = 'informative';
            break;
          case '4':
            typeText = 'Extend Analog';
            badgeColor = 'brand';
            break;
          case '5':
            typeText = 'Internal';
            badgeColor = 'warning';
            break;
          default:
            typeText = 'Virtual';
            badgeColor = 'success';
        }

        return (
          <TableCellLayout>
            <Badge appearance="outline" color={badgeColor}>
              {typeText}
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
                  {/* Refresh Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleRefreshFromDevice}
                    disabled={refreshing}
                    title="Refresh all outputs from device"
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
                      placeholder="Search outputs..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search outputs"
                    />
                  </div>

                  {/* Info Button with Tooltip */}
                  <Tooltip
                    content={`Showing output points for ${selectedDevice.nameShowOnTree} (SN: ${selectedDevice.serialNumber}). This table displays all configured output points including digital and analog outputs, their current values, voltage settings, and operational status.`}
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
                  HORIZONTAL DIVIDER
                  Matches: ext-overview-hr
                  ======================================== */}
              <div className={styles.noPadding}>
                <hr className={styles.overviewHr} />
              </div>

              {/* ========================================
                  DOCKING BODY - Main Content
                  Matches: msportalfx-docking-body
                  ======================================== */}
              <div className={styles.dockingBody}>

                {/* Loading State */}
                {loading && outputs.length === 0 && (
                  <div className={styles.loadingBar}>
                    <Spinner size="tiny" />
                    <Text size={200} weight="regular">Loading outputs...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div className={styles.centerText}>
                      <Text size={500} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={300}>Please select a device from the tree to view outputs</Text>
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
                      items={outputs}
                      columns={columns}
                      sortable
                      resizableColumns
                      columnSizingOptions={{
                        output: {
                          minWidth: 60,
                          defaultWidth: 80,
                        },
                        panel: {
                          minWidth: 60,
                          defaultWidth: 75,
                        },
                        fullLabel: {
                          minWidth: 150,
                          defaultWidth: 200,
                        },
                        autoManual: {
                          minWidth: 90,
                          defaultWidth: 120,
                        },
                        hoaSwitch: {
                          minWidth: 80,
                          defaultWidth: 120,
                        },
                        value: {
                          minWidth: 100,
                          defaultWidth: 140,
                        },
                        units: {
                          minWidth: 100,
                          defaultWidth: 150,
                        },
                        range: {
                          minWidth: 80,
                          defaultWidth: 120,
                        },
                        lowVoltage: {
                          minWidth: 80,
                          defaultWidth: 100,
                        },
                        highVoltage: {
                          minWidth: 80,
                          defaultWidth: 100,
                        },
                        pwmPeriod: {
                          minWidth: 90,
                          defaultWidth: 120,
                        },
                        status: {
                          minWidth: 80,
                          defaultWidth: 100,
                        },
                        signalType: {
                          minWidth: 60,
                          defaultWidth: 80,
                        },
                        label: {
                          minWidth: 130,
                          defaultWidth: 170,
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
                      <DataGridBody<OutputPoint>>
                        {({ item, rowId }) => (
                          <DataGridRow<OutputPoint> key={rowId}>
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
                    {outputs.length === 0 && (
                      <div className={styles.emptyStateContainer}>
                        <div className={styles.emptyStateHeader}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.emptyStateIcon}>
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                          </svg>
                          <Text size={400} weight="semibold">No outputs found</Text>
                        </div>
                        <Text size={300} className={styles.emptyStateText}>This device has no configured output points</Text>
                        <Button
                          appearance="subtle"
                          icon={<ArrowSyncRegular />}
                          onClick={handleRefresh}
                          className={styles.refreshButton}
                        >
                          Refresh
                        </Button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Range Selection Drawer */}
      {selectedOutput && (
        <RangeSelectionDrawer
          isOpen={rangeDrawerOpen}
          onClose={() => setRangeDrawerOpen(false)}
          currentRange={selectedOutput.range ? parseInt(selectedOutput.range) : 0}
          digitalAnalog={selectedOutput.signalType === 'Digital' ? 1 : 0}
          onSave={handleRangeSave}
          inputLabel={`Output ${selectedOutput.outputIndex || selectedOutput.outputId} - ${selectedOutput.fullLabel || 'Unnamed'}`}
        />
      )}
    </div>
  );
};

export default OutputsPage;
