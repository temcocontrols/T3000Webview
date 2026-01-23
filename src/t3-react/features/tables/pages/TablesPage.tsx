import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DataGrid,
  DataGridBody,
  DataGridRow,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridCell,
  TableCellLayout,
  TableColumnDefinition,
  createTableColumn,
  Spinner,
  Text,
  Button,
  Tooltip,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ErrorCircleRegular,
  CheckmarkCircleRegular,
  InfoRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import styles from './TablesPage.module.css';

// Table interface matching TABLES entity
interface TableItem {
  tableId: string;
  tableIndex: string;
  panel: string;
  tableName: string;
  tableData: string; // JSON string: [{"volts": 0, "value": 0}, ...]
  status: string;
}

const TablesPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();

  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Auto-select first device on page load if none selected
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

  // Fetch tables from database
  const fetchTables = useCallback(async () => {
    if (!selectedDevice) {
      setTables([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/devices/${selectedDevice.serialNumber}/tables/refresh`);

      if (!response.ok) {
        throw new Error(`Failed to fetch tables: ${response.statusText}`);
      }

      const result = await response.json();
      setTables(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tables';
      setError(errorMessage);
      console.error('Error fetching tables:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Handle refresh button click
  const handleRefresh = () => {
    fetchTables();
  };

  // Handle cell edit
  const handleCellClick = (rowIndex: number, columnId: string, currentValue: string) => {
    if (columnId === 'tableId' || columnId === 'tableIndex') return; // Read-only columns
    setEditingCell({ rowIndex, columnId });
    setEditValue(currentValue || '');
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleSaveEdit = async (rowIndex: number, columnId: string) => {
    if (!selectedDevice || !editingCell) return;

    const table = tables[rowIndex];
    const updatedTable = { ...table, [columnId]: editValue };

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/devices/${selectedDevice.serialNumber}/tables/${table.tableIndex}/update`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTable),
        }
      );

      if (!response.ok) {
        throw new Error(`Update failed: ${response.statusText}`);
      }

      // Update local state
      const newTables = [...tables];
      newTables[rowIndex] = updatedTable;
      setTables(newTables);

      setSuccessMessage(`Table ${table.tableIndex} updated successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setEditingCell(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Column definitions
  const columns: TableColumnDefinition<TableItem>[] = useMemo(() => [
    createTableColumn<TableItem>({
      columnId: 'tableId',
      renderHeaderCell: () => <span>Table ID</span>,
      renderCell: (item) => <TableCellLayout>{item.tableId}</TableCellLayout>,
    }),
    createTableColumn<TableItem>({
      columnId: 'tableIndex',
      renderHeaderCell: () => <span>Index</span>,
      renderCell: (item) => <TableCellLayout>{item.tableIndex}</TableCellLayout>,
    }),
    createTableColumn<TableItem>({
      columnId: 'panel',
      renderHeaderCell: () => <span>Panel</span>,
      renderCell: (item: TableItem) => {
        const rowIndex = tables.indexOf(item);
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'panel';
        return (
          <TableCellLayout>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                <input
                  type="text"
                  className={styles.editInput}
                  value={editValue}
                  onChange={handleEditChange}
                  onBlur={() => handleSaveEdit(rowIndex, 'panel')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(rowIndex, 'panel');
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                />
              </div>
            ) : (
              <span onClick={() => handleCellClick(rowIndex, 'panel', item.panel)}>{item.panel || '-'}</span>
            )}
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<TableItem>({
      columnId: 'tableName',
      renderHeaderCell: () => <span>Table Name</span>,
      renderCell: (item: TableItem) => {
        const rowIndex = tables.indexOf(item);
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'tableName';
        return (
          <TableCellLayout>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                <input
                  type="text"
                  className={styles.editInput}
                  value={editValue}
                  onChange={handleEditChange}
                  onBlur={() => handleSaveEdit(rowIndex, 'tableName')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(rowIndex, 'tableName');
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                  maxLength={9}
                />
              </div>
            ) : (
              <span onClick={() => handleCellClick(rowIndex, 'tableName', item.tableName)}>{item.tableName || '-'}</span>
            )}
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<TableItem>({
      columnId: 'tableData',
      renderHeaderCell: () => <span>Table Data (JSON)</span>,
      renderCell: (item) => (
        <TableCellLayout>
          <span style={{ fontSize: '10px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.tableData || '[]'}
          </span>
        </TableCellLayout>
      ),
    }),
    createTableColumn<TableItem>({
      columnId: 'status',
      renderHeaderCell: () => <span>Status</span>,
      renderCell: (item) => <TableCellLayout>{item.status || '-'}</TableCellLayout>,
    }),
  ], [editingCell, editValue]);

  return (
    <div className={styles.container}>
      <div className={styles.bladeContentContainer}>
        <div className={styles.bladeContentWrapper}>
          <div className={styles.bladeContent}>
            <div className={styles.partContent}>

              {/* Error Message */}
              {error && (
                <div style={{ marginBottom: '12px', padding: '8px 12px', backgroundColor: '#fef6f6', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ErrorCircleRegular style={{ color: '#d13438', fontSize: '16px', flexShrink: 0 }} />
                  <Text style={{ color: '#d13438', fontWeight: 500, fontSize: '13px' }}>{error}</Text>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div style={{ marginBottom: '12px', padding: '8px 12px', backgroundColor: '#f0f6ff', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckmarkCircleRegular style={{ color: '#107c10', fontSize: '16px', flexShrink: 0 }} />
                  <Text style={{ color: '#323130', fontWeight: 500, fontSize: '13px' }}>{successMessage}</Text>
                </div>
              )}

              {/* Toolbar */}
              <div className={styles.toolbar}>
                <div className={styles.toolbarContainer}>
                  <Button
                    appearance="subtle"
                    icon={<ArrowSyncRegular />}
                    onClick={handleRefresh}
                    disabled={loading}
                    className={styles.toolbarButton}
                  >
                    Refresh
                  </Button>

                  {/* Info Button with Tooltip */}
                  {selectedDevice && (
                    <Tooltip
                      content={`Showing analog conversion tables for ${selectedDevice.nameShowOnTree} (SN: ${selectedDevice.serialNumber}). These tables define custom voltage-to-value conversions for analog inputs.`}
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
                  )}
                </div>
              </div>

              <hr className={styles.overviewHr} />

              {/* Data Grid */}
              <div className={styles.dockingBody}>
                {loading ? (
                  <div className={styles.loadingBar}>
                    <Spinner size="tiny" />
                    <Text size={200} weight="regular">Loading tables...</Text>
                  </div>
                ) : tables.length === 0 ? (
                  <div className={styles.noData}>
                    <Text>No tables configured for this device.</Text>
                  </div>
                ) : (
                  <DataGrid
                    items={tables}
                    columns={columns}
                    sortable
                    resizableColumns
                    focusMode="composite"
                  >
                    <DataGridHeader>
                      <DataGridRow>
                        {({ renderHeaderCell }) => (
                          <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                        )}
                      </DataGridRow>
                    </DataGridHeader>
                    <DataGridBody<TableItem>>
                      {({ item, rowId }) => (
                        <DataGridRow<TableItem> key={rowId}>
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

export { TablesPage };
