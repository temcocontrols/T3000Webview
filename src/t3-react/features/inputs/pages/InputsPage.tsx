/**
 * Inputs Page
 *
 * Maps to C++ CInputSetDlg (InputSetDlg.cpp)
 * Displays input points in a data grid similar to C++ MSFlexGrid
 *
 * Grid Columns (from C++ InputSetDlg.cpp:316-353):
 * - Index: Row number (0-based)
 * - Input Name: Full_Label field
 * - Value: fValue with units
 * - Auto/Man: auto_manual status
 * - Calibration: calibration offset
 * - Filter: filter_field value
 * - Range: range_field (sensor type)
 * - Function: Input function type
 * - Custom Tables: Custom sensor configuration
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
  makeStyles,
  Button,
  Spinner,
  Text,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  Tooltip,
  Badge,
  shorthands,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ArrowDownloadRegular,
  FilterRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import './InputsPage.module.css';

// Types based on Rust entity (input_points.rs)
interface InputPoint {
  serialNumber: number;
  inputId?: string;                // "IN1", "IN2", etc.
  inputIndex?: string;
  panel?: string;
  fullLabel?: string;              // Input name
  autoManual?: string;             // "Auto" or "Manual"
  fValue?: string;                 // Current value
  units?: string;                  // Unit of measurement
  rangeField?: string;             // Sensor type/range
  calibration?: string;            // Calibration offset
  sign?: string;                   // + or -
  filterField?: string;            // Filter value
  status?: string;                 // Online/Offline
  digitalAnalog?: string;          // "0"=digital, "1"=analog
  label?: string;                  // Short label
  typeField?: string;              // Input type
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
  },
  toolbar: {
    backgroundColor: '#fafafa',
    borderBottom: '1px solid #edebe9',
    ...shorthands.padding('4px', '8px'),
    minHeight: '32px',
    fontSize: '12px',
    fontWeight: '400',
    // InputsPage-specific toolbar button styles
    '& .fui-ToolbarButton': {
      height: '32px',
      minHeight: '32px',
      padding: '0 12px',
      fontSize: '13px',
      fontWeight: '400',
      color: '#323130',
      gap: '6px',
    },
    '& .fui-ToolbarButton:hover:not([aria-disabled="true"])': {
      backgroundColor: '#f3f2f1',
      color: '#201f1e',
    },
    '& .fui-ToolbarButton:active:not([aria-disabled="true"])': {
      backgroundColor: '#edebe9',
      color: '#201f1e',
    },
    '& .fui-ToolbarButton[aria-disabled="true"]': {
      color: '#a19f9d',
      cursor: 'default',
    },
    '& .fui-ToolbarButton svg': {
      fontSize: '16px',
      width: '16px',
      height: '16px',
    },
  },
  toolbarDivider: {
    paddingBottom: '5px',
  },
  toolbarHr: {
    borderWidth: '0',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderColor: '#edebe9',
    margin: '0',
  },
  gridContainer: {
    ...shorthands.flex(1),
    ...shorthands.overflow('hidden'),
    backgroundColor: '#ffffff',
    position: 'relative',
    height: '100%',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.gap('12px'),
    height: '400px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.gap('12px'),
    height: '400px',
    color: '#605e5c',
    fontSize: '13px',
  },
});

export const InputsPage: React.FC = () => {
  const classes = useStyles();
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();

  const [inputs, setInputs] = useState<InputPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-select first device on page load if no device is selected
  // Navigate tree structure to find first actual device (may be nested under subnet nodes)
  useEffect(() => {
    console.log('[InputsPage] Auto-select useEffect triggered');
    console.log('[InputsPage] selectedDevice:', selectedDevice);
    console.log('[InputsPage] treeData.length:', treeData.length);

    if (!selectedDevice && treeData.length > 0) {
      console.log('[InputsPage] Searching for first device...');

      // Recursive function to find first device node in tree
      const findFirstDevice = (nodes: any[]): any => {
        for (const node of nodes) {
          // If this node has device data, return it
          if (node.data) {
            return node;
          }
          // Otherwise, search its children recursively
          if (node.children && node.children.length > 0) {
            const found = findFirstDevice(node.children);
            if (found) return found;
          }
        }
        return null;
      };

      const firstDeviceNode = findFirstDevice(treeData);

      if (firstDeviceNode?.data) {
        console.log('[InputsPage] Auto-selecting first device:', firstDeviceNode.data);
        selectDevice(firstDeviceNode.data);
      } else {
        console.log('[InputsPage] No device found in tree');
      }
    }
  }, [selectedDevice, treeData, selectDevice]);

  // Fetch inputs for selected device
  const fetchInputs = useCallback(async () => {
    console.log('[InputsPage] fetchInputs called, selectedDevice:', selectedDevice);

    if (!selectedDevice) {
      console.log('[InputsPage] No device selected');
      setInputs([]);
      return;
    }

    console.log('[InputsPage] Fetching inputs for device:', selectedDevice.serialNumber);
    setLoading(true);
    setError(null);

    try {
      // Use devices route instead of points alias
      const url = `/api/t3_device/devices/${selectedDevice.serialNumber}/input-points`;
      console.log('[InputsPage] Fetching from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch inputs: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[InputsPage] Received data:', data);
      setInputs(data.input_points || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load inputs';
      setError(errorMessage);
      console.error('Error fetching inputs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);  // Load inputs when device changes
  useEffect(() => {
    fetchInputs();
  }, [fetchInputs]);

  // Refresh handler (matches C++ RefreshButton)
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInputs();
    setRefreshing(false);
  };

  // Export handler (placeholder for future implementation)
  const handleExport = () => {
    console.log('Export inputs to CSV');
    // TODO: Implement CSV export
  };

  // Column definitions matching C++ grid layout (InputSetDlg.cpp:316-353)
  const columns: TableColumnDefinition<InputPoint>[] = [
    createTableColumn<InputPoint>({
      columnId: 'index',
      renderHeaderCell: () => '#',
      renderCell: (_item) => {
        // Get row index from the full list
        const index = inputs.findIndex(inp => inp.serialNumber === _item.serialNumber && inp.inputIndex === _item.inputIndex);
        return <TableCellLayout>{index + 1}</TableCellLayout>;
      },
      compare: (a, b) => {
        const aIndex = parseInt(a.inputIndex || '0');
        const bIndex = parseInt(b.inputIndex || '0');
        return aIndex - bIndex;
      },
    }),
    createTableColumn<InputPoint>({
      columnId: 'inputName',
      renderHeaderCell: () => 'Input Name',
      renderCell: (item) => (
        <TableCellLayout>
          <Text weight="semibold">{item.fullLabel || item.label || 'Unnamed'}</Text>
        </TableCellLayout>
      ),
    }),
    createTableColumn<InputPoint>({
      columnId: 'value',
      renderHeaderCell: () => 'Value',
      renderCell: (item) => (
        <TableCellLayout>
          {item.fValue || '---'} {item.units || ''}
        </TableCellLayout>
      ),
    }),
    createTableColumn<InputPoint>({
      columnId: 'autoManual',
      renderHeaderCell: () => 'Auto/Man',
      renderCell: (item) => {
        const isAuto = item.autoManual?.toLowerCase() === 'auto';
        return (
          <TableCellLayout>
            <Badge
              appearance={isAuto ? 'filled' : 'outline'}
              color={isAuto ? 'success' : 'warning'}
            >
              {item.autoManual || 'Auto'}
            </Badge>
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<InputPoint>({
      columnId: 'calibration',
      renderHeaderCell: () => 'Calibration',
      renderCell: (item) => {
        const cal = item.calibration || '0';
        const sign = item.sign || '';
        return (
          <TableCellLayout>
            {sign}{cal}
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<InputPoint>({
      columnId: 'filter',
      renderHeaderCell: () => 'Filter',
      renderCell: (item) => (
        <TableCellLayout>{item.filterField || '0'}</TableCellLayout>
      ),
    }),
    createTableColumn<InputPoint>({
      columnId: 'range',
      renderHeaderCell: () => 'Range',
      renderCell: (item) => (
        <TableCellLayout>
          <Text wrap={false}>{item.rangeField || 'Not Set'}</Text>
        </TableCellLayout>
      ),
    }),
    createTableColumn<InputPoint>({
      columnId: 'digitalAnalog',
      renderHeaderCell: () => 'Type',
      renderCell: (item) => {
        const isDigital = item.digitalAnalog === '0';
        return (
          <TableCellLayout>
            <Badge
              appearance="outline"
              color={isDigital ? 'informative' : 'brand'}
            >
              {isDigital ? 'Digital' : 'Analog'}
            </Badge>
          </TableCellLayout>
        );
      },
    }),
  ];

  // Render loading state
  if (loading && inputs.length === 0) {
    return (
      <div className={classes.container}>
        <Toolbar className={classes.toolbar}>
          <Text size={400} weight="semibold">Inputs</Text>
        </Toolbar>
        <div className={classes.loadingContainer}>
          <Spinner size="large" label="Loading inputs..." />
        </div>
      </div>
    );
  }

  // Render no device selected state
  if (!selectedDevice) {
    return (
      <div className={classes.container}>
        <Toolbar className={classes.toolbar}>
          <Text size={400} weight="semibold">Inputs</Text>
        </Toolbar>
        <div className={classes.emptyState}>
          <Text size={400}>No device selected</Text>
          <Text size={300}>Please select a device from the tree to view inputs</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      {/* Toolbar - matches Azure Portal Resource Manager */}
      <Toolbar className={classes.toolbar}>
        <Tooltip content="Refresh inputs from device" relationship="label">
          <ToolbarButton
            icon={<ArrowSyncRegular />}
            onClick={handleRefresh}
            disabled={refreshing}
            appearance="subtle"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </ToolbarButton>
        </Tooltip>

        <Tooltip content="Export to CSV" relationship="label">
          <ToolbarButton
            icon={<ArrowDownloadRegular />}
            onClick={handleExport}
            appearance="subtle"
          >
            Export to CSV
          </ToolbarButton>
        </Tooltip>

        <ToolbarDivider />

        <Tooltip content="Filter inputs" relationship="label">
          <ToolbarButton icon={<FilterRegular />} appearance="subtle">
            Filter
          </ToolbarButton>
        </Tooltip>
      </Toolbar>

      {/* Azure Portal style horizontal divider */}
      <div className={classes.toolbarDivider}>
        <hr className={classes.toolbarHr} />
      </div>

      {/* Error message */}
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Error</MessageBarTitle>
            {error}
          </MessageBarBody>
        </MessageBar>
      )}

      {/* Data Grid */}
      <div className={classes.gridContainer}>
        {inputs.length === 0 ? (
          <div className={classes.emptyState}>
            <Text size={500}>No inputs found</Text>
            <Text size={300}>This device has no configured input points</Text>
            <Button
              appearance="primary"
              icon={<ArrowSyncRegular />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          </div>
        ) : (
          <DataGrid
            items={inputs}
            columns={columns}
            sortable
            resizableColumns
            columnSizingOptions={{
              index: {
                minWidth: 50,
                defaultWidth: 60,
              },
              inputName: {
                minWidth: 150,
                defaultWidth: 250,
              },
              value: {
                minWidth: 100,
                defaultWidth: 150,
              },
              autoManual: {
                minWidth: 80,
                defaultWidth: 100,
              },
              calibration: {
                minWidth: 80,
                defaultWidth: 100,
              },
              filter: {
                minWidth: 60,
                defaultWidth: 80,
              },
              range: {
                minWidth: 120,
                defaultWidth: 180,
              },
              digitalAnalog: {
                minWidth: 80,
                defaultWidth: 100,
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
            <DataGridBody<InputPoint>>
              {({ item, rowId }) => (
                <DataGridRow<InputPoint> key={rowId}>
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
  );
};

export default InputsPage;
