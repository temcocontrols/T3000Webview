/**
 * Context Menu Configuration
 * Right-click menus for different tree node types
 * Based on C++ ImageTreeCtrl.cpp
 */

import type { ContextMenuItem, TreeNodeType } from '../../common/types/tree';

/**
 * Building Root Context Menu
 * Right-click on root building node
 */
export const buildingRootContextMenu: ContextMenuItem[] = [
  {
    id: 'building-add',
    label: 'Add Building',
    icon: 'BuildingMultiple',
    action: 'addBuilding',
  },
  {
    id: 'building-edit',
    label: 'Edit Building',
    icon: 'Edit',
    action: 'editBuilding',
  },
  {
    id: 'building-delete',
    label: 'Delete Building',
    icon: 'Delete',
    action: 'deleteBuilding',
    isDanger: true,
  },
  {
    id: 'divider-1',
    type: 'divider',
  },
  {
    id: 'building-refresh',
    label: 'Refresh',
    icon: 'ArrowClockwise',
    action: 'refresh',
    shortcut: 'F5',
  },
  {
    id: 'building-expand-all',
    label: 'Expand All',
    icon: 'ChevronDown',
    action: 'expandAll',
  },
  {
    id: 'building-collapse-all',
    label: 'Collapse All',
    icon: 'ChevronUp',
    action: 'collapseAll',
  },
];

/**
 * Device Node Context Menu
 * Right-click on a device node
 */
export const deviceNodeContextMenu: ContextMenuItem[] = [
  {
    id: 'device-connect',
    label: 'Connect',
    icon: 'PlugConnected',
    action: 'connectDevice',
  },
  {
    id: 'device-disconnect',
    label: 'Disconnect',
    icon: 'PlugDisconnected',
    action: 'disconnectDevice',
  },
  {
    id: 'divider-1',
    type: 'divider',
  },
  {
    id: 'device-rename',
    label: 'Rename',
    icon: 'Rename',
    action: 'renameDevice',
    shortcut: 'F2',
  },
  {
    id: 'device-delete',
    label: 'Delete',
    icon: 'Delete',
    action: 'deleteDevice',
    isDanger: true,
  },
  {
    id: 'divider-2',
    type: 'divider',
  },
  {
    id: 'device-info',
    label: 'Device Information',
    icon: 'Info',
    action: 'showDeviceInfo',
  },
  {
    id: 'device-settings',
    label: 'Device Settings',
    icon: 'Settings',
    action: 'openDeviceSettings',
  },
  {
    id: 'divider-3',
    type: 'divider',
  },
  {
    id: 'device-backup',
    label: 'Backup',
    icon: 'Archive',
    action: 'backupDevice',
  },
  {
    id: 'device-restore',
    label: 'Restore',
    icon: 'ArrowCounterclockwise',
    action: 'restoreDevice',
  },
  {
    id: 'device-sync-time',
    label: 'Sync Time',
    icon: 'Clock',
    action: 'syncDeviceTime',
  },
  {
    id: 'divider-4',
    type: 'divider',
  },
  {
    id: 'device-firmware',
    label: 'Firmware Update',
    icon: 'ArrowUpload',
    action: 'firmwareUpdate',
  },
  {
    id: 'device-reboot',
    label: 'Reboot',
    icon: 'ArrowClockwise',
    action: 'rebootDevice',
    isDanger: true,
  },
  {
    id: 'divider-5',
    type: 'divider',
  },
  {
    id: 'device-refresh',
    label: 'Refresh',
    icon: 'ArrowClockwise',
    action: 'refresh',
    shortcut: 'F5',
  },
];

/**
 * Point List Node Context Menu
 * Right-click on point list container (Inputs, Outputs, Variables, etc.)
 */
export const pointListNodeContextMenu: ContextMenuItem[] = [
  {
    id: 'points-view',
    label: 'View Points',
    icon: 'Eye',
    action: 'viewPoints',
  },
  {
    id: 'divider-1',
    type: 'divider',
  },
  {
    id: 'points-upload',
    label: 'Upload to Device',
    icon: 'ArrowUpload',
    action: 'uploadPoints',
  },
  {
    id: 'points-download',
    label: 'Download from Device',
    icon: 'ArrowDownload',
    action: 'downloadPoints',
  },
  {
    id: 'divider-2',
    type: 'divider',
  },
  {
    id: 'points-export',
    label: 'Export to CSV',
    icon: 'DocumentText',
    action: 'exportPoints',
  },
  {
    id: 'points-import',
    label: 'Import from CSV',
    icon: 'DocumentArrowUp',
    action: 'importPoints',
  },
  {
    id: 'divider-3',
    type: 'divider',
  },
  {
    id: 'points-refresh',
    label: 'Refresh',
    icon: 'ArrowClockwise',
    action: 'refresh',
    shortcut: 'F5',
  },
];

/**
 * Group Node Context Menu
 * Right-click on a group/folder node
 */
export const groupNodeContextMenu: ContextMenuItem[] = [
  {
    id: 'group-add',
    label: 'Add Group',
    icon: 'FolderAdd',
    action: 'addGroup',
  },
  {
    id: 'group-rename',
    label: 'Rename Group',
    icon: 'Rename',
    action: 'renameGroup',
    shortcut: 'F2',
  },
  {
    id: 'group-delete',
    label: 'Delete Group',
    icon: 'Delete',
    action: 'deleteGroup',
    isDanger: true,
  },
  {
    id: 'divider-1',
    type: 'divider',
  },
  {
    id: 'group-add-device',
    label: 'Add Device to Group',
    icon: 'Add',
    action: 'addDeviceToGroup',
  },
  {
    id: 'divider-2',
    type: 'divider',
  },
  {
    id: 'group-expand',
    label: 'Expand All',
    icon: 'ChevronDown',
    action: 'expandAll',
  },
  {
    id: 'group-collapse',
    label: 'Collapse All',
    icon: 'ChevronUp',
    action: 'collapseAll',
  },
  {
    id: 'divider-3',
    type: 'divider',
  },
  {
    id: 'group-refresh',
    label: 'Refresh',
    icon: 'ArrowClockwise',
    action: 'refresh',
    shortcut: 'F5',
  },
];

/**
 * I/O Point Node Context Menu
 * Right-click on an individual input/output/variable point
 */
export const ioPointNodeContextMenu: ContextMenuItem[] = [
  {
    id: 'point-edit',
    label: 'Edit Point',
    icon: 'Edit',
    action: 'editPoint',
  },
  {
    id: 'point-view-details',
    label: 'View Details',
    icon: 'Info',
    action: 'viewPointDetails',
  },
  {
    id: 'divider-1',
    type: 'divider',
  },
  {
    id: 'point-write-value',
    label: 'Write Value',
    icon: 'EditArrowBack',
    action: 'writePointValue',
  },
  {
    id: 'point-release',
    label: 'Release (Auto)',
    icon: 'ArrowUndo',
    action: 'releasePoint',
  },
  {
    id: 'divider-2',
    type: 'divider',
  },
  {
    id: 'point-trend',
    label: 'View Trend',
    icon: 'LineChart',
    action: 'viewPointTrend',
  },
  {
    id: 'point-alarm',
    label: 'Configure Alarm',
    icon: 'Alert',
    action: 'configurePointAlarm',
  },
  {
    id: 'divider-3',
    type: 'divider',
  },
  {
    id: 'point-copy',
    label: 'Copy',
    icon: 'Copy',
    action: 'copyPoint',
    shortcut: 'Ctrl+C',
  },
  {
    id: 'point-paste',
    label: 'Paste',
    icon: 'ClipboardPaste',
    action: 'pastePoint',
    shortcut: 'Ctrl+V',
  },
  {
    id: 'divider-4',
    type: 'divider',
  },
  {
    id: 'point-refresh',
    label: 'Refresh',
    icon: 'ArrowClockwise',
    action: 'refresh',
    shortcut: 'F5',
  },
];

/**
 * Get context menu by node type
 */
export function getContextMenuByNodeType(nodeType: TreeNodeType): ContextMenuItem[] {
  switch (nodeType) {
    case 'building':
      return buildingRootContextMenu;
    case 'device':
      return deviceNodeContextMenu;
    case 'pointList':
      return pointListNodeContextMenu;
    case 'group':
      return groupNodeContextMenu;
    case 'point':
      return ioPointNodeContextMenu;
    default:
      return [];
  }
}

/**
 * Get context menu item by ID
 */
export function getContextMenuItemById(
  nodeType: TreeNodeType,
  itemId: string
): ContextMenuItem | undefined {
  const menu = getContextMenuByNodeType(nodeType);
  return menu.find((item) => item.id === itemId);
}

/**
 * Filter context menu items based on conditions
 */
export function filterContextMenu(
  menu: ContextMenuItem[],
  condition: (item: ContextMenuItem) => boolean
): ContextMenuItem[] {
  return menu.filter(condition);
}
