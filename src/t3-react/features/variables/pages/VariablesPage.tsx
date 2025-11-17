/**
 * Variables Page - Azure Portal Complete Sample
 *
 * Complete Azure Portal blade layout matching Inputs/Outputs pattern
 * Variables are internal system variables used for calculations and logic
 *
 * Azure Portal Structure:
 * - Blade Content Container (fxs-blade-content-container-default-details)
 * - Blade Content Wrapper (fxs-blade-content-wrapper)
 * - Part Content (fxs-part-content ext-msportal-padding)
 * - Toolbar (ext-overview-assistant-toolbar azc-toolbar)
 * - Horizontal Divider (ext-overview-hr)
 * - Blade Description (ext-blade-description)
 * - Docking Body (msportalfx-docking-body)
 * - Data Grid (fxc-gc-dataGrid) with thead/tbody structure
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
import { RangeSelectionDrawer } from '../components/RangeSelectionDrawer';
import { getRangeLabel } from '../data/rangeData';
import styles from './VariablesPage.module.css';

// Types based on Rust entity (variable_points.rs)
interface VariablePoint {
  serialNumber: number;
  variableId?: string;
  variableIndex?: string;
  panel?: string;
  fullLabel?: string;
  autoManual?: string;
  fValue?: string;
  units?: string;
  rangeField?: string;
  calibration?: string;
  sign?: string;
  filterField?: string;
  status?: string;
  digitalAnalog?: string;
  label?: string;
  typeField?: string;
}

export const VariablesPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();

  const [variables, setVariables] = useState<VariablePoint[]>([]);
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

  // Fetch variables for selected device
  const fetchVariables = useCallback(async () => {
    if (!selectedDevice) {
      setVariables([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/t3_device/devices/${selectedDevice.serialNumber}/variable-points`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch variables: ${response.statusText}`);
      }

      const data = await response.json();
      setVariables(data.variable_points || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load variables';
      setError(errorMessage);
      console.error('Error fetching variables:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVariables();
    setRefreshing(false);
  };

  const handleExport = () => {
    console.log('Export variables to CSV');
  };

  const handleSettings = () => {
    console.log('Settings clicked');
  };

  // Inline editing handlers
  const handleCellDoubleClick = (item: VariablePoint, field: string, currentValue: string) => {
    setEditingCell({ serialNumber: item.serialNumber, variableIndex: item.variableIndex || '', field });
    setEditValue(currentValue || '');
  };

  const handleEditSave = async () => {
    if (!editingCell) {
      setEditingCell(null);
      return;
    }

    // For value field, allow empty/zero values
    if (editingCell.field !== 'fValue' && !editValue.trim()) {
      setEditingCell(null);
      return;
    }

    setIsSaving(true);
    try {
      // TODO: Replace with actual API call to update the backend
      // if (editingCell.field === 'fullLabel') {
      //   await updateVariableLabel(editingCell.serialNumber, editingCell.variableIndex, editValue);
      // } else if (editingCell.field === 'fValue') {
      //   await updateVariableValue(editingCell.serialNumber, editingCell.variableIndex, editValue);
      // }

      // Update local state optimistically
      setVariables(prevVariables =>
        prevVariables.map(variable =>
          variable.serialNumber === editingCell.serialNumber &&
          variable.variableIndex === editingCell.variableIndex
            ? { ...variable, [editingCell.field]: editValue }
            : variable
        )
      );

      console.log('Updated', editingCell.field, ':', editValue, 'for', editingCell);
      setEditingCell(null);
    } catch (error) {
      console.error('Failed to update:', error);
      // Optionally show error message to user
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

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ serialNumber: number; variableIndex: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Range drawer state
  const [rangeDrawerOpen, setRangeDrawerOpen] = useState(false);
  const [selectedVariableForRange, setSelectedVariableForRange] = useState<VariablePoint | null>(null);

  // Range selection handlers
  const handleUnitsClick = (item: VariablePoint) => {
    setSelectedVariableForRange(item);
    setRangeDrawerOpen(true);
  };

  const handleRangeSave = (newRange: number) => {
    if (!selectedVariableForRange) return;

    // Update local state optimistically
    setVariables(prevVariables =>
      prevVariables.map(variable =>
        variable.serialNumber === selectedVariableForRange.serialNumber &&
        variable.variableIndex === selectedVariableForRange.variableIndex
          ? { ...variable, rangeField: newRange.toString() }
          : variable
      )
    );

    console.log('Range updated:', selectedVariableForRange.serialNumber, selectedVariableForRange.variableIndex, newRange);
    // TODO: Call API to update range value
    // Example: await updateVariableRange(selectedVariableForRange.serialNumber, selectedVariableForRange.variableIndex, newRange);
  };

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

  // Column definitions matching the sequence: Variable, Panel, Full Label, Label, Auto/Manual, Value, Units
  const columns: TableColumnDefinition<VariablePoint>[] = [
    // 1. Variable (Index/ID)
    createTableColumn<VariablePoint>({
      columnId: 'variable',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('variable')}>
          <span>Variable</span>
          {sortColumn === 'variable' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.variableId || item.variableIndex || '---'}</TableCellLayout>,
    }),
    // 2. Panel
    createTableColumn<VariablePoint>({
      columnId: 'panel',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('panel')}>
          <span>Panel</span>
          {sortColumn === 'panel' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => <TableCellLayout>{item.panel || '---'}</TableCellLayout>,
    }),
    // 3. Full Label
    createTableColumn<VariablePoint>({
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
                          editingCell?.variableIndex === item.variableIndex &&
                          editingCell?.field === 'fullLabel';

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
                aria-label="Edit full label"
              />
            ) : (
              <div
                className={styles.editableCell}
                onDoubleClick={() => handleCellDoubleClick(item, 'fullLabel', item.fullLabel || '')}
                title="Double-click to edit"
              >
                <Text size={200} weight="regular">{item.fullLabel || 'Unnamed'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 3. Label (short label)
    createTableColumn<VariablePoint>({
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
      renderCell: (item) => (
        <TableCellLayout>
          {editingCell?.serialNumber === item.serialNumber && editingCell?.variableIndex === item.variableIndex && editingCell?.field === 'label' ? (
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
              onDoubleClick={() => handleCellDoubleClick(item, 'label', item.label || '')}
              title="Double-click to edit"
            >
              <Text size={200} weight="regular">{item.label || '---'}</Text>
            </div>
          )}
        </TableCellLayout>
      ),
    }),
    // 4. Auto/Manual
    createTableColumn<VariablePoint>({
      columnId: 'autoManual',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Auto/Manual</span>
        </div>
      ),
      renderCell: (item) => {
        // Check if Auto: value could be 'auto', 'Auto', or '1' (Manual is '0')
        const value = item.autoManual?.toString().toLowerCase();
        const isAuto = value === 'auto' || value === '1';

        const handleToggle = () => {
          const newValue = !isAuto ? '1' : '0';
          console.log('Auto/Man toggled:', item.serialNumber, item.variableIndex, newValue);

          // Update local state optimistically
          setVariables(prevVariables =>
            prevVariables.map(variable =>
              variable.serialNumber === item.serialNumber && variable.variableIndex === item.variableIndex
                ? { ...variable, autoManual: newValue }
                : variable
            )
          );

          // TODO: Call API to update Auto/Man value
          // Example: updateVariableAutoManual(item.serialNumber, item.variableIndex, newValue);
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
    // 5. Value
    createTableColumn<VariablePoint>({
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
      renderCell: (item) => {
        const isEditing = editingCell?.serialNumber === item.serialNumber &&
                          editingCell?.variableIndex === item.variableIndex &&
                          editingCell?.field === 'fValue';

        return (
          <TableCellLayout>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                className={styles.editInput}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleEditSave}
                onKeyDown={handleEditKeyDown}
                autoFocus
                disabled={isSaving}
                placeholder="Enter value"
                aria-label="Edit value"
              />
            ) : (
              <div
                className={styles.editableCell}
                onDoubleClick={() => handleCellDoubleClick(item, 'fValue', item.fValue?.toString() || '0')}
                title="Double-click to edit"
              >
                <Text size={200} weight="regular">{item.fValue || '---'}</Text>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    // 7. Units
    createTableColumn<VariablePoint>({
      columnId: 'units',
      renderHeaderCell: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleSort('units')}>
          <span>Units</span>
          {sortColumn === 'units' ? (
            sortDirection === 'ascending' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />
          ) : (
            <ArrowSortRegular style={{ opacity: 0.5 }} />
          )}
        </div>
      ),
      renderCell: (item) => {
        // Parse range value and digital_analog type
        const rangeValue = item.rangeField ? parseInt(item.rangeField) : 0;
        const digitalAnalog = item.digitalAnalog === '1' ? 1 : 0;
        const rangeLabel = getRangeLabel(rangeValue, digitalAnalog);

        return (
          <TableCellLayout>
            <div
              onClick={() => handleUnitsClick(item)}
              style={{ cursor: 'pointer', color: '#0078d4' }}
              title="Click to change range/units"
            >
              <Text size={200} weight="regular">{rangeLabel}</Text>
            </div>
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
                    Showing variable points for <b>{selectedDevice.nameShowOnTree} (SN: {selectedDevice.serialNumber})</b>.
                    {' '}This table displays all configured variable points used for internal calculations, logic operations,
                    and data storage within the building automation system.
                    {' '}<a href="#" onClick={(e) => { e.preventDefault(); console.log('Learn more clicked'); }}>Learn more</a>
                  </span>
                </div>
              )}

              {/* ========================================
                  TOOLBAR - Azure Portal Command Bar
                  Matches: ext-overview-assistant-toolbar
                  ======================================== */}
              <div className={styles.toolbar}>
                <div className={styles.toolbarContainer}>
                  {/* Refresh Button */}
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

                  {/* Export to CSV Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleExport}
                    title="Export to CSV"
                    aria-label="Export to CSV"
                  >
                    <ArrowDownloadRegular />
                    <span>Export to CSV</span>
                  </button>

                  {/* Toolbar Separator */}
                  <div className={styles.toolbarSeparator} role="separator" />

                  {/* Settings Button */}
                  <button
                    className={styles.toolbarButton}
                    onClick={handleSettings}
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
                      placeholder="Search variables..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      spellCheck="false"
                      role="searchbox"
                      aria-label="Search variables"
                    />
                  </div>
                </div>
              </div>

              {/* ========================================
                  HORIZONTAL DIVIDER
                  Matches: ext-overview-hr
                  ======================================== */}
              <div style={{ padding: '0' }}>
                <hr className={styles.overviewHr} />
              </div>

              {/* ========================================
                  DOCKING BODY - Main Content
                  Matches: msportalfx-docking-body
                  ======================================== */}
              <div className={styles.dockingBody}>

                {/* Loading State */}
                {loading && variables.length === 0 && (
                  <div className={styles.loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spinner size="large" />
                    <Text style={{ marginLeft: '12px' }}>Loading variables...</Text>
                  </div>
                )}

                {/* No Device Selected */}
                {!selectedDevice && !loading && (
                  <div className={styles.noData}>
                    <div style={{ textAlign: 'center' }}>
                      <Text size={500} weight="semibold">No device selected</Text>
                      <br />
                      <Text size={300}>Please select a device from the tree to view variables</Text>
                    </div>
                  </div>
                )}

                {/* Data Grid - Azure Portal Style */}
                {selectedDevice && !loading && !error && variables.length === 0 && (
                  <div style={{ marginTop: '40px' }}>
                    <div style={{ textAlign: 'center', padding: '0 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM10 8V16H14V8H10Z" fill="currentColor"/>
                        </svg>
                        <Text size={500} weight="semibold">No variables found</Text>
                      </div>
                      <Text size={300} style={{ display: 'block', marginBottom: '24px', color: '#605e5c', textAlign: 'center' }}>This device has no configured variable points</Text>
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

                {/* Data Grid with Data */}
                {selectedDevice && !loading && !error && variables.length > 0 && (
                  <DataGrid
                    items={variables}
                    columns={columns}
                    sortable
                    resizableColumns
                    columnSizingOptions={{
                      variable: {
                        minWidth: 60,
                        defaultWidth: 80,
                      },
                      panel: {
                        minWidth: 60,
                        defaultWidth: 75,
                      },
                      fullLabel: {
                        minWidth: 180,
                        defaultWidth: 250,
                      },
                      label: {
                        minWidth: 130,
                        defaultWidth: 170,
                      },
                      autoManual: {
                        minWidth: 90,
                        defaultWidth: 120,
                      },
                      value: {
                        minWidth: 80,
                        defaultWidth: 100,
                      },
                      units: {
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
                    <DataGridBody<VariablePoint>>
                      {({ item, rowId }) => (
                        <DataGridRow<VariablePoint> key={rowId}>
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

      {/* Range Selection Drawer */}
      {selectedVariableForRange && (
        <RangeSelectionDrawer
          isOpen={rangeDrawerOpen}
          onClose={() => {
            setRangeDrawerOpen(false);
            setSelectedVariableForRange(null);
          }}
          currentRange={selectedVariableForRange.rangeField ? parseInt(selectedVariableForRange.rangeField) : 0}
          digitalAnalog={selectedVariableForRange.digitalAnalog === '1' ? 1 : 0}
          onSave={handleRangeSave}
          inputLabel={selectedVariableForRange.fullLabel || 'Variable'}
        />
      )}
    </div>
  );
};

export default VariablesPage;
