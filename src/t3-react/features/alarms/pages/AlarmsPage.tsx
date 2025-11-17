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
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowClockwise24Regular,
  Save24Regular,
  Dismiss24Regular,
  CheckmarkCircle24Regular,
  ErrorCircle24Regular,
  ArrowSortUpRegular,
  ArrowSortDownRegular,
  ArrowSortRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
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
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, Partial<Alarm>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending');

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

  // Fetch alarms data
  const fetchAlarms = useCallback(async () => {
    if (!selectedDevice) {
      setAlarms([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Using generic table API
      const response = await fetch(`/api/t3_device/devices/${selectedDevice.serialNumber}/table/ALARMS`);
      if (!response.ok) throw new Error('Failed to fetch alarms');

      const result = await response.json();
      setAlarms(result.data || []);
    } catch (err) {
      console.error('Error fetching alarms:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch alarms');
      setAlarms([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDevice]);

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

  // Sort handler
  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
    } else {
      setSortColumn(columnId);
      setSortDirection('ascending');
    }
  };

  // Column definitions based on C++ BacnetAlarmLog.cpp (7 columns)
  const columns: TableColumnDefinition<Alarm>[] = useMemo(() => [
    // Column 1: NUM (Alarm ID)
    createTableColumn<Alarm>({
      columnId: 'alarm_id',
      compare: (a, b) => Number(a.alarm_id) - Number(b.alarm_id),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('alarm_id')}>
          <span>NUM</span>
          {sortColumn === 'alarm_id' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
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
        {/* Loading State */}
        {isLoading && alarms.length === 0 && (
          <div className={styles.loadingContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size="large" />
            <Text style={{ marginLeft: '12px' }}>Loading alarms...</Text>
          </div>
        )}

        {/* No Device Selected */}
        {!selectedDevice && !isLoading && (
          <div className={styles.emptyState}>
            <div style={{ textAlign: 'center' }}>
              <Text size={500} weight="semibold">No device selected</Text>
              <br />
              <Text size={300}>Please select a device from the tree to view alarms</Text>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#fef0f1', border: '1px solid #d13438', borderRadius: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flexShrink: 0, marginTop: '2px' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 6C10.5523 6 11 6.44772 11 7V10C11 10.5523 10.5523 11 10 11C9.44772 11 9 10.5523 9 10V7C9 6.44772 9.44772 6 10 6ZM10 14C9.44772 14 9 13.5523 9 13C9 12.4477 9.44772 12 10 12C10.5523 12 11 12.4477 11 13C11 13.5523 10.5523 14 10 14Z" fill="#d13438"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <Text style={{ color: '#d13438', display: 'block', marginBottom: '4px' }} weight="semibold">Error loading alarms</Text>
                <Text style={{ color: '#d13438' }} size={300}>{error}</Text>
              </div>
            </div>
          </div>
        )}

        {/* No Alarms Found */}
        {selectedDevice && !isLoading && !error && alarms.length === 0 && (
          <div style={{ marginTop: '40px' }}>
            <div style={{ textAlign: 'center', padding: '0 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                </svg>
                <Text size={500} weight="semibold">No alarms found</Text>
              </div>
              <Text size={300} style={{ display: 'block', marginBottom: '24px', color: '#605e5c', textAlign: 'center' }}>This device has no alarm records</Text>
              <Button
                appearance="subtle"
                icon={<ArrowClockwise24Regular />}
                onClick={fetchAlarms}
                style={{ minWidth: '120px', fontWeight: 'normal' }}
              >
                Refresh
              </Button>
            </div>
          </div>
        )}

        {/* Data Grid with Data */}
        {selectedDevice && !isLoading && !error && alarms.length > 0 && (
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
