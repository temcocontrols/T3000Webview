/**
 * GraphicsPage Component
 *
 * Display and edit graphical floor plans - Azure Portal style
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
  ImageRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import { GraphicRefreshApi } from '../services/graphicRefreshApi';
import type { Graphic } from '../../../../lib/t3-database/types/graphics.types';
import styles from './GraphicsPage.module.css';

export const GraphicsPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice, getNextDevice, getFilteredDevices } = useDeviceTreeStore();

  const [graphics, setGraphics] = useState<Graphic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshed, setAutoRefreshed] = useState(false);

  // Auto-scroll feature state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingNextDevice, setIsLoadingNextDevice] = useState(false);
  const isAtBottomRef = useRef(false);

  // Auto-select first device on page load if no device is selected
  useEffect(() => {
    if (!selectedDevice && treeData.length > 0) {
      const filteredDevices = getFilteredDevices();
      console.log('[GraphicsPage] Auto-select check:', {
        hasSelectedDevice: !!selectedDevice,
        treeDataLength: treeData.length,
        filteredDevicesCount: filteredDevices.length,
      });

      if (filteredDevices.length > 0) {
        const firstDevice = filteredDevices[0];
        console.log(`[GraphicsPage] Auto-selecting first device: ${firstDevice.nameShowOnTree} (SN: ${firstDevice.serialNumber})`);
        selectDevice(firstDevice);
      }
    }
  }, [selectedDevice, treeData, selectDevice, getFilteredDevices]);

  // Fetch graphics for selected device
  const fetchGraphics = useCallback(async () => {
    if (!selectedDevice) {
      setGraphics([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const graphics = await GraphicRefreshApi.loadAllFromDB(selectedDevice.serialNumber);
      setGraphics(graphics || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load graphics';
      setError(errorMessage);
      console.error('Error fetching graphics:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchGraphics();
  }, [fetchGraphics]);

  // Auto-refresh once after page load
  useEffect(() => {
    if (loading || !selectedDevice || autoRefreshed) return;

    const checkAndRefresh = async () => {
      try {
        console.log('[GraphicsPage] Auto-loading graphics from database...');
        // TODO: Implement GraphicRefreshApi.refreshAllFromDevice() using Action 0/1
        // Graphics use different FFI actions than Action 17
        await fetchGraphics();
        setAutoRefreshed(true);
      } catch (error) {
        console.error('[GraphicsPage] Auto-load failed:', error);
        setAutoRefreshed(true);
      }
    };

    checkAndRefresh();
  }, [loading, selectedDevice, autoRefreshed, fetchGraphics]);

  // Load next device in tree (auto-scroll feature)
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

    if (isAtBottom && graphics.length > 0) {
      isAtBottomRef.current = true;
    } else {
      isAtBottomRef.current = false;
    }
  }, [isLoadingNextDevice, loading, graphics.length]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (isLoadingNextDevice || loading || graphics.length === 0) return;

    if (e.deltaY > 0 && isAtBottomRef.current) {
      isAtBottomRef.current = false;
      loadNextDevice();
    }
  }, [isLoadingNextDevice, loading, graphics.length, loadNextDevice]);

  // Auto-scroll to top after device change
  useEffect(() => {
    if (selectedDevice && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: isLoadingNextDevice ? 'smooth' : 'auto'
      });
    }
  }, [selectedDevice, isLoadingNextDevice]);

  // Refresh all graphics from device
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    try {
      console.log('[GraphicsPage] Manually loading graphics from database...');
      // TODO: Implement GraphicRefreshApi.refreshAllFromDevice() using Action 0/1
      // Graphics use different FFI actions than Action 17
      await fetchGraphics();
    } catch (error) {
      console.error('[GraphicsPage] Refresh failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh graphics');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = () => {
    if (graphics.length === 0) return;

    const csvContent = [
      ['Graphic ID', 'Label', 'Full Label', 'Picture File', 'Panel', 'Element Count'].join(','),
      ...graphics.map(g => [
        g.Graphic_ID || '',
        g.Label || '',
        g.Full_Label || '',
        g.Picture_File || '',
        g.Panel || '',
        g.Element_Count?.toString() || '',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graphics_${selectedDevice?.serialNumber || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewWebview = useCallback((graphic: Graphic) => {
    if (!selectedDevice || !graphic.Graphic_ID) return;

    // Construct the webview URL for this graphic
    const webviewUrl = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/graphics/${graphic.Graphic_ID}/webview`;

    console.log('🖼️ [GraphicsPage] Opening webview for graphic:', {
      serialNumber: selectedDevice.serialNumber,
      graphicId: graphic.Graphic_ID,
      label: graphic.Label,
      url: webviewUrl,
    });

    // Open in a new window/tab
    window.open(webviewUrl, '_blank');
  }, [selectedDevice]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
    } else {
      setSortColumn(column);
      setSortDirection('ascending');
    }
  };

  // Filter and sort graphics
  const filteredGraphics = graphics.filter(g =>
    searchQuery === '' ||
    (g.Label?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (g.Full_Label?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (g.Graphic_ID?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (g.Picture_File?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedGraphics = [...filteredGraphics].sort((a, b) => {
    if (!sortColumn) return 0;

    const aVal = (a as any)[sortColumn] || '';
    const bVal = (b as any)[sortColumn] || '';

    if (sortDirection === 'ascending') {
      return aVal.toString().localeCompare(bVal.toString());
    } else {
      return bVal.toString().localeCompare(aVal.toString());
    }
  });

  // Display data with 10 empty rows when no graphics
  const displayGraphics = React.useMemo(() => {
    if (sortedGraphics.length === 0) {
      return Array(10).fill(null).map((_, index) => ({
        SerialNumber: selectedDevice?.serialNumber || 0,
        Graphic_ID: '',
        Panel: '',
        Label: '',
        Full_Label: '',
        Picture_File: '',
        Element_Count: 0,
        Status: '',
      }));
    }
    return sortedGraphics;
  }, [sortedGraphics, selectedDevice]);

  // Helper to identify empty rows
  const isEmptyRow = (item: Graphic) => !item.Graphic_ID && sortedGraphics.length === 0;

  // Define columns matching C++ BacnetScreen columns
  const columns: TableColumnDefinition<Graphic>[] = [
    createTableColumn<Graphic>({
      columnId: 'Graphic_ID',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('Graphic_ID')}>
          <span>Graphic #</span>
          {sortColumn === 'Graphic_ID' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.Graphic_ID || '---')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Graphic>({
      columnId: 'Panel',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('Panel')}>
          <span>Panel</span>
          {sortColumn === 'Panel' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.Panel || '---')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Graphic>({
      columnId: 'Label',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('Label')}>
          <span>Label</span>
          {sortColumn === 'Label' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.Label || '---')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Graphic>({
      columnId: 'Picture_File',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('Picture_File')}>
          <span>Picture File</span>
          {sortColumn === 'Picture_File' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.Picture_File || '---')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Graphic>({
      columnId: 'Element_Count',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('Element_Count')}>
          <span>Element Count</span>
          {sortColumn === 'Element_Count' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.Element_Count?.toString() || '0')}
        </TableCellLayout>
      ),
    }),
    // Actions column - View Webview
    createTableColumn<Graphic>({
      columnId: 'actions',
      renderHeaderCell: () => <span>Action</span>,
      renderCell: (item) => {
        if (isEmptyRow(item)) {
          return <TableCellLayout></TableCellLayout>;
        }

        return (
          <TableCellLayout>
            <Button
              size="small"
              icon={<ImageRegular />}
              onClick={(e) => {
                e.stopPropagation();
                handleViewWebview(item);
              }}
              title="View webview for this graphic"
            >
              View Webview
            </Button>
          </TableCellLayout>
        );
      },
    }),
  ];

  return (
    <div className={styles.container}>
      <div className={styles.bladeContentContainer}>
        <div className={styles.bladeContentWrapper}>
          <div className={styles.bladeContent}>
            <div className={styles.partContent}>

              {error && (
                <div className={styles.errorNotice}>
                  <ErrorCircleRegular className={styles.iconError} />
                  <Text className={styles.textError}>
                    {error}
                  </Text>
                </div>
              )}

              {selectedDevice && (
              <>
              <div className={styles.toolbar}>
                <div className={styles.toolbarContainer}>
                  <button
                    className={styles.toolbarButton}
                    onClick={handleRefreshFromDevice}
                    disabled={refreshing}
                    title="Refresh all graphics from device"
                  >
                    <ArrowSyncRegular />
                    <span>{refreshing ? 'Refreshing...' : 'Refresh from Device'}</span>
                  </button>

                  <button
                    className={styles.toolbarButton}
                    onClick={handleExport}
                    disabled={graphics.length === 0}
                    title="Export to CSV"
                  >
                    <ArrowDownloadRegular />
                    <span>Export</span>
                  </button>

                  {/* Toolbar Separator */}
                  <div className={styles.toolbarSeparator} role="separator" />

                  {/* Settings Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={() => {}}
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
                      placeholder="Search graphics..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search graphics"
                    />
                  </div>

                  {/* Info Button with Tooltip */}
                  <Tooltip
                    content={`Showing graphics for ${selectedDevice.nameShowOnTree} (SN: ${selectedDevice.serialNumber}). This table displays all configured graphic floor plans and their associated elements.`}
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
                {loading && graphics.length === 0 && (
                  <div className={styles.loadingBar}>
                    <Spinner size="tiny" />
                    <Text size={200} weight="regular">Loading graphics...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div className={styles.centerText}>
                      <Text size={400} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={200}>Please select a device from the tree to view graphics</Text>
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
                      items={displayGraphics}
                      columns={columns}
                      sortable
                      resizableColumns
                      columnSizingOptions={{
                        Graphic_ID: {
                          minWidth: 70,
                          idealWidth: '10%',
                        },
                        Panel: {
                          minWidth: 80,
                          idealWidth: '10%',
                        },
                        Label: {
                          minWidth: 150,
                          idealWidth: '20%',
                        },
                        Picture_File: {
                          minWidth: 150,
                          idealWidth: '25%',
                        },
                        Element_Count: {
                          minWidth: 100,
                          idealWidth: '15%',
                        },
                        actions: {
                          minWidth: 100,
                          idealWidth: '20%',
                        },
                      }}
                      getRowId={(item) => `${item.SerialNumber}-${item.Graphic_ID}`}
                    >
                      <DataGridHeader>
                        <DataGridRow>
                          {({ renderHeaderCell }) => (
                            <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                          )}
                        </DataGridRow>
                      </DataGridHeader>
                      <DataGridBody<Graphic>>
                        {({ item, rowId }) => (
                          <DataGridRow<Graphic> key={rowId}>
                            {({ renderCell }) => (
                              <DataGridCell>{renderCell(item)}</DataGridCell>
                            )}
                          </DataGridRow>
                        )}
                      </DataGridBody>
                    </DataGrid>
                  </div>
                )}

                {/* Auto-load indicator */}
                {isLoadingNextDevice && (
                  <div className={styles.autoLoadIndicator}>
                    <Spinner size="tiny" />
                    <Text size={200}>Loading next device...</Text>
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
