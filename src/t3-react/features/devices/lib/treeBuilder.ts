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
 */
export function groupByBuilding(devices: DeviceInfo[]): Map<string, DeviceInfo[]> {
  const buildingMap = new Map<string, DeviceInfo[]>();

  devices.forEach((device) => {
    // Determine building key
    // Priority: mainBuildingName > buildingName > protocol-based group
    let buildingKey: string;

    if (device.mainBuildingName) {
      buildingKey = device.mainBuildingName;
    } else if (device.buildingName) {
      buildingKey = device.buildingName;
    } else {
      // Group by protocol if no building info
      buildingKey = `${device.protocol} Devices`;
    }

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
 * Maps to C++ CImageList icon constants
 * Reference: LEFT_PANEL_CPP_DESIGN.md Section 8
 */
export function getDeviceIcon(productClassId: number): string {
  switch (productClassId) {
    case 1: return 'Thermostat';           // PM_TSTAT
    case 2: return 'LightBulb';            // LED
    case 3: return 'LightBulb';            // LC
    case 4: return 'LightBulb';            // LCP
    case 5: return 'Box';                  // CM5
    case 6: return 'Box';                  // IOMOD
    case 10: return 'Server';              // T3000
    case 19: return 'Plug';                // T38AI8AO6DO
    case 20: return 'Plug';                // T322AI
    case 21: return 'Plug';                // T38I13O
    case 22: return 'Box';                 // T332AI
    case 23: return 'Box';                 // T3PT12
    case 25: return 'Box';                 // T3IOA
    case 26: return 'Thermostat';          // TSTAT10
    case 27: return 'Power';               // TSTAT_AQ
    case 28: return 'Box';                 // TSTAT_WIFI
    case 29: return 'Plug';                // T34AO
    case 30: return 'Plug';                // T36CTA
    case 31: return 'Plug';                // T36CT
    case 48: return 'Box';                 // T3PT10
    case 51: return 'Thermostat';          // TEMCO_TSTAT
    default: return 'CircleSmall';         // Unknown device
  }
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
