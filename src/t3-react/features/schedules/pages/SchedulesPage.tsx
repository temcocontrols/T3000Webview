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
  InfoRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import { PanelDataRefreshService } from '../../../shared/services/panelDataRefreshService';
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
  const { selectedDevice, treeData, selectDevice, getNextDevice, getFilteredDevices } = useDeviceTreeStore();

  const [schedules, setSchedules] = useState<SchedulePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('scheduleId');
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending');
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
  const [autoRefreshed, setAutoRefreshed] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingNextDevice, setIsLoadingNextDevice] = useState(false);
  const isAtBottomRef = useRef(false);

  // Auto-select first device on page load if no device is selected
  useEffect(() => {
    if (!selectedDevice) {
      const devices = getFilteredDevices();
      if (devices.length > 0) {
        selectDevice(devices[0]);
      }
    }
  }, [selectedDevice, getFilteredDevices, selectDevice]);

  // Fetch schedules for selected device
  const fetchSchedules = useCallback(async () => {
    if (!selectedDevice) {
      setSchedules([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/table/SCHEDULES`);

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
      // DON'T clear schedules on database fetch error - preserve what we have
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Reset autoRefreshed flag when device changes
  useEffect(() => {
    setSchedules([]);
    setAutoRefreshed(false);
  }, [selectedDevice?.serialNumber]);

  // Auto-refresh on page load (Trigger #1) - ONLY if database is empty
  useEffect(() => {
    if (loading || !selectedDevice || autoRefreshed) return;

    const timer = setTimeout(async () => {
      // Check if database has schedule data
      if (schedules.length > 0) {
        console.log('🔄 Database has data, skipping auto-refresh');
        setAutoRefreshed(true);
        return;
      }

      console.log('🔄 Database empty, auto-refreshing schedules from device on page load...');
      try {
        const serial = selectedDevice.serialNumber;
        const result = await PanelDataRefreshService.refreshAllSchedules(serial);
        console.log('✅ Auto-refresh result:', result);
        // Data already saved by service, just reload from database
        await fetchSchedules();
        setAutoRefreshed(true);
      } catch (err) {
        console.error('❌ Auto-refresh failed:', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [loading, selectedDevice, autoRefreshed, fetchSchedules, schedules.length]);

  // Refresh from database (toolbar button)
  const handleRefreshFromDatabase = () => {
    setRefreshing(true);
    fetchSchedules();
  };

  // Refresh from device (Trigger #2 - Manual button)
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;
    setRefreshing(true);
    setError(null);

    try {
      const serial = selectedDevice.serialNumber;
      console.log('🔄 Refreshing all schedules from device...');
      const result = await PanelDataRefreshService.refreshAllSchedules(serial);
      console.log('✅ Device refresh result:', result);
      // Data already saved by service, just reload from database
      await fetchSchedules();
    } catch (err) {
      console.error('❌ Refresh from device failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh from device');
    } finally {
      setRefreshing(false);
    }
  };

  // Refresh single schedule from device (Trigger #3 - Per-row icon)
  const handleRefreshSingleSchedule = async (item: SchedulePoint) => {
    if (!selectedDevice || !item.scheduleId) return;

    const scheduleKey = item.scheduleId;
    setRefreshingItems(prev => new Set(prev).add(scheduleKey));

    try {
      const serial = selectedDevice.serialNumber;
      const scheduleIndex = parseInt(item.scheduleId);
      console.log(`🔄 Refreshing single schedule from device: ${scheduleIndex}`);

      const result = await PanelDataRefreshService.refreshSingleSchedule(serial, scheduleIndex);
      console.log('✅ Single schedule refresh result:', result);
      // Data already saved by service, just reload from database
      await fetchSchedules();
    } catch (err) {
      console.error('❌ Single schedule refresh failed:', err);
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(scheduleKey);
        return newSet;
      });
    }
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
    if (isLoadingNextDevice || loading) return;

    const target = e.currentTarget;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    const isAtBottom = scrollBottom <= 1;

    if (isAtBottom && schedules.length > 0) {
      isAtBottomRef.current = true;
    } else {
      isAtBottomRef.current = false;
    }
  }, [isLoadingNextDevice, loading, schedules.length]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (isLoadingNextDevice || loading || schedules.length === 0) return;

    if (e.deltaY > 0 && isAtBottomRef.current) {
      isAtBottomRef.current = false;
      loadNextDevice();
    }
  }, [isLoadingNextDevice, loading, schedules.length, loadNextDevice]);

  // Auto-scroll to top after device change
  useEffect(() => {
    if (selectedDevice && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: isLoadingNextDevice ? 'smooth' : 'auto'
      });
    }
  }, [selectedDevice, isLoadingNextDevice]);

  // Display schedules with empty rows when no data (show 10 empty rows)
  const displaySchedules = React.useMemo(() => {
    if (schedules.length === 0) {
      return Array(10).fill(null).map((_, index) => ({
        serialNumber: 0,
        scheduleId: '',
        autoManual: '',
        outputField: '',
        variableField: '',
        holiday1: '',
        status1: '',
        holiday2: '',
        status2: '',
        intervalField: '',
        scheduleTime: '',
        mondayTime: '',
        tuesdayTime: '',
        wednesdayTime: '',
        thursdayTime: '',
        fridayTime: '',
      } as SchedulePoint));
    }
    return schedules;
  }, [schedules]);

  // Helper to check if row is an empty placeholder
  const isEmptyRow = (schedule: SchedulePoint) => {
    return !schedule.scheduleId && schedules.length === 0;
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
    // 1. Schedule ID (with refresh icon)
    createTableColumn<SchedulePoint>({
      columnId: 'scheduleId',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('scheduleId')}>
          <span>Schedule</span>
          {sortColumn === 'scheduleId' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => {
        const isRefreshing = item.scheduleId && refreshingItems.has(item.scheduleId);
        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              <div className={styles.headerCellWith8Gap}>
                <button
                  className={`${styles.refreshIconButton} ${isRefreshing ? styles.rotating : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefreshSingleSchedule(item);
                  }}
                  disabled={isRefreshing}
                  title="Refresh this schedule from device"
                  aria-label="Refresh schedule"
                >
                  <ArrowSyncRegular fontSize={16} />
                </button>
                <span>{item.scheduleId || '---'}</span>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),

    // 2. Auto/Manual
    createTableColumn<SchedulePoint>({
      columnId: 'autoManual',
      renderHeaderCell: () => (
        <div className={styles.headerCell}>
          <span>Auto/Man</span>
        </div>
      ),
      renderCell: (item) => {
        const isAuto = item.autoManual === '1';
        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              <div className={styles.headerCellWith8Gap}>
                <Switch
                  checked={isAuto}
                  onChange={() => handleAutoManualToggle(item)}
                />
                <Text size={200}>{isAuto ? 'AUTO' : 'MAN'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),

    // 3. Output
    createTableColumn<SchedulePoint>({
      columnId: 'outputField',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('outputField')}>
          <span>Output</span>
          {sortColumn === 'outputField' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.outputField || '---')}
        </TableCellLayout>
      ),
    }),

    // 4. Variable
    createTableColumn<SchedulePoint>({
      columnId: 'variableField',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('variableField')}>
          <span>Variable</span>
          {sortColumn === 'variableField' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.variableField || '---')}
        </TableCellLayout>
      ),
    }),

    // 5. Holiday1
    createTableColumn<SchedulePoint>({
      columnId: 'holiday1',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('holiday1')}>
          <span>Holiday1</span>
          {sortColumn === 'holiday1' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.holiday1 || '---')}
        </TableCellLayout>
      ),
    }),

    // 6. Status1
    createTableColumn<SchedulePoint>({
      columnId: 'status1',
      renderHeaderCell: () => (
        <div className={styles.headerCell}>
          <span>Label</span>
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.status1 || '---')}
        </TableCellLayout>
      ),
    }),

    // 7. Holiday2
    createTableColumn<SchedulePoint>({
      columnId: 'holiday2',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('holiday2')}>
          <span>Holiday2</span>
          {sortColumn === 'holiday2' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.holiday2 || '---')}
        </TableCellLayout>
      ),
    }),

    // 8. Status2
    createTableColumn<SchedulePoint>({
      columnId: 'status2',
      renderHeaderCell: () => (
        <div className={styles.headerCell}>
          <span>Status</span>
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.status2 || '---')}
        </TableCellLayout>
      ),
    }),
  ];

  // Filtered and sorted schedules (use displaySchedules to include empty rows)
  const filteredSchedules = displaySchedules.filter(schedule =>
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
              <>
              <div className={styles.toolbar}>
                <div className={styles.toolbarContainer}>
                  {/* Refresh Button */}
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
                      placeholder="Search schedules..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search schedules"
                    />
                  </div>

                  {/* Info Button with Tooltip */}
                  <Tooltip
                    content={`Showing schedule points for ${selectedDevice.nameShowOnTree} (SN: ${selectedDevice.serialNumber}). This table displays all configured weekly routine schedules including holidays, outputs, and status information.`}
                    relationship="description"
                  >
                    <button
                      className={`${styles.toolbarButton} ${styles.clearFiltersButton}`}
                      title="Information"
                      aria-label="Information about this page"
                    >
                      <InfoRegular />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* ========================================
                  HORIZONTAL DIVIDER
                  Matches: ext-overview-hr
                  ======================================== */}
              <div className={styles.noPadding}>
                <hr className={styles.overviewHr} />
              </div>
              </>
              )}

              {/* ========================================
                  DOCKING BODY - Main Content
                  Matches: msportalfx-docking-body
                  ======================================== */}
              <div className={styles.dockingBody}>

                {/* Loading State */}
                {loading && schedules.length === 0 && (
                  <div className={styles.loadingBar}>
                    <Spinner size="tiny" />
                    <Text size={200} weight="regular">Loading schedules...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div className={styles.centerText}>
                      <Text size={400} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={200}>Please select a device from the tree to view schedules</Text>
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
                    items={sortedSchedules}
                    columns={columns}
                    sortable
                    resizableColumns
                    columnSizingOptions={{
                      scheduleId: {
                        minWidth: 70,
                        idealWidth: '10%',
                      },
                      autoManual: {
                        minWidth: 100,
                        idealWidth: '15%',
                      },
                      outputField: {
                        minWidth: 80,
                        idealWidth: '12%',
                      },
                      variableField: {
                        minWidth: 80,
                        idealWidth: '12%',
                      },
                      holiday1: {
                        minWidth: 80,
                        idealWidth: '15%',
                      },
                      status1: {
                        minWidth: 80,
                        idealWidth: '12%',
                      },
                      holiday2: {
                        minWidth: 80,
                        idealWidth: '12%',
                      },
                      status2: {
                        minWidth: 80,
                        idealWidth: '12%',
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

                  {/* No Data Message - Commented out - showing empty grid instead
                  {schedules.length === 0 && (
                    <div className={styles.emptyStateContainer}>
                      <div className={styles.emptyStateHeader}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.emptyStateIcon}>
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                        </svg>
                        <Text size={400} weight="semibold">No schedules found</Text>
                      </div>
                      <Text size={300} style={{ display: 'block', marginBottom: '16px', color: '#605e5c', textAlign: 'center' }}>This device has no configured schedule points</Text>
                      <Button
                        appearance="subtle"
                        icon={<ArrowSyncRegular />}
                        onClick={handleRefreshFromDatabase}
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

export default SchedulesPage;
