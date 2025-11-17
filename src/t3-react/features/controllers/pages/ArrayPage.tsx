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
  tokens,
} from '@fluentui/react-components';
import {
  ArrowClockwise24Regular,
  Save24Regular,
  Dismiss24Regular,
} from '@fluentui/react-icons';
import { useParams } from 'react-router-dom';
import styles from './ArrayPage.module.css';

// Array interface matching C++ CBacnetArray structure (4 columns)
interface ArrayItem {
  item: string;              // Item # (Column 0)
  array_name: string;        // Array Name (Column 1 - EditBox)
  length: string;            // Length (Column 2 - EditBox)
  value: string;             // Value (Column 3 - Normal/ReadOnly)
}

const ArrayPage: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [arrays, setArrays] = useState<ArrayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, Partial<ArrayItem>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch array data
  const fetchArrays = useCallback(async () => {
    if (!deviceId) return;

    setIsLoading(true);
    try {
      // Using generic table API (ARRAY table doesn't have entity yet)
      const response = await fetch(`/api/t3_device/devices/${deviceId}/table/ARRAY_TABLE`);
      if (!response.ok) throw new Error('Failed to fetch arrays');

      const result = await response.json();
      setArrays(result.data || []);
    } catch (error) {
      console.error('Error fetching arrays:', error);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

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

  // Column definitions based on C++ CBacnetArray.cpp (4 columns)
  const columns: TableColumnDefinition<ArrayItem>[] = useMemo(() => [
    // Column 0: Item #
    createTableColumn<ArrayItem>({
      columnId: 'item',
      compare: (a, b) => Number(a.item) - Number(b.item),
      renderHeaderCell: () => <div className={styles.headerText}>Item</div>,
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
          <span className={styles.subtitleText}>Device {deviceId}</span>
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
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}>Loading arrays...</div>
          </div>
        ) : arrays.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📊</div>
            <h2 className={styles.emptyStateTitle}>No Arrays</h2>
            <p className={styles.emptyStateText}>
              This device has no arrays configured.
            </p>
          </div>
        ) : (
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
