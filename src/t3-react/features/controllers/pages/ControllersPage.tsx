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
  tokens,
} from '@fluentui/react-components';
import {
  ArrowClockwise24Regular,
  Save24Regular,
  Dismiss24Regular,
} from '@fluentui/react-icons';
import { useParams } from 'react-router-dom';
import styles from './ControllersPage.module.css';

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

const ControllersPage: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [controllers, setControllers] = useState<PIDController[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, Partial<PIDController>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch PID controllers data
  const fetchControllers = useCallback(async () => {
    if (!deviceId) return;
    
    setIsLoading(true);
    try {
      // Using generic table API since no specific PID endpoint exists yet
      const response = await fetch(`/api/t3_device/devices/${deviceId}/table/PID_TABLE`);
      if (!response.ok) throw new Error('Failed to fetch controllers');
      
      const result = await response.json();
      setControllers(result.data || []);
    } catch (error) {
      console.error('Error fetching controllers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

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

  // Discard changes
  const handleDiscardChanges = () => {
    setEditedValues({});
    setHasChanges(false);
  };

  // Toggle Auto/Manual
  const handleAutoManualToggle = (controller: PIDController) => {
    const currentValue = getCurrentValue(controller, 'auto_manual');
    const newValue = currentValue === 'AUTO' ? 'MANUAL' : 'AUTO';
    handleFieldEdit(controller.loop_field, 'auto_manual', newValue);
  };

  // Column definitions
  const columns: TableColumnDefinition<PIDController>[] = useMemo(() => [
    // Column 1: NUM (Controller #)
    createTableColumn<PIDController>({
      columnId: 'loop_field',
      compare: (a, b) => Number(a.loop_field) - Number(b.loop_field),
      renderHeaderCell: () => <div className={styles.headerText}>NUM</div>,
      renderCell: (controller) => (
        <TableCellLayout className={styles.numCell}>
          {controller.loop_field}
        </TableCellLayout>
      ),
    }),

    // Column 2: Input
    createTableColumn<PIDController>({
      columnId: 'input_field',
      compare: (a, b) => (a.input_field || '').localeCompare(b.input_field || ''),
      renderHeaderCell: () => <div className={styles.headerText}>Input</div>,
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
      renderHeaderCell: () => <div className={styles.headerText}>Value</div>,
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
      renderHeaderCell: () => <div className={styles.headerText}>A/M</div>,
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
      renderHeaderCell: () => <div className={styles.headerText}>Output</div>,
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
      renderHeaderCell: () => <div className={styles.headerText}>Setpoint</div>,
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
      renderHeaderCell: () => <div className={styles.headerText}>Action</div>,
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
      renderHeaderCell: () => <div className={styles.headerText}>Prop</div>,
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
      renderHeaderCell: () => <div className={styles.headerText}>Int</div>,
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
      renderHeaderCell: () => <div className={styles.headerText}>Der</div>,
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
      renderHeaderCell: () => <div className={styles.headerText}>Bias</div>,
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
  ], [editedValues]);

  return (
    <div className={styles.controllersPage}>
      {/* Azure Portal Blade Header */}
      <div className={styles.bladeHeader}>
        <div className={styles.bladeTitle}>
          <h1 className={styles.titleText}>PID Controllers</h1>
          <span className={styles.subtitleText}>Device {deviceId}</span>
        </div>
        <div className={styles.bladeActions}>
          <Button
            appearance="secondary"
            icon={<ArrowClockwise24Regular />}
            onClick={fetchControllers}
            disabled={isLoading}
          >
            Refresh
          </Button>
          {hasChanges && (
            <>
              <Button
                appearance="secondary"
                icon={<Dismiss24Regular />}
                onClick={handleDiscardChanges}
              >
                Discard
              </Button>
              <Button
                appearance="primary"
                icon={<Save24Regular />}
                onClick={handleSaveAll}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save All'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Azure Portal Blade Content */}
      <div className={styles.bladeContent}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}>Loading controllers...</div>
          </div>
        ) : controllers.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📊</div>
            <h2 className={styles.emptyStateTitle}>No PID Controllers</h2>
            <p className={styles.emptyStateText}>
              This device has no PID controllers configured.
            </p>
          </div>
        ) : (
          <div className={styles.gridContainer}>
            <DataGrid
              items={controllers}
              columns={columns}
              sortable
              resizableColumns
              className={styles.dataGrid}
            >
              <DataGridHeader>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell className={styles.headerCell}>
                      {renderHeaderCell()}
                    </DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<PIDController>>
                {({ item, rowId }) => (
                  <DataGridRow<PIDController>
                    key={rowId}
                    className={styles.dataRow}
                  >
                    {({ renderCell }) => (
                      <DataGridCell className={styles.dataCell}>
                        {renderCell(item)}
                      </DataGridCell>
                    )}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          </div>
        )}
      </div>

      {/* Azure Portal Blade Footer with Stats */}
      <div className={styles.bladeFooter}>
        <div className={styles.statsContainer}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Controllers:</span>
            <span className={styles.statValue}>{controllers.length}</span>
          </div>
          {hasChanges && (
            <div className={styles.statItem}>
              <Badge appearance="important" className={styles.changesBadge}>
                Unsaved Changes
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControllersPage;
