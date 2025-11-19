/**
 * Trendlogs Page - Azure Portal Complete Sample
 *
 * Complete Azure Portal blade layout matching Programs/Schedules pattern
 * Based on C++ BacnetMonitor.cpp structure:
 * - 5 columns: NUM, Label, Interval, Status, Data Size (KB)
 * - Inline editing for labels
 * - Status display
 *
 * C++ Reference: T3000-Source/T3000/BacnetMonitor.cpp
 * - Column 0: MONITOR_NUM (checkbox)
 * - Column 1: MONITOR_LABEL (edit)
 * - Column 2: MONITOR_INTERVAL (readonly)
 * - Column 3: MONITOR_STATUS (readonly)
 * - Column 4: MONITOR_DATA_SIZE (readonly)
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
  Input,
  Badge,
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
import styles from './TrendlogsPage.module.css';

// Types based on C++ BacnetMonitor structure
interface TrendlogPoint {
  serialNumber: number;
  monitorId?: string;
  label?: string;
  interval?: string;
  status?: string;
  dataSize?: string;
}

export const TrendlogsPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();

  const [trendlogs, setTrendlogs] = useState<TrendlogPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCell, setEditingCell] = useState<{ serialNumber: number; monitorId: string; field: string } | null>(null);
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

  // Fetch trendlogs for selected device
  const fetchTrendlogs = useCallback(async () => {
    if (!selectedDevice) {
      setTrendlogs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/t3_device/devices/${selectedDevice.serialNumber}/trendlogs`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch trendlogs: ${response.statusText}`);
      }

      const data = await response.json();
      setTrendlogs(data.trendlogs || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load trendlogs';
      setError(errorMessage);
      console.error('Error fetching trendlogs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchTrendlogs();
  }, [fetchTrendlogs]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTrendlogs();
    setRefreshing(false);
  };

  const handleExport = () => {
    console.log('Export trendlogs to CSV');
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
  const handleCellDoubleClick = (item: TrendlogPoint, field: string, currentValue: string) => {
    setEditingCell({ serialNumber: item.serialNumber, monitorId: item.monitorId || '', field });
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
      setTrendlogs(prevTrendlogs =>
        prevTrendlogs.map(trendlog =>
          trendlog.serialNumber === editingCell.serialNumber && trendlog.monitorId === editingCell.monitorId
            ? { ...trendlog, [editingCell.field]: editValue }
            : trendlog
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

  // Column definitions matching C++ BacnetMonitor: NUM, Label, Interval, Status, Data Size
  const columns: TableColumnDefinition<TrendlogPoint>[] = [
    // 1. NUM (Monitor ID)
    createTableColumn<TrendlogPoint>({
      columnId: 'monitorId',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('monitorId')}>
          <span>NUM</span>
          {sortColumn === 'monitorId' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.monitorId || '---'}</TableCellLayout>,
    }),

    // 2. Label (editable)
    createTableColumn<TrendlogPoint>({
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
                          editingCell?.monitorId === item.monitorId &&
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
                <Text size={200}>{item.label || 'Unnamed'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),

    // 3. Interval (readonly)
    createTableColumn<TrendlogPoint>({
      columnId: 'interval',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('interval')}>
          <span>Interval</span>
          {sortColumn === 'interval' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.interval || '---'}</TableCellLayout>,
    }),

    // 4. Status (readonly with badge)
    createTableColumn<TrendlogPoint>({
      columnId: 'status',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Status</span>
        </div>
      ),
      renderCell: (item) => {
        const isActive = item.status?.toLowerCase() === 'active' || item.status === '1';

        return (
          <TableCellLayout>
            <Badge
              appearance={isActive ? 'filled' : 'outline'}
              color={isActive ? 'success' : 'subtle'}
              size="small"
            >
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </TableCellLayout>
        );
      },
    }),

    // 5. Data Size (KB) (readonly)
    createTableColumn<TrendlogPoint>({
      columnId: 'dataSize',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('dataSize')}>
          <span>Data Size (KB)</span>
          {sortColumn === 'dataSize' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.dataSize || '0'}</TableCellLayout>,
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

              {/* BLADE DESCRIPTION */}
              {selectedDevice && (
                <div className={styles.bladeDescription}>
                  <span>
                    Showing trendlog monitors for <b>{selectedDevice.nameShowOnTree} (SN: {selectedDevice.serialNumber})</b>.
                    {' '}This table displays all configured trendlog/monitor data collection points including status, intervals, and data sizes.
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
                    placeholder="Search trendlogs..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    spellCheck="false"
                    role="searchbox"
                    aria-label="Search trendlogs"
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

              {loading && trendlogs.length === 0 && (
                <div className={styles.loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spinner size="large" />
                  <Text style={{ marginLeft: '12px' }}>Loading trendlogs...</Text>
                </div>
              )}

              {!selectedDevice && !loading && (
                <div className={styles.noData}>
                  <div style={{ textAlign: 'center' }}>
                    <Text size={500} weight="semibold">No device selected</Text>
                    <br />
                    <Text size={300}>Please select a device from the tree to view trendlogs</Text>
                  </div>
                </div>
              )}

              {/* Data Grid - Always show with header when device is selected */}
              {selectedDevice && !loading && !error && (
                <>
                  <DataGrid
                    items={trendlogs}
                    columns={columns}
                    sortable
                    resizableColumns
                    columnSizingOptions={{
                      monitorId: {
                        minWidth: 60,
                        defaultWidth: 80,
                      },
                      label: {
                        minWidth: 160,
                        defaultWidth: 200,
                      },
                      interval: {
                        minWidth: 100,
                        defaultWidth: 120,
                      },
                      status: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      dataSize: {
                        minWidth: 100,
                        defaultWidth: 130,
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
                    <DataGridBody<TrendlogPoint>>
                      {({ item, rowId }) => (
                        <DataGridRow<TrendlogPoint> key={rowId}>
                          {({ renderCell }) => (
                            <DataGridCell>{renderCell(item)}</DataGridCell>
                          )}
                        </DataGridRow>
                      )}
                    </DataGridBody>
                  </DataGrid>

                  {/* No Data Message - Show below grid when empty */}
                  {trendlogs.length === 0 && (
                    <div style={{ marginTop: '24px', textAlign: 'center', padding: '0 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                        </svg>
                        <Text size={400} weight="semibold">No trendlogs found</Text>
                      </div>
                      <Text size={300} style={{ display: 'block', marginBottom: '16px', color: '#605e5c', textAlign: 'center' }}>This device has no configured trendlog monitors</Text>
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
  );
};

export default TrendlogsPage;
