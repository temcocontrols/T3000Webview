/**
 * Tree Store - Manages left panel tree navigation state
 * 
 * Responsibilities:
 * - Tree data structure
 * - Expanded/collapsed nodes
 * - Selected node tracking
 * - Tree loading and updates
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { TreeNode } from '@common/types/tree';
import { networkApi } from '@common/api/network';

interface TreeState {
  // State
  treeData: TreeNode[];
  expandedNodes: Set<string>;
  selectedNodeId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Node expansion
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  toggleNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  
  // Node selection
  selectNode: (nodeId: string | null) => void;
  getSelectedNode: () => TreeNode | null;
  
  // Tree management
  loadTree: () => Promise<void>;
  refreshTree: () => Promise<void>;
  updateNode: (nodeId: string, updates: Partial<TreeNode>) => void;
  addNode: (parentId: string, node: TreeNode) => void;
  removeNode: (nodeId: string) => void;
  
  // Utilities
  findNode: (nodeId: string) => TreeNode | null;
  getNodePath: (nodeId: string) => TreeNode[];
  isExpanded: (nodeId: string) => boolean;
  hasChildren: (nodeId: string) => boolean;
  reset: () => void;
}

const initialState = {
  treeData: [],
  expandedNodes: new Set<string>(),
  selectedNodeId: null,
  isLoading: false,
  error: null,
};

export const useTreeStore = create<TreeState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Node expansion
      expandNode: (nodeId) => {
        set((state) => {
          const newExpanded = new Set(state.expandedNodes);
          newExpanded.add(nodeId);
          return { expandedNodes: newExpanded };
        });
      },

      collapseNode: (nodeId) => {
        set((state) => {
          const newExpanded = new Set(state.expandedNodes);
          newExpanded.delete(nodeId);
          return { expandedNodes: newExpanded };
        });
      },

      toggleNode: (nodeId) => {
        const isExpanded = get().expandedNodes.has(nodeId);
        if (isExpanded) {
          get().collapseNode(nodeId);
        } else {
          get().expandNode(nodeId);
        }
      },

      expandAll: () => {
        const getAllNodeIds = (nodes: TreeNode[]): string[] => {
          return nodes.flatMap((node) => [
            String(node.id),
            ...(node.children ? getAllNodeIds(node.children) : []),
          ]);
        };
        
        const allIds = getAllNodeIds(get().treeData);
        set({ expandedNodes: new Set(allIds) });
      },

      collapseAll: () => {
        set({ expandedNodes: new Set() });
      },

      // Node selection
      selectNode: (nodeId) => {
        set({ selectedNodeId: nodeId });
      },

      getSelectedNode: () => {
        const { selectedNodeId, findNode } = get();
        return selectedNodeId ? findNode(selectedNodeId) : null;
      },

      // Tree management
      loadTree: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await networkApi.getNetworkTree();
          set({ 
            treeData: response.data,
            isLoading: false,
            error: null 
          });
        } catch (error) {
          set({ 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load tree'
          });
        }
      },

      refreshTree: async () => {
        const { expandedNodes, selectedNodeId } = get();
        await get().loadTree();
        // Restore expanded and selected state after refresh
        set({ expandedNodes, selectedNodeId });
      },

      updateNode: (nodeId, updates) => {
        const updateNodeRecursive = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.map((node) => {
            if (String(node.id) === nodeId) {
              return { ...node, ...updates };
            }
            if (node.children) {
              return { ...node, children: updateNodeRecursive(node.children) };
            }
            return node;
          });
        };

        set((state) => ({
          treeData: updateNodeRecursive(state.treeData),
        }));
      },

      addNode: (parentId, node) => {
        const addNodeRecursive = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.map((n) => {
            if (String(n.id) === parentId) {
              return {
                ...n,
                children: [...(n.children || []), node],
              };
            }
            if (n.children) {
              return { ...n, children: addNodeRecursive(n.children) };
            }
            return n;
          });
        };

        set((state) => ({
          treeData: addNodeRecursive(state.treeData),
        }));
      },

      removeNode: (nodeId) => {
        const removeNodeRecursive = (nodes: TreeNode[]): TreeNode[] => {
          return nodes
            .filter((n) => String(n.id) !== nodeId)
            .map((n) => ({
              ...n,
              children: n.children ? removeNodeRecursive(n.children) : undefined,
            }));
        };

        set((state) => ({
          treeData: removeNodeRecursive(state.treeData),
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        }));
      },

      // Utilities
      findNode: (nodeId) => {
        const findNodeRecursive = (nodes: TreeNode[]): TreeNode | null => {
          for (const node of nodes) {
            if (String(node.id) === nodeId) return node;
            if (node.children) {
              const found = findNodeRecursive(node.children);
              if (found) return found;
            }
          }
          return null;
        };

        return findNodeRecursive(get().treeData);
      },

      getNodePath: (nodeId) => {
        const path: TreeNode[] = [];
        const findPath = (nodes: TreeNode[], targetId: string, currentPath: TreeNode[]): boolean => {
          for (const node of nodes) {
            const newPath = [...currentPath, node];
            if (String(node.id) === targetId) {
              path.push(...newPath);
              return true;
            }
            if (node.children && findPath(node.children, targetId, newPath)) {
              return true;
            }
          }
          return false;
        };

        findPath(get().treeData, nodeId, []);
        return path;
      },

      isExpanded: (nodeId) => {
        return get().expandedNodes.has(nodeId);
      },

      hasChildren: (nodeId) => {
        const node = get().findNode(nodeId);
        return !!(node?.children && node.children.length > 0);
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'TreeStore',
    }
  )
);

// Selectors
export const treeSelectors = {
  treeData: (state: TreeState) => state.treeData,
  selectedNodeId: (state: TreeState) => state.selectedNodeId,
  expandedNodes: (state: TreeState) => state.expandedNodes,
  isLoading: (state: TreeState) => state.isLoading,
  error: (state: TreeState) => state.error,
};
