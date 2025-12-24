import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DataGrid,
  DataGridProps,
  DataGridBody,
  DataGridRow,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridCell,
  TableCellLayout,
  TableColumnDefinition,
  createTableColumn,
  Badge,
  Button,
  Switch,
  Input,
  Spinner,
  Text,
  tokens,
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
  ArrowClockwise24Regular,
  Save24Regular,
  Dismiss24Regular,
  InfoRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import { PidLoopRefreshApiService } from '../services/pidLoopRefreshApi';
import styles from './PIDLoopsPage.module.css';

// PID Controller interface matching PID_TABLE entity
interface PIDController {
  loop_field: string;            // NUM (Controller #)
  input_field: string;           // Input
  input_value: string;           // Input Value
  units: string;                 // Input Units
  auto_manual: string;           // A/M (Auto/Manual)
  output_field: string;          // Output
  set_value: string;             // Setpoint
  // Setpoint_High/Low not in C++ display but in DB
  units_state: string;           // Setpoint Units
  action_field: string;          // Action (Direct/Reverse)
  proportional: string;          // Prop (Proportional)
  reset_field: string;           // Int (Integral/Reset)
  rate: string;                  // Der (Derivative)
  bias: string;                  // Bias
  // Additional fields from entity
  switch_node?: string;
  output_value?: string;
  status?: string;
  type_field?: string;
  setpoint_high?: string;
  setpoint_low?: string;
  variable_state?: string;
}

const PIDLoopsPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice, getNextDevice, getFilteredDevices } = useDeviceTreeStore();
  const [pidLoops, setPidLoops] = useState<PIDController[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, Partial<PIDController>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
  const [autoRefreshed, setAutoRefreshed] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingNextDevice, setIsLoadingNextDevice] = useState(false);
  const isAtBottomRef = useRef(false);

  // Create empty rows when no data exists
  const displayPidLoops = useMemo(() => {
    if (pidLoops.length === 0) {
      // Return 10 completely empty rows
      return Array(10).fill(null).map((_, index) => ({
        loop_field: '',
        input_field: '',
        input_value: '',
        units: '',
        auto_manual: '',
        output_field: '',
        output_value: '',
        set_value: '',
        units_state: '',
        action_field: '',
        proportional: '',
        reset_field: '',
        rate: '',
        bias: '',
        switch_node: '',
        status: '',
        type_field: '',
        setpoint_high: '',
        setpoint_low: '',
        variable_state: '',
      } as PIDController));
    }
    return pidLoops;
  }, [pidLoops]);

  // Check if a row is an empty placeholder row
  const isEmptyRow = (controller: PIDController) => {
    return !controller.loop_field && pidLoops.length === 0;
  };

  // Wrapper to render empty cells for empty rows
  const renderCellContent = (controller: PIDController, content: React.ReactNode) => {
    if (isEmptyRow(controller)) {
      return <TableCellLayout></TableCellLayout>;
    }
    return <TableCellLayout>{content}</TableCellLayout>;
  };

  // Auto-select first device on page load if no device is selected
  useEffect(() => {
    if (!selectedDevice) {
      const devices = getFilteredDevices();
      if (devices.length > 0) {
        selectDevice(devices[0]);
      }
    }
  }, [selectedDevice, getFilteredDevices, selectDevice]);

  // Fetch PID loops data
  const fetchPidLoops = useCallback(async () => {
    if (!selectedDevice) return;

    console.log('Fetching PID loops for device:', selectedDevice.serialNumber);
    setIsLoading(true);
    setError(null);
    try {
      // Using generic table API since no specific PID endpoint exists yet
      const url = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/table/PID_TABLE`;
      console.log('Fetching from URL:', url);
      const response = await fetch(url);
      console.log('Response status:', response.status);
      if (!response.ok) throw new Error('Failed to fetch PID loops');

      const result = await response.json();
      console.log('API response:', result);
      console.log('Data array:', result.data);
      setPidLoops(result.data || []);
    } catch (error) {
      console.error('Error fetching PID loops:', error);
      setError(error instanceof Error ? error.message : 'Failed to load PID loops');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchPidLoops();
  }, [fetchPidLoops]);

  // Auto-refresh once after page load (Trigger #1)
  useEffect(() => {
    if (isLoading || !selectedDevice || autoRefreshed) return;

    // Wait for initial load to complete, then auto-refresh from device
    const timer = setTimeout(async () => {
      try {
        console.log('[PIDLoopsPage] Auto-refreshing from device...');
        const refreshResponse = await PidLoopRefreshApiService.refreshAllPidLoops(selectedDevice.serialNumber);
        console.log('[PIDLoopsPage] Refresh response:', refreshResponse);

        // Save to database
        if (refreshResponse.items && refreshResponse.items.length > 0) {
          await PidLoopRefreshApiService.saveRefreshedPidLoops(selectedDevice.serialNumber, refreshResponse.items);
          // Only reload from database if save was successful
          await fetchPidLoops();
        } else {
          console.warn('[PIDLoopsPage] Auto-refresh: No items received, keeping existing data');
        }
        setAutoRefreshed(true);
      } catch (error) {
        console.error('[PIDLoopsPage] Auto-refresh failed:', error);
        // Don't reload from database on error - preserve existing PID loops
        setAutoRefreshed(true); // Mark as attempted to prevent retry loops
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isLoading, selectedDevice, autoRefreshed, fetchPidLoops]);

  // Handle field edit
  const handleFieldEdit = (controllerId: string, field: keyof PIDController, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [controllerId]: {
        ...(prev[controllerId] || {}),
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  // Get current value (edited or original)
  const getCurrentValue = (controller: PIDController, field: keyof PIDController): string => {
    const controllerId = controller.loop_field;
    return editedValues[controllerId]?.[field] ?? controller[field] ?? '';
  };

  // Save all changes
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement batch save when API is ready
      console.log('Saving changes:', editedValues);
      setEditedValues({});
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Discard all changes
  const handleDiscardChanges = () => {
    setEditedValues({});
    setHasChanges(false);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPidLoops();
    setRefreshing(false);
  };

  // Refresh all PID loops from device (Trigger #2: Manual "Refresh from Device" button)
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    try {
      console.log('[PIDLoopsPage] Refreshing all PID loops from device...');
      const refreshResponse = await PidLoopRefreshApiService.refreshAllPidLoops(selectedDevice.serialNumber);
      console.log('[PIDLoopsPage] Refresh response:', refreshResponse);

      // Save to database
      if (refreshResponse.items && refreshResponse.items.length > 0) {
        const saveResponse = await PidLoopRefreshApiService.saveRefreshedPidLoops(
          selectedDevice.serialNumber,
          refreshResponse.items
        );
        console.log('[PIDLoopsPage] Save response:', saveResponse);

        // Only reload from database if save was successful
        await fetchPidLoops();
      } else {
        console.warn('[PIDLoopsPage] No items received from refresh, keeping existing data');
      }
    } catch (error) {
      console.error('[PIDLoopsPage] Failed to refresh from device:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh from device');
      // Don't call fetchPidLoops() on error - preserve existing PID loops in UI
    } finally {
      setRefreshing(false);
    }
  };

  // Refresh single PID loop from device (Trigger #3: Per-row refresh icon)
  const handleRefreshSinglePidLoop = async (loopField: string) => {
    if (!selectedDevice) return;

    const index = parseInt(loopField, 10);
    if (isNaN(index)) {
      console.error('[PIDLoopsPage] Invalid loop field:', loopField);
      return;
    }

    setRefreshingItems(prev => new Set(prev).add(loopField));
    try {
      console.log(`[PIDLoopsPage] Refreshing PID loop ${index} from device...`);
      const refreshResponse = await PidLoopRefreshApiService.refreshPidLoop(selectedDevice.serialNumber, index);
      console.log('[PIDLoopsPage] Refresh response:', refreshResponse);

      // Save to database
      if (refreshResponse.items && refreshResponse.items.length > 0) {
        const saveResponse = await PidLoopRefreshApiService.saveRefreshedPidLoops(
          selectedDevice.serialNumber,
          refreshResponse.items
        );
        console.log('[PIDLoopsPage] Save response:', saveResponse);
      }

      // Reload data from database after save
      await fetchPidLoops();
    } catch (error) {
      console.error(`[PIDLoopsPage] Failed to refresh PID loop ${index}:`, error);
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(loopField);
        return newSet;
      });
    }
  };

  // Handle export
  const handleExport = () => {
    console.log('Export PID loops to CSV');
    // TODO: Implement CSV export
  };

  // Handle settings
  const handleSettings = () => {
    console.log('Settings clicked');
    // TODO: Implement settings dialog
  };

  // Handle search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Toggle Auto/Manual
  const handleAutoManualToggle = (controller: PIDController) => {
    const currentValue = getCurrentValue(controller, 'auto_manual');
    const newValue = currentValue === 'AUTO' ? 'MANUAL' : 'AUTO';
    handleFieldEdit(controller.loop_field, 'auto_manual', newValue);
  };

  // Sort handler
  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
    } else {
      setSortColumn(columnId);
      setSortDirection('ascending');
    }
  };

  // Auto-scroll navigation handlers
  const loadNextDevice = useCallback(() => {
    const nextDevice = getNextDevice();
    if (nextDevice) {
      setIsLoadingNextDevice(true);
      selectDevice(nextDevice);
      setTimeout(() => {
        setIsLoadingNextDevice(false);
      }, 500);
    }
  }, [getNextDevice, selectDevice]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isLoadingNextDevice || isLoading) return;

    const target = e.currentTarget;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    const isAtBottom = scrollBottom <= 1;

    if (isAtBottom && pidLoops.length > 0) {
      isAtBottomRef.current = true;
    } else {
      isAtBottomRef.current = false;
    }
  }, [isLoadingNextDevice, isLoading, pidLoops.length]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (isLoadingNextDevice || isLoading || pidLoops.length === 0) return;

    if (e.deltaY > 0 && isAtBottomRef.current) {
      isAtBottomRef.current = false;
      loadNextDevice();
    }
  }, [isLoadingNextDevice, isLoading, pidLoops.length, loadNextDevice]);

  // Auto-scroll to top after device change
  useEffect(() => {
    if (selectedDevice && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: isLoadingNextDevice ? 'smooth' : 'auto'
      });
    }
  }, [selectedDevice, isLoadingNextDevice]);

  // Column definitions
  const columns: TableColumnDefinition<PIDController>[] = useMemo(() => [
    // Column 1: NUM (Controller #) with refresh icon
    createTableColumn<PIDController>({
      columnId: 'loop_field',
      compare: (a, b) => Number(a.loop_field) - Number(b.loop_field),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('loop_field')}>
          <span>NUM</span>
          {sortColumn === 'loop_field' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (controller) => {
        if (isEmptyRow(controller)) {
          return <TableCellLayout></TableCellLayout>;
        }
        const loopField = controller.loop_field || '';
        const isRefreshingThis = refreshingItems.has(loopField);

        return (
          <TableCellLayout>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefreshSinglePidLoop(loopField);
                }}
                className={`${styles.refreshIconButton} ${isRefreshingThis ? styles.isRefreshing : ''}`}
                title="Refresh this PID loop from device"
                disabled={isRefreshingThis}
              >
                <ArrowSyncRegular
                  style={{ fontSize: '14px' }}
                  className={isRefreshingThis ? styles.rotating : ''}
                />
              </button>
              <Text size={200} weight="regular">{controller.loop_field}</Text>
            </div>
          </TableCellLayout>
        );
      },
    }),

    // Column 2: Input
    createTableColumn<PIDController>({
      columnId: 'input_field',
      compare: (a, b) => (a.input_field || '').localeCompare(b.input_field || ''),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Input</span>
        </div>
      ),
      renderCell: (controller) => (
        <TableCellLayout>
          {!isEmptyRow(controller) && (
            <Input
              className={styles.editableInput}
              value={getCurrentValue(controller, 'input_field')}
              onChange={(e, data) => handleFieldEdit(controller.loop_field, 'input_field', data.value)}
            />
          )}
        </TableCellLayout>
      ),
    }),

    // Column 3: Input Value
    createTableColumn<PIDController>({
      columnId: 'input_value',
      compare: (a, b) => Number(a.input_value || 0) - Number(b.input_value || 0),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Value</span>
        </div>
      ),
      renderCell: (controller) => (
        <TableCellLayout>
          {!isEmptyRow(controller) && (
            <Input
              className={styles.editableInput}
              type="number"
              value={getCurrentValue(controller, 'input_value')}
              onChange={(e, data) => handleFieldEdit(controller.loop_field, 'input_value', data.value)}
            />
          )}
        </TableCellLayout>
      ),
    }),

    // Column 4: Input Units
    createTableColumn<PIDController>({
      columnId: 'units',
      compare: (a, b) => (a.units || '').localeCompare(b.units || ''),
      renderHeaderCell: () => <div className={styles.headerText}>Units</div>,
      renderCell: (controller) => (
        <TableCellLayout className={styles.readOnlyCell}>
          {!isEmptyRow(controller) && getCurrentValue(controller, 'units')}
        </TableCellLayout>
      ),
    }),

    // Column 5: Auto/Manual
    createTableColumn<PIDController>({
      columnId: 'auto_manual',
      compare: (a, b) => (a.auto_manual || '').localeCompare(b.auto_manual || ''),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>A/M</span>
        </div>
      ),
      renderCell: (controller) => {
        if (isEmptyRow(controller)) {
          return <TableCellLayout></TableCellLayout>;
        }
        const isAuto = getCurrentValue(controller, 'auto_manual') === 'AUTO';
        return (
          <TableCellLayout>
            <div className={styles.autoManualContainer}>
              <Switch
                checked={isAuto}
                onChange={() => handleAutoManualToggle(controller)}
                className={styles.autoManualSwitch}
              />
              <span className={styles.autoManualLabel}>
                {isAuto ? 'AUTO' : 'MAN'}
              </span>
            </div>
          </TableCellLayout>
        );
      },
    }),

    // Column 6: Output
    createTableColumn<PIDController>({
      columnId: 'output_field',
      compare: (a, b) => (a.output_field || '').localeCompare(b.output_field || ''),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Output</span>
        </div>
      ),
      renderCell: (controller) => (
        <TableCellLayout>
          {!isEmptyRow(controller) && (
            <Input
              className={styles.editableInput}
              value={getCurrentValue(controller, 'output_field')}
              onChange={(e, data) => handleFieldEdit(controller.loop_field, 'output_field', data.value)}
            />
          )}
        </TableCellLayout>
      ),
    }),

    // Column 7: Setpoint
    createTableColumn<PIDController>({
      columnId: 'set_value',
      compare: (a, b) => Number(a.set_value || 0) - Number(b.set_value || 0),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Setpoint</span>
        </div>
      ),
      renderCell: (controller) => (
        <TableCellLayout>
          {!isEmptyRow(controller) && (
            <Input
              className={styles.editableInput}
              type="number"
              value={getCurrentValue(controller, 'set_value')}
              onChange={(e, data) => handleFieldEdit(controller.loop_field, 'set_value', data.value)}
            />
          )}
        </TableCellLayout>
      ),
    }),

    // Column 8: Setpoint Value (from C++ CONTROLLER_SETVALUE)
    // Note: In C++ this is separate from CONTROLLER_SETPOINT
    // Skipping for now as it's not clear if this is the actual setpoint value or different

    // Column 9: Setpoint Units
    createTableColumn<PIDController>({
      columnId: 'units_state',
      compare: (a, b) => (a.units_state || '').localeCompare(b.units_state || ''),
      renderHeaderCell: () => <div className={styles.headerText}>Units</div>,
      renderCell: (controller) => (
        <TableCellLayout className={styles.readOnlyCell}>
          {!isEmptyRow(controller) && getCurrentValue(controller, 'units_state')}
        </TableCellLayout>
      ),
    }),

    // Column 10: Action (Direct/Reverse)
    createTableColumn<PIDController>({
      columnId: 'action_field',
      compare: (a, b) => (a.action_field || '').localeCompare(b.action_field || ''),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Action</span>
        </div>
      ),
      renderCell: (controller) => (
        <TableCellLayout className={styles.readOnlyCell}>
          {!isEmptyRow(controller) && getCurrentValue(controller, 'action_field')}
        </TableCellLayout>
      ),
    }),

    // Column 11: Proportional
    createTableColumn<PIDController>({
      columnId: 'proportional',
      compare: (a, b) => Number(a.proportional || 0) - Number(b.proportional || 0),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Prop</span>
        </div>
      ),
      renderCell: (controller) => (
        <TableCellLayout>
          {!isEmptyRow(controller) && (
            <Input
              className={styles.editableInput}
              type="number"
              value={getCurrentValue(controller, 'proportional')}
              onChange={(e, data) => handleFieldEdit(controller.loop_field, 'proportional', data.value)}
            />
          )}
        </TableCellLayout>
      ),
    }),

    // Column 12: Integral (Reset)
    createTableColumn<PIDController>({
      columnId: 'reset_field',
      compare: (a, b) => Number(a.reset_field || 0) - Number(b.reset_field || 0),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Int</span>
        </div>
      ),
      renderCell: (controller) => (
        <TableCellLayout>
          {!isEmptyRow(controller) && (
            <Input
              className={styles.editableInput}
              type="number"
              value={getCurrentValue(controller, 'reset_field')}
              onChange={(e, data) => handleFieldEdit(controller.loop_field, 'reset_field', data.value)}
            />
          )}
        </TableCellLayout>
      ),
    }),

    // Column 13: Time (from C++ CONTROLLER_I_TIME - ComboBox type)
    // Note: This column exists in C++ but not mapped to entity field yet
    // Skipping for now

    // Column 14: Derivative (Rate)
    createTableColumn<PIDController>({
      columnId: 'rate',
      compare: (a, b) => Number(a.rate || 0) - Number(b.rate || 0),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Der</span>
        </div>
      ),
      renderCell: (controller) => (
        <TableCellLayout>
          {!isEmptyRow(controller) && (
            <Input
              className={styles.editableInput}
              type="number"
              value={getCurrentValue(controller, 'rate')}
              onChange={(e, data) => handleFieldEdit(controller.loop_field, 'rate', data.value)}
            />
          )}
        </TableCellLayout>
      ),
    }),

    // Column 15: Bias
    createTableColumn<PIDController>({
      columnId: 'bias',
      compare: (a, b) => Number(a.bias || 0) - Number(b.bias || 0),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Bias</span>
        </div>
      ),
      renderCell: (controller) => (
        <TableCellLayout>
          {!isEmptyRow(controller) && (
            <Input
              className={styles.editableInput}
              type="number"
              value={getCurrentValue(controller, 'bias')}
              onChange={(e, data) => handleFieldEdit(controller.loop_field, 'bias', data.value)}
            />
          )}
        </TableCellLayout>
      ),
    }),
  ], [editedValues, sortColumn, sortDirection, handleSort, handleFieldEdit, handleAutoManualToggle, getCurrentValue, isEmptyRow]);

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

        {/* Toolbar Section */}
        {selectedDevice && (
        <>
        <div className={styles.toolbar}>
          <div className={styles.toolbarContainer}>
            {/* Refresh Button - Refresh from Device */}
            <button
              className={styles.toolbarButton}
              onClick={handleRefreshFromDevice}
              disabled={refreshing}
              title="Refresh all PID loops from device"
              aria-label="Refresh from Device"
            >
              <ArrowClockwise24Regular />
              <span>{refreshing ? 'Refreshing...' : 'Refresh from Device'}</span>
            </button>

            <button
              className={styles.toolbarButton}
              onClick={handleExport}
              title="Export to CSV"
              aria-label="Export to CSV"
            >
              <ArrowDownloadRegular />
              <span>Export to CSV</span>
            </button>

            <div className={styles.toolbarSeparator} role="separator" />

            <button
              className={styles.toolbarButton}
              onClick={handleSettings}
              title="Settings"
              aria-label="Settings"
            >
              <SettingsRegular />
              <span>Settings</span>
            </button>

            <div className={styles.searchInputWrapper}>
              <SearchRegular className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Search PID loops..."
                value={searchQuery}
                onChange={handleSearchChange}
                spellCheck="false"
                role="searchbox"
                aria-label="Search PID loops"
              />
            </div>

            {/* Info Button with Tooltip */}
            {selectedDevice && (
              <Tooltip
                content={`Showing PID loops for ${selectedDevice.nameShowOnTree} (SN: ${selectedDevice.serialNumber}). This table displays all PID controller configurations including inputs, outputs, setpoints, and tuning parameters.`}
                relationship="description"
              >
                <button
                  className={styles.toolbarButton}
                  style={{ marginLeft: '8px' }}
                  title="Information"
                  aria-label="Information about this page"
                >
                  <InfoRegular />
                </button>
              </Tooltip>
            )}

            {hasChanges && (
              <>
                <div className={styles.toolbarSeparator} role="separator" />
                <button
                  className={styles.toolbarButton}
                  onClick={handleDiscardChanges}
                  title="Discard Changes"
                  aria-label="Discard Changes"
                >
                  <Dismiss24Regular />
                  <span>Discard</span>
                </button>
                <button
                  className={`${styles.toolbarButton} ${styles.toolbarButtonPrimary}`}
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  title="Save All"
                  aria-label="Save All"
                >
                  <Save24Regular />
                  <span>{isSaving ? 'Saving...' : 'Save All'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Horizontal Divider */}
        <div style={{ padding: '0' }}>
          <hr className={styles.overviewHr} />
        </div>
        </>
        )}

        {/* Docking Body - Main Content */}
        <div className={styles.dockingBody}>
        {/* Loading State */}
        {isLoading && pidLoops.length === 0 && (
          <div className={styles.loadingBar}>
            <Spinner size="tiny" />
            <Text size={200} weight="regular">Loading PID loops...</Text>
          </div>
        )}

        {/* No Device Selected */}
        {!selectedDevice && !isLoading && (
          <div className={styles.noData}>
            <div style={{ textAlign: 'center' }}>
              <Text size={400} weight="semibold">No device selected</Text>
              <br />
              <Text size={200}>Please select a device from the tree to view pid loops</Text>
            </div>
          </div>
        )}

        {/* Data Grid - Always show with header */}
        {selectedDevice && !isLoading && !error && (
          <div
            ref={scrollContainerRef}
            className={styles.scrollContainer}
            onScroll={handleScroll}
            onWheel={handleWheel}
          >
            <DataGrid
              items={displayPidLoops}
              columns={columns}
              sortable
              resizableColumns
              columnSizingOptions={{
                loop_field: {
                  minWidth: 60,
                  defaultWidth: 80,
                },
                input_field: {
                  minWidth: 100,
                  defaultWidth: 150,
                },
                input_value: {
                  minWidth: 80,
                  defaultWidth: 100,
                },
                units: {
                  minWidth: 80,
                  defaultWidth: 100,
                },
                auto_manual: {
                  minWidth: 100,
                  defaultWidth: 120,
                },
                output_field: {
                  minWidth: 100,
                  defaultWidth: 150,
                },
                output_value: {
                  minWidth: 80,
                  defaultWidth: 100,
                },
                setpoint_field: {
                  minWidth: 100,
                  defaultWidth: 150,
                },
                setpoint_value: {
                  minWidth: 80,
                  defaultWidth: 100,
                },
                prop_band: {
                  minWidth: 80,
                  defaultWidth: 100,
                },
                integral: {
                  minWidth: 80,
                  defaultWidth: 100,
                },
                derivative: {
                  minWidth: 80,
                  defaultWidth: 100,
                },
                sample_time: {
                  minWidth: 90,
                  defaultWidth: 110,
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
              <DataGridBody<PIDController>>
                {({ item, rowId }) => (
                  <DataGridRow<PIDController> key={rowId}>
                    {({ renderCell }) => (
                      <DataGridCell>{renderCell(item)}</DataGridCell>
                    )}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>

            {/* No Data Message - Show below grid when empty */}
            {/* Commented out - showing empty grid instead
            {pidLoops.length === 0 && (
              <div style={{ marginTop: '24px', textAlign: 'center', padding: '0 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                  </svg>
                  <Text size={400} weight="semibold">No PID loops found</Text>
                </div>
                <Text size={300} style={{ display: 'block', marginBottom: '16px', color: '#605e5c', textAlign: 'center' }}>This device has no PID loops configured</Text>
                <Button
                  appearance="subtle"
                  icon={<ArrowClockwise24Regular />}
                  onClick={handleRefresh}
                  style={{ minWidth: '120px', fontWeight: 'normal' }}
                >
                  Refresh
                </Button>
              </div>
            )}
            */}

            {isLoadingNextDevice && (
              <div className={styles.autoLoadIndicator}>
                <Spinner size="tiny" />
                <Text>Loading next device...</Text>
              </div>
            )}
          </div>
        )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PIDLoopsPage;
