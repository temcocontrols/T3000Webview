/**
 * DeviceTree Component
 *
 * Renders hierarchical device tree using Fluent UI Tree components
 * Maps to C++ CImageTreeCtrl class
 *
 * C++ Reference (LEFT_PANEL_CPP_DESIGN.md Section 4):
 * - CImageTreeCtrl �?DeviceTree component
 * - InsertItem() �?TreeItem rendering
 * - SetItemImage() �?Icon component
 * - OnSelChanged() �?onOpenChange handler
 */

import React, { useCallback } from 'react';
import {
  Tree,
  TreeItem,
  TreeItemLayout,
} from '@fluentui/react-components';
import {
  Checkmark20Regular,
  Dismiss20Regular,
  QuestionCircle20Regular,
} from '@fluentui/react-icons';
import type { TreeNode } from '../../../../types/device';
import { useDeviceTreeStore } from '../../store/deviceTreeStore';
import { TreeContextMenu } from '../TreeContextMenu/TreeContextMenu';
import styles from './DeviceTree.module.css';

/**
 * Status icon component - Azure Portal style
 */
const StatusIcon: React.FC<{ status: 'online' | 'offline' | 'unknown' }> = ({ status }) => {
  const iconStyle = {
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  switch (status) {
    case 'online':
      return <Checkmark20Regular style={{ ...iconStyle, color: '#107C10' }} />;
    case 'offline':
      return <Dismiss20Regular style={{ ...iconStyle, color: '#a80000' }} />;
    default:
      return <QuestionCircle20Regular style={{ ...iconStyle, color: '#605e5c' }} />;
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

  // Building/subnet node
  if (node.type === 'building' && node.children) {
    return (
      <TreeItem
        itemType="branch"
        value={node.id}
        open={node.expanded}
        onOpenChange={handleOpenChange}
        style={{ paddingLeft: `${level * 20}px` }}
      >
        <TreeItemLayout
          onClick={handleClick}
          className={isSelected ? styles.treeItemSelected : styles.treeItemNormal}
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
    <TreeContextMenu
      device={node.data || null}
      onOpen={handleOpen}
      onDelete={handleDelete}
      onEdit={handleEdit}
      onCheckStatus={handleCheckStatus}
    >
      <TreeItem
        itemType="leaf"
        value={node.id}
        style={{ paddingLeft: `${level * 20}px` }}
      >
        <TreeItemLayout
          onClick={handleClick}
          aside={node.status ? <StatusIcon status={node.status} /> : undefined}
          className={isSelected ? styles.treeItemSelected : styles.treeItemNormal}
        >
          {node.label}
        </TreeItemLayout>
      </TreeItem>
    </TreeContextMenu>
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
