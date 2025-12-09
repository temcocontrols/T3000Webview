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
  Badge,
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
import styles from './CustomUnitsPage.module.css';

// Custom Unit interface matching CUSTOM_UNITS entity
interface CustomUnitItem {
  unitId: string;
  unitIndex: string;
  panel: string;
  unitType: string; // 'DIGITAL' or 'ANALOG'
  direct: number; // 0 or 1
  digitalUnitsOff: string;
  digitalUnitsOn: string;
  analogUnitName: string;
  status: string;
}

const CustomUnitsPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();

  const [customUnits, setCustomUnits] = useState<CustomUnitItem[]>([]);
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

  // Fetch custom units from database
  const fetchCustomUnits = useCallback(async () => {
    if (!selectedDevice) {
      setCustomUnits([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/devices/${selectedDevice.serialNumber}/custom-units/refresh`);

      if (!response.ok) {
        throw new Error(`Failed to fetch custom units: ${response.statusText}`);
      }

      const result = await response.json();
      setCustomUnits(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load custom units';
      setError(errorMessage);
      console.error('Error fetching custom units:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchCustomUnits();
  }, [fetchCustomUnits]);

  // Handle refresh button click
  const handleRefresh = () => {
    fetchCustomUnits();
  };

  // Handle cell edit
  const handleCellClick = (rowIndex: number, columnId: string, currentValue: string | number) => {
    if (columnId === 'unitId' || columnId === 'unitIndex') return; // Read-only columns
    setEditingCell({ rowIndex, columnId });
    setEditValue(String(currentValue || ''));
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleSaveEdit = async (rowIndex: number, columnId: string) => {
    if (!selectedDevice || !editingCell) return;

    const unit = customUnits[rowIndex];

    // Convert to appropriate type based on column
    let convertedValue: any = editValue;
    if (columnId === 'direct') {
      convertedValue = parseInt(editValue) || 0;
    }

    const updatedUnit = { ...unit, [columnId]: convertedValue };

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/devices/${selectedDevice.serialNumber}/custom-units/${unit.unitIndex}/update`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUnit),
        }
      );

      if (!response.ok) {
        throw new Error(`Update failed: ${response.statusText}`);
      }

      // Update local state
      const newUnits = [...customUnits];
      newUnits[rowIndex] = updatedUnit;
      setCustomUnits(newUnits);

      setSuccessMessage(`Custom unit ${unit.unitIndex} updated successfully`);
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

  // Unit type badge color
  const getUnitTypeColor = (type: string): 'informative' | 'success' => {
    return type === 'DIGITAL' ? 'informative' : 'success';
  };

  // Column definitions
  const columns: TableColumnDefinition<CustomUnitItem>[] = useMemo(() => [
    createTableColumn<CustomUnitItem>({
      columnId: 'unitIndex',
      renderHeaderCell: () => <span>Index</span>,
      renderCell: (item) => <TableCellLayout>{item.unitIndex}</TableCellLayout>,
    }),
    createTableColumn<CustomUnitItem>({
      columnId: 'unitType',
      renderHeaderCell: () => <span>Type</span>,
      renderCell: (item) => (
        <TableCellLayout>
          <Badge appearance="filled" color={getUnitTypeColor(item.unitType || 'ANALOG')}>
            {item.unitType || 'ANALOG'}
          </Badge>
        </TableCellLayout>
      ),
    }),
    createTableColumn<CustomUnitItem>({
      columnId: 'panel',
      renderHeaderCell: () => <span>Panel</span>,
      renderCell: (item) => <TableCellLayout>{item.panel || '-'}</TableCellLayout>,
    }),
    createTableColumn<CustomUnitItem>({
      columnId: 'direct',
      renderHeaderCell: () => <span>Direct</span>,
      renderCell: (item: CustomUnitItem) => {
        const rowIndex = customUnits.indexOf(item);
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'direct';
        return (
          <TableCellLayout>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                <input
                  type="number"
                  className={styles.editInput}
                  value={editValue}
                  onChange={handleEditChange}
                  onBlur={() => handleSaveEdit(rowIndex, 'direct')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(rowIndex, 'direct');
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                  min={0}
                  max={1}
                />
              </div>
            ) : (
              <span onClick={() => handleCellClick(rowIndex, 'direct', item.direct || 0)}>
                {item.direct === 1 ? 'Yes' : 'No'}
              </span>
            )}
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<CustomUnitItem>({
      columnId: 'digitalUnitsOff',
      renderHeaderCell: () => <span>Digital OFF Text</span>,
      renderCell: (item: CustomUnitItem) => {
        const rowIndex = customUnits.indexOf(item);
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'digitalUnitsOff';
        return (
          <TableCellLayout>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                <input
                  type="text"
                  className={styles.editInput}
                  value={editValue}
                  onChange={handleEditChange}
                  onBlur={() => handleSaveEdit(rowIndex, 'digitalUnitsOff')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(rowIndex, 'digitalUnitsOff');
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                  maxLength={12}
                />
              </div>
            ) : (
              <span onClick={() => handleCellClick(rowIndex, 'digitalUnitsOff', item.digitalUnitsOff)}>
                {item.digitalUnitsOff || '-'}
              </span>
            )}
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<CustomUnitItem>({
      columnId: 'digitalUnitsOn',
      renderHeaderCell: () => <span>Digital ON Text</span>,
      renderCell: (item: CustomUnitItem) => {
        const rowIndex = customUnits.indexOf(item);
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'digitalUnitsOn';
        return (
          <TableCellLayout>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                <input
                  type="text"
                  className={styles.editInput}
                  value={editValue}
                  onChange={handleEditChange}
                  onBlur={() => handleSaveEdit(rowIndex, 'digitalUnitsOn')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(rowIndex, 'digitalUnitsOn');
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                  maxLength={12}
                />
              </div>
            ) : (
              <span onClick={() => handleCellClick(rowIndex, 'digitalUnitsOn', item.digitalUnitsOn)}>
                {item.digitalUnitsOn || '-'}
              </span>
            )}
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<CustomUnitItem>({
      columnId: 'analogUnitName',
      renderHeaderCell: () => <span>Analog Unit Name</span>,
      renderCell: (item: CustomUnitItem) => {
        const rowIndex = customUnits.indexOf(item);
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'analogUnitName';
        return (
          <TableCellLayout>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                <input
                  type="text"
                  className={styles.editInput}
                  value={editValue}
                  onChange={handleEditChange}
                  onBlur={() => handleSaveEdit(rowIndex, 'analogUnitName')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(rowIndex, 'analogUnitName');
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                />
              </div>
            ) : (
              <span onClick={() => handleCellClick(rowIndex, 'analogUnitName', item.analogUnitName)}>
                {item.analogUnitName || '-'}
              </span>
            )}
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<CustomUnitItem>({
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
                      content={`Showing custom units for ${selectedDevice.nameShowOnTree} (SN: ${selectedDevice.serialNumber}). Define custom digital and analog unit labels for points.`}
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
                  <div className={styles.loading}>
                    <Spinner size="medium" label="Loading custom units..." />
                  </div>
                ) : customUnits.length === 0 ? (
                  <div className={styles.noData}>
                    <Text>No custom units configured for this device.</Text>
                  </div>
                ) : (
                  <DataGrid
                    items={customUnits}
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
                    <DataGridBody<CustomUnitItem>>
                      {({ item, rowId }) => (
                        <DataGridRow<CustomUnitItem> key={rowId}>
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

export { CustomUnitsPage };
