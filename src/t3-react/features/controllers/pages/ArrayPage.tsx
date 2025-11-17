import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DataGrid,
  DataGridProps,
  DataGridBody,
  DataGridRow,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridCell,
  TableCellLayout,
  TableColumnDefinition,
  createTableColumn,
  Badge,
  Button,
  Input,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowClockwise24Regular,
  Save24Regular,
  Dismiss24Regular,
  ArrowSortUpRegular,
  ArrowSortDownRegular,
  ArrowSortRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '@t3-react/store';
import styles from './ArrayPage.module.css';

// Array interface matching C++ CBacnetArray structure (4 columns)
interface ArrayItem {
  item: string;              // Item # (Column 0)
  array_name: string;        // Array Name (Column 1 - EditBox)
  length: string;            // Length (Column 2 - EditBox)
  value: string;             // Value (Column 3 - Normal/ReadOnly)
}

const ArrayPage: React.FC = () => {
  const { selectedDevice, devices, selectDevice } = useDeviceTreeStore();
  const [arrays, setArrays] = useState<ArrayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, Partial<ArrayItem>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [sortState, setSortState] = useState<{ columnId: string; direction: 'ascending' | 'descending' }>({ columnId: 'item', direction: 'ascending' });

  // Auto-select first device on page load if none selected
  useEffect(() => {
    if (!selectedDevice && devices.length > 0) {
      selectDevice(devices[0].id);
    }
  }, [selectedDevice, devices, selectDevice]);

  // Fetch array data
  const fetchArrays = useCallback(async () => {
    if (!selectedDevice) return;

    setIsLoading(true);
    setError(null);
    try {
      // Using generic table API (ARRAY table doesn't have entity yet)
      const response = await fetch(`/api/t3_device/devices/${selectedDevice.id}/table/ARRAY_TABLE`);
      if (!response.ok) throw new Error('Failed to fetch arrays');

      const result = await response.json();
      setArrays(result.data || []);
    } catch (error) {
      console.error('Error fetching arrays:', error);
      setError(error instanceof Error ? error.message : 'Failed to load arrays');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchArrays();
  }, [fetchArrays]);

  // Handle field edit
  const handleFieldEdit = (itemId: string, field: keyof ArrayItem, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  // Get current value (edited or original)
  const getCurrentValue = (arrayItem: ArrayItem, field: keyof ArrayItem): string => {
    const itemId = arrayItem.item;
    return editedValues[itemId]?.[field] ?? arrayItem[field] ?? '';
  };

  // Save all changes
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement batch save when API is ready
      console.log('Saving changes:', editedValues);
      setEditedValues({});
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Discard changes
  const handleDiscardChanges = () => {
    setEditedValues({});
    setHasChanges(false);
  };

  // Handle sort
  const handleSort = (columnId: string) => {
    setSortState((prev) => ({
      columnId,
      direction: prev.columnId === columnId && prev.direction === 'ascending' ? 'descending' : 'ascending',
    }));
  };

  // Get sort icon
  const getSortIcon = (columnId: string) => {
    if (sortState.columnId !== columnId) return <ArrowSortRegular />;
    return sortState.direction === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />;
  };

  // Column definitions based on C++ CBacnetArray.cpp (4 columns)
  const columns: TableColumnDefinition<ArrayItem>[] = useMemo(() => [
    // Column 0: Item #
    createTableColumn<ArrayItem>({
      columnId: 'item',
      compare: (a, b) => Number(a.item) - Number(b.item),
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('item')}>
          <div className={styles.headerText}>Item</div>
          {getSortIcon('item')}
        </div>
      ),
      renderCell: (arrayItem) => (
        <TableCellLayout className={styles.numCell}>
          {arrayItem.item}
        </TableCellLayout>
      ),
    }),

    // Column 1: Array Name (EditBox)
    createTableColumn<ArrayItem>({
      columnId: 'array_name',
      compare: (a, b) => (a.array_name || '').localeCompare(b.array_name || ''),
      renderHeaderCell: () => <div className={styles.headerText}>Array Name</div>,
      renderCell: (arrayItem) => (
        <TableCellLayout>
          <Input
            className={styles.editableInput}
            value={getCurrentValue(arrayItem, 'array_name')}
            onChange={(e, data) => handleFieldEdit(arrayItem.item, 'array_name', data.value)}
          />
        </TableCellLayout>
      ),
    }),

    // Column 2: Length (EditBox)
    createTableColumn<ArrayItem>({
      columnId: 'length',
      compare: (a, b) => Number(a.length || 0) - Number(b.length || 0),
      renderHeaderCell: () => <div className={styles.headerText}>Length</div>,
      renderCell: (arrayItem) => (
        <TableCellLayout>
          <Input
            className={styles.editableInput}
            type="number"
            value={getCurrentValue(arrayItem, 'length')}
            onChange={(e, data) => handleFieldEdit(arrayItem.item, 'length', data.value)}
          />
        </TableCellLayout>
      ),
    }),

    // Column 3: Value (Normal/ReadOnly)
    createTableColumn<ArrayItem>({
      columnId: 'value',
      compare: (a, b) => (a.value || '').localeCompare(b.value || ''),
      renderHeaderCell: () => <div className={styles.headerText}>Value</div>,
      renderCell: (arrayItem) => (
        <TableCellLayout className={styles.readOnlyCell}>
          {getCurrentValue(arrayItem, 'value')}
        </TableCellLayout>
      ),
    }),
  ], [editedValues]);

  return (
    <div className={styles.arrayPage}>
      {/* Azure Portal Blade Header */}
      <div className={styles.bladeHeader}>
        <div className={styles.bladeTitle}>
          <h1 className={styles.titleText}>Arrays</h1>
          {selectedDevice && (
            <span className={styles.subtitleText}>
              {selectedDevice.nameShowOnTree} (SN: {selectedDevice.serialNumber})
            </span>
          )}
        </div>
        <div className={styles.bladeActions}>
          <Button
            appearance="secondary"
            icon={<ArrowClockwise24Regular />}
            onClick={fetchArrays}
            disabled={isLoading}
          >
            Refresh
          </Button>
          {hasChanges && (
            <>
              <Button
                appearance="secondary"
                icon={<Dismiss24Regular />}
                onClick={handleDiscardChanges}
              >
                Discard
              </Button>
              <Button
                appearance="primary"
                icon={<Save24Regular />}
                onClick={handleSaveAll}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save All'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Azure Portal Blade Content */}
      <div className={styles.bladeContent}>
        {/* Loading State */}
        {isLoading && (
          <div className={styles.loadingContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size="large" />
            <Text style={{ marginLeft: '12px' }}>Loading arrays...</Text>
          </div>
        )}

        {/* No Device Selected */}
        {!selectedDevice && !isLoading && (
          <div style={{ textAlign: 'center' }}>
            <Text>Please select a device from the tree to view arrays.</Text>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#fef0f1', border: '1px solid #d13438', borderRadius: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flexShrink: 0, marginTop: '2px' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 13C9.44772 13 9 12.5523 9 12C9 11.4477 9.44772 11 10 11C10.5523 11 11 11.4477 11 12C11 12.5523 10.5523 13 10 13ZM11 9C11 9.55228 10.5523 10 10 10C9.44772 10 9 9.55228 9 9V6C9 5.44772 9.44772 5 10 5C10.5523 5 11 5.44772 11 6V9Z" fill="#d13438"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <Text weight="semibold" style={{ color: '#d13438', display: 'block', marginBottom: '4px' }}>Error loading arrays</Text>
                <Text style={{ color: '#605e5c' }}>{error}</Text>
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {selectedDevice && !isLoading && !error && arrays.length === 0 && (
          <div style={{ marginTop: '40px' }}>
            <div style={{ textAlign: 'center', padding: '0 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                  <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" fill="currentColor"/>
                </svg>
              </div>
              <Text size={500} weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>No Arrays</Text>
              <Text style={{ color: '#605e5c' }}>This device has no arrays configured.</Text>
            </div>
          </div>
        )}

        {/* Data Grid with Data */}
        {selectedDevice && !isLoading && !error && arrays.length > 0 && (
          <div className={styles.gridContainer}>
            <DataGrid
              items={arrays}
              columns={columns}
              sortable
              resizableColumns
              className={styles.dataGrid}
            >
              <DataGridHeader>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell className={styles.headerCell}>
                      {renderHeaderCell()}
                    </DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<ArrayItem>>
                {({ item, rowId }) => (
                  <DataGridRow<ArrayItem>
                    key={rowId}
                    className={styles.dataRow}
                  >
                    {({ renderCell }) => (
                      <DataGridCell className={styles.dataCell}>
                        {renderCell(item)}
                      </DataGridCell>
                    )}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          </div>
        )}
      </div>

      {/* Azure Portal Blade Footer with Stats */}
      <div className={styles.bladeFooter}>
        <div className={styles.statsContainer}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Arrays:</span>
            <span className={styles.statValue}>{arrays.length}</span>
          </div>
          {hasChanges && (
            <div className={styles.statItem}>
              <Badge appearance="important" className={styles.changesBadge}>
                Unsaved Changes
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArrayPage;
