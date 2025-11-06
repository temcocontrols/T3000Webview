/**
 * useTreeNavigation Hook
 *
 * Provides tree navigation functionality
 * Wraps treeStore with convenient helpers
 */

import { useCallback } from 'react';
import { useTreeStore, treeSelectors } from '@t3-react/store';
import type { TreeNode } from '@common/types/tree';

export function useTreeNavigation() {
  // State selectors
  const treeData = useTreeStore(treeSelectors.treeData);
  const selectedNodeId = useTreeStore(treeSelectors.selectedNodeId);
  const expandedNodes = useTreeStore(treeSelectors.expandedNodes);
  const isLoading = useTreeStore(treeSelectors.isLoading);
  const error = useTreeStore(treeSelectors.error);

  // Actions - Node expansion
  const expandNode = useTreeStore((state) => state.expandNode);
  const collapseNode = useTreeStore((state) => state.collapseNode);
  const toggleNode = useTreeStore((state) => state.toggleNode);
  const expandAll = useTreeStore((state) => state.expandAll);
  const collapseAll = useTreeStore((state) => state.collapseAll);

  // Actions - Node selection
  const selectNode = useTreeStore((state) => state.selectNode);
  const getSelectedNode = useTreeStore((state) => state.getSelectedNode);

  // Actions - Tree management
  const loadTree = useTreeStore((state) => state.loadTree);
  const refreshTree = useTreeStore((state) => state.refreshTree);
  const updateNode = useTreeStore((state) => state.updateNode);
  const addNode = useTreeStore((state) => state.addNode);
  const removeNode = useTreeStore((state) => state.removeNode);

  // Utilities
  const findNode = useTreeStore((state) => state.findNode);
  const getNodePath = useTreeStore((state) => state.getNodePath);
  const isExpanded = useTreeStore((state) => state.isExpanded);
  const hasChildren = useTreeStore((state) => state.hasChildren);

  // Helper functions
  const isNodeSelected = useCallback(
    (nodeId: string) => selectedNodeId === nodeId,
    [selectedNodeId]
  );

  const selectAndExpand = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      expandNode(nodeId);

      // Expand all parent nodes to make selected node visible
      const path = getNodePath(nodeId);
      path.forEach((node) => {
        expandNode(String(node.id));
      });
    },
    [selectNode, expandNode, getNodePath]
  );

  const collapseAndDeselect = useCallback(
    (nodeId: string) => {
      collapseNode(nodeId);
      if (selectedNodeId === nodeId) {
        selectNode(null);
      }
    },
    [collapseNode, selectNode, selectedNodeId]
  );

  const getExpandedNodeIds = useCallback(() => {
    return Array.from(expandedNodes);
  }, [expandedNodes]);

  const expandMultiple = useCallback(
    (nodeIds: string[]) => {
      nodeIds.forEach((id) => expandNode(id));
    },
    [expandNode]
  );

  const collapseMultiple = useCallback(
    (nodeIds: string[]) => {
      nodeIds.forEach((id) => collapseNode(id));
    },
    [collapseNode]
  );

  // Tree traversal helpers
  const findNodeByLabel = useCallback(
    (label: string): TreeNode | null => {
      const searchTree = (nodes: TreeNode[]): TreeNode | null => {
        for (const node of nodes) {
          if (node.label.toLowerCase().includes(label.toLowerCase())) {
            return node;
          }
          if (node.children) {
            const found = searchTree(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      return searchTree(treeData);
    },
    [treeData]
  );

  const getAllNodes = useCallback((): TreeNode[] => {
    const nodes: TreeNode[] = [];
    const traverse = (nodeList: TreeNode[]) => {
      nodeList.forEach((node) => {
        nodes.push(node);
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(treeData);
    return nodes;
  }, [treeData]);

  const getNodeDepth = useCallback(
    (nodeId: string): number => {
      const path = getNodePath(nodeId);
      return path.length - 1;
    },
    [getNodePath]
  );

  return {
    // State
    treeData,
    selectedNodeId,
    expandedNodes,
    isLoading,
    error,

    // Node expansion
    expandNode,
    collapseNode,
    toggleNode,
    expandAll,
    collapseAll,
    expandMultiple,
    collapseMultiple,

    // Node selection
    selectNode,
    selectAndExpand,
    getSelectedNode,
    isNodeSelected,
    collapseAndDeselect,

    // Tree management
    loadTree,
    refreshTree,
    updateNode,
    addNode,
    removeNode,

    // Utilities
    findNode,
    findNodeByLabel,
    getNodePath,
    getNodeDepth,
    isExpanded,
    hasChildren,
    getExpandedNodeIds,
    getAllNodes,
  };
}
