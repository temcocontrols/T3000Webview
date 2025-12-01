/**
 * Device and tree node types from C++ tree_product struct
 */

import { Protocol } from './protocol';
import { ProductType } from './product';

// Device online status
export enum DeviceStatus {
  Online = 'online',
  Offline = 'offline',
  Unknown = 'unknown',
}

// Tree node type (for tree navigation)
export enum TreeNodeType {
  Root = 'root',              // Building root
  Building = 'building',      // Building node
  Floor = 'floor',           // Floor/Group node
  Device = 'device',         // Device node
  PointList = 'point-list',  // Point list node (Inputs, Outputs, etc.)
  IONode = 'io-node',        // Individual I/O point node
}

// Device information (from C++ tree_product)
export interface DeviceInfo {
  serialNumber: number;
  productClassId: ProductType;
  protocol: Protocol;
  firmwareVersion: string;
  hardwareVersion: string;
  ipAddress: string;
  port: number;
  modbusAddress?: number;      // For Modbus devices
  instance?: number;           // For BACnet devices
  networkNumber?: number;      // For BACnet MSTP
  macAddress?: string;         // For BACnet MSTP
  status: DeviceStatus;
  lastSeen?: Date;
  description?: string;
  location?: string;
}

// Tree node (recursive structure for left panel tree)
export interface TreeNode {
  id: string;                  // Unique identifier
  name: string;                // Display name
  type: TreeNodeType;          // Node type
  icon?: string;               // Icon name or path
  children?: TreeNode[];       // Child nodes
  deviceInfo?: DeviceInfo;     // Device details (if type = device)
  expanded?: boolean;          // Expansion state
  selected?: boolean;          // Selection state
  parentId?: string;           // Parent node ID
  data?: any;                  // Additional data
}

// Device list item (simplified for lists/grids)
export interface DeviceListItem {
  id: string;
  name: string;
  serialNumber: number;
  productType: ProductType;
  protocol: Protocol;
  ipAddress: string;
  status: DeviceStatus;
  lastSeen?: Date;
}

// Device configuration
export interface DeviceConfig {
  name: string;
  description?: string;
  location?: string;
  ipAddress: string;
  port: number;
  protocol: Protocol;
  modbusAddress?: number;
  instance?: number;
  networkNumber?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;    // seconds
}

// Device filter (for search/filter)
export interface DeviceFilter {
  protocol?: Protocol;
  status?: DeviceStatus;
  productType?: ProductType;
  searchText?: string;
}
