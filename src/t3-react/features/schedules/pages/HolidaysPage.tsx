/**
 * Holidays Page - Azure Portal Complete Sample
 *
 * Complete Azure Portal blade layout matching Programs/Schedules pattern
 * Based on C++ BacnetAnnualRoutine.cpp structure:
 * - 5 columns: NUM, Full Label, Auto/Manual, Value, Label
 * - Auto/Manual toggle
 * - Inline editing for labels
 *
 * C++ Reference: T3000-Source/T3000/BacnetAnnualRoutine.cpp
 * - Column 0: ANNUAL_ROUTINE_NUM (checkbox)
 * - Column 1: ANNUAL_ROUTINE_FULL_LABEL (edit)
 * - Column 2: ANNUAL_ROUTINE_AUTO_MANUAL (combobox)
 * - Column 3: ANNUAL_ROUTINE_VALUE (combobox)
 * - Column 4: ANNUAL_ROUTINE_LABLE (edit)
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
  Input,
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
import styles from './HolidaysPage.module.css';

// Types based on C++ BacnetAnnualRoutine structure
interface HolidayPoint {
  serialNumber: number;
  holidayId?: string;
  fullLabel?: string;
  autoManual?: string;
  value?: string;
  label?: string;
}

export const HolidaysPage: React.FC = () => {
  const { selectedDevice, selectDevice, getNextDevice, getFilteredDevices } = useDeviceTreeStore();

  const [holidays, setHolidays] = useState<HolidayPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCell, setEditingCell] = useState<{ serialNumber: number; holidayId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
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

  // Fetch holidays for selected device
  const fetchHolidays = useCallback(async () => {
    if (!selectedDevice) {
      setHolidays([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/table/ANNUAL_TABLE`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch holidays: ${response.statusText}`);
      }

      const data = await response.json();
      setHolidays(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load holidays';
      setError(errorMessage);
      console.error('Error fetching holidays:', err);
      // DON'T clear holidays on database fetch error - preserve what we have
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // Reset autoRefreshed flag when device changes
  useEffect(() => {
    setHolidays([]);
    setAutoRefreshed(false);
  }, [selectedDevice?.serialNumber]);

  // Auto-refresh on page load (Trigger #1) - ONLY if database is empty
  useEffect(() => {
    if (loading || !selectedDevice || autoRefreshed) return;

    const timer = setTimeout(async () => {
      // Check if database has holiday data
      if (holidays.length > 0) {
        console.log('🔄 Database has data, skipping auto-refresh');
        setAutoRefreshed(true);
        return;
      }

      console.log('🔄 Database empty, auto-refreshing holidays from device on page load...');
      try {
        const serial = selectedDevice.serialNumber;
        const result = await PanelDataRefreshService.refreshAllHolidays(serial);
        console.log('✅ Auto-refresh result:', result);
        // Data already saved by service, just reload from database
        await fetchHolidays();
        setAutoRefreshed(true);
      } catch (err) {
        console.error('❌ Auto-refresh failed:', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [loading, selectedDevice, autoRefreshed, fetchHolidays, holidays.length]);

  // Refresh from database
  const handleRefreshFromDatabase = async () => {
    setRefreshing(true);
    await fetchHolidays();
    setRefreshing(false);
  };

  // Refresh from device (Trigger #2 - Manual button)
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;
    setRefreshing(true);
    setError(null);

    try {
      const serial = selectedDevice.serialNumber;
      console.log('🔄 Refreshing all holidays from device...');
      const result = await PanelDataRefreshService.refreshAllHolidays(serial);
      console.log('✅ Device refresh result:', result);
      // Data already saved by service, just reload from database
      await fetchHolidays();
    } catch (err) {
      console.error('❌ Refresh from device failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh from device');
    } finally {
      setRefreshing(false);
    }
  };

  // Refresh single holiday from device (Trigger #3 - Per-row icon)
  const handleRefreshSingleHoliday = async (item: HolidayPoint) => {
    if (!selectedDevice || !item.holidayId) return;

    const holidayKey = item.holidayId;
    setRefreshingItems(prev => new Set(prev).add(holidayKey));

    try {
      const serial = selectedDevice.serialNumber;
      const holidayIndex = parseInt(item.holidayId);
      console.log(`🔄 Refreshing single holiday from device: ${holidayIndex}`);

      const result = await PanelDataRefreshService.refreshSingleHoliday(serial, holidayIndex);
      console.log('✅ Single holiday refresh result:', result);
      // Data already saved by service, just reload from database
      await fetchHolidays();
    } catch (err) {
      console.error('❌ Single holiday refresh failed:', err);
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(holidayKey);
        return newSet;
      });
    }
  };

  const handleExport = () => {
    console.log('Export holidays to CSV');
  };

  const handleSettings = () => {
    console.log('Settings clicked');
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

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

    if (isAtBottom && holidays.length > 0) {
      isAtBottomRef.current = true;
    } else {
      isAtBottomRef.current = false;
    }
  }, [isLoadingNextDevice, loading, holidays.length]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (isLoadingNextDevice || loading || holidays.length === 0) return;

    if (e.deltaY > 0 && isAtBottomRef.current) {
      isAtBottomRef.current = false;
      loadNextDevice();
    }
  }, [isLoadingNextDevice, loading, holidays.length, loadNextDevice]);

  // Auto-scroll to top after device change
  useEffect(() => {
    if (selectedDevice && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: isLoadingNextDevice ? 'smooth' : 'auto'
      });
    }
  }, [selectedDevice, isLoadingNextDevice]);

  // Display holidays with empty rows when no data (show 10 empty rows)
  const displayHolidays = React.useMemo(() => {
    if (holidays.length === 0) {
      return Array(10).fill(null).map((_, index) => ({
        serialNumber: 0,
        holidayId: '',
        fullLabel: '',
        autoManual: '',
        value: '',
        label: '',
      } as HolidayPoint));
    }
    return holidays;
  }, [holidays]);

  // Helper to check if row is an empty placeholder
  const isEmptyRow = (holiday: HolidayPoint) => {
    return !holiday.holidayId && holidays.length === 0;
  };

  // Inline editing handlers
  const handleCellDoubleClick = (item: HolidayPoint, field: string, currentValue: string) => {
    setEditingCell({ serialNumber: item.serialNumber, holidayId: item.holidayId || '', field });
    setEditValue(currentValue || '');
  };

  const handleEditSave = async () => {
    if (!editingCell || !editValue.trim()) {
      setEditingCell(null);
      return;
    }

    setIsSaving(true);
    try {
      // TODO: Implement API call to save
      console.log('Saving:', editingCell, editValue);

      // Update local state
      setHolidays(prevHolidays =>
        prevHolidays.map(holiday =>
          holiday.serialNumber === editingCell.serialNumber && holiday.holidayId === editingCell.holidayId
            ? { ...holiday, [editingCell.field]: editValue }
            : holiday
        )
      );

      setEditingCell(null);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Auto/Manual toggle
  const handleAutoManualToggle = async (item: HolidayPoint) => {
    const newValue = item.autoManual === '1' ? '0' : '1';

    setHolidays(prevHolidays =>
      prevHolidays.map(holiday =>
        holiday.serialNumber === item.serialNumber && holiday.holidayId === item.holidayId
          ? { ...holiday, autoManual: newValue }
          : holiday
      )
    );

    console.log('Toggle Auto/Manual:', item.holidayId, newValue);
    // TODO: Call API to update
  };

  // Column definitions matching C++ BacnetAnnualRoutine: NUM, Full Label, Auto/Manual, Value, Label
  const columns: TableColumnDefinition<HolidayPoint>[] = [
    // 1. NUM (Holiday ID with refresh icon)
    createTableColumn<HolidayPoint>({
      columnId: 'holidayId',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('holidayId')}>
          <span>Holiday</span>
          {sortColumn === 'holidayId' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => {
        const isRefreshing = item.holidayId && refreshingItems.has(item.holidayId);
        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              <div className={styles.flexCenter8Gap}>
                <button
                  className={`${styles.refreshIconButton} ${isRefreshing ? styles.rotating : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefreshSingleHoliday(item);
                  }}
                  disabled={!!isRefreshing}
                  title="Refresh this holiday from device"
                  aria-label="Refresh holiday"
                >
                  <ArrowSyncRegular fontSize={16} />
                </button>
                <span>{item.holidayId || '---'}</span>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),

    // 2. Full Label (editable)
    createTableColumn<HolidayPoint>({
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
                          editingCell?.holidayId === item.holidayId &&
                          editingCell?.field === 'fullLabel';

        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              isEditing ? (
                <Input
                  value={editValue}
                  onChange={(_e, data) => setEditValue(data.value)}
                  onBlur={handleEditSave}
                  onKeyDown={handleEditKeyDown}
                  autoFocus
                  disabled={isSaving}
                  size="small"
                  className={styles.fullWidth}
                />
              ) : (
                <div
                  onDoubleClick={() => handleCellDoubleClick(item, 'fullLabel', item.fullLabel || '')}
                  className={styles.editableCell}
                >
                  <Text size={200}>{item.fullLabel || 'Unnamed'}</Text>
                </div>
              )
            )}
          </TableCellLayout>
        );
      },
    }),

    // 3. Auto/Manual (toggle)
    createTableColumn<HolidayPoint>({
      columnId: 'autoManual',
      renderHeaderCell: () => (
        <div className={styles.headerCell}>
          <span>Auto/Man</span>
        </div>
      ),
      renderCell: (item) => {
        const isAuto = item.autoManual === '1' || item.autoManual?.toLowerCase() === 'auto';

        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              <div className={styles.headerCellWith8Gap}>
                <Switch
                  checked={isAuto}
                  onChange={() => handleAutoManualToggle(item)}
                />
                <Text size={200}>{isAuto ? 'Auto' : 'Manual'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),

    // 4. Value (editable)
    createTableColumn<HolidayPoint>({
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
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.value || '---')}
        </TableCellLayout>
      ),
    }),

    // 5. Label (editable)
    createTableColumn<HolidayPoint>({
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
                          editingCell?.holidayId === item.holidayId &&
                          editingCell?.field === 'label';

        return (
          <TableCellLayout>
            {!isEmptyRow(item) && (
              isEditing ? (
                <Input
                  value={editValue}
                  onChange={(_e, data) => setEditValue(data.value)}
                  onBlur={handleEditSave}
                  onKeyDown={handleEditKeyDown}
                  autoFocus
                  disabled={isSaving}
                  size="small"
                  className={styles.fullWidth}
                />
              ) : (
                <div
                  onDoubleClick={() => handleCellDoubleClick(item, 'label', item.label || '')}
                  className={styles.editableCell}
                >
                  <Text size={200}>{item.label || '---'}</Text>
                </div>
              )
            )}
          </TableCellLayout>
        );
      },
    }),
  ];

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
              <div className={styles.errorMessage}>
                <ErrorCircleRegular className={styles.iconError} />
                <Text className={styles.textError}>
                  {error}
                </Text>
              </div>
            )}

            {/* ========================================
                TOOLBAR - Azure Portal Command Bar
                Matches: ext-overview-assistant-toolbar azc-toolbar
                ======================================== */}
            {selectedDevice && (
            <>
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
                    placeholder="Search holidays..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    spellCheck="false"
                    role="searchbox"
                    aria-label="Search holidays"
                  />
                </div>

                {/* Info Button with Tooltip */}
                <Tooltip
                  content={`Showing holidays for ${selectedDevice.nameShowOnTree} (SN: ${selectedDevice.serialNumber}). This table displays all configured annual routine/holiday schedules including labels, auto/manual modes, and values.`}
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

          {/* HORIZONTAL DIVIDER */}
          <div className={styles.noPadding}>
            <hr className={styles.overviewHr} />
          </div>
          </>
          )}

            {/* DOCKING BODY */}
            <div className={styles.dockingBody}>

              {loading && holidays.length === 0 && (
                <div className={styles.loadingBar}>
                  <Spinner size="tiny" />
                  <Text size={200} weight="regular">Loading holidays...</Text>
                </div>
              )}

              {!selectedDevice && !loading && (
                <div className={styles.noData}>
                  <div className={styles.centerText}>
                    <Text size={400} weight="semibold">No device selected</Text>
                    <br />
                    <Text size={200}>Please select a device from the tree to view holidays</Text>
                  </div>
                </div>
              )}

              {selectedDevice && !loading && (
                <div
                  ref={scrollContainerRef}
                  className={styles.scrollContainer}
                  onScroll={handleScroll}
                  onWheel={handleWheel}
                >
                  <DataGrid
                    items={displayHolidays}
                    columns={columns}
                    sortable
                    resizableColumns
                    columnSizingOptions={{
                      holidayId: {
                        minWidth: 60,
                        idealWidth: 100,
                      },
                      fullLabel: {
                        minWidth: 150,
                        idealWidth: 200,
                      },
                      autoManual: {
                        minWidth: 100,
                        idealWidth: 130,
                      },
                      value: {
                        minWidth: 80,
                        idealWidth: 100,
                      },
                      label: {
                        minWidth: 90,
                        idealWidth: 130,
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
                    <DataGridBody<HolidayPoint>>
                      {({ item, rowId }) => (
                        <DataGridRow<HolidayPoint> key={rowId}>
                          {({ renderCell }) => (
                            <DataGridCell>{renderCell(item)}</DataGridCell>
                          )}
                        </DataGridRow>
                      )}
                    </DataGridBody>
                  </DataGrid>

                  {/* No Data Message - Commented out - showing empty grid instead
                  {holidays.length === 0 && (
                    <div className={styles.emptyStateContainer}>
                      <div className={styles.emptyStateHeader}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.emptyStateIcon}>
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                        </svg>
                        <Text size={400} weight="semibold">No holidays found</Text>
                      </div>
                      <Text size={300} style={{ display: 'block', marginBottom: '16px', color: '#605e5c', textAlign: 'center' }}>This device has no configured holiday points</Text>
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
