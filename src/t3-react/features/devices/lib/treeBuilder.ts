/**
 * Tree Builder Utility
 *
 * Converts flat device list into hierarchical tree structure
 * Maps to C++ CImageTreeCtrl::BuildTree logic
 *
 * C++ Reference (LEFT_PANEL_CPP_DESIGN.md Section 4):
 * - CImageTreeCtrl::BuildTree() �?buildTreeFromDevices()
 * - SortByParent() �?groupByBuilding()
 * - InsertItem() �?createTreeNode()
 */

import type { DeviceInfo, TreeNode, DeviceStatus } from '../../../types/device';

/**
 * Sort comparator for devices
 * Prioritizes: building �?serial number �?name
 */
function sortDevices(a: DeviceInfo, b: DeviceInfo): number {
  // First by building
  const buildingA = a.mainBuildingName || a.buildingName || '';
  const buildingB = b.mainBuildingName || b.buildingName || '';
  if (buildingA !== buildingB) {
    return buildingA.localeCompare(buildingB);
  }

  // Then by serial number
  return a.serialNumber - b.serialNumber;
}

/**
 * Group devices by building/subnet
 * Maps to C++ SortByParent logic
 * C++ uses ALL_NODE.Building_Name for grouping
 */
export function groupByBuilding(devices: DeviceInfo[]): Map<string, DeviceInfo[]> {
  const buildingMap = new Map<string, DeviceInfo[]>();

  devices.forEach((device) => {
    // Use buildingName directly (matches C++ ALL_NODE.Building_Name)
    // If no building name, use "Local View" (matches C++ default for TCP devices)
    let buildingKey: string = device.buildingName || 'Local View';

    if (!buildingMap.has(buildingKey)) {
      buildingMap.set(buildingKey, []);
    }
    buildingMap.get(buildingKey)!.push(device);
  });

  // Sort devices within each building
  buildingMap.forEach((deviceList) => {
    deviceList.sort(sortDevices);
  });

  return buildingMap;
}

/**
 * Get device icon name based on product class ID
 * Maps to C++ CImageList icon constants (MainFrm.cpp:2048-2150)
 * Reference: T3000.h PM_* constants
 */
export function getDeviceIcon(productClassId: number | null | undefined): string {
  // Default to generic device icon if null/undefined
  if (productClassId === null || productClassId === undefined) {
    return 'Devices3';
  }

  // Comprehensive mapping of all PM_* constants from C++
  const iconMap: Record<number, string> = {
    // Thermostats
    1: 'Thermostat',           // PM_TSTAT (original)
    26: 'Thermostat',          // PM_TSTAT10
    27: 'Thermostat',          // PM_TSTAT_AQ (with air quality)
    51: 'Thermostat',          // PM_TEMCO_TSTAT

    // Lighting Controllers
    2: 'LightBulb',            // LED
    3: 'LightBulb',            // LC (Lighting Controller)
    4: 'LightBulb',            // LCP

    // Controllers and Panels
    5: 'Box',                  // PM_CM5
    34: 'Box',                 // PM_MINIPANEL
    35: 'Box',                 // PM_MINIPANEL_ARM

    // T3 I/O Modules
    6: 'Plug',                 // IOMOD
    19: 'Plug',                // PM_T38AI8AO6DO (T3-8AI-8AO-6DO)
    20: 'Plug',                // PM_T322AI (T3-22AI)
    21: 'Plug',                // PM_T38I13O (T3-8I-13O)
    22: 'Plug',                // PM_T332AI (T3-32AI)
    23: 'Plug',                // PM_T3PT12 (T3-PT12)
    25: 'Plug',                // PM_T3IOA (T3-IOA)
    29: 'Plug',                // PM_T34AO (T3-4AO)
    30: 'Plug',                // PM_T36CTA (T3-6CTA)
    31: 'Plug',                // PM_T36CT (T3-6CT)
    48: 'Plug',                // PM_T3PT10 (T3-PT10)

    // WiFi/Network Devices
    28: 'WifiEthernet',        // PM_TSTAT_WIFI

    // Servers/Gateway
    10: 'Server',              // T3000 Server

    // Generic/Unknown
    0: 'Devices3',             // Unknown/Default
  };

  return iconMap[productClassId] || 'Devices3'; // Default to generic device icon
}

/**
 * Get building icon based on protocol
 */
export function getBuildingIcon(protocol: string): string {
  if (protocol.includes('BACnet')) return 'CityNext';
  if (protocol.includes('Modbus')) return 'Processing';
  return 'Home';
}

/**
 * Create tree node from device
 */
function createDeviceNode(
  device: DeviceInfo,
  expandedNodes: Set<string>,
  deviceStatuses: Map<number, DeviceStatus>
): TreeNode {
  const nodeId = `device-${device.serialNumber}`;

  return {
    id: nodeId,
    type: 'device',
    label: device.nameShowOnTree,
    icon: getDeviceIcon(device.productClassId),
    data: device,
    status: deviceStatuses.get(device.serialNumber) || device.status || 'unknown',
    expanded: expandedNodes.has(nodeId),
    level: 1,
  };
}

/**
 * Create building/subnet node
 */
function createBuildingNode(
  buildingName: string,
  devices: DeviceInfo[],
  expandedNodes: Set<string>,
  deviceStatuses: Map<number, DeviceStatus>
): TreeNode {
  const nodeId = `building-${buildingName}`;
  const protocol = devices[0]?.protocol || 'Unknown';

  // Create child device nodes
  const childNodes = devices.map((device) =>
    createDeviceNode(device, expandedNodes, deviceStatuses)
  );

  // Calculate status summary (for future use in tooltips/badges)
  // const onlineCount = childNodes.filter((n) => n.status === 'online').length;
  // const offlineCount = childNodes.filter((n) => n.status === 'offline').length;

  return {
    id: nodeId,
    type: 'building',
    label: `${buildingName} (${devices.length})`,
    icon: getBuildingIcon(protocol),
    children: childNodes,
    expanded: expandedNodes.has(nodeId),
    level: 0,
  };
}

/**
 * Build tree structure from flat device list
 * Main entry point - maps to C++ CImageTreeCtrl::BuildTree
 *
 * @param devices - Flat list of devices
 * @param expandedNodes - Set of expanded node IDs
 * @param deviceStatuses - Map of device serial numbers to status
 * @returns Hierarchical tree structure
 */
export function buildTreeFromDevices(
  devices: DeviceInfo[],
  expandedNodes: Set<string>,
  deviceStatuses: Map<number, DeviceStatus>
): TreeNode[] {
  if (!devices || devices.length === 0) {
    return [];
  }

  // Group devices by building
  const buildingMap = groupByBuilding(devices);

  // Create building nodes with children
  const treeNodes: TreeNode[] = [];

  // Sort buildings alphabetically
  const sortedBuildings = Array.from(buildingMap.keys()).sort();

  sortedBuildings.forEach((buildingName) => {
    const devicesInBuilding = buildingMap.get(buildingName)!;
    const buildingNode = createBuildingNode(
      buildingName,
      devicesInBuilding,
      expandedNodes,
      deviceStatuses
    );
    treeNodes.push(buildingNode);
  });

  return treeNodes;
}

/**
 * Find node by ID in tree (recursive search)
 */
export function findNodeById(nodes: TreeNode[], nodeId: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }
    if (node.children) {
      const found = findNodeById(node.children, nodeId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Get all node IDs (recursive)
 */
export function getAllNodeIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  const collect = (nodeList: TreeNode[]) => {
    nodeList.forEach((node) => {
      ids.push(node.id);
      if (node.children) collect(node.children);
    });
  };
  collect(nodes);
  return ids;
}

/**
 * Count devices in tree (excluding building nodes)
 */
export function countDevices(nodes: TreeNode[]): number {
  let count = 0;
  const countRecursive = (nodeList: TreeNode[]) => {
    nodeList.forEach((node) => {
      if (node.type === 'device') count++;
      if (node.children) countRecursive(node.children);
    });
  };
  countRecursive(nodes);
  return count;
}

/**
 * Get parent node ID
 */
export function getParentNodeId(nodeId: string): string | null {
  if (nodeId.startsWith('device-')) {
    // Device nodes are children of building nodes
    // We need to search the tree to find the parent
    return null; // Will be resolved in component context
  }
  return null; // Building nodes have no parent
}
