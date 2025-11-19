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
  Input,
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
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
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
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();

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
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHolidays();
    setRefreshing(false);
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
    // 1. NUM (Holiday ID)
    createTableColumn<HolidayPoint>({
      columnId: 'holidayId',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('holidayId')}>
          <span>NUM</span>
          {sortColumn === 'holidayId' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.holidayId || '---'}</TableCellLayout>,
    }),

    // 2. Full Label (editable)
    createTableColumn<HolidayPoint>({
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
        const isEditing = editingCell?.serialNumber === item.serialNumber &&
                          editingCell?.holidayId === item.holidayId &&
                          editingCell?.field === 'fullLabel';

        return (
          <TableCellLayout>
            {isEditing ? (
              <Input
                value={editValue}
                onChange={(e, data) => setEditValue(data.value)}
                onBlur={handleEditSave}
                onKeyDown={handleEditKeyDown}
                autoFocus
                disabled={isSaving}
                size="small"
                style={{ width: '100%' }}
              />
            ) : (
              <div
                onDoubleClick={() => handleCellDoubleClick(item, 'fullLabel', item.fullLabel || '')}
                style={{ cursor: 'text', minHeight: '20px' }}
              >
                <Text size={200}>{item.fullLabel || 'Unnamed'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),

    // 3. Auto/Manual (toggle)
    createTableColumn<HolidayPoint>({
      columnId: 'autoManual',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Auto/Manual</span>
        </div>
      ),
      renderCell: (item) => {
        const isAuto = item.autoManual === '1' || item.autoManual?.toLowerCase() === 'auto';

        return (
          <TableCellLayout>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Switch
                checked={isAuto}
                onChange={() => handleAutoManualToggle(item)}
              />
              <Text size={200}>{isAuto ? 'Auto' : 'Manual'}</Text>
            </div>
          </TableCellLayout>
        );
      },
    }),

    // 4. Value (editable)
    createTableColumn<HolidayPoint>({
      columnId: 'value',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('value')}>
          <span>Value</span>
          {sortColumn === 'value' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.value || '---'}</TableCellLayout>,
    }),

    // 5. Label (editable)
    createTableColumn<HolidayPoint>({
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
        const isEditing = editingCell?.serialNumber === item.serialNumber &&
                          editingCell?.holidayId === item.holidayId &&
                          editingCell?.field === 'label';

        return (
          <TableCellLayout>
            {isEditing ? (
              <Input
                value={editValue}
                onChange={(e, data) => setEditValue(data.value)}
                onBlur={handleEditSave}
                onKeyDown={handleEditKeyDown}
                autoFocus
                disabled={isSaving}
                size="small"
                style={{ width: '100%' }}
              />
            ) : (
              <div
                onDoubleClick={() => handleCellDoubleClick(item, 'label', item.label || '')}
                style={{ cursor: 'text', minHeight: '20px' }}
              >
                <Text size={200}>{item.label || '---'}</Text>
              </div>
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
              <div style={{ marginBottom: '12px', padding: '8px 12px', backgroundColor: '#fef6f6', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ErrorCircleRegular style={{ color: '#d13438', fontSize: '16px', flexShrink: 0 }} />
                <Text style={{ color: '#d13438', fontWeight: 500, fontSize: '13px' }}>
                  {error}
                </Text>
              </div>
            )}

            {/* ========================================
                BLADE DESCRIPTION
                Matches: ext-blade-description
                ======================================== */}
            {selectedDevice && (
              <div className={styles.bladeDescription}>
                <span>
                  Showing holidays for <b>{selectedDevice.nameShowOnTree} (SN: {selectedDevice.serialNumber})</b>.
                  {' '}This table displays all configured annual routine/holiday schedules including labels, auto/manual modes, and values.
                  {' '}<a href="#" onClick={(e) => { e.preventDefault(); console.log('Learn more clicked'); }}>Learn more</a>
                </span>
              </div>
            )}

            {/* ========================================
                TOOLBAR - Azure Portal Command Bar
                Matches: ext-overview-assistant-toolbar azc-toolbar
                ======================================== */}
            <div className={styles.toolbar}>
              <div className={styles.toolbarContainer}>
                <button
                  className={styles.toolbarButton}
                  onClick={handleRefresh}
                  disabled={refreshing}
                  title="Refresh"
                  aria-label="Refresh"
                >
                  <ArrowSyncRegular />
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
                    placeholder="Search holidays..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    spellCheck="false"
                    role="searchbox"
                    aria-label="Search holidays"
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

              {loading && holidays.length === 0 && (
                <div className={styles.loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spinner size="large" />
                  <Text style={{ marginLeft: '12px' }}>Loading holidays...</Text>
                </div>
              )}

              {!selectedDevice && !loading && (
                <div className={styles.noData}>
                  <div style={{ textAlign: 'center' }}>
                    <Text size={500} weight="semibold">No device selected</Text>
                    <br />
                    <Text size={300}>Please select a device from the tree to view holidays</Text>
                  </div>
                </div>
              )}

              {selectedDevice && !loading && !error && (
                <>
                  <DataGrid
                    items={holidays}
                    columns={columns}
                    sortable
                    resizableColumns
                    columnSizingOptions={{
                      holidayId: {
                        minWidth: 60,
                        defaultWidth: 80,
                      },
                      fullLabel: {
                        minWidth: 150,
                        defaultWidth: 200,
                      },
                      autoManual: {
                        minWidth: 100,
                        defaultWidth: 120,
                      },
                      value: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      label: {
                        minWidth: 90,
                        defaultWidth: 120,
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

                  {/* No Data Message - Show below grid when empty */}
                  {holidays.length === 0 && (
                    <div style={{ marginTop: '24px', textAlign: 'center', padding: '0 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                        </svg>
                        <Text size={400} weight="semibold">No holidays found</Text>
                      </div>
                      <Text size={300} style={{ display: 'block', marginBottom: '16px', color: '#605e5c', textAlign: 'center' }}>This device has no holidays configured</Text>
                      <Button
                        appearance="subtle"
                        icon={<ArrowSyncRegular />}
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
