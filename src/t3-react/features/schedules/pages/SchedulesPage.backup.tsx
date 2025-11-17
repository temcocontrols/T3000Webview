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
  Checkbox,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowClockwise24Regular,
  Save24Regular,
  Dismiss24Regular,
} from '@fluentui/react-icons';
import { useParams } from 'react-router-dom';
import styles from './SchedulesPage.module.css';

// Schedule interface matching SCHEDULES entity and C++ BacnetWeeklyRoutine (9 columns)
interface Schedule {
  schedule_id: string;           // NUM (Column 0 - CheckBox)
  auto_manual: string;           // Auto/Manual (Column 2 - ComboBox)
  output_field: string;          // Output (Column 3 - ComboBox)
  holiday1: string;              // Holiday1 (Column 4 - ComboBox)
  status1: string;               // State1 (Column 5 - Normal)
  holiday2: string;              // Holiday2 (Column 6 - ComboBox)
  status2: string;               // State2 (Column 7 - Normal)
  // Additional fields from entity
  variable_field?: string;
  interval_field?: string;
  schedule_time?: string;
  monday_time?: string;
  tuesday_time?: string;
  wednesday_time?: string;
  thursday_time?: string;
  friday_time?: string;
}


const SchedulesPage: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, Partial<Schedule>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedSchedules, setSelectedSchedules] = useState<Set<string>>(new Set());

  // Fetch schedules data
  const fetchSchedules = useCallback(async () => {
    if (!deviceId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/t3_device/devices/${deviceId}/table/SCHEDULES`);
      if (!response.ok) throw new Error('Failed to fetch schedules');

      const result = await response.json();
      setSchedules(result.data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Handle field edit
  const handleFieldEdit = (scheduleId: string, field: keyof Schedule, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [scheduleId]: {
        ...(prev[scheduleId] || {}),
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  // Get current value
  const getCurrentValue = (schedule: Schedule, field: keyof Schedule): string => {
    const scheduleId = schedule.schedule_id;
    return editedValues[scheduleId]?.[field] ?? schedule[field] ?? '';
  };

  // Save all changes
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
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
  const handleAutoManualToggle = (schedule: Schedule) => {
    const currentValue = getCurrentValue(schedule, 'auto_manual');
    const newValue = currentValue === 'AUTO' ? 'MANUAL' : 'AUTO';
    handleFieldEdit(schedule.schedule_id, 'auto_manual', newValue);
  };

  // Toggle schedule selection (checkbox)
  const handleCheckboxToggle = (scheduleId: string) => {
    setSelectedSchedules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scheduleId)) {
        newSet.delete(scheduleId);
      } else {
        newSet.add(scheduleId);
      }
      return newSet;
    });
  };

  // Column definitions based on C++ BacnetWeeklyRoutine.cpp (9 columns)
  const columns: TableColumnDefinition<Schedule>[] = useMemo(() => [
    // Column 0: NUM (CheckBox)
    createTableColumn<Schedule>({
      columnId: 'schedule_id',
      compare: (a, b) => Number(a.schedule_id) - Number(b.schedule_id),
      renderHeaderCell: () => <div className={styles.headerText}>NUM</div>,
      renderCell: (schedule) => (
        <TableCellLayout>
          <div className={styles.checkboxCell}>
            <Checkbox
              checked={selectedSchedules.has(schedule.schedule_id)}
              onChange={() => handleCheckboxToggle(schedule.schedule_id)}
            />
            <span className={styles.numText}>{schedule.schedule_id}</span>
          </div>
        </TableCellLayout>
      ),
    }),

    // Column 1: Full Label (from WEEKLY_ROUTINE_FULL_LABLE - EditBox) - Not in entity, skipping

    // Column 2: Auto/Manual
    createTableColumn<Schedule>({
      columnId: 'auto_manual',
      compare: (a, b) => (a.auto_manual || '').localeCompare(b.auto_manual || ''),
      renderHeaderCell: () => <div className={styles.headerText}>Auto/Manual</div>,
      renderCell: (schedule) => {
        const isAuto = getCurrentValue(schedule, 'auto_manual') === 'AUTO';
        return (
          <TableCellLayout>
            <div className={styles.autoManualContainer}>
              <Switch
                checked={isAuto}
                onChange={() => handleAutoManualToggle(schedule)}
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

    // Column 3: Output
    createTableColumn<Schedule>({
      columnId: 'output_field',
      compare: (a, b) => (a.output_field || '').localeCompare(b.output_field || ''),
      renderHeaderCell: () => <div className={styles.headerText}>Output</div>,
      renderCell: (schedule) => (
        <TableCellLayout>
          <Input
            className={styles.editableInput}
            value={getCurrentValue(schedule, 'output_field')}
            onChange={(e, data) => handleFieldEdit(schedule.schedule_id, 'output_field', data.value)}
          />
        </TableCellLayout>
      ),
    }),

    // Column 4: Holiday1
    createTableColumn<Schedule>({
      columnId: 'holiday1',
      compare: (a, b) => (a.holiday1 || '').localeCompare(b.holiday1 || ''),
      renderHeaderCell: () => <div className={styles.headerText}>Holiday1</div>,
      renderCell: (schedule) => (
        <TableCellLayout>
          <Input
            className={styles.editableInput}
            value={getCurrentValue(schedule, 'holiday1')}
            onChange={(e, data) => handleFieldEdit(schedule.schedule_id, 'holiday1', data.value)}
          />
        </TableCellLayout>
      ),
    }),

    // Column 5: State1
    createTableColumn<Schedule>({
      columnId: 'status1',
      compare: (a, b) => (a.status1 || '').localeCompare(b.status1 || ''),
      renderHeaderCell: () => <div className={styles.headerText}>State1</div>,
      renderCell: (schedule) => (
        <TableCellLayout className={styles.readOnlyCell}>
          {getCurrentValue(schedule, 'status1')}
        </TableCellLayout>
      ),
    }),

    // Column 6: Holiday2
    createTableColumn<Schedule>({
      columnId: 'holiday2',
      compare: (a, b) => (a.holiday2 || '').localeCompare(b.holiday2 || ''),
      renderHeaderCell: () => <div className={styles.headerText}>Holiday2</div>,
      renderCell: (schedule) => (
        <TableCellLayout>
          <Input
            className={styles.editableInput}
            value={getCurrentValue(schedule, 'holiday2')}
            onChange={(e, data) => handleFieldEdit(schedule.schedule_id, 'holiday2', data.value)}
          />
        </TableCellLayout>
      ),
    }),

    // Column 7: State2
    createTableColumn<Schedule>({
      columnId: 'status2',
      compare: (a, b) => (a.status2 || '').localeCompare(b.status2 || ''),
      renderHeaderCell: () => <div className={styles.headerText}>State2</div>,
      renderCell: (schedule) => (
        <TableCellLayout className={styles.readOnlyCell}>
          {getCurrentValue(schedule, 'status2')}
        </TableCellLayout>
      ),
    }),

    // Column 8: Label (from WEEKLY_ROUTINE_LABEL - EditBox) - Not in entity, skipping
  ], [editedValues, selectedSchedules]);

  return (
    <div className={styles.schedulesPage}>
      {/* Azure Portal Blade Header */}
      <div className={styles.bladeHeader}>
        <div className={styles.bladeTitle}>
          <h1 className={styles.titleText}>Schedules</h1>
          <span className={styles.subtitleText}>Device {deviceId}</span>
        </div>
        <div className={styles.bladeActions}>
          <Button
            appearance="secondary"
            icon={<ArrowClockwise24Regular />}
            onClick={fetchSchedules}
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
          <div className={styles.loadingContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size="large" />
            <Text style={{ marginLeft: '12px' }}>Loading schedules...</Text>
          </div>
        ) : schedules.length === 0 ? (
          <div className={styles.emptyState}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
              </svg>
              <Text size={500} weight="semibold">No Schedules</Text>
            </div>
            <Text size={300} style={{ display: 'block', marginBottom: '24px', color: '#605e5c', textAlign: 'center' }}>
              This device has no schedules configured.
            </Text>
          </div>
        ) : (
          <div className={styles.gridContainer}>
            <DataGrid
              items={schedules}
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
              <DataGridBody<Schedule>>
                {({ item, rowId }) => (
                  <DataGridRow<Schedule>
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
            <span className={styles.statLabel}>Total Schedules:</span>
            <span className={styles.statValue}>{schedules.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Selected:</span>
            <span className={styles.statValue}>{selectedSchedules.size}</span>
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

export default SchedulesPage;
