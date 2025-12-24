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
import { GraphicRefreshApiService } from '../services/graphicRefreshApi';
import styles from './GraphicsPage.module.css';

// Types based on Rust entity (graphics.rs)
interface GraphicPoint {
  serialNumber: number;
  graphicId?: string;
  switchNode?: string;
  graphicLabel?: string;
  graphicPictureFile?: string;
  graphicTotalPoint?: string;
}

export const GraphicsPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice, getNextDevice, getFilteredDevices } = useDeviceTreeStore();

  const [graphics, setGraphics] = useState<GraphicPoint[]>([]);
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
      const response = await GraphicRefreshApiService.getGraphics(selectedDevice.serialNumber);
      setGraphics(response.data || []);
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

    const timer = setTimeout(async () => {
      try {
        console.log('[GraphicsPage] Auto-loading graphics using GET_INITIAL_DATA...');

        // Use GET_INITIAL_DATA (Action 1) to load and save graphics
        // This will load graphic screen data and parse items to save to database
        const saveResponse = await GraphicRefreshApiService.loadAndSaveGraphics(
          selectedDevice.serialNumber,
          0 // viewitem index - can be 0-7 for different graphic screens
        );
        console.log('[GraphicsPage] Load and save response:', saveResponse);

        if (saveResponse.savedCount > 0) {
          await fetchGraphics();
        } else {
          console.warn('[GraphicsPage] Auto-load: No items saved, keeping existing data');
        }
        setAutoRefreshed(true);
      } catch (error) {
        console.error('[GraphicsPage] Auto-load failed:', error);
        setAutoRefreshed(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [loading, selectedDevice, autoRefreshed, fetchGraphics]);

  // Refresh all graphics from device
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    try {
      console.log('[GraphicsPage] Manually loading graphics using GET_INITIAL_DATA...');

      // Use GET_INITIAL_DATA (Action 1) to load and save graphics
      const saveResponse = await GraphicRefreshApiService.loadAndSaveGraphics(
        selectedDevice.serialNumber,
        0 // viewitem index
      );
      console.log('[GraphicsPage] Load and save response:', saveResponse);

      if (saveResponse.savedCount > 0) {
        await fetchGraphics();
      }
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
      ['Graphic ID', 'Label', 'Picture File', 'Switch Node', 'Total Points'].join(','),
      ...graphics.map(g => [
        g.graphicId || '',
        g.graphicLabel || '',
        g.graphicPictureFile || '',
        g.switchNode || '',
        g.graphicTotalPoint || '',
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

  const handleViewWebview = useCallback((graphic: GraphicPoint) => {
    if (!selectedDevice || !graphic.graphicId) return;

    // Construct the webview URL for this graphic
    const webviewUrl = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/graphics/${graphic.graphicId}/webview`;

    console.log('🖼️ [GraphicsPage] Opening webview for graphic:', {
      serialNumber: selectedDevice.serialNumber,
      graphicId: graphic.graphicId,
      label: graphic.graphicLabel,
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
    (g.graphicLabel?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (g.graphicId?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (g.graphicPictureFile?.toLowerCase().includes(searchQuery.toLowerCase()))
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
        serialNumber: selectedDevice?.serialNumber || 0,
        graphicId: '',
        switchNode: '',
        graphicLabel: '',
        graphicPictureFile: '',
        graphicTotalPoint: '',
      }));
    }
    return sortedGraphics;
  }, [sortedGraphics, selectedDevice]);

  // Helper to identify empty rows
  const isEmptyRow = (item: GraphicPoint) => !item.graphicId && sortedGraphics.length === 0;

  // Define columns matching C++ BacnetScreen columns
  const columns: TableColumnDefinition<GraphicPoint>[] = [
    createTableColumn<GraphicPoint>({
      columnId: 'graphicId',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('graphicId')}>
          <span>Graphic #</span>
          {sortColumn === 'graphicId' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.graphicId || '---')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<GraphicPoint>({
      columnId: 'switchNode',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('switchNode')}>
          <span>Full Label</span>
          {sortColumn === 'switchNode' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.switchNode || '---')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<GraphicPoint>({
      columnId: 'graphicLabel',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('graphicLabel')}>
          <span>Label</span>
          {sortColumn === 'graphicLabel' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.graphicLabel || '---')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<GraphicPoint>({
      columnId: 'graphicPictureFile',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('graphicPictureFile')}>
          <span>Picture File</span>
          {sortColumn === 'graphicPictureFile' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.graphicPictureFile || '---')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<GraphicPoint>({
      columnId: 'graphicTotalPoint',
      renderHeaderCell: () => (
        <div className={styles.headerCellSort} onClick={() => handleSort('graphicTotalPoint')}>
          <span>Element Count</span>
          {sortColumn === 'graphicTotalPoint' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular className={styles.sortIconFaded} />
          )}
        </div>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.graphicTotalPoint || '0')}
        </TableCellLayout>
      ),
    }),
    // Actions column - View Webview
    createTableColumn<GraphicPoint>({
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

              <div className={styles.horizontalDivider}></div>
              </>
              )}

              <div className={styles.noPadding}>
                {!selectedDevice ? (
                  <div className={styles.noData}>
                    <div style={{ textAlign: 'center' }}>
                      <Text size={500} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={300}>Please select a device from the tree to view graphics</Text>
                    </div>
                  </div>
                ) : loading && graphics.length === 0 ? (
                  <div className={styles.loadingState}>
                    <Spinner size="large" label="Loading graphics..." />
                  </div>
                ) : graphics.length === 0 ? (
                  <div className={styles.emptyStateContainer}>
                    <div className={styles.emptyStateHeader}>
                      <InfoRegular className={styles.iconSmall} />
                      <Text size={300} weight="semibold" className={styles.textSemibold}>
                        No graphics found for this device
                      </Text>
                    </div>
                    <Text size={200} className={styles.textSmall}>
                      Graphics may not have been configured yet
                    </Text>
                  </div>
                ) : (
                  <div className={styles.scrollContainerAuto}>
                    <DataGrid
                      items={displayGraphics}
                      columns={columns}
                      sortable
                      resizableColumns
                      className={styles.fullWidth}
                      columnSizingOptions={{
                        graphicId: {
                          minWidth: 80,
                          idealWidth: '10%',
                        },
                        switchNode: {
                          minWidth: 150,
                          idealWidth: '25%',
                        },
                        graphicLabel: {
                          minWidth: 120,
                          idealWidth: '15%',
                        },
                        graphicPictureFile: {
                          minWidth: 150,
                          idealWidth: '25%',
                        },
                        graphicTotalPoint: {
                          minWidth: 100,
                          idealWidth: '10%',
                        },
                        actions: {
                          minWidth: 100,
                          idealWidth: '15%',
                        },
                      }}
                      getRowId={(item) => `${item.serialNumber}-${item.graphicId}`}
                    >
                      <DataGridHeader>
                        <DataGridRow>
                          {({ renderHeaderCell }) => (
                            <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                          )}
                        </DataGridRow>
                      </DataGridHeader>
                      <DataGridBody<GraphicPoint>>
                        {({ item, rowId }) => (
                          <DataGridRow<GraphicPoint> key={rowId}>
                            {({ renderCell }) => (
                              <DataGridCell>{renderCell(item)}</DataGridCell>
                            )}
                          </DataGridRow>
                        )}
                      </DataGridBody>
                    </DataGrid>
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
