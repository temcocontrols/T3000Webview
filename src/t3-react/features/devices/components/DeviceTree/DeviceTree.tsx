/**
 * DeviceTree Component
 *
 * Renders hierarchical device tree using Fluent UI Tree components
 * Maps to C++ CImageTreeCtrl class
 *
 * C++ Reference (LEFT_PANEL_CPP_DESIGN.md Section 4):
 * - CImageTreeCtrl DeviceTree component
 * - InsertItem() TreeItem rendering
 * - SetItemImage() Icon component
 * - OnSelChanged() onOpenChange handler
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Tree,
  TreeItem,
  TreeItemLayout,
} from '@fluentui/react-components';
import {
  Checkmark20Regular,
  Dismiss20Regular,
  Info20Regular,
  Warning20Regular,
  Desktop20Regular,
} from '@fluentui/react-icons';
import type { TreeNode } from '../../../../shared/types/device';
import { useDeviceTreeStore } from '../../store/deviceTreeStore';
import { TreeContextMenu } from '../TreeContextMenu/TreeContextMenu';
import styles from './DeviceTree.module.css';

const renderDetailValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }
  return String(value);
};

const DeviceDetailsTooltip: React.FC<{ device: NonNullable<TreeNode['data']> }> = ({ device }) => (
  <div className={styles.deviceInfoTooltip}>
    <div className={styles.deviceInfoRow}><span>Panel Name:</span> <strong>{renderDetailValue(device.nameShowOnTree || device.productName)}</strong></div>
    <div className={styles.deviceInfoRow}><span>Product Type:</span> <strong>{renderDetailValue(device.productName)}</strong></div>
    <div className={styles.deviceInfoRow}><span>Serial Number:</span> <strong>{renderDetailValue(device.serialNumber)}</strong></div>
    <div className={styles.deviceInfoRow}><span>Panel Number:</span> <strong>{renderDetailValue(device.panelId ?? device.panelNumber)}</strong></div>
    <div className={styles.deviceInfoSpacer} />
    <div className={styles.deviceInfoRow}><span>BACnet Object Instance:</span> <strong>{renderDetailValue(device.objectInstance)}</strong></div>
    <div className={styles.deviceInfoRow}><span>BACnet MSTP Mac ID:</span> <strong>{renderDetailValue(device.bacnetMstpMacId)}</strong></div>
    <div className={styles.deviceInfoSpacer} />
    <div className={styles.deviceInfoRow}><span>IP address:</span> <strong>{renderDetailValue(device.ipAddress)}</strong></div>
    <div className={styles.deviceInfoRow}><span>Port:</span> <strong>{renderDetailValue(device.port ?? device.modbusPort ?? device.bacnetIpPort)}</strong></div>
    <div className={styles.deviceInfoRow}><span>Modbus ID:</span> <strong>{renderDetailValue(device.modbusAddress)}</strong></div>
    <div className={styles.deviceInfoRow}><span>PC IP address:</span> <strong>{renderDetailValue(device.pcIpAddress)}</strong></div>
  </div>
);

/**
 * Status icon component - Azure Portal style
 */
const StatusIcon: React.FC<{ status: 'online' | 'offline' | 'unknown'; isSelected?: boolean; isUnknownDevice?: boolean }> = ({ status, isSelected, isUnknownDevice }) => {
  const iconStyle = {
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const color = isSelected ? '#0078d4' : undefined;
  const warningColor = isUnknownDevice ? '#d29200' : undefined;

  if (isUnknownDevice) {
    return <Info20Regular style={{ ...iconStyle, color: warningColor || '#d29200' }} />;
  }

  switch (status) {
    case 'online':
      return <Checkmark20Regular style={{ ...iconStyle, color: color || '#107C10' }} />;
    case 'offline':
      return <Dismiss20Regular style={{ ...iconStyle, color: color || '#a80000' }} />;
    default:
      return <Info20Regular style={{ ...iconStyle, color: color || '#0f6cbd' }} />;
  }
};

/**
 * Recursive tree node renderer
 */
const TreeNodeItem: React.FC<{ node: TreeNode; level: number }> = React.memo(({ node, level }) => {
  const {
    selectedNodeId,
    expandNode,
    collapseNode,
    selectNode,
    deleteDevice,
    updateDevice,
    checkDeviceStatus,
    connectDevice,
  } = useDeviceTreeStore();

  const handleOpenChange = useCallback(
    (_event: unknown, data: { open: boolean }) => {
      if (data.open) {
        expandNode(node.id);
      } else {
        collapseNode(node.id);
      }
    },
    [node.id, expandNode, collapseNode]
  );

  const handleClick = useCallback(() => {
    selectNode(node.id);
  }, [node.id, selectNode]);

  // Context menu handlers
  const handleOpen = useCallback((device: typeof node.data) => {
    if (device) {
      connectDevice(device.serialNumber);
      // TODO: Navigate to device detail view
      console.log('Open device:', device.serialNumber);
    }
  }, [connectDevice]);

  const handleDelete = useCallback((device: typeof node.data) => {
    if (device && window.confirm(`Delete device ${device.nameShowOnTree}?`)) {
      deleteDevice(device.serialNumber);
    }
  }, [deleteDevice]);

  const handleEdit = useCallback((device: typeof node.data) => {
    if (device) {
      const newLabel = window.prompt('Enter new label:', device.nameShowOnTree);
      if (newLabel && newLabel !== device.nameShowOnTree) {
        updateDevice(device.serialNumber, { nameShowOnTree: newLabel });
      }
    }
  }, [updateDevice]);

  const handleCheckStatus = useCallback((device: typeof node.data) => {
    if (device) {
      checkDeviceStatus(device.serialNumber);
    }
  }, [checkDeviceStatus]);

  const isSelected = selectedNodeId === node.id;
  const hasDeviceInfo = !!node.data;
  const isUnknownDevice = node.data?.productName === '(Unknown)';

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsPos, setDetailsPos] = useState<{ top: number; left: number } | null>(null);
  const detailsCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const openDetailsPopover = useCallback((e: React.MouseEvent) => {
    if (!hasDeviceInfo) return;
    if (detailsCloseTimerRef.current) {
      clearTimeout(detailsCloseTimerRef.current);
      detailsCloseTimerRef.current = null;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const panelWidth = 320;
    const left = Math.max(rect.right + 6, rect.right + 6);
    const clampedLeft = Math.min(left, window.innerWidth - panelWidth - 8);
    setDetailsPos({
      top: rect.top,
      left: clampedLeft,
    });
    setDetailsOpen(true);
  }, [hasDeviceInfo]);

  const closeDetailsPopover = useCallback(() => {
    if (detailsCloseTimerRef.current) clearTimeout(detailsCloseTimerRef.current);
    detailsCloseTimerRef.current = setTimeout(() => setDetailsOpen(false), 150);
  }, []);

  const keepDetailsOpen = useCallback(() => {
    if (detailsCloseTimerRef.current) {
      clearTimeout(detailsCloseTimerRef.current);
      detailsCloseTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (detailsCloseTimerRef.current) clearTimeout(detailsCloseTimerRef.current);
    };
  }, []);

  // Show info icon for ALL selected devices with data; online/offline keep their status icon too
  const asideContent = isSelected ? (
    <span className={styles.deviceInfoIcon}>
      <StatusIcon status={node.status ?? 'unknown'} isSelected={isSelected} isUnknownDevice={isUnknownDevice} />
    </span>
  ) : undefined;

  // Building/subnet node
  if (node.type === 'building' && node.children) {
    return (
      <TreeItem
        itemType="branch"
        value={node.id}
        open={node.expanded}
        onOpenChange={handleOpenChange}
      >
        <TreeItemLayout
          onClick={handleClick}
          className={isSelected ? styles.treeItemSelected : styles.treeItemNormal}
          style={{ '--tree-level': level } as React.CSSProperties}
        >
          {node.label}
        </TreeItemLayout>
        <Tree>
          {node.children.map((child) => (
            <TreeNodeItem key={child.id} node={child} level={level + 1} />
          ))}
        </Tree>
      </TreeItem>
    );
  }

  // Device leaf node with context menu
  return (
    <>
      <TreeContextMenu
        device={node.data || null}
        onOpen={handleOpen}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onCheckStatus={handleCheckStatus}
      >
        {/* Row wrapper — hover here to show device details popover */}
        <div
          ref={rowRef}
          className={styles.deviceRowWrapper}
          onMouseEnter={isSelected && hasDeviceInfo ? openDetailsPopover : undefined}
          onMouseLeave={isSelected && hasDeviceInfo ? closeDetailsPopover : undefined}
        >
          <TreeItem
            itemType="leaf"
            value={node.id}
          >
            <TreeItemLayout
              onClick={handleClick}
              iconBefore={<Desktop20Regular style={{ color: '#605e5c', width: '16px', height: '16px' }} />}
              aside={asideContent}
              className={isSelected ? styles.treeItemSelected : styles.treeItemNormal}
              style={{ '--tree-level': level } as React.CSSProperties}
            >
              {node.label}
            </TreeItemLayout>
          </TreeItem>
        </div>
      </TreeContextMenu>

      {detailsOpen && detailsPos && isSelected && hasDeviceInfo && createPortal(
        <div
          className={styles.deviceInfoPopover}
          style={{ top: `${detailsPos.top}px`, left: `${detailsPos.left}px` }}
          onMouseEnter={keepDetailsOpen}
          onMouseLeave={closeDetailsPopover}
        >
          <DeviceDetailsTooltip device={node.data!} />
        </div>,
        document.body
      )}
    </>
  );
});

TreeNodeItem.displayName = 'TreeNodeItem';

/**
 * Main DeviceTree Component
 */
export const DeviceTree: React.FC = () => {
  const { treeData } = useDeviceTreeStore();

  if (!treeData || treeData.length === 0) {
    return (
      <div className={styles.emptyState}>
        No devices found
      </div>
    );
  }

  return (
    <Tree aria-label="Device Tree" style={{ width: '100%', height: '100%' }}>
      {treeData.map((node) => (
        <TreeNodeItem key={node.id} node={node} level={0} />
      ))}
    </Tree>
  );
};

export default DeviceTree;
