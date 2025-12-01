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
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ErrorCircleRegular,
  CheckmarkCircleRegular,
  PersonRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import styles from './UsersPage.module.css';

// User interface matching USERS entity
interface UserItem {
  userId: string;
  userIndex: string;
  panel: string;
  name: string;
  password: string;
  accessLevel: number;
  rightsAccess: number;
  defaultPanel: number;
  defaultGroup: number;
  screenRight: string;
  programRight: string;
  status: string;
}

const UsersPage: React.FC = () => {
  const { selectedDevice, treeData, selectDevice } = useDeviceTreeStore();

  const [users, setUsers] = useState<UserItem[]>([]);
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

  // Fetch users from database
  const fetchUsers = useCallback(async () => {
    if (!selectedDevice) {
      setUsers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/devices/${selectedDevice.serialNumber}/users/refresh`);

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const result = await response.json();
      setUsers(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMessage);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle refresh button click
  const handleRefresh = () => {
    fetchUsers();
  };

  // Handle cell edit
  const handleCellClick = (rowIndex: number, columnId: string, currentValue: string | number) => {
    if (columnId === 'userId' || columnId === 'userIndex') return; // Read-only columns
    setEditingCell({ rowIndex, columnId });
    setEditValue(String(currentValue || ''));
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleSaveEdit = async (rowIndex: number, columnId: string) => {
    if (!selectedDevice || !editingCell) return;

    const user = users[rowIndex];

    // Convert to appropriate type based on column
    let convertedValue: any = editValue;
    if (['accessLevel', 'rightsAccess', 'defaultPanel', 'defaultGroup'].includes(columnId)) {
      convertedValue = parseInt(editValue) || 0;
    }

    const updatedUser = { ...user, [columnId]: convertedValue };

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/devices/${selectedDevice.serialNumber}/users/${user.userIndex}/update`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser),
        }
      );

      if (!response.ok) {
        throw new Error(`Update failed: ${response.statusText}`);
      }

      // Update local state
      const newUsers = [...users];
      newUsers[rowIndex] = updatedUser;
      setUsers(newUsers);

      setSuccessMessage(`User ${user.name || user.userIndex} updated successfully`);
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

  // Access level badge color
  const getAccessLevelColor = (level: number): 'success' | 'warning' | 'danger' | 'informative' => {
    if (level >= 200) return 'danger'; // Admin
    if (level >= 100) return 'warning'; // Operator
    if (level >= 50) return 'informative'; // User
    return 'success'; // Guest
  };

  // Column definitions
  const columns: TableColumnDefinition<UserItem>[] = useMemo(() => [
    createTableColumn<UserItem>({
      columnId: 'userIndex',
      renderHeaderCell: () => <span>Index</span>,
      renderCell: (item) => <TableCellLayout>{item.userIndex}</TableCellLayout>,
    }),
    createTableColumn<UserItem>({
      columnId: 'name',
      renderHeaderCell: () => <span>Username</span>,
      renderCell: (item: UserItem) => {
        const rowIndex = users.indexOf(item);
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'name';
        return (
          <TableCellLayout media={<PersonRegular />}>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                <input
                  type="text"
                  className={styles.editInput}
                  value={editValue}
                  onChange={handleEditChange}
                  onBlur={() => handleSaveEdit(rowIndex, 'name')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(rowIndex, 'name');
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                  maxLength={16}
                />
              </div>
            ) : (
              <span onClick={() => handleCellClick(rowIndex, 'name', item.name)}>{item.name || '-'}</span>
            )}
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<UserItem>({
      columnId: 'password',
      renderHeaderCell: () => <span>Password</span>,
      renderCell: (item: UserItem) => {
        const rowIndex = users.indexOf(item);
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'password';
        return (
          <TableCellLayout>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                <input
                  type="password"
                  className={styles.editInput}
                  value={editValue}
                  onChange={handleEditChange}
                  onBlur={() => handleSaveEdit(rowIndex, 'password')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(rowIndex, 'password');
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                  maxLength={9}
                />
              </div>
            ) : (
              <span onClick={() => handleCellClick(rowIndex, 'password', item.password)}>
                {item.password ? '••••••••' : '-'}
              </span>
            )}
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<UserItem>({
      columnId: 'accessLevel',
      renderHeaderCell: () => <span>Access Level</span>,
      renderCell: (item: UserItem) => {
        const rowIndex = users.indexOf(item);
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'accessLevel';
        return (
          <TableCellLayout>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                <input
                  type="number"
                  className={styles.editInput}
                  value={editValue}
                  onChange={handleEditChange}
                  onBlur={() => handleSaveEdit(rowIndex, 'accessLevel')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(rowIndex, 'accessLevel');
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                  min={0}
                  max={255}
                />
              </div>
            ) : (
              <div onClick={() => handleCellClick(rowIndex, 'accessLevel', item.accessLevel || 0)}>
                <Badge appearance="filled" color={getAccessLevelColor(item.accessLevel || 0)}>
                  {item.accessLevel || 0}
                </Badge>
              </div>
            )}
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<UserItem>({
      columnId: 'panel',
      renderHeaderCell: () => <span>Panel</span>,
      renderCell: (item) => <TableCellLayout>{item.panel || '-'}</TableCellLayout>,
    }),
    createTableColumn<UserItem>({
      columnId: 'defaultPanel',
      renderHeaderCell: () => <span>Default Panel</span>,
      renderCell: (item) => <TableCellLayout>{item.defaultPanel || 0}</TableCellLayout>,
    }),
    createTableColumn<UserItem>({
      columnId: 'defaultGroup',
      renderHeaderCell: () => <span>Default Group</span>,
      renderCell: (item) => <TableCellLayout>{item.defaultGroup || 0}</TableCellLayout>,
    }),
    createTableColumn<UserItem>({
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

              {/* Blade Description */}
              {selectedDevice && (
                <div className={styles.bladeDescription}>
                  <span>
                    Showing user accounts for <b>{selectedDevice.nameShowOnTree} (SN: {selectedDevice.serialNumber})</b>.
                    {' '}Manage user access levels, passwords, and permissions.
                    {' '}<a href="#" onClick={(e) => { e.preventDefault(); }}>Learn more</a>
                  </span>
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
                </div>
              </div>

              <hr className={styles.overviewHr} />

              {/* Data Grid */}
              <div className={styles.dockingBody}>
                {loading ? (
                  <div className={styles.loading}>
                    <Spinner size="medium" label="Loading users..." />
                  </div>
                ) : users.length === 0 ? (
                  <div className={styles.noData}>
                    <Text>No users configured for this device.</Text>
                  </div>
                ) : (
                  <DataGrid
                    items={users}
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
                    <DataGridBody<UserItem>>
                      {({ item, rowId }) => (
                        <DataGridRow<UserItem> key={rowId}>
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

export { UsersPage };
