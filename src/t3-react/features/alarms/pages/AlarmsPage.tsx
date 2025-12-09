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
  Tooltip,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ArrowDownloadRegular,
  SettingsRegular,
  SearchRegular,
  ArrowClockwise24Regular,
  Save24Regular,
  Dismiss24Regular,
  CheckmarkCircle24Regular,
  ErrorCircleRegular,
  ArrowSortUpRegular,
  ArrowSortDownRegular,
  ArrowSortRegular,
  InfoRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import { AlarmRefreshApiService } from '../services/alarmRefreshApi';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
  const [autoRefreshed, setAutoRefreshed] = useState(false);

  const handleExport = () => {
    console.log('Export alarms to CSV');
  };

  const handleSettings = () => {
    console.log('Settings clicked');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

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
      const response = await fetch(`${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/table/ALARMS`);
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

  // Auto-refresh on page load (Trigger #1)
  useEffect(() => {
    if (isLoading || !selectedDevice || autoRefreshed) return;

    const timer = setTimeout(async () => {
      console.log('🔄 Auto-refreshing alarms from device on page load...');
      try {
        const serial = selectedDevice.serialNumber;
        const response = await AlarmRefreshApiService.refreshAllAlarms(serial);
        console.log('✅ Auto-refresh response:', response);
        if (response && response.items) {
          await AlarmRefreshApiService.saveRefreshedAlarms(serial, response.items);
          await fetchAlarms();
        }
        setAutoRefreshed(true);
      } catch (err) {
        console.error('❌ Auto-refresh failed:', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isLoading, selectedDevice, autoRefreshed, fetchAlarms]);

  // Refresh from device (Trigger #2 - Manual button)
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;
    setRefreshing(true);
    setError(null);

    try {
      const serial = selectedDevice.serialNumber;
      console.log('🔄 Refreshing all alarms from device...');
      const response = await AlarmRefreshApiService.refreshAllAlarms(serial);
      console.log('✅ Device refresh response:', response);

      if (response && response.items) {
        await AlarmRefreshApiService.saveRefreshedAlarms(serial, response.items);
        await fetchAlarms();
      }
    } catch (err) {
      console.error('❌ Refresh from device failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh from device');
    } finally {
      setRefreshing(false);
    }
  };

  // Refresh single alarm from device (Trigger #3 - Per-row icon)
  const handleRefreshSingleAlarm = async (item: Alarm) => {
    if (!selectedDevice || !item.alarm_id) return;

    const alarmKey = item.alarm_id;
    setRefreshingItems(prev => new Set(prev).add(alarmKey));

    try {
      const serial = selectedDevice.serialNumber;
      const alarmIndex = parseInt(item.alarm_id);
      console.log(`🔄 Refreshing single alarm from device: ${alarmIndex}`);

      const response = await AlarmRefreshApiService.refreshAlarm(serial, alarmIndex);
      console.log('✅ Single alarm refresh response:', response);

      if (response && response.items) {
        await AlarmRefreshApiService.saveRefreshedAlarms(serial, response.items);
        await fetchAlarms();
      }
    } catch (err) {
      console.error('❌ Single alarm refresh failed:', err);
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(alarmKey);
        return newSet;
      });
    }
  };

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
    // Column 1: NUM (Alarm ID with refresh icon)
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
      renderCell: (alarm) => {
        const isRefreshing = alarm.alarm_id && refreshingItems.has(alarm.alarm_id);
        return (
          <TableCellLayout className={styles.numCell}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className={`${styles.refreshIconButton} ${isRefreshing ? styles.rotating : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefreshSingleAlarm(alarm);
                }}
                disabled={isRefreshing}
                title="Refresh this alarm from device"
                aria-label="Refresh alarm"
              >
                <ArrowSyncRegular fontSize={16} />
              </button>
              <span>{alarm.alarm_id}</span>
            </div>
          </TableCellLayout>
        );
      },
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
                  TOOLBAR - Azure Portal Command Bar
                  ======================================== */}
              {selectedDevice && (
              <div className={styles.toolbar}>
                <div className={styles.toolbarContainer}>
                  <button
                    className={styles.toolbarButton}
                    onClick={handleRefreshFromDevice}
                    disabled={refreshing}
                    title="Refresh from Device"
                    aria-label="Refresh from Device"
                  >
                    <ArrowSyncRegular className={refreshing ? styles.rotating : ''} />
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
                      placeholder="Search alarms..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search alarms"
                    />
                  </div>

                  {/* Info Button with Tooltip */}
                  {selectedDevice && (
                    <Tooltip
                      content={`Showing alarm log for ${selectedDevice.nameShowOnTree} (SN: ${selectedDevice.serialNumber}). This table displays all alarm records including active and resolved alarms.`}
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
              )}

              {/* ========================================
                  HORIZONTAL DIVIDER
                  ======================================== */}
              <div style={{ padding: '0' }}>
                <hr className={styles.overviewHr} />
              </div>

              {/* ========================================
                  DOCKING BODY - Main Content
                  ======================================== */}
              <div className={styles.dockingBody}>

                {/* Loading State */}
                {isLoading && alarms.length === 0 && (
                  <div className={styles.loadingBar}>
                    <Spinner size="tiny" />
                    <Text size={200} weight="regular">Loading alarms...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !isLoading && (
                  <div className={styles.noData}>
                    <div style={{ textAlign: 'center' }}>
                      <Text size={500} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={300}>Please select a device from the tree to view alarms</Text>
                    </div>
                  </div>
                )}

                {/* Data Grid - Always show with header when device is selected */}
                {selectedDevice && !isLoading && !error && (
                  <>
                    <DataGrid
                      items={alarms}
                      columns={columns}
                      sortable
                      resizableColumns
                      columnSizingOptions={{
                        alarm_id: {
                          minWidth: 60,
                          defaultWidth: 80,
                        },
                        panel: {
                          minWidth: 100,
                          defaultWidth: 120,
                        },
                        message: {
                          minWidth: 200,
                          defaultWidth: 300,
                        },
                        time_stamp: {
                          minWidth: 140,
                          defaultWidth: 180,
                        },
                        acknowledged: {
                          minWidth: 100,
                          defaultWidth: 120,
                        },
                        status: {
                          minWidth: 80,
                          defaultWidth: 100,
                        },
                        actions: {
                          minWidth: 80,
                          defaultWidth: 100,
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
                      <DataGridBody<Alarm>>
                        {({ item, rowId }) => (
                          <DataGridRow<Alarm> key={rowId}>
                            {({ renderCell }) => (
                              <DataGridCell>{renderCell(item)}</DataGridCell>
                            )}
                          </DataGridRow>
                        )}
                      </DataGridBody>
                    </DataGrid>

                    {/* No Data Message - Show below grid when empty */}
                    {alarms.length === 0 && (
                      <div style={{ marginTop: '24px', textAlign: 'center', padding: '0 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                          </svg>
                          <Text size={400} weight="semibold">No alarms found</Text>
                        </div>
                        <Text size={300} style={{ display: 'block', marginBottom: '16px', color: '#605e5c', textAlign: 'center' }}>This device has no alarm logs</Text>
                        <Button
                          appearance="subtle"
                          icon={<ArrowSyncRegular />}
                          onClick={fetchAlarms}
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

export default AlarmsPage;
