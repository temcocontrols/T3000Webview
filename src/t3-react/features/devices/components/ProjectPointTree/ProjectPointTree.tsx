/**
 * ProjectPointTree Component
 *
 * Renders Project Point View tree structure:
 * Point List → System List → Devices → Point Types (with capacity indicators)
 *
 * Matches C++ Project Point View (DLG_DIALOG_BUILDING_MANAGEMENT mode)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Tree,
  TreeItem,
  TreeItemLayout,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogTrigger,
  Button,
  Input,
  Popover,
  PopoverSurface,
} from '@fluentui/react-components';
import {
  BuildingRegular,
  Checkmark20Regular,
  CaretRight16Regular,
  CaretDown16Regular,
} from '@fluentui/react-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDeviceTreeStore } from '../../store/deviceTreeStore';
import type { DeviceInfo, DeviceStatus } from '../../../../shared/types/device';
import { TreeContextMenu } from '../TreeContextMenu/TreeContextMenu';
import styles from './ProjectPointTree.module.css';

/**
 * Title-case labels matching C++ project view
 */
const POINT_TYPE_LABELS: Record<string, string> = {
  inputs: 'Input',
  outputs: 'Output',
  variables: 'Variable',
  programs: 'Program',
  pidloops: 'PID',
  schedules: 'Schedule',
  holidays: 'Holiday',
  graphics: 'Graphic',
  trendlogs: 'Trendlog',
};

/**
 * Get SVG icon for point type (matches toolbar SVG icons)
 */
const getPointTypeIcon = (pointType: string) => {
  const svgMap: Record<string, string> = {
    inputs: 'inputs',
    outputs: 'outputs',
    variables: 'variables',
    programs: 'programs',
    pidloops: 'pidloops',
    schedules: 'schedules',
    holidays: 'holidays',
    graphics: 'graphics',
    trendlogs: 'trendlogs',
  };
  const name = svgMap[pointType] || 'inputs';
  return <img src={`/assets/t3icon/toolbar/${name}.svg`} className={styles.icon} alt={pointType} />;
};

/**
 * Map route to point type for selection
 */
const getPointTypeFromRoute = (pathname: string): string | null => {
  if (pathname.includes('/inputs')) return 'inputs';
  if (pathname.includes('/outputs')) return 'outputs';
  if (pathname.includes('/variables')) return 'variables';
  if (pathname.includes('/programs')) return 'programs';
  if (pathname.includes('/pidloops')) return 'pidloops';
  if (pathname.includes('/schedules')) return 'schedules';
  if (pathname.includes('/holidays')) return 'holidays';
  if (pathname.includes('/graphics')) return 'graphics';
  if (pathname.includes('/trendlogs')) return 'trendlogs';
  return null;
};

/**
 * Map point type to route for navigation
 */
const getRouteFromPointType = (pointType: string): string => {
  const routeMap: Record<string, string> = {
    'inputs': '/t3000/inputs',
    'outputs': '/t3000/outputs',
    'variables': '/t3000/variables',
    'programs': '/t3000/programs',
    'pidloops': '/t3000/pidloops',
    'schedules': '/t3000/schedules',
    'holidays': '/t3000/holidays',
    'graphics': '/t3000/graphics',
    'trendlogs': '/t3000/trendlogs',
  };
  return routeMap[pointType] || '/t3000/dashboard';
};

/**
 * Status icon component
 */
const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'online') {
    return <Checkmark20Regular className={styles.statusOnline} />;
  }
  // return <CircleFilled className={styles.statusOffline} />;
  return <></>;
};

/**
 * Device node with context menu (delete confirm + edit label), mirrors Equipment View
 */
const ProjectDeviceNode: React.FC<{
  node: any;
  level: number;
  selectedPointType: string | null;
  onNavigate: (pointType: string) => void;
  status: DeviceStatus;
}> = React.memo(
  ({ node, level, selectedPointType, onNavigate, status }) => {
    const {
      connectDevice,
      deleteDevice,
      updateDevice,
      checkDeviceStatus,
      fetchProjectPointTree,
      selectDevice,
      devices,
    } = useDeviceTreeStore();
    const selectedDevice = useDeviceTreeStore((s) => s.selectedDevice);

    const hasChildren = node.children && node.children.length > 0;

    const serialNumber = Number(node.serial_number) || 0;
    const isSelected = !!selectedDevice && selectedDevice.serialNumber === serialNumber;
    const realDevice = devices.find((d) => d.serialNumber === serialNumber);
    const deviceInfo: DeviceInfo = realDevice
      ? { ...realDevice, status }
      : {
          serialNumber,
          productName: node.name || '',
          nameShowOnTree: node.name || '',
          status,
          statusHistory: [],
          productClassId: null,
          productId: null,
          protocol: 'Native',
        };

    // Edit Label dialog state
    const [editOpen, setEditOpen] = useState(false);
    const [editValue, setEditValue] = useState('');

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<DeviceInfo | null>(null);
    const rowRef = useRef<HTMLDivElement>(null);

    const handleOpen = useCallback(() => {
      if (deviceInfo.serialNumber) {
        connectDevice(deviceInfo.serialNumber);
        console.log('Open device:', deviceInfo.serialNumber);
      }
    }, [connectDevice, deviceInfo.serialNumber]);

    const handleDelete = useCallback(() => {
      setDeleteTarget(deviceInfo);
    }, [deviceInfo]);

    const handleConfirmDelete = useCallback(async () => {
      if (!deleteTarget) return;
      setDeleteTarget(null);
      try {
        await deleteDevice(deleteTarget.serialNumber);
        await fetchProjectPointTree();
      } catch {
        // Error already surfaced by the store
      }
    }, [deleteTarget, deleteDevice, fetchProjectPointTree]);

    const handleCancelDelete = useCallback(() => {
      setDeleteTarget(null);
    }, []);

    const handleEdit = useCallback(() => {
      setEditValue(deviceInfo.nameShowOnTree || '');
      setEditOpen(true);
    }, [deviceInfo.nameShowOnTree]);

    const handleSaveLabel = useCallback(async () => {
      const newLabel = editValue.trim();
      if (newLabel && newLabel !== (deviceInfo.nameShowOnTree || '')) {
        try {
          await updateDevice(deviceInfo.serialNumber, { nameShowOnTree: newLabel });
          await fetchProjectPointTree();
        } catch {
          // Error already surfaced by the store
        }
      }
      setEditOpen(false);
    }, [editValue, deviceInfo, updateDevice, fetchProjectPointTree]);

    const handleCheckStatus = useCallback(() => {
      if (deviceInfo.serialNumber) {
        checkDeviceStatus(deviceInfo.serialNumber);
      }
    }, [checkDeviceStatus, deviceInfo.serialNumber]);

    const handlePointTypeNavigate = useCallback((pointType: string) => {
      // Select the device first so point-grid pages (Inputs, Outputs, ...)
      // load this device's data instead of a stale selection.
      if (deviceInfo.serialNumber) {
        selectDevice(deviceInfo);
      }
      onNavigate(pointType);
    }, [deviceInfo, selectDevice, onNavigate]);

    return (
      <>
        <TreeContextMenu
          device={deviceInfo}
          onOpen={handleOpen}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onCheckStatus={handleCheckStatus}
        >
          <div ref={rowRef} style={{ width: '100%', height: '100%' }}>
            <TreeItem itemType="branch" value={node.name}>
              <TreeItemLayout
                className={`${isSelected ? styles.treeItemSelected : styles.treeItemNormal} ${styles.nodeDevice} ${styles[`level${level}`] || ''}`}
                style={{ '--tree-level': level } as React.CSSProperties}
                iconBefore={<BuildingRegular style={{ color: '#605e5c', width: '20px', height: '20px' }} />}
                aside={<StatusIcon status={status} />}
              >
                {node.name}
              </TreeItemLayout>
              {hasChildren && (
                <Tree>
                  {node.children.map((child: any, index: number) => (
                    <ProjectTreeNode
                      key={`${child.name}-${index}`}
                      node={child}
                      level={level + 1}
                      selectedPointType={selectedPointType}
                      onNavigate={handlePointTypeNavigate}
                    />
                  ))}
                </Tree>
              )}
            </TreeItem>
          </div>
        </TreeContextMenu>

        {/* Delete confirmation (Fluent Popover, haystack style) */}
        <Popover
          open={!!deleteTarget}
          onOpenChange={(_e, data) => { if (!data.open) setDeleteTarget(null); }}
          positioning={{ target: rowRef.current, position: 'above', align: 'start' }}
        >
          <PopoverSurface style={{ maxWidth: 340, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Delete "{deleteTarget?.nameShowOnTree || deleteTarget?.productName || ''}"?
            </div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginBottom: 16 }}>
              This action cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={handleCancelDelete}>Cancel</Button>
              <Button size="small" appearance="primary" style={{ background: '#d32f2f' }} onClick={handleConfirmDelete}>Delete</Button>
            </div>
          </PopoverSurface>
        </Popover>

        {/* Edit Label dialog */}
        <Dialog open={editOpen} onOpenChange={(_e, data) => setEditOpen(data.open)}>
          <DialogSurface style={{ width: 360, maxWidth: 'calc(100vw - 32px)', fontSize: 12 }}>
            <DialogBody style={{ fontSize: 12, margin: -5 }}>
              <DialogTitle style={{ fontSize: 13 }}>Edit Label</DialogTitle>
              <DialogContent style={{ fontSize: 12, marginTop: -12 }}>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.currentTarget.value)}
                  placeholder="Device label"
                  style={{ width: '100%', marginTop: 12, fontSize: 12 }}
                />
              </DialogContent>
              <DialogActions style={{ marginTop: 12, fontSize: 12 }}>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="secondary" size="medium" style={{ fontSize: 12, fontWeight: 500 }}>Cancel</Button>
                </DialogTrigger>
                <Button appearance="primary" size="medium" onClick={handleSaveLabel} disabled={!editValue.trim()} style={{ fontSize: 12, fontWeight: 500 }}>
                  Save
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </>
    );
  }
);

ProjectDeviceNode.displayName = 'ProjectDeviceNode';

/**
 * Recursive tree node renderer for Project Point View
 */
const ProjectTreeNode: React.FC<{
  node: any;
  level: number;
  selectedPointType: string | null;
  onNavigate: (pointType: string) => void;
}> = React.memo(
  ({ node, level, selectedPointType, onNavigate }) => {
    const showOfflineDevices = useDeviceTreeStore((s) => s.showOfflineDevices);
    const toggleShowOfflineDevices = useDeviceTreeStore((s) => s.toggleShowOfflineDevices);
    const storeDevices = useDeviceTreeStore((s) => s.devices);
    const deviceStatuses = useDeviceTreeStore((s) => s.deviceStatuses);
    const hasChildren = node.children && node.children.length > 0;

    // Point type node — uppercase label, aligned count, no percent bar
    if (node.node_type === 'point_type') {
      const isSelected = node.point_type === selectedPointType;
      const label = POINT_TYPE_LABELS[node.point_type] || node.name;
      const used = node.used ?? 0;
      const total = node.total ?? 0;

      const handleClick = () => {
        if (node.point_type) {
          onNavigate(node.point_type);
        }
      };

      return (
        <TreeItem itemType="leaf" value={node.name}>
          <TreeItemLayout
            className={`${isSelected ? styles.treeItemSelected : styles.treeItemNormal} ${styles.nodePointType} ${styles[`level${level}`] || ''}`}
            style={{ '--tree-level': level, cursor: 'pointer' } as React.CSSProperties}
            onClick={handleClick}
          >
            {getPointTypeIcon(node.point_type)}
            <span className={styles.pointTypeLabel}>{label}</span>
            <span className={styles.pointTypeCount}>({used}/{total})</span>
          </TreeItemLayout>
        </TreeItem>
      );
    }

    // System node — skip "System List"; split devices into online (top) and an
    // offline group (collapsible, hidden by default). Sub-devices (parent serial)
    // and online status are resolved from the store, mirroring Equipment View.
    if (node.node_type === 'system') {
      const storeDevicesBySerial = new Map(storeDevices.map((d) => [d.serialNumber, d]));
      const isSubDevice = (d: DeviceInfo) => Number(d.parentSerialNumber ?? d.noteParentSerialNumber ?? 0) > 0;
      const statusOf = (d: any): DeviceStatus => {
        const serial = Number(d.serial_number) || 0;
        return deviceStatuses.get(serial) ?? (d.status === 'online' ? 'online' : 'offline');
      };

      const validDevices: any[] = (node.children || []).filter((d: any) => {
        if (d.node_type !== 'device') return false;
        const name = d.name || '';
        if (!name || name.toLowerCase().includes('unknown') || name.startsWith('Device ')) {
          return false;
        }
        const serial = Number(d.serial_number) || 0;
        const info = storeDevicesBySerial.get(serial);
        return !(info && isSubDevice(info));
      });

      const onlineDevices = validDevices.filter((d) => statusOf(d) === 'online');
      const offlineDevices = validDevices.filter((d) => statusOf(d) !== 'online');

      return (
        <>
          {onlineDevices.map((child, index) => (
            <ProjectDeviceNode
              key={`${child.name}-${index}`}
              node={child}
              level={level + 1}
              selectedPointType={selectedPointType}
              onNavigate={onNavigate}
              status={statusOf(child)}
            />
          ))}

          {offlineDevices.length > 0 && (
            <>
              <TreeItem itemType="leaf" value="offline-group">
                <TreeItemLayout
                  onClick={toggleShowOfflineDevices}
                  selector={null}
                  iconBefore={
                    showOfflineDevices
                      ? <CaretDown16Regular style={{ color: '#0078d4', width: '16px', height: '16px' }} />
                      : <CaretRight16Regular style={{ color: '#0078d4', width: '16px', height: '16px' }} />
                  }
                  className={`${styles.treeItemNormal} ${styles.offlineGroupItem}`}
                  style={{ '--tree-level': level + 1 } as React.CSSProperties}
                >
                  {showOfflineDevices
                    ? 'Hide offline devices'
                    : `Show ${offlineDevices.length} more offline`}
                </TreeItemLayout>
              </TreeItem>

              {showOfflineDevices && offlineDevices.map((child, index) => (
                <ProjectDeviceNode
                  key={`${child.name}-off-${index}`}
                  node={child}
                  level={level + 1}
                  selectedPointType={selectedPointType}
                  onNavigate={onNavigate}
                  status={statusOf(child)}
                />
              ))}
            </>
          )}
        </>
      );
    }

    // Root node (Point List)
    return (
      <TreeItem itemType="branch" value={node.name}>
        <TreeItemLayout
          className={`${styles.treeItemNormal} ${styles.nodeRoot} ${styles[`level${level}`] || ''}`}
          style={{ '--tree-level': level } as React.CSSProperties}
        >
          {node.name}
        </TreeItemLayout>
        {hasChildren && (
          <Tree>
            {node.children.map((child: any, index: number) => (
              <ProjectTreeNode
                key={`${child.name}-${index}`}
                node={child}
                level={level + 1}
                selectedPointType={selectedPointType}
                onNavigate={onNavigate}
              />
            ))}
          </Tree>
        )}
      </TreeItem>
    );
  }
);

/**
 * ProjectPointTree Component
 */
export const ProjectPointTree: React.FC = () => {
  const { projectTreeData, projectTreeLoading, projectTreeError, fetchProjectPointTree } = useDeviceTreeStore();
  const [openItems, setOpenItems] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const selectedPointType = getPointTypeFromRoute(location.pathname);

  const handleNavigate = (pointType: string) => {
    const route = getRouteFromPointType(pointType);
    navigate(route);
  };

  useEffect(() => {
    if (!projectTreeData && !projectTreeLoading) {
      fetchProjectPointTree();
    }
  }, [projectTreeData, projectTreeLoading]);

  // Auto-expand the selected device (or the first device) when tree data loads.
  // Only root + selected device are expanded, so all other device branches stay collapsed.
  useEffect(() => {
    if (projectTreeData && openItems.length === 0) {
      const itemsToExpand: string[] = [projectTreeData.name];

      // Flatten: skip "System List" → go directly to devices
      const children = projectTreeData.children || [];
      const systemList = children.find((c: any) => c.node_type === 'system');
      const deviceChildren = systemList?.children || children;
      const validDevices = deviceChildren.filter(
        (d: any) => {
          const name = d.name || '';
          return d.node_type === 'device' && name && !name.toLowerCase().includes('unknown') && !name.startsWith('Device ');
        }
      );

      if (validDevices.length > 0) {
        const { selectedDevice } = useDeviceTreeStore.getState();
        const selected = selectedDevice
          ? validDevices.find((d: any) => Number(d.serial_number) === selectedDevice.serialNumber)
          : null;
        const target = selected || validDevices[0];
        itemsToExpand.push(target.name);
      }

      setOpenItems(itemsToExpand);
    }
  }, [projectTreeData, openItems.length]);

  if (projectTreeLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>Loading...</div>
      </div>
    );
  }

  if (projectTreeError) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorTitle}>Failed to load project tree</div>
        <div className={styles.errorMessage}>{projectTreeError}</div>
      </div>
    );
  }

  if (!projectTreeData) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIcon}>📊</div>
        <div className={styles.emptyTitle}>No Project Data</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Tree
        openItems={openItems}
        onOpenChange={(_, data) => setOpenItems(data.openItems as string[])}
      >
        <ProjectTreeNode
          node={projectTreeData}
          level={0}
          selectedPointType={selectedPointType}
          onNavigate={handleNavigate}
        />
      </Tree>
    </div>
  );
};

export default ProjectPointTree;
