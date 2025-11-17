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
  Input,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowClockwise24Regular,
  Save24Regular,
  Dismiss24Regular,
  CheckmarkCircle24Regular,
  ErrorCircle24Regular,
} from '@fluentui/react-icons';
import { useParams } from 'react-router-dom';
import styles from './AlarmsPage.module.css';

// Alarm interface matching ALARMS entity and C++ BacnetAlarmLog (7 columns)
interface Alarm {
  alarm_id: string;              // NUM (Column 0)
  panel: string;                 // Panel (Column 1)
  message: string;               // Message (Column 2)
  time_stamp: string;            // Time (Column 3)
  acknowledged: string;          // Acknowledge (Column 4)
  status: string;                // Res - Resolved (Column 5)
  // Column 6 is Delete button action
  // Additional fields from entity
  priority?: string;
  notification_id?: string;
  alarm_state?: string;
  alarm_type?: string;
  source?: string;
  description?: string;
  action_field?: string;
  low_limit?: string;
  high_limit?: string;
}


const AlarmsPage: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, Partial<Alarm>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch alarms data
  const fetchAlarms = useCallback(async () => {
    if (!deviceId) return;

    setIsLoading(true);
    try {
      // Using generic table API
      const response = await fetch(`/api/t3_device/devices/${deviceId}/table/ALARMS`);
      if (!response.ok) throw new Error('Failed to fetch alarms');

      const result = await response.json();
      setAlarms(result.data || []);
    } catch (error) {
      console.error('Error fetching alarms:', error);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  // Handle field edit
  const handleFieldEdit = (alarmId: string, field: keyof Alarm, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [alarmId]: {
        ...(prev[alarmId] || {}),
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  // Get current value (edited or original)
  const getCurrentValue = (alarm: Alarm, field: keyof Alarm): string => {
    const alarmId = alarm.alarm_id;
    return editedValues[alarmId]?.[field] ?? alarm[field] ?? '';
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

  // Toggle Acknowledge
  const handleAcknowledgeToggle = (alarm: Alarm) => {
    const currentValue = getCurrentValue(alarm, 'acknowledged');
    const newValue = currentValue === 'Yes' ? 'No' : 'Yes';
    handleFieldEdit(alarm.alarm_id, 'acknowledged', newValue);
  };

  // Handle Delete
  const handleDelete = (alarm: Alarm) => {
    // TODO: Implement delete logic
    console.log('Delete alarm:', alarm.alarm_id);
  };

  // Column definitions based on C++ BacnetAlarmLog.cpp (7 columns)
  const columns: TableColumnDefinition<Alarm>[] = useMemo(() => [
    // Column 1: NUM (Alarm ID)
    createTableColumn<Alarm>({
      columnId: 'alarm_id',
      compare: (a, b) => Number(a.alarm_id) - Number(b.alarm_id),
      renderHeaderCell: () => <div className={styles.headerText}>NUM</div>,
      renderCell: (alarm) => (
        <TableCellLayout className={styles.numCell}>
          {alarm.alarm_id}
        </TableCellLayout>
      ),
    }),

    // Column 2: Panel
    createTableColumn<Alarm>({
      columnId: 'panel',
      compare: (a, b) => (a.panel || '').localeCompare(b.panel || ''),
      renderHeaderCell: () => <div className={styles.headerText}>Panel</div>,
      renderCell: (alarm) => (
        <TableCellLayout className={styles.readOnlyCell}>
          {getCurrentValue(alarm, 'panel')}
        </TableCellLayout>
      ),
    }),

    // Column 3: Message
    createTableColumn<Alarm>({
      columnId: 'message',
      compare: (a, b) => (a.message || '').localeCompare(b.message || ''),
      renderHeaderCell: () => <div className={styles.headerText}>Message</div>,
      renderCell: (alarm) => (
        <TableCellLayout className={styles.messageCell}>
          {getCurrentValue(alarm, 'message')}
        </TableCellLayout>
      ),
    }),

    // Column 4: Time
    createTableColumn<Alarm>({
      columnId: 'time_stamp',
      compare: (a, b) => (a.time_stamp || '').localeCompare(b.time_stamp || ''),
      renderHeaderCell: () => <div className={styles.headerText}>Time</div>,
      renderCell: (alarm) => (
        <TableCellLayout className={styles.timeCell}>
          {getCurrentValue(alarm, 'time_stamp')}
        </TableCellLayout>
      ),
    }),

    // Column 5: Acknowledge
    createTableColumn<Alarm>({
      columnId: 'acknowledged',
      compare: (a, b) => (a.acknowledged || '').localeCompare(b.acknowledged || ''),
      renderHeaderCell: () => <div className={styles.headerText}>Acknowledge</div>,
      renderCell: (alarm) => {
        const isAcknowledged = getCurrentValue(alarm, 'acknowledged') === 'Yes';
        return (
          <TableCellLayout>
            <div className={styles.acknowledgeContainer}>
              <Button
                appearance={isAcknowledged ? 'primary' : 'secondary'}
                size="small"
                icon={isAcknowledged ? <CheckmarkCircle24Regular /> : undefined}
                onClick={() => handleAcknowledgeToggle(alarm)}
              >
                {isAcknowledged ? 'Acknowledged' : 'Acknowledge'}
              </Button>
            </div>
          </TableCellLayout>
        );
      },
    }),

    // Column 6: Res (Resolved status)
    createTableColumn<Alarm>({
      columnId: 'status',
      compare: (a, b) => (a.status || '').localeCompare(b.status || ''),
      renderHeaderCell: () => <div className={styles.headerText}>Res</div>,
      renderCell: (alarm) => {
        const status = getCurrentValue(alarm, 'status');
        const isResolved = status === 'Resolved' || status === 'Yes';
        return (
          <TableCellLayout>
            <Badge
              appearance={isResolved ? 'success' : 'important'}
              className={styles.statusBadge}
            >
              {isResolved ? 'Resolved' : 'Active'}
            </Badge>
          </TableCellLayout>
        );
      },
    }),

    // Column 7: Delete
    createTableColumn<Alarm>({
      columnId: 'delete',
      renderHeaderCell: () => <div className={styles.headerText}>Delete</div>,
      renderCell: (alarm) => (
        <TableCellLayout>
          <Button
            appearance="secondary"
            size="small"
            onClick={() => handleDelete(alarm)}
          >
            Delete
          </Button>
        </TableCellLayout>
      ),
    }),
  ], [editedValues]);

  // Count active vs resolved alarms
  const activeAlarms = alarms.filter(a => a.status !== 'Resolved' && a.status !== 'Yes').length;
  const resolvedAlarms = alarms.length - activeAlarms;

  return (
    <div className={styles.alarmsPage}>
      {/* Azure Portal Blade Header */}
      <div className={styles.bladeHeader}>
        <div className={styles.bladeTitle}>
          <h1 className={styles.titleText}>Alarm Log</h1>
          <span className={styles.subtitleText}>Device {deviceId}</span>
        </div>
        <div className={styles.bladeActions}>
          <Button
            appearance="secondary"
            icon={<ArrowClockwise24Regular />}
            onClick={fetchAlarms}
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
            <div className={styles.loadingSpinner}>Loading alarms...</div>
          </div>
        ) : alarms.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>🔔</div>
            <h2 className={styles.emptyStateTitle}>No Alarms</h2>
            <p className={styles.emptyStateText}>
              This device has no alarm records.
            </p>
          </div>
        ) : (
          <div className={styles.gridContainer}>
            <DataGrid
              items={alarms}
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
              <DataGridBody<Alarm>>
                {({ item, rowId }) => (
                  <DataGridRow<Alarm>
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
            <span className={styles.statLabel}>Total Alarms:</span>
            <span className={styles.statValue}>{alarms.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Active:</span>
            <Badge appearance="important" className={styles.statBadge}>
              {activeAlarms}
            </Badge>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Resolved:</span>
            <Badge appearance="success" className={styles.statBadge}>
              {resolvedAlarms}
            </Badge>
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

export default AlarmsPage;
