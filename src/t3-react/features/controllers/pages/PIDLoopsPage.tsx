import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
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
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();
  const [controllers, setControllers] = useState<PIDController[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, Partial<PIDController>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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

  // Fetch PID controllers data
  const fetchControllers = useCallback(async () => {
    if (!selectedDevice) return;

    console.log('Fetching PID loops for device:', selectedDevice.serialNumber);
    setIsLoading(true);
    setError(null);
    try {
      // Using generic table API since no specific PID endpoint exists yet
      const url = `/api/t3_device/devices/${selectedDevice.serialNumber}/table/PID_TABLE`;
      console.log('Fetching from URL:', url);
      const response = await fetch(url);
      console.log('Response status:', response.status);
      if (!response.ok) throw new Error('Failed to fetch controllers');

      const result = await response.json();
      console.log('API response:', result);
      console.log('Data array:', result.data);
      setControllers(result.data || []);
    } catch (error) {
      console.error('Error fetching controllers:', error);
      setError(error instanceof Error ? error.message : 'Failed to load controllers');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchControllers();
  }, [fetchControllers]);

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
    await fetchControllers();
    setRefreshing(false);
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

  // Column definitions
  const columns: TableColumnDefinition<PIDController>[] = useMemo(() => [
    // Column 1: NUM (Controller #)
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
      renderCell: (controller) => (
        <TableCellLayout>
          {controller.loop_field}
        </TableCellLayout>
      ),
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
          <Input
            className={styles.editableInput}
            value={getCurrentValue(controller, 'input_field')}
            onChange={(e, data) => handleFieldEdit(controller.loop_field, 'input_field', data.value)}
          />
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
          <Input
            className={styles.editableInput}
            type="number"
            value={getCurrentValue(controller, 'input_value')}
            onChange={(e, data) => handleFieldEdit(controller.loop_field, 'input_value', data.value)}
          />
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
          {getCurrentValue(controller, 'units')}
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
          <Input
            className={styles.editableInput}
            value={getCurrentValue(controller, 'output_field')}
            onChange={(e, data) => handleFieldEdit(controller.loop_field, 'output_field', data.value)}
          />
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
          <Input
            className={styles.editableInput}
            type="number"
            value={getCurrentValue(controller, 'set_value')}
            onChange={(e, data) => handleFieldEdit(controller.loop_field, 'set_value', data.value)}
          />
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
          {getCurrentValue(controller, 'units_state')}
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
          {getCurrentValue(controller, 'action_field')}
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
          <Input
            className={styles.editableInput}
            type="number"
            value={getCurrentValue(controller, 'proportional')}
            onChange={(e, data) => handleFieldEdit(controller.loop_field, 'proportional', data.value)}
          />
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
          <Input
            className={styles.editableInput}
            type="number"
            value={getCurrentValue(controller, 'reset_field')}
            onChange={(e, data) => handleFieldEdit(controller.loop_field, 'reset_field', data.value)}
          />
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
          <Input
            className={styles.editableInput}
            type="number"
            value={getCurrentValue(controller, 'rate')}
            onChange={(e, data) => handleFieldEdit(controller.loop_field, 'rate', data.value)}
          />
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
          <Input
            className={styles.editableInput}
            type="number"
            value={getCurrentValue(controller, 'bias')}
            onChange={(e, data) => handleFieldEdit(controller.loop_field, 'bias', data.value)}
          />
        </TableCellLayout>
      ),
    }),
  ], [editedValues, sortColumn, sortDirection, handleSort, handleFieldEdit, handleAutoManualToggle, getCurrentValue]);

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

        {/* Blade Description */}
        {selectedDevice && (
          <div className={styles.bladeDescription}>
            <span>
              Showing PID loops for <b>{selectedDevice.nameShowOnTree} (SN: {selectedDevice.serialNumber})</b>.
              {' '}This table displays all PID controller configurations including inputs, outputs, setpoints, and tuning parameters.
              {' '}<a href="#" onClick={(e) => { e.preventDefault(); console.log('Learn more clicked'); }}>Learn more</a>
            </span>
          </div>
        )}

        {/* Toolbar Section */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarContainer}>
            <button
              className={styles.toolbarButton}
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh"
              aria-label="Refresh"
            >
              <ArrowClockwise24Regular />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
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

        {/* Docking Body - Main Content */}
        <div className={styles.dockingBody}>
        {/* Loading State */}
        {isLoading && controllers.length === 0 && (
          <div className={styles.loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size="large" />
            <Text style={{ marginLeft: '12px' }}>Loading PID loops...</Text>
          </div>
        )}

        {/* No Device Selected */}
        {!selectedDevice && !isLoading && (
          <div className={styles.noData}>
            <div style={{ textAlign: 'center' }}>
              <Text size={500} weight="semibold">No device selected</Text>
              <br />
              <Text size={300}>Please select a device from the tree to view PID loops</Text>
            </div>
          </div>
        )}

        {/* Data Grid - Always show with header */}
        {selectedDevice && !isLoading && !error && (
          <>
            <DataGrid
              items={controllers}
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
            {controllers.length === 0 && (
              <div style={{ marginTop: '40px', textAlign: 'center', padding: '0 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                  </svg>
                  <Text size={500} weight="semibold">No PID loops found</Text>
                </div>
                <Text size={300} style={{ display: 'block', marginBottom: '24px', color: '#605e5c', textAlign: 'center' }}>This device has no PID loops configured</Text>
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
          </>
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
