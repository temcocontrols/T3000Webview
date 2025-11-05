/**
 * Tree navigation and context menu types
 */

import { TreeNode, TreeNodeType } from './device';

// Context menu item
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  children?: ContextMenuItem[];
  action?: () => void;
}

// Context menu configuration for different node types
export interface ContextMenuConfig {
  nodeType: TreeNodeType;
  items: ContextMenuItem[];
}

// Tree action types
export enum TreeAction {
  Select = 'select',
  Expand = 'expand',
  Collapse = 'collapse',
  Rename = 'rename',
  Delete = 'delete',
  AddDevice = 'add-device',
  AddBuilding = 'add-building',
  AddFloor = 'add-floor',
  Connect = 'connect',
  Disconnect = 'disconnect',
  Refresh = 'refresh',
  Properties = 'properties',
  DragStart = 'drag-start',
  DragEnd = 'drag-end',
  Drop = 'drop',
}

// Tree action payload
export interface TreeActionPayload {
  action: TreeAction;
  nodeId: string;
  node?: TreeNode;
  data?: any;
}

// Tree drag-drop data
export interface TreeDragDropData {
  sourceNode: TreeNode;
  targetNode: TreeNode;
  position: 'before' | 'after' | 'inside';
}

// Tree filter
export interface TreeFilter {
  searchText?: string;
  nodeTypes?: TreeNodeType[];
  showOfflineDevices?: boolean;
}

// Tree state
export interface TreeState {
  nodes: TreeNode[];
  selectedNodeId: string | null;
  expandedNodeIds: Set<string>;
  draggingNodeId: string | null;
  filter: TreeFilter;
}
