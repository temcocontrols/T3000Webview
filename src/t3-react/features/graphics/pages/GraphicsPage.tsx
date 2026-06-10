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
  ArrowClockwiseRegular,
  SettingsRegular,
  SearchRegular,
  ErrorCircleRegular,
  InfoRegular,
  ImageRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import { GraphicRefreshApi } from '../services/graphicRefreshApi';
import type { Graphic } from '../../../../lib/t3-database/types/graphics.types';
import { PanelDataRefreshService } from '../../../shared/services/panelDataRefreshService';
import { useStatusBarStore } from '../../../store/statusBarStore';
import styles from './GraphicsPage.module.css';
import { useRegisterCsvHandlers } from '@t3-react/shared/context/CsvOperationsContext';
import { parseCsvFile, mapCsvToObjects } from '@t3-react/shared/utils/csvUtils';

export const GraphicsPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice, getNextDevice, getFilteredDevices } = useDeviceTreeStore();
  const setMessage = useStatusBarStore((state) => state.setMessage);

  const [graphics, setGraphics] = useState<Graphic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshed, setAutoRefreshed] = useState(false);
  const [dbChecked, setDbChecked] = useState(false);
  const deviceRefreshedRef = useRef<number | null>(null);

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
      setDbChecked(true);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchGraphics();
  }, [fetchGraphics]);

  // Reset auto-refresh state when device changes (don't clear data to avoid visual flash)
  useEffect(() => {
    setAutoRefreshed(false);
    setDbChecked(false);
  }, [selectedDevice?.serialNumber]);

  // Auto-refresh once per device - ONLY if database is empty after initial DB fetch
  useEffect(() => {
    if (!dbChecked || loading || !selectedDevice || autoRefreshed) return;
    if (deviceRefreshedRef.current === selectedDevice.serialNumber) return;

    const checkAndRefresh = async () => {
      deviceRefreshedRef.current = selectedDevice.serialNumber;

      if (graphics.length > 0) {
        console.log('[GraphicsPage] Database has data, skipping auto-refresh');
        setAutoRefreshed(true);
        return;
      }

      console.log('[GraphicsPage] Database empty, auto-refreshing from device using Action 17...');
      setLoading(true);

      try {
        // Use PanelDataRefreshService with Action 17 (GET_WEBVIEW_LIST)
        // EntryType.GROUP = 10 (BAC_GRP)
        const result = await PanelDataRefreshService.refreshFromDevice({
          serialNumber: selectedDevice.serialNumber,
          type: 'graphic',
          onLoadingChange: (loading) => {
            if (loading) {
              setMessage(`Loading graphics from ${selectedDevice.nameShowOnTree} (Action 17)...`, 'info');
            }
          }
        });
        setMessage(`✓ Synced ${result.itemCount} graphics from ${selectedDevice.nameShowOnTree}`, 'success');
      } catch (error) {
        console.error('[GraphicsPage] Auto-refresh failed:', error);
        setMessage(`Failed to sync graphics: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      } finally {
        // Always reload from database to show what was actually saved
        await fetchGraphics();
        setLoading(false);
        setAutoRefreshed(true);
      }
    };

    checkAndRefresh();
  }, [dbChecked, loading, selectedDevice, autoRefreshed, fetchGraphics, graphics.length, setMessage]);

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

  // Refresh all graphics from device using Action 17
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    try {
      console.log('[GraphicsPage] Refreshing graphics from device using Action 17...');

      // Use PanelDataRefreshService with Action 17 (GET_WEBVIEW_LIST)
      // EntryType.GROUP = 10 (BAC_GRP)
      const result = await PanelDataRefreshService.refreshFromDevice({
        serialNumber: selectedDevice.serialNumber,
        type: 'graphic',
        onLoadingChange: (loading) => {
          if (loading) {
            setMessage(`Loading graphics from ${selectedDevice.nameShowOnTree} (Action 17)...`, 'info');
          }
        }
      });

      setMessage(`✓ Synced ${result.itemCount} graphics from ${selectedDevice.nameShowOnTree}`, 'success');

      // Reload from database to show saved data
      await fetchGraphics();
    } catch (error) {
      console.error('[GraphicsPage] Refresh failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to refresh graphics';
      setError(errorMsg);
      setMessage(`Failed to sync graphics: ${errorMsg}`, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-scroll to top after device change
  useEffect(() => {
    if (selectedDevice && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: isLoadingNextDevice ? 'smooth' : 'auto'
      });
    }
  }, [selectedDevice, isLoadingNextDevice]);

  const handleExport = () => {
    if (graphics.length === 0) return;

    const csvContent = [
      ['Graphic ID', 'Label', 'Full Label', 'Picture File', 'Switch Node', 'Element Count'].join(','),
      ...graphics.map(g => [
        g.graphicId || '',
        g.graphicLabel || '',
        g.graphicFullLabel || '',
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

  // Register CSV export handler with global context (Tools menu)
  const handleImport = async (file: File) => {
    const { headers, rows } = await parseCsvFile(file);
    if (rows.length === 0) return;
    const csvColumns: import('@t3-react/shared/utils/csvUtils').CsvColumn<Graphic>[] = [
      { header: 'Graphic ID', accessor: g => g.graphicId, setter: (g, v) => { g.graphicId = v; } },
      { header: 'Label', accessor: g => g.graphicLabel, setter: (g, v) => { g.graphicLabel = v; } },
      { header: 'Full Label', accessor: g => g.graphicFullLabel, setter: (g, v) => { g.graphicFullLabel = v; } },
      { header: 'Picture File', accessor: g => g.graphicPictureFile, setter: (g, v) => { g.graphicPictureFile = v; } },
      { header: 'Switch Node', accessor: g => g.switchNode, setter: (g, v) => { g.switchNode = v; } },
      { header: 'Element Count', accessor: g => g.graphicTotalPoint, setter: (g, v) => { g.graphicTotalPoint = v; } },
    ];
    const imported = mapCsvToObjects(headers, rows, csvColumns, () => ({} as Graphic));
    setGraphics(imported);
  };

  useRegisterCsvHandlers(handleExport, handleImport);

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
  const [sortState, setSortState] = useState<{ sortColumn: string; sortDirection: 'ascending' | 'descending' } | undefined>();
  const [sortKey, setSortKey] = useState(0);
  const prevSortRef = React.useRef<{ sortColumn: string; sortDirection: string } | undefined>();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSortChange = (_e: any, newState: { sortColumn: string; sortDirection: 'ascending' | 'descending' }) => {
    const prev = prevSortRef.current;
    prevSortRef.current = newState;
    if (prev?.sortColumn === newState.sortColumn && prev?.sortDirection === 'descending' && newState.sortDirection === 'ascending') {
      setSortState(undefined);
      setSortKey(k => k + 1);
    } else {
      setSortState(newState);
    }
  };

  // Filter and sort graphics
  const filteredGraphics = graphics.filter(g =>
    searchQuery === '' ||
    (g.graphicLabel?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (g.graphicFullLabel?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (g.graphicId?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (g.graphicPictureFile?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Display data with search filtering (sorting handled by DataGrid built-in)
  const displayGraphics = React.useMemo(() => {
    if (filteredGraphics.length === 0 && graphics.length === 0) {
      return Array(18).fill(null).map((_, index) => ({
        GraphicId: -(index + 1),
        serialNumber: selectedDevice?.serialNumber || 0,
        graphicId: '', switchNode: '', graphicLabel: '', graphicFullLabel: '',
        graphicPictureFile: '', graphicTotalPoint: '0',
      }));
    }
    return filteredGraphics;
  }, [filteredGraphics, selectedDevice, graphics.length]);

  // Helper to identify empty rows
  const isEmptyRow = (item: Graphic) => !item.graphicId && graphics.length === 0;

  // Define columns matching C++ BacnetScreen columns
  const columns: TableColumnDefinition<Graphic>[] = [
    // 1. Graphic # (10%)
    createTableColumn<Graphic>({
      columnId: 'Graphic_ID',
      renderHeaderCell: () => (
        <span>ID</span>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.graphicId || '')}
        </TableCellLayout>
      ),
    }),
    // 2. Full Label (25%)
    createTableColumn<Graphic>({
      columnId: 'Full_Label',
      renderHeaderCell: () => (
        <span>Full Label</span>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.graphicFullLabel || '')}
        </TableCellLayout>
      ),
    }),
    // 3. Label (15%)
    createTableColumn<Graphic>({
      columnId: 'Label',
      renderHeaderCell: () => (
        <span>Label</span>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.graphicLabel || '')}
        </TableCellLayout>
      ),
    }),
    // 4. Picture File (20%)
    createTableColumn<Graphic>({
      columnId: 'Picture_File',
      renderHeaderCell: () => (
        <span>Picture File</span>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.graphicPictureFile || '')}
        </TableCellLayout>
      ),
    }),
    createTableColumn<Graphic>({
      columnId: 'Element_Count',
      renderHeaderCell: () => (
        <span>Total Points</span>
      ),
      renderCell: (item) => (
        <TableCellLayout>
          {!isEmptyRow(item) && (item.graphicTotalPoint || '0')}
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

                  <button
                    className={styles.toolbarButton}
                    onClick={handleRefreshFromDevice}
                    disabled={refreshing}
                    title="Refresh all graphics from device"
                  >
                    <ArrowSyncRegular />
                    <span>{refreshing ? 'Refreshing...' : 'Refresh from Device'}</span>
                  </button>

                  <div className={styles.toolbarSeparator} role="separator" />

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
                      key={sortKey}
                      items={displayGraphics}
                      columns={columns}
                      sortable
                      sortState={sortState}
                      onSortChange={handleSortChange}
                      resizableColumns
                      resizableColumnsOptions={{ autoFitColumns: false }}
                      style={{ width: '100%', border: '1px solid #d1d1d1', borderRadius: 0, backgroundColor: '#fff' }}
                      getRowId={(item) => {
                        const id = item.GraphicId ?? item.graphicId ?? `empty-${displayGraphics.indexOf(item)}`;
                        return `${item.serialNumber ?? 'unknown'}-${id}`;
                      }}
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
