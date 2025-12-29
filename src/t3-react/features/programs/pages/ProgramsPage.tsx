/**
 * Programs Page - Azure Portal Complete Sample
 *
 * Complete Azure Portal blade layout matching Inputs/Outputs/Variables pattern
 * Based on C++ BacnetProgram.cpp structure:
 * - 7 columns: Program, Full Label, Status, Auto/Manual, Size, Execution time, Label
 * - Status: ON/OFF
 * - Auto/Manual toggle
 * - Inline editing for labels
 *
 * C++ Reference: T3000-Source/T3000/BacnetProgram.cpp
 * - Column 0: PROGRAM_NUM (checkbox)
 * - Column 1: PROGRAM_FULL_LABLE (edit)
 * - Column 2: PROGRAM_STATUS (ON/OFF combobox)
 * - Column 3: PROGRAM_AUTO_MANUAL (Auto/Manual combobox)
 * - Column 4: PROGRAM_SIZE_LIST (readonly)
 * - Column 5: PROGRAM_RUN_STATUS (readonly)
 * - Column 6: PROGRAM_LABEL (edit)
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
  Badge,
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
import { ProgramRefreshApiService } from '../services/programRefreshApi';
import styles from './ProgramsPage.module.css';

// Types based on Rust entity (programs.rs) and C++ BacnetProgram structure
interface ProgramPoint {
  serialNumber: number;
  programId?: string;
  switchNode?: string;
  programLabel?: string;
  programList?: string;
  programSize?: string;
  programPointer?: string;
  programStatus?: string;
  autoManual?: string;
}

export const ProgramsPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice, getNextDevice, getFilteredDevices } = useDeviceTreeStore();

  const [programs, setPrograms] = useState<ProgramPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
  const [autoRefreshed, setAutoRefreshed] = useState(false);

  // Auto-scroll feature state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingNextDevice, setIsLoadingNextDevice] = useState(false);
  const isAtBottomRef = useRef(false);

  // Auto-select first device on page load if no device is selected
  useEffect(() => {
    if (!selectedDevice && treeData.length > 0) {
      const filteredDevices = getFilteredDevices();
      if (filteredDevices.length > 0) {
        selectDevice(filteredDevices[0]);
      }
    }
  }, [selectedDevice, treeData, selectDevice, getFilteredDevices]);

  // Fetch programs for selected device
  const fetchPrograms = useCallback(async () => {
    if (!selectedDevice) {
      setPrograms([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/programs`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch programs: ${response.statusText}`);
      }

      const data = await response.json();
      setPrograms(data.programs || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load programs';
      setError(errorMessage);
      console.error('Error fetching programs:', err);
      // DON'T clear programs on database fetch error - preserve what we have
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  // Auto-refresh once after page load (Trigger #1)
  useEffect(() => {
    if (loading || !selectedDevice || autoRefreshed) return;

    // Wait for initial load to complete, then auto-refresh from device
    const timer = setTimeout(async () => {
      try {
        console.log('[ProgramsPage] Auto-refreshing from device...');
        const refreshResponse = await ProgramRefreshApiService.refreshAllPrograms(selectedDevice.serialNumber);
        console.log('[ProgramsPage] Refresh response:', refreshResponse);

        // Save to database
        if (refreshResponse.items && refreshResponse.items.length > 0) {
          await ProgramRefreshApiService.saveRefreshedPrograms(selectedDevice.serialNumber, refreshResponse.items);
          // Only reload from database if save was successful
          await fetchPrograms();
        } else {
          console.warn('[ProgramsPage] Auto-refresh: No items received, keeping existing data');
        }
        setAutoRefreshed(true);
      } catch (error) {
        console.error('[ProgramsPage] Auto-refresh failed:', error);
        // Don't reload from database on error - preserve existing programs
        setAutoRefreshed(true); // Mark as attempted to prevent retry loops
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [loading, selectedDevice, autoRefreshed, fetchPrograms]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPrograms();
    setRefreshing(false);
  };

  // Refresh all programs from device (Trigger #2: Manual "Refresh from Device" button)
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    try {
      console.log('[ProgramsPage] Refreshing all programs from device...');
      const refreshResponse = await ProgramRefreshApiService.refreshAllPrograms(selectedDevice.serialNumber);
      console.log('[ProgramsPage] Refresh response:', refreshResponse);

      // Save to database
      if (refreshResponse.items && refreshResponse.items.length > 0) {
        const saveResponse = await ProgramRefreshApiService.saveRefreshedPrograms(
          selectedDevice.serialNumber,
          refreshResponse.items
        );
        console.log('[ProgramsPage] Save response:', saveResponse);

        // Only reload from database if save was successful
        await fetchPrograms();
      } else {
        console.warn('[ProgramsPage] No items received from refresh, keeping existing data');
      }
    } catch (error) {
      console.error('[ProgramsPage] Failed to refresh from device:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh from device');
      // Don't call fetchPrograms() on error - preserve existing programs in UI
    } finally {
      setRefreshing(false);
    }
  };

  // Refresh single program from device (Trigger #3: Per-row refresh icon)
  const handleRefreshSingleProgram = async (programId: string) => {
    if (!selectedDevice) return;

    const index = parseInt(programId, 10);
    if (isNaN(index)) {
      console.error('[ProgramsPage] Invalid program index:', programId);
      return;
    }

    setRefreshingItems(prev => new Set(prev).add(programId));
    try {
      console.log(`[ProgramsPage] Refreshing program ${index} from device...`);
      const refreshResponse = await ProgramRefreshApiService.refreshProgram(selectedDevice.serialNumber, index);
      console.log('[ProgramsPage] Refresh response:', refreshResponse);

      // Save to database
      if (refreshResponse.items && refreshResponse.items.length > 0) {
        const saveResponse = await ProgramRefreshApiService.saveRefreshedPrograms(
          selectedDevice.serialNumber,
          refreshResponse.items
        );
        console.log('[ProgramsPage] Save response:', saveResponse);
      }

      // Reload data from database after save
      await fetchPrograms();
    } catch (error) {
      console.error(`[ProgramsPage] Failed to refresh program ${index}:`, error);
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(programId);
        return newSet;
      });
    }
  };

  const handleExport = () => {
    console.log('Export programs to CSV');
  };

  const handleSettings = () => {
    console.log('Settings clicked');
  };

  // Auto-scroll handlers
  const loadNextDevice = useCallback(async () => {
    const nextDevice = getNextDevice();
    if (!nextDevice) return;
    setIsLoadingNextDevice(true);
    selectDevice(nextDevice);
    setTimeout(() => setIsLoadingNextDevice(false), 500);
  }, [getNextDevice, selectDevice]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isLoadingNextDevice || loading) return;
    const target = e.currentTarget;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    const isAtBottom = scrollBottom <= 1;
    if (isAtBottom && programs.length > 0) {
      isAtBottomRef.current = true;
    } else {
      isAtBottomRef.current = false;
    }
  }, [isLoadingNextDevice, loading, programs.length]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (isLoadingNextDevice || loading || programs.length === 0) return;
    if (e.deltaY > 0 && isAtBottomRef.current) {
      isAtBottomRef.current = false;
      loadNextDevice();
    }
  }, [isLoadingNextDevice, loading, programs.length, loadNextDevice]);

  useEffect(() => {
    if (selectedDevice && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: isLoadingNextDevice ? 'smooth' : 'auto'
      });
    }
  }, [selectedDevice, isLoadingNextDevice]);

  // Inline editing handlers
  const handleCellDoubleClick = (item: ProgramPoint, field: string, currentValue: string) => {
    setEditingCell({ serialNumber: item.serialNumber, programId: item.programId || '', field });
    setEditValue(currentValue || '');
  };

  const handleEditSave = async () => {
    if (!editingCell || !editValue.trim()) {
      setEditingCell(null);
      return;
    }

    setIsSaving(true);
    try {
      // Update local state optimistically
      setPrograms(prevPrograms =>
        prevPrograms.map(program =>
          program.serialNumber === editingCell.serialNumber &&
          program.programId === editingCell.programId
            ? { ...program, [editingCell.field]: editValue }
            : program
        )
      );

      console.log('Updated', editingCell.field, ':', editValue, 'for', editingCell);
      setEditingCell(null);
      // TODO: Call API to update program
    } catch (error) {
      console.error('Failed to update:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [editingCell, setEditingCell] = useState<{ serialNumber: number; programId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    console.log('Search query:', e.target.value);
  };

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending');

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
    } else {
      setSortColumn(columnId);
      setSortDirection('ascending');
    }
  };

  // Display data with 10 empty rows when no programs
  const displayPrograms = React.useMemo(() => {
    if (programs.length === 0) {
      return Array(10).fill(null).map((_, index) => ({
        serialNumber: selectedDevice?.serialNumber || 0,
        programId: '',
        switchNode: '',
        programLabel: '',
        programList: '',
        programSize: '',
        programPointer: '',
        programStatus: '',
        autoManual: '',
      }));
    }
    return programs;
  }, [programs, selectedDevice]);

  // Helper to identify empty rows
  const isEmptyRow = (item: ProgramPoint) => !item.programId && programs.length === 0;

  // Column definitions matching C++ BacnetProgram: Program, Full Label, Status, Auto/Manual, Size, Execution time, Label
  const columns: TableColumnDefinition<ProgramPoint>[] = [
    // 1. Program (ID) with refresh icon
    createTableColumn<ProgramPoint>({
      columnId: 'program',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('program')}>
          <span>Program</span>
          {sortColumn === 'program' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => {
        if (isEmptyRow(item)) {
          return <TableCellLayout></TableCellLayout>;
        }

        const programId = item.programId || '';
        const isRefreshingThis = refreshingItems.has(programId);

        return (
          <TableCellLayout>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefreshSingleProgram(programId);
                }}
                className={`${styles.refreshIconButton} ${isRefreshingThis ? styles.isRefreshing : ''}`}
                title="Refresh this program from device"
                disabled={isRefreshingThis}
              >
                <ArrowSyncRegular
                  style={{ fontSize: '14px' }}
                  className={isRefreshingThis ? styles.rotating : ''}
                />
              </button>
              <Text size={200} weight="regular">{item.programId || '---'}</Text>
            </div>
          </TableCellLayout>
        );
      },
    }),
    // 2. Full Label (editable)
    createTableColumn<ProgramPoint>({
      columnId: 'fullLabel',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('fullLabel')}>
          <span>Full Label</span>
          {sortColumn === 'fullLabel' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => {
        if (isEmptyRow(item)) {
          return <TableCellLayout></TableCellLayout>;
        }

        const isEditing = editingCell?.serialNumber === item.serialNumber &&
                          editingCell?.programId === item.programId &&
                          editingCell?.field === 'programLabel';

        return (
          <TableCellLayout>
            {isEditing ? (
              <input
                type="text"
                className={styles.editInput}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleEditSave}
                onKeyDown={handleEditKeyDown}
                autoFocus
                disabled={isSaving}
                placeholder="Enter full label"
                aria-label="Edit full label"
              />
            ) : (
              <div
                className={styles.editableCell}
                onDoubleClick={() => handleCellDoubleClick(item, 'programLabel', item.programLabel || '')}
                title="Double-click to edit"
              >
                <Text size={200} weight="regular">{item.programLabel || 'Unnamed'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 3. Status (ON/OFF)
    createTableColumn<ProgramPoint>({
      columnId: 'status',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('status')}>
          <span>Status</span>
          {sortColumn === 'status' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => {
        if (isEmptyRow(item)) {
          return <TableCellLayout></TableCellLayout>;
        }

        const isOn = item.programStatus?.toLowerCase() === 'on' || item.programStatus === '1';

        const handleToggle = () => {
          const newValue = !isOn ? 'ON' : 'OFF';
          console.log('Status toggled:', item.serialNumber, item.programId, newValue);

          setPrograms(prevPrograms =>
            prevPrograms.map(program =>
              program.serialNumber === item.serialNumber && program.programId === item.programId
                ? { ...program, programStatus: newValue }
                : program
            )
          );
          // TODO: Call API to update status
        };

        return (
          <TableCellLayout>
            <Badge
              appearance="filled"
              color={isOn ? 'success' : 'warning'}
              style={{ cursor: 'pointer' }}
              onClick={handleToggle}
            >
              {isOn ? 'ON' : 'OFF'}
            </Badge>
          </TableCellLayout>
        );
      },
    }),
    // 4. Auto/Manual
    createTableColumn<ProgramPoint>({
      columnId: 'autoManual',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Auto/Manual</span>
        </div>
      ),
      renderCell: (item) => {
        if (isEmptyRow(item)) {
          return <TableCellLayout></TableCellLayout>;
        }

        const value = item.autoManual?.toString().toLowerCase();
        const isAuto = value === 'auto' || value === '1';

        const handleToggle = () => {
          const newValue = !isAuto ? 'Auto' : 'Manual';
          console.log('Auto/Man toggled:', item.serialNumber, item.programId, newValue);

          setPrograms(prevPrograms =>
            prevPrograms.map(program =>
              program.serialNumber === item.serialNumber && program.programId === item.programId
                ? { ...program, autoManual: newValue }
                : program
            )
          );
          // TODO: Call API to update Auto/Man
        };

        return (
          <TableCellLayout>
            <div
              onClick={handleToggle}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Switch
                checked={isAuto}
                style={{ transform: 'scale(0.8)' }}
              />
            </div>
          </TableCellLayout>
        );
      },
    }),
    // 5. Size
    createTableColumn<ProgramPoint>({
      columnId: 'size',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('size')}>
          <span>Size</span>
          {sortColumn === 'size' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.programSize || '0')}
        </TableCellLayout>
      ),
    }),
    // 6. Execution time (Run Status)
    createTableColumn<ProgramPoint>({
      columnId: 'executionTime',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Execution Time</span>
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.programPointer || '---')}
        </TableCellLayout>
      ),
    }),
    // 7. Label (short label, editable)
    createTableColumn<ProgramPoint>({
      columnId: 'label',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('label')}>
          <span>Label</span>
          {sortColumn === 'label' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => {
        if (isEmptyRow(item)) {
          return <TableCellLayout></TableCellLayout>;
        }

        const isEditing = editingCell?.serialNumber === item.serialNumber &&
                          editingCell?.programId === item.programId &&
                          editingCell?.field === 'programList';

        return (
          <TableCellLayout>
            {isEditing ? (
              <input
                type="text"
                className={styles.editInput}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleEditSave}
                onKeyDown={handleEditKeyDown}
                autoFocus
                disabled={isSaving}
                placeholder="Enter label"
                aria-label="Edit label"
              />
            ) : (
              <div
                className={styles.editableCell}
                onDoubleClick={() => handleCellDoubleClick(item, 'programList', item.programList || '')}
                title="Double-click to edit"
              >
                <Text size={200} weight="regular">{item.programList || '---'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
  ];

  // ========================================
  // RENDER: Complete Azure Portal Blade Layout
  // ========================================

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

              {/* TOOLBAR */}
              {selectedDevice && (
              <>
              <div className={styles.toolbar}>
                <div className={styles.toolbarContainer}>
                  {/* Refresh Button - Refresh from Device */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleRefreshFromDevice}
                    disabled={refreshing}
                    title="Refresh all programs from device"
                    aria-label="Refresh from Device"
                  >
                    <ArrowSyncRegular />
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
                      placeholder="Search programs..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search programs"
                    />
                  </div>

                  {/* Info Button with Tooltip */}
                  <Tooltip
                    content={`Showing program points for ${selectedDevice.nameShowOnTree} (SN: ${selectedDevice.serialNumber}). This table displays all configured program logic including execution status, size, and control settings.`}
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
                </div>
              </div>

              {/* HORIZONTAL DIVIDER */}
              <div style={{ padding: '0' }}>
                <hr className={styles.overviewHr} />
              </div>
              </>
              )}

              {/* DOCKING BODY */}
              <div className={styles.dockingBody}>

                {loading && programs.length === 0 && (
                  <div className={styles.loadingBar}>
                    <Spinner size="tiny" />
                    <Text size={200} weight="regular">Loading programs...</Text>
                  </div>
                )}

                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div style={{ textAlign: 'center' }}>
                      <Text size={400} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={200}>Please select a device from the tree to view programs</Text>
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
                    items={displayPrograms}
                    columns={columns}
                    sortable
                    resizableColumns
                    columnSizingOptions={{
                      program: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      fullLabel: {
                        minWidth: 150,
                        defaultWidth: 200,
                      },
                      status: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      autoManual: {
                        minWidth: 100,
                        defaultWidth: 120,
                      },
                      size: {
                        minWidth: 60,
                        defaultWidth: 80,
                      },
                      executionTime: {
                        minWidth: 100,
                        defaultWidth: 130,
                      },
                      label: {
                        minWidth: 100,
                        defaultWidth: 150,
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
                    <DataGridBody<ProgramPoint>>
                      {({ item, rowId }) => (
                        <DataGridRow<ProgramPoint> key={rowId}>
                          {({ renderCell }) => (
                            <DataGridCell>{renderCell(item)}</DataGridCell>
                          )}
                        </DataGridRow>
                      )}
                    </DataGridBody>
                  </DataGrid>

                  {/* No Data Message - Show below grid when empty */}
                  {/* {programs.length === 0 && (
                    <div style={{ marginTop: '24px', textAlign: 'center', padding: '0 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                        </svg>
                        <Text size={400} weight="semibold">No programs found</Text>
                      </div>
                      <Text size={300} style={{ display: 'block', marginBottom: '16px', color: '#605e5c', textAlign: 'center' }}>This device has no programs configured</Text>
                      <Button
                        appearance="subtle"
                        icon={<ArrowSyncRegular />}
                        onClick={handleRefresh}
                        style={{ minWidth: '120px', fontWeight: 'normal' }}
                      >
                        Refresh
                      </Button>
                      </div>
                    )} */}
                  </div>
                )}              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramsPage;
