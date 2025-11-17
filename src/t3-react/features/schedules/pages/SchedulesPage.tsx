/**
 * Schedules Page - Azure Portal Complete Sample
 *
 * Complete Azure Portal blade layout matching Inputs/Outputs/Variables/Programs pattern
 * Based on C++ BacnetWeeklyRoutine.cpp structure and Rust SCHEDULES entity:
 * - Columns: Schedule, Auto/Manual, Output, Variable, Holiday1, Status1, Holiday2, Status2
 * - Auto/Manual toggle
 * - Inline editing for fields
 *
 * C++ Reference: T3000-Source/T3000/BacnetWeeklyRoutine.cpp
 * Rust Entity: api/src/entity/t3_device/schedules.rs
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
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import styles from './SchedulesPage.module.css';

// Types based on Rust entity (schedules.rs) and C++ BacnetWeeklyRoutine structure
interface SchedulePoint {
  serialNumber: number;
  scheduleId?: string;
  autoManual?: string;
  outputField?: string;
  variableField?: string;
  holiday1?: string;
  status1?: string;
  holiday2?: string;
  status2?: string;
  intervalField?: string;
  scheduleTime?: string;
  mondayTime?: string;
  tuesdayTime?: string;
  wednesdayTime?: string;
  thursdayTime?: string;
  fridayTime?: string;
}

export const SchedulesPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();

  const [schedules, setSchedules] = useState<SchedulePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('scheduleId');
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

  // Fetch schedules for selected device
  const fetchSchedules = useCallback(async () => {
    if (!selectedDevice) {
      setSchedules([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/t3_device/devices/${selectedDevice.serialNumber}/table/SCHEDULES`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Schedules API response:', result);

      if (result.data && Array.isArray(result.data)) {
        setSchedules(result.data);
      } else {
        console.warn('Unexpected response format:', result);
        setSchedules([]);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch schedules');
      setSchedules([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchSchedules();
  };

  // Export handler
  const handleExport = () => {
    console.log('Export schedules clicked');
  };

  // Settings handler
  const handleSettings = () => {
    console.log('Settings clicked');
  };

  // Search handler
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
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

  // Auto/Manual toggle handler
  const handleAutoManualToggle = async (item: SchedulePoint) => {
    const newValue = item.autoManual === '1' ? '0' : '1';

    // Optimistic update
    setSchedules(prevSchedules =>
      prevSchedules.map(schedule =>
        schedule.serialNumber === item.serialNumber && schedule.scheduleId === item.scheduleId
          ? { ...schedule, autoManual: newValue }
          : schedule
      )
    );

    console.log('Toggle Auto/Manual:', item.scheduleId, newValue);
    // TODO: Call API to update auto_manual value
  };

  // Column definitions matching C++ BacnetWeeklyRoutine.cpp
  const columns: TableColumnDefinition<SchedulePoint>[] = [
    // 1. Schedule ID
    createTableColumn<SchedulePoint>({
      columnId: 'scheduleId',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('scheduleId')}>
          <span>Schedule</span>
          {sortColumn === 'scheduleId' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.scheduleId || '---'}</TableCellLayout>,
    }),

    // 2. Auto/Manual
    createTableColumn<SchedulePoint>({
      columnId: 'autoManual',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Auto/Man</span>
        </div>
      ),
      renderCell: (item) => {
        const isAuto = item.autoManual === '1';
        return (
          <TableCellLayout>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Switch
                checked={isAuto}
                onChange={() => handleAutoManualToggle(item)}
              />
              <Text size={200}>{isAuto ? 'AUTO' : 'MAN'}</Text>
            </div>
          </TableCellLayout>
        );
      },
    }),

    // 3. Output
    createTableColumn<SchedulePoint>({
      columnId: 'outputField',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('outputField')}>
          <span>Output</span>
          {sortColumn === 'outputField' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.outputField || '---'}</TableCellLayout>,
    }),

    // 4. Variable
    createTableColumn<SchedulePoint>({
      columnId: 'variableField',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('variableField')}>
          <span>Variable</span>
          {sortColumn === 'variableField' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.variableField || '---'}</TableCellLayout>,
    }),

    // 5. Holiday1
    createTableColumn<SchedulePoint>({
      columnId: 'holiday1',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('holiday1')}>
          <span>Holiday1</span>
          {sortColumn === 'holiday1' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.holiday1 || '---'}</TableCellLayout>,
    }),

    // 6. Status1
    createTableColumn<SchedulePoint>({
      columnId: 'status1',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Status1</span>
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.status1 || '---'}</TableCellLayout>,
    }),

    // 7. Holiday2
    createTableColumn<SchedulePoint>({
      columnId: 'holiday2',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('holiday2')}>
          <span>Holiday2</span>
          {sortColumn === 'holiday2' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.holiday2 || '---'}</TableCellLayout>,
    }),

    // 8. Status2
    createTableColumn<SchedulePoint>({
      columnId: 'status2',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Status2</span>
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.status2 || '---'}</TableCellLayout>,
    }),
  ];

  // Filtered and sorted schedules
  const filteredSchedules = schedules.filter(schedule =>
    searchQuery === '' ||
    schedule.scheduleId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    schedule.outputField?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    schedule.variableField?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    const aValue = (a[sortColumn as keyof SchedulePoint] || '').toString();
    const bValue = (b[sortColumn as keyof SchedulePoint] || '').toString();
    const comparison = aValue.localeCompare(bValue);
    return sortDirection === 'ascending' ? comparison : -comparison;
  });

  return (
    <div className={styles.container}>
      {/* ========================================
          AZURE PORTAL BLADE - FULL WIDTH LAYOUT
          Matches: ext-blade
          ======================================== */}
      <div className={styles.blade}>
        <div className={styles.bladeContent}>
          {/* ========================================
              BLADE HEADER - Title & Toolbar
              Matches: ext-blade-header
              ======================================== */}
          <div className={styles.bladeHeader}>
            <div className={styles.titleContainer}>
              <h1 className={styles.title}>Schedules</h1>
            </div>
          </div>

          {/* ========================================
              PART CONTAINER - Main Content Wrapper
              Matches: fxs-part-container
              ======================================== */}
          <div className={styles.partContainer}>
            {/* Part Content - Main Content Area */}
            <div className={styles.partContent}>

              {/* ERROR MESSAGE */}
              {error && (
                <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#fef0f1', border: '1px solid #d13438', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flexShrink: 0, marginTop: '2px' }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 6C10.5523 6 11 6.44772 11 7V10C11 10.5523 10.5523 11 10 11C9.44772 11 9 10.5523 9 10V7C9 6.44772 9.44772 6 10 6ZM10 14C9.44772 14 9 13.5523 9 13C9 12.4477 9.44772 12 10 12C10.5523 12 11 12.4477 11 13C11 13.5523 10.5523 14 10 14Z" fill="#d13438"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text style={{ color: '#d13438', display: 'block', marginBottom: '4px' }} weight="semibold">Error loading schedules</Text>
                      <Text style={{ color: '#d13438' }} size={300}>{error}</Text>
                    </div>
                  </div>
                </div>
              )}

              {/* BLADE DESCRIPTION */}
              {selectedDevice && (
                <div className={styles.bladeDescription}>
                  <span>
                    Showing schedule points for <b>{selectedDevice.nameShowOnTree} (SN: {selectedDevice.serialNumber})</b>.
                    {' '}This table displays all configured weekly routine schedules including holidays, outputs, and status information.
                    {' '}<a href="#" onClick={(e) => { e.preventDefault(); console.log('Learn more clicked'); }}>Learn more</a>
                  </span>
                </div>
              )}

              {/* TOOLBAR */}
              <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                  {/* Refresh Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleRefresh}
                    disabled={loading || refreshing}
                    title="Refresh"
                    aria-label="Refresh"
                  >
                    <ArrowSyncRegular />
                    <span>Refresh</span>
                  </button>

                  {/* Export Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleExport}
                    title="Export"
                    aria-label="Export"
                  >
                    <ArrowDownloadRegular />
                    <span>Export</span>
                  </button>

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
                      placeholder="Search schedules..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search schedules"
                    />
                  </div>
                </div>
              </div>

              {/* HORIZONTAL DIVIDER */}
              <div style={{ padding: '0' }}>
                <hr className={styles.overviewHr} />
              </div>

              {/* DOCKING BODY */}
              <div className={styles.dockingBody}>

                {/* Loading State */}
                {loading && schedules.length === 0 && (
                  <div className={styles.loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spinner size="large" />
                    <Text style={{ marginLeft: '12px' }}>Loading schedules...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div style={{ textAlign: 'center' }}>
                      <Text size={500} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={300}>Please select a device from the tree to view schedules</Text>
                    </div>
                  </div>
                )}

                {/* No Schedules Found */}
                {selectedDevice && !loading && !error && schedules.length === 0 && (
                  <div style={{ marginTop: '40px' }}>
                    <div style={{ textAlign: 'center', padding: '0 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                        </svg>
                        <Text size={500} weight="semibold">No schedules found</Text>
                      </div>
                      <Text size={300} style={{ display: 'block', marginBottom: '24px', color: '#605e5c', textAlign: 'center' }}>This device has no configured schedule points</Text>
                      <Button
                        appearance="subtle"
                        icon={<ArrowSyncRegular />}
                        onClick={handleRefresh}
                        style={{ minWidth: '120px', fontWeight: 'normal' }}
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>
                )}

                {/* Data Grid with Data */}
                {selectedDevice && !loading && !error && schedules.length > 0 && (
                  <DataGrid
                    items={sortedSchedules}
                    columns={columns}
                    sortable
                    resizableColumns
                    columnSizingOptions={{
                      scheduleId: {
                        minWidth: 70,
                        defaultWidth: 90,
                      },
                      autoManual: {
                        minWidth: 100,
                        defaultWidth: 120,
                      },
                      outputField: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      variableField: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      holiday1: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      status1: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      holiday2: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      status2: {
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
                    <DataGridBody<SchedulePoint>>
                      {({ item, rowId }) => (
                        <DataGridRow<SchedulePoint> key={rowId}>
                          {({ renderCell }) => (
                            <DataGridCell>{renderCell(item)}</DataGridCell>
                          )}
                        </DataGridRow>
                      )}
                    </DataGridBody>
                  </DataGrid>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulesPage;
