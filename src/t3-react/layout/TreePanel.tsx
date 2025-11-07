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
  tokens,
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

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  header: {
    padding: '12px',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  treeContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
  },
  statusIndicator: {
    width: '8px',
    height: '8px',
    marginRight: '8px',
  },
  onlineStatus: {
    color: tokens.colorPaletteGreenForeground1,
  },
  offlineStatus: {
    color: tokens.colorPaletteRedForeground1,
  },
});

export const TreePanel: React.FC = () => {
  const styles = useStyles();

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

  // Handle node expand/collapse
  const handleNodeToggle = (node: TreeNode) => {
    const nodeId = String(node.id);
    if (isExpanded(nodeId)) {
      collapseNode(nodeId);
    } else {
      expandNode(nodeId);
    }
  };

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
    if (node.type === 'building' || node.type === 'group') {
      icon = expanded ? <FolderOpenRegular /> : <FolderRegular />;
    } else {
      icon = <DesktopRegular />;
    }

    return (
      <TreeItem
        key={nodeId}
        itemType={hasChildren ? 'branch' : 'leaf'}
        value={nodeId}
        aria-selected={selected}
      >
        <TreeItemLayout
          onClick={() => handleNodeClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          iconBefore={icon}
          iconAfter={
            node.type === 'device' && (
              <CircleFilled
                className={`${styles.statusIndicator} ${
                  node.online ? styles.onlineStatus : styles.offlineStatus
                }`}
              />
            )
          }
        >
          {node.label}
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
