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
  Badge,
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
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();

  const [programs, setPrograms] = useState<ProgramPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  // Fetch programs for selected device
  const fetchPrograms = useCallback(async () => {
    if (!selectedDevice) {
      setPrograms([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/t3_device/devices/${selectedDevice.serialNumber}/programs`;
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
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPrograms();
    setRefreshing(false);
  };

  const handleExport = () => {
    console.log('Export programs to CSV');
  };

  const handleSettings = () => {
    console.log('Settings clicked');
  };

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

  // Column definitions matching C++ BacnetProgram: Program, Full Label, Status, Auto/Manual, Size, Execution time, Label
  const columns: TableColumnDefinition<ProgramPoint>[] = [
    // 1. Program (ID)
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
      renderCell: (item) => <TableCellLayout>{item.programId || '---'}</TableCellLayout>,
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
      renderCell: (item) => <TableCellLayout>{item.programSize || '0'}</TableCellLayout>,
    }),
    // 6. Execution time (Run Status)
    createTableColumn<ProgramPoint>({
      columnId: 'executionTime',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Execution Time</span>
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.programPointer || '---'}</TableCellLayout>,
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

              {/* ERROR MESSAGE */}
              {error && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#fef0f1', border: '1px solid #d13438', borderRadius: '2px' }}>
                    <Text style={{ color: '#d13438' }} weight="semibold">Error loading programs</Text>
                    <br />
                    <Text style={{ color: '#d13438' }} size={300}>{error}</Text>
                  </div>
                </div>
              )}

              {/* BLADE DESCRIPTION */}
              {selectedDevice && (
                <div className={styles.bladeDescription}>
                  <span>
                    Showing program points for <b>{selectedDevice.nameShowOnTree} (SN: {selectedDevice.serialNumber})</b>.
                    {' '}This table displays all configured program logic including execution status, size, and control settings.
                    {' '}<a href="#" onClick={(e) => { e.preventDefault(); console.log('Learn more clicked'); }}>Learn more</a>
                  </span>
                </div>
              )}

              {/* TOOLBAR */}
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
                      placeholder="Search programs..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search programs"
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

                {loading && programs.length === 0 && (
                  <div className={styles.loading}>
                    <Spinner size="large" />
                    <Text>Loading programs...</Text>
                  </div>
                )}

                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div style={{ textAlign: 'center' }}>
                      <Text size={500} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={300}>Please select a device from the tree to view programs</Text>
                    </div>
                  </div>
                )}

                {selectedDevice && !loading && !error && programs.length === 0 && (
                  <div style={{ marginTop: '40px' }}>
                    <div style={{ textAlign: 'center', padding: '0 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                        </svg>
                        <Text size={500} weight="semibold">No programs found</Text>
                      </div>
                      <Text size={300} style={{ display: 'block', marginBottom: '24px', color: '#605e5c', textAlign: 'center' }}>This device has no configured program points</Text>
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

                {selectedDevice && !loading && !error && programs.length > 0 && (
                  <DataGrid
                    items={programs}
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
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramsPage;
