/**
 * TreePanel Component
 *
 * Left navigation panel with device tree
 * Features:
 * - Hierarchical tree view
 * - Expand/collapse nodes
 * - Node selection
 * - Context menu support
 * - Device online/offline status
 */

import React, { useEffect } from 'react';
import {
  Tree,
  TreeItem,
  TreeItemLayout,
  makeStyles,
  Spinner,
} from '@fluentui/react-components';
import {
  FolderRegular,
  FolderOpenRegular,
  DesktopRegular,
  CircleFilled,
} from '@fluentui/react-icons';
import { useTreeNavigation, useContextMenu, useDeviceData } from '@t3-react/hooks';
import type { TreeNode } from '@common/react/types/tree';
import { useTheme } from '@t3-react/theme';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'var(--t3-color-sidebar-background)',
    borderRight: '1px solid var(--t3-color-sidebar-border)',
  },
  header: {
    padding: '16px',
    fontWeight: 'var(--t3-font-weight-semibold)',
    fontSize: 'var(--t3-font-size-body)',
    color: 'var(--t3-color-sidebar-text)',
    borderBottom: '1px solid var(--t3-color-sidebar-border)',
  },
  treeContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
    color: 'var(--t3-color-sidebar-text)',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
  },
  treeItem: {
    color: 'var(--t3-color-sidebar-text)',
    '&:hover': {
      backgroundColor: 'var(--t3-color-sidebar-hover)',
    },
  },
  treeItemSelected: {
    backgroundColor: 'var(--t3-color-sidebar-selected)',
    borderLeft: '3px solid var(--t3-color-primary)',
    paddingLeft: '5px',
  },
  statusIndicator: {
    width: '8px',
    height: '8px',
    marginLeft: '8px',
  },
  onlineStatus: {
    color: 'var(--t3-color-success)',
  },
  offlineStatus: {
    color: 'var(--t3-color-error)',
  },
});

export const TreePanel: React.FC = () => {
  const styles = useStyles();
  const { theme } = useTheme();

  const {
    treeData,
    isLoading,
    loadTree,
    selectNode,
    expandNode,
    collapseNode,
    isExpanded,
    isNodeSelected,
  } = useTreeNavigation();

  const { showContextMenu } = useContextMenu();
  const { selectDeviceById } = useDeviceData();

  // Load tree on mount
  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Handle node click
  const handleNodeClick = (node: TreeNode) => {
    selectNode(String(node.id));

    // If it's a device node, update selected device
    if (node.type === 'device') {
      selectDeviceById(node.id);
    }
  };

  // Handle node expand/collapse (currently handled by Tree component automatically)
  // Keeping for future custom expansion logic if needed
  // const handleNodeToggle = (node: TreeNode) => {
  //   const nodeId = String(node.id);
  //   if (isExpanded(nodeId)) {
  //     collapseNode(nodeId);
  //   } else {
  //     expandNode(nodeId);
  //   }
  // };

  // Handle context menu
  const handleContextMenu = (event: React.MouseEvent, node: TreeNode) => {
    event.preventDefault();

    // Determine context menu type based on node type
    const menuType = node.type === 'building' ? 'building' : 'device';
    showContextMenu(event, menuType, node);
  };

  // Render tree node
  const renderNode = (node: TreeNode): React.ReactNode => {
    const nodeId = String(node.id);
    const expanded = isExpanded(nodeId);
    const selected = isNodeSelected(nodeId);
    const hasChildren = node.children && node.children.length > 0;

    // Icon based on node type and state
    let icon: React.ReactElement;
    if (node.type === 'building' || node.type === 'root' || node.type === 'floor') {
      icon = expanded ? <FolderOpenRegular /> : <FolderRegular />;
    } else {
      icon = <DesktopRegular />;
    }

    // Device online status (if applicable)
    const deviceOnline = (node as any).online; // Use type assertion for optional property

    return (
      <TreeItem
        key={nodeId}
        itemType={hasChildren ? 'branch' : 'leaf'}
        value={nodeId}
        aria-selected={selected}
        className={`${styles.treeItem} ${selected ? styles.treeItemSelected : ''}`}
      >
        <TreeItemLayout
          onClick={() => handleNodeClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          iconBefore={icon}
          iconAfter={
            node.type === 'device' && deviceOnline !== undefined ? (
              <CircleFilled
                className={`${styles.statusIndicator} ${
                  deviceOnline ? styles.onlineStatus : styles.offlineStatus
                }`}
              />
            ) : null
          }
        >
          {(node as any).label || node.name}
        </TreeItemLayout>

        {hasChildren && expanded && (
          <Tree>
            {node.children!.map((child) => renderNode(child))}
          </Tree>
        )}
      </TreeItem>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>Building Tree</div>

      <div className={styles.treeContainer}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <Spinner label="Loading tree..." />
          </div>
        ) : (
          <Tree>
            {treeData.map((node) => renderNode(node))}
          </Tree>
        )}
      </div>
    </div>
  );
};
