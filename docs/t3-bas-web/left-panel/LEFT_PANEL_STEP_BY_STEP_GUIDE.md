# Left Panel Device Tree - Complete Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture & Design](#architecture--design)
3. [Data Structure & Models](#data-structure--models)
4. [State Management](#state-management)
5. [API Integration Layer](#api-integration-layer)
6. [Component Architecture](#component-architecture)
7. [Context Menu Implementation](#context-menu-implementation)
8. [Data Communication & Synchronization](#data-communication--synchronization)
9. [Sorting & Filtering Logic](#sorting--filtering-logic)
10. [C++ Integration Points](#c-integration-points)
11. [Database Schema](#database-schema)
12. [Phase 1: Foundation Setup](#phase-1-foundation-setup)
13. [Phase 2: Core Tree Component](#phase-2-core-tree-component)
14. [Phase 3: Data Integration](#phase-3-data-integration)
15. [Phase 4: Actions & Context Menu](#phase-4-actions--context-menu)
16. [Phase 5: Filtering & Sorting](#phase-5-filtering--sorting)
17. [Phase 6: Polish & Testing](#phase-6-polish--testing)
18. [Implementation Roadmap](#implementation-roadmap)
19. [Performance Considerations](#performance-considerations)
20. [Error Handling](#error-handling)
21. [Testing Strategy](#testing-strategy)

---

# Overview

This document provides a comprehensive guide for implementing the left panel device tree in the T3000 React application, matching the functionality of the C++ T3000 application.

This combines both architectural planning and step-by-step implementation instructions in one comprehensive document.

**📖 C++ Design Reference**: For detailed information about the original C++ implementation (tree_product structure, CImageTreeCtrl methods, threading patterns, and message handlers), see [`LEFT_PANEL_CPP_DESIGN.md`](./LEFT_PANEL_CPP_DESIGN.md).

## Key Features
- **Device Hierarchy**: Building → Subnet → Device tree structure
- **Real-time Status**: Online/offline indicators with background monitoring
- **Context Menu**: Right-click actions (connect, disconnect, rename, delete)
- **Filtering & Search**: Text search, show/hide offline, sorting
- **Background Sync**: Automatic device list updates
- **CRUD Operations**: Add, update, delete devices
- **Device Scanning**: Trigger network scans for new devices

## Technology Stack
- **React 18** with TypeScript
- **Fluent UI React Components** (Tree, TreeItem, TreeItemLayout)
- **Zustand** for state management
- **Rust API Backend** (Axum framework)
- **SQLite Database** (existing devices table)

## Implementation Timeline
- **Estimated Duration**: 6 weeks for complete implementation
- **Priority**: High - This is a core feature for device management
- **Approach**: Iterative development with testing at each phase

---

# Architecture & Design

## Component Hierarchy

```
TreePanel (Container)
├── TreeToolbar (Actions: refresh, scan, add, filter)
├── TreeFilter (Search input, filter options)
├── DeviceTree (Main tree component)
│   ├── BuildingNode (Building level)
│   │   ├── SubnetNode (Subnet level)
│   │   │   ├── DeviceNode (Device level)
│   │   │   │   └── SubDeviceNode (Sub-device level)
│   └── ContextMenu (Right-click menu)
└── TreeStatus (Connection status, device count)
```

## Data Flow Architecture

```
Database (SQLite)
    ↓
Rust API (Axum)
    ↓
TypeScript API Service
    ↓
Zustand Store
    ↓
React Components
```

## State Management Architecture

The application uses a three-layer state management approach:

1. **API Service Layer** (`deviceApi.ts`): Handles HTTP communication with Rust backend
2. **Store Layer** (`deviceTreeStore.ts`): Zustand store with actions and state
3. **Component Layer**: React components consume store state and dispatch actions

## Key Design Principles

- **Single Source of Truth**: Zustand store holds all device data
- **Optimistic Updates**: UI updates immediately, sync with backend asynchronously
- **Error Boundaries**: Graceful error handling at each layer
- **Performance First**: Memoization, virtual scrolling, and debouncing
- **Type Safety**: Full TypeScript coverage with strict mode

---

# Data Structure & Models

## Core Data Structures (TypeScript Interfaces)

```typescript
// src/t3-react/types/device.ts

export interface TreeNode {
  id: string;
  type: 'building' | 'subnet' | 'device' | 'sub-device';
  label: string;
  icon?: string;
  children?: TreeNode[];
  data?: any;
  expanded?: boolean;
  selected?: boolean;
  status?: 'online' | 'offline' | 'unknown';
}

export interface DeviceInfo {
  serialNumber: number;              // Primary key (maps to Serial_ID in C++)
  panelId?: number;                  // Panel identification
  mainBuildingName?: string;         // Main building name
  buildingName?: string;             // Building/Subnet name
  floorName?: string;                // Floor name
  roomName?: string;                 // Room name
  productName: string;               // Device name shown in tree
  productClassId: number;            // Product type (1=Tstat, 2=LED, etc.)
  productId: number;                 // Specific product model
  protocol: 'BACnet' | 'Modbus' | 'Native';

  // Network configuration
  ipAddress?: string;                // IP address for TCP/IP devices
  port?: number;                     // TCP/IP port
  bacnetMstpMacId?: number;          // BACnet MSTP MAC ID
  modbusAddress?: number;            // Modbus address
  baudrate?: string;                 // Serial baudrate or IP
  comPort?: number;                  // COM port number

  // Device status
  status: 'online' | 'offline' | 'unknown';
  statusHistory: boolean[];          // Last 5 connection attempts

  // Device information
  hardwareVersion?: number;
  softwareVersion?: number;
  objectInstance?: number;           // BACnet object instance

  // Visual/UI
  nameShowOnTree: string;            // Display name in tree
  custom?: string;                   // Custom label
  imgPathName?: string;              // Icon path

  // Hierarchy
  noteParentSerialNumber?: number;   // Parent device serial number
  panelNumber?: number;              // Panel number
  subnetPort?: number;               // Subnet port (1=Main, 2=Zigbee, 3=Sub)
  subnetBaudrate?: number;           // Subnet baudrate
  expand?: number;                   // Expansion state (1=expanded, 2=collapsed)
}

export interface BuildingInfo {
  id: string;
  name: string;
  protocol: string;                  // "BACnet IP", "Modbus TCP", "Modbus RTU"
  ipAddress?: string;
  port?: string;
  comPort?: string;
  baudrate?: string;
  devices: DeviceInfo[];
}

export interface SubnetInfo {
  id: string;
  buildingId: string;
  name: string;
  devices: DeviceInfo[];
}
```

---

# State Management

## Zustand Device Tree Store

```typescript
// src/t3-react/store/deviceTreeStore.ts

interface DeviceTreeState {
  // Data
  buildings: BuildingInfo[];
  devices: DeviceInfo[];
  selectedDevice: DeviceInfo | null;
  expandedNodes: Set<string>;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  lastRefreshTime: Date | null;

  // Filters
  filterText: string;
  showOfflineDevices: boolean;
  sortBy: 'name' | 'type' | 'status';

  // Actions - Data Loading
  loadDevices: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  scanForDevices: () => Promise<void>;

  // Actions - Selection
  selectDevice: (device: DeviceInfo) => void;
  clearSelection: () => void;

  // Actions - Tree Management
  toggleNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // Actions - CRUD
  addDevice: (device: DeviceInfo) => Promise<void>;
  updateDevice: (serialNumber: number, updates: Partial<DeviceInfo>) => Promise<void>;
  deleteDevice: (serialNumber: number) => Promise<void>;

  // Actions - Filtering
  setFilterText: (text: string) => void;
  setShowOfflineDevices: (show: boolean) => void;
  setSortBy: (sortBy: 'name' | 'type' | 'status') => void;

  // Actions - Status
  updateDeviceStatus: (serialNumber: number, status: 'online' | 'offline') => void;
  checkDeviceOnline: (serialNumber: number) => Promise<boolean>;
}
```

---

# API Integration Layer

## API Endpoints Overview

The React application communicates with the Rust backend through these REST API endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | Get all devices with statistics |
| GET | `/api/devices/:id` | Get single device by serial number |
| POST | `/api/devices` | Create new device |
| PUT | `/api/devices/:id` | Update existing device |
| DELETE | `/api/devices/:id` | Delete device |
| POST | `/api/devices/scan` | Trigger device scan (calls C++ backend) |
| GET | `/api/devices/:id/status` | Check if device is online |
| POST | `/api/devices/:id/connect` | Connect to device |
| POST | `/api/devices/:id/disconnect` | Disconnect from device |

## Device API Service

```typescript
// src/t3-react/services/deviceApi.ts

export class DeviceApiService {
  private baseUrl = 'http://localhost:5173/api';

  // GET /api/devices - Get all devices with stats
  async getAllDevices(): Promise<DeviceInfo[]> {
    const response = await fetch(`${this.baseUrl}/devices`);
    const data = await response.json();
    return data.devices;
  }

  // GET /api/devices/:id - Get single device
  async getDeviceById(serialNumber: number): Promise<DeviceInfo> {
    const response = await fetch(`${this.baseUrl}/devices/${serialNumber}`);
    const data = await response.json();
    return data.device;
  }

  // POST /api/devices - Create new device
  async createDevice(device: Partial<DeviceInfo>): Promise<DeviceInfo> {
    const response = await fetch(`${this.baseUrl}/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device),
    });
    const data = await response.json();
    return data.device;
  }

  // PUT /api/devices/:id - Update device
  async updateDevice(serialNumber: number, updates: Partial<DeviceInfo>): Promise<DeviceInfo> {
    const response = await fetch(`${this.baseUrl}/devices/${serialNumber}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    return data.device;
  }

  // DELETE /api/devices/:id - Delete device
  async deleteDevice(serialNumber: number): Promise<void> {
    await fetch(`${this.baseUrl}/devices/${serialNumber}`, {
      method: 'DELETE',
    });
  }

  // POST /api/devices/scan - Scan for devices (triggers C++ scan)
  async scanDevices(options: ScanOptions): Promise<DeviceInfo[]> {
    const response = await fetch(`${this.baseUrl}/devices/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    const data = await response.json();
    return data.devices;
  }

  // GET /api/devices/:id/status - Check device online status
  async checkDeviceStatus(serialNumber: number): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/devices/${serialNumber}/status`);
    const data = await response.json();
    return data.online;
  }
}

interface ScanOptions {
  protocol?: 'BACnet' | 'Modbus' | 'All';
  ipRange?: string;
  comPort?: number;
  timeout?: number;
}
```

---

# Database Schema

The devices table structure from your existing API:

```sql
CREATE TABLE devices (
    Serial_Number INTEGER PRIMARY KEY,
    Panel_ID INTEGER,
    MainBuilding_Name TEXT,
    Building_Name TEXT,
    Floor_Name TEXT,
    Room_Name TEXT,
    Product_Name TEXT,
    Product_Class_ID INTEGER,
    Product_ID INTEGER,
    Address TEXT,
    Bautrate TEXT,
    Description TEXT,
    Status TEXT,
    IP_Address TEXT,
    Port INTEGER,
    BACnet_MSTP_MAC_ID INTEGER,
    Modbus_Address INTEGER,
    PC_IP_Address TEXT,
    Modbus_Port INTEGER,
    BACnet_IP_Port INTEGER,
    Show_Label_Name TEXT,
    Connection_Type TEXT
);
```

---

# Architecture & Design

## Component Hierarchy

```
TreePanel (Container)
├── TreeToolbar (Actions: refresh, scan, add, filter)
├── TreeFilter (Search input, filter options)
├── DeviceTree (Main tree component)
│   ├── BuildingNode (Building level)
│   │   ├── SubnetNode (Subnet level)
│   │   │   ├── DeviceNode (Device level)
│   │   │   │   └── SubDeviceNode (Sub-device level)
│   └── ContextMenu (Right-click menu)
└── TreeStatus (Connection status, device count)
```

## Data Flow

```
Database (SQLite)
    ↓
Rust API (Axum)
    ↓
TypeScript API Service
    ↓
Zustand Store
    ↓
React Components
```

## State Management Architecture

The application uses a three-layer state management approach:

1. **API Service Layer** (`deviceApi.ts`): Handles HTTP communication
2. **Store Layer** (`deviceTreeStore.ts`): Zustand store with actions
3. **Component Layer**: React components consume store state

---

# Context Menu Implementation

## Context Menu Structure

```typescript
// src/t3-react/components/TreeContextMenu.tsx

interface ContextMenuProps {
  device: DeviceInfo;
  position: { x: number; y: number };
  onClose: () => void;
}

export const TreeContextMenu: React.FC<ContextMenuProps> = ({
  device,
  position,
  onClose,
}) => {
  const menuItems = useMemo(() => [
    {
      key: 'connect',
      label: 'Connect',
      icon: <PlugConnectedRegular />,
      disabled: device.status === 'online',
      onClick: () => handleConnect(device),
    },
    {
      key: 'disconnect',
      label: 'Disconnect',
      icon: <PlugDisconnectedRegular />,
      disabled: device.status === 'offline',
      onClick: () => handleDisconnect(device),
    },
    { key: 'divider1', type: 'divider' },
    {
      key: 'refresh',
      label: 'Refresh',
      icon: <ArrowSyncRegular />,
      onClick: () => handleRefresh(device),
    },
    {
      key: 'rename',
      label: 'Rename',
      icon: <EditRegular />,
      onClick: () => handleRename(device),
    },
    { key: 'divider2', type: 'divider' },
    {
      key: 'properties',
      label: 'Properties',
      icon: <SettingsRegular />,
      onClick: () => handleProperties(device),
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteRegular />,
      onClick: () => handleDelete(device),
    },
  ], [device]);

  return (
    <Menu>
      {menuItems.map(item => (
        item.type === 'divider'
          ? <MenuDivider key={item.key} />
          : <MenuItem key={item.key} {...item} />
      ))}
    </Menu>
  );
};
```

---

# Data Communication & Synchronization

## Real-time Status Updates

```typescript
// src/t3-react/hooks/useDeviceStatusMonitor.ts

export const useDeviceStatusMonitor = () => {
  const { devices, updateDeviceStatus } = useDeviceTreeStore();

  useEffect(() => {
    // Poll device status every 30 seconds
    const interval = setInterval(async () => {
      for (const device of devices) {
        try {
          const online = await deviceApi.checkDeviceStatus(device.serialNumber);
          updateDeviceStatus(device.serialNumber, online ? 'online' : 'offline');
        } catch (error) {
          updateDeviceStatus(device.serialNumber, 'unknown');
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [devices]);
};
```

## Background Sync Service

```typescript
// src/t3-react/services/syncService.ts

export class SyncService {
  private syncInterval: number = 60000; // 1 minute
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    this.intervalId = setInterval(() => {
      this.syncDevices();
    }, this.syncInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async syncDevices() {
    try {
      const devices = await deviceApi.getAllDevices();
      useDeviceTreeStore.getState().setDevices(devices);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
```

---

# Sorting & Filtering Logic

## Tree Builder with Sorting

```typescript
// src/t3-react/utils/treeBuilder.ts

export function buildTreeStructure(
  devices: DeviceInfo[],
  sortBy: 'name' | 'type' | 'status' = 'name',
  filterText: string = '',
  showOffline: boolean = true
): TreeNode[] {
  // Filter devices
  let filteredDevices = devices;

  if (filterText) {
    filteredDevices = devices.filter(d =>
      d.nameShowOnTree.toLowerCase().includes(filterText.toLowerCase())
    );
  }

  if (!showOffline) {
    filteredDevices = filteredDevices.filter(d => d.status === 'online');
  }

  // Sort devices
  const sortedDevices = sortDevices(filteredDevices, sortBy);

  // Group by building
  const buildingMap = new Map<string, DeviceInfo[]>();
  sortedDevices.forEach(device => {
    const buildingKey = device.buildingName || 'Default';
    if (!buildingMap.has(buildingKey)) {
      buildingMap.set(buildingKey, []);
    }
    buildingMap.get(buildingKey)!.push(device);
  });

  // Build tree nodes
  const treeNodes: TreeNode[] = [];
  buildingMap.forEach((devices, buildingName) => {
    treeNodes.push({
      id: `building-${buildingName}`,
      type: 'building',
      label: buildingName,
      icon: 'BuildingRegular',
      children: devices.map(device => ({
        id: `device-${device.serialNumber}`,
        type: 'device',
        label: device.nameShowOnTree,
        icon: getDeviceIcon(device.productClassId),
        status: device.status,
        data: device,
      })),
      expanded: true,
    });
  });

  return treeNodes;
}

function sortDevices(devices: DeviceInfo[], sortBy: string): DeviceInfo[] {
  return [...devices].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.nameShowOnTree.localeCompare(b.nameShowOnTree);
      case 'type':
        return a.productClassId - b.productClassId;
      case 'status':
        return statusOrder[a.status] - statusOrder[b.status];
      default:
        return 0;
    }
  });
}

const statusOrder = { online: 0, offline: 1, unknown: 2 };
```

---

# C++ Integration Points

## FFI Communication (if needed)

```typescript
// src/t3-react/services/ffiService.ts

export class FFIService {
  // Trigger C++ scan operation
  async triggerScan(options: ScanOptions): Promise<void> {
    await fetch('/api/ffi/scan', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // Connect to device (C++ handles actual connection)
  async connectDevice(serialNumber: number): Promise<boolean> {
    const response = await fetch(`/api/ffi/connect/${serialNumber}`, {
      method: 'POST',
    });
    return response.ok;
  }

  // Disconnect from device
  async disconnectDevice(serialNumber: number): Promise<void> {
    await fetch(`/api/ffi/disconnect/${serialNumber}`, {
      method: 'POST',
    });
  }
}
```

---

# Performance Considerations

## Optimization Strategies
1. **Virtual Scrolling**: For large device lists (>100 devices)
2. **Memoization**: Use `useMemo` for tree structure building
3. **Debouncing**: Filter input debounced at 300ms
4. **Lazy Loading**: Load device details on demand
5. **Incremental Updates**: Only update changed devices

## Caching Strategy
- Cache device list in Zustand store
- Refresh on user action or interval
- Invalidate on CRUD operations

---

# Error Handling

```typescript
// Error handling pattern
try {
  const devices = await deviceApi.getAllDevices();
  setDevices(devices);
} catch (error) {
  if (error instanceof NetworkError) {
    showNotification({
      type: 'error',
      message: 'Failed to connect to server',
      action: { label: 'Retry', onClick: () => loadDevices() }
    });
  } else if (error instanceof DatabaseError) {
    showNotification({
      type: 'error',
      message: 'Database error',
    });
  }
}
```

---

# Testing Strategy

## Unit Tests
- Tree builder logic
- Sorting and filtering functions
- Store actions and selectors
- API service methods

## Integration Tests
- Device loading flow
- CRUD operations
- Status updates
- Context menu actions

## E2E Tests
- Complete user workflows
- Multi-device scenarios
- Error recovery

---

---

# Phase 1: Foundation Setup

## Step 1.1: Create TypeScript Types

**File**: `src/t3-react/types/device.ts`

```typescript
/**
 * Device Tree Type Definitions
 * Based on C++ tree_product structure
 *
 * C++ to React Mapping Reference:
 * ================================
 * C++ (tree_product)                    → React (DeviceInfo)
 * ------------------------------------------------
 * serial_number                         → serialNumber
 * product_class_id                      → productClassId
 * status + status_last_time[5]          → status + statusHistory[]
 * NameShowOnTree                        → nameShowOnTree
 * expand (1=expanded, 2=collapsed)      → expand / expandedNodes Set
 * note_parent_serial_number             → noteParentSerialNumber
 * HTREEITEM product_item                → React component key/id
 * strImgPathName                        → imgPathName (icon mapping)
 * BuildingInfo                          → buildingName, mainBuildingName
 *
 * See LEFT_PANEL_CPP_DESIGN.md Section 1 for complete field details
 */

export type DeviceStatus = 'online' | 'offline' | 'unknown';
export type DeviceProtocol = 'BACnet' | 'Modbus' | 'Native';
export type NodeType = 'building' | 'subnet' | 'device' | 'sub-device';

/**
 * Main device information structure
 * Maps to C++ tree_product and database devices table
 */
export interface DeviceInfo {
  // Primary identification
  serialNumber: number;              // Serial_Number (PRIMARY KEY)
  panelId?: number;                  // Panel_ID

  // Hierarchy
  mainBuildingName?: string;         // MainBuilding_Name
  buildingName?: string;             // Building_Name
  floorName?: string;                // Floor_Name
  roomName?: string;                 // Room_Name

  // Device information
  productName: string;               // Product_Name
  productClassId: number;            // Product_Class_ID (1=Tstat, 2=LED, etc.)
  productId: number;                 // Product_ID

  // Network configuration
  protocol: DeviceProtocol;
  ipAddress?: string;                // IP_Address
  port?: number;                     // Port
  bacnetMstpMacId?: number;          // BACnet_MSTP_MAC_ID
  modbusAddress?: number;            // Modbus_Address
  pcIpAddress?: string;              // PC_IP_Address
  modbusPort?: number;               // Modbus_Port
  bacnetIpPort?: number;             // BACnet_IP_Port
  baudrate?: string;                 // Bautrate
  comPort?: number;                  // Com_Port
  connectionType?: string;           // Connection_Type

  // Device status
  status: DeviceStatus;
  statusHistory: boolean[];          // Last 5 connection attempts

  // Device details
  hardwareVersion?: number;
  softwareVersion?: number;
  objectInstance?: number;

  // Display
  nameShowOnTree: string;            // Show_Label_Name or Product_Name
  custom?: string;                   // Custom label
  description?: string;              // Description
  imgPathName?: string;              // Icon path

  // Hierarchy relationships
  noteParentSerialNumber?: number;   // Parent device serial number
  panelNumber?: number;              // Panel number
  subnetPort?: number;               // 1=Main, 2=Zigbee, 3=Sub
  subnetBaudrate?: number;
  expand?: number;                   // 1=expanded, 2=collapsed
}

/**
 * Tree node structure for UI rendering
 */
export interface TreeNode {
  id: string;                        // Unique node ID
  type: NodeType;
  label: string;
  icon?: string;
  children?: TreeNode[];
  data?: DeviceInfo;                 // Actual device data
  expanded?: boolean;
  selected?: boolean;
  status?: DeviceStatus;
  level?: number;                    // Tree depth level
}

/**
 * Building/Subnet grouping
 */
export interface BuildingInfo {
  id: string;
  name: string;
  protocol: string;
  ipAddress?: string;
  port?: string;
  comPort?: string;
  baudrate?: string;
  deviceCount: number;
}

/**
 * API response structures
 */
export interface DeviceWithStats extends DeviceInfo {
  inputCount: number;
  outputCount: number;
  variableCount: number;
  totalPoints: number;
}

export interface DevicesResponse {
  devices: DeviceWithStats[];
  total: number;
  message: string;
}

/**
 * Scan options for device discovery
 */
export interface ScanOptions {
  protocol?: 'BACnet' | 'Modbus' | 'All';
  ipRange?: string;
  comPort?: number;
  timeout?: number;
}
```

**Action**: Create this file and commit it.

---

## Step 1.2: Create Device API Service

**File**: `src/t3-react/services/deviceApi.ts`

```typescript
/**
 * Device API Service
 * Handles all HTTP requests to the Rust backend API
 */

import { DeviceInfo, DeviceWithStats, DevicesResponse, ScanOptions } from '@t3-react/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5173/api';

class DeviceApiService {
  /**
   * GET /api/devices
   * Retrieve all devices with statistics
   */
  async getAllDevices(): Promise<DeviceWithStats[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/devices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DevicesResponse = await response.json();
      return data.devices;
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      throw error;
    }
  }

  /**
   * GET /api/devices/:id
   * Get single device by serial number
   */
  async getDeviceById(serialNumber: number): Promise<DeviceInfo> {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${serialNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Device not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.device;
    } catch (error) {
      console.error(`Failed to fetch device ${serialNumber}:`, error);
      throw error;
    }
  }

  /**
   * POST /api/devices
   * Create a new device
   */
  async createDevice(device: Partial<DeviceInfo>): Promise<DeviceInfo> {
    try {
      const response = await fetch(`${API_BASE_URL}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.mapToApiFormat(device)),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.device;
    } catch (error) {
      console.error('Failed to create device:', error);
      throw error;
    }
  }

  /**
   * PUT /api/devices/:id
   * Update existing device
   */
  async updateDevice(
    serialNumber: number,
    updates: Partial<DeviceInfo>
  ): Promise<DeviceInfo> {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${serialNumber}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.mapToApiFormat(updates)),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Device not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.device;
    } catch (error) {
      console.error(`Failed to update device ${serialNumber}:`, error);
      throw error;
    }
  }

  /**
   * DELETE /api/devices/:id
   * Delete device
   */
  async deleteDevice(serialNumber: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${serialNumber}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Device not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to delete device ${serialNumber}:`, error);
      throw error;
    }
  }

  /**
   * POST /api/devices/scan
   * Trigger device scan (calls C++ backend)
   */
  async scanDevices(options: ScanOptions = {}): Promise<DeviceInfo[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.devices || [];
    } catch (error) {
      console.error('Failed to scan devices:', error);
      throw error;
    }
  }

  /**
   * GET /api/devices/:id/status
   * Check if device is online
   */
  async checkDeviceStatus(serialNumber: number): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${serialNumber}/status`, {
        method: 'GET',
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.online || false;
    } catch (error) {
      console.error(`Failed to check status for device ${serialNumber}:`, error);
      return false;
    }
  }

  /**
   * POST /api/devices/:id/connect
   * Connect to device
   */
  async connectDevice(serialNumber: number): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${serialNumber}/connect`, {
        method: 'POST',
      });

      return response.ok;
    } catch (error) {
      console.error(`Failed to connect to device ${serialNumber}:`, error);
      return false;
    }
  }

  /**
   * POST /api/devices/:id/disconnect
   * Disconnect from device
   */
  async disconnectDevice(serialNumber: number): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${serialNumber}/disconnect`, {
        method: 'POST',
      });

      return response.ok;
    } catch (error) {
      console.error(`Failed to disconnect from device ${serialNumber}:`, error);
      return false;
    }
  }

  /**
   * Map frontend device format to API format (PascalCase)
   */
  private mapToApiFormat(device: Partial<DeviceInfo>): any {
    return {
      SerialNumber: device.serialNumber,
      PanelId: device.panelId,
      MainBuilding_Name: device.mainBuildingName,
      Building_Name: device.buildingName,
      Floor_Name: device.floorName,
      Room_Name: device.roomName,
      Product_Name: device.productName,
      Product_Class_ID: device.productClassId,
      Product_ID: device.productId,
      Address: device.ipAddress,
      Bautrate: device.baudrate,
      Description: device.description,
      Status: device.status,
      IP_Address: device.ipAddress,
      Port: device.port,
      BACnet_MSTP_MAC_ID: device.bacnetMstpMacId,
      Modbus_Address: device.modbusAddress,
      PC_IP_Address: device.pcIpAddress,
      Modbus_Port: device.modbusPort,
      BACnet_IP_Port: device.bacnetIpPort,
      Show_Label_Name: device.nameShowOnTree,
      Connection_Type: device.connectionType,
    };
  }
}

// Export singleton instance
export const deviceApi = new DeviceApiService();
```

**Action**: Create this file and add it to the services index.

---

## Step 1.3: Create Zustand Device Tree Store

**File**: `src/t3-react/store/deviceTreeStore.ts`

```typescript
/**
 * Device Tree Store
 * Central state management for device tree
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { DeviceInfo, TreeNode } from '@t3-react/types';
import { deviceApi } from '@t3-react/services/deviceApi';

interface DeviceTreeState {
  // Data
  devices: DeviceInfo[];
  selectedDevice: DeviceInfo | null;
  expandedNodes: Set<string>;

  // UI State
  isLoading: boolean;
  isRefreshing: boolean;
  isScanning: boolean;
  lastRefreshTime: Date | null;
  error: string | null;

  // Filters
  filterText: string;
  showOfflineDevices: boolean;
  sortBy: 'name' | 'type' | 'status';

  // Actions - Data Loading
  loadDevices: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  scanForDevices: () => Promise<void>;

  // Actions - Selection
  selectDevice: (device: DeviceInfo | null) => void;
  selectDeviceById: (serialNumber: number) => void;
  clearSelection: () => void;

  // Actions - Tree Management
  toggleNode: (nodeId: string) => void;
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // Actions - CRUD
  addDevice: (device: Partial<DeviceInfo>) => Promise<void>;
  updateDevice: (serialNumber: number, updates: Partial<DeviceInfo>) => Promise<void>;
  deleteDevice: (serialNumber: number) => Promise<void>;

  // Actions - Filtering
  setFilterText: (text: string) => void;
  setShowOfflineDevices: (show: boolean) => void;
  setSortBy: (sortBy: 'name' | 'type' | 'status') => void;

  // Actions - Status
  updateDeviceStatus: (serialNumber: number, status: 'online' | 'offline' | 'unknown') => void;
  checkDeviceOnline: (serialNumber: number) => Promise<void>;

  // Actions - Device Operations
  connectToDevice: (serialNumber: number) => Promise<boolean>;
  disconnectFromDevice: (serialNumber: number) => Promise<boolean>;
}

export const useDeviceTreeStore = create<DeviceTreeState>()(
  devtools(
    (set, get) => ({
      // Initial State
      devices: [],
      selectedDevice: null,
      expandedNodes: new Set<string>(),
      isLoading: false,
      isRefreshing: false,
      isScanning: false,
      lastRefreshTime: null,
      error: null,
      filterText: '',
      showOfflineDevices: true,
      sortBy: 'name',

      // Load devices from API
      loadDevices: async () => {
        set({ isLoading: true, error: null });
        try {
          const devices = await deviceApi.getAllDevices();
          set({
            devices,
            isLoading: false,
            lastRefreshTime: new Date(),
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load devices',
            isLoading: false,
          });
        }
      },

      // Refresh devices
      refreshDevices: async () => {
        set({ isRefreshing: true, error: null });
        try {
          const devices = await deviceApi.getAllDevices();
          set({
            devices,
            isRefreshing: false,
            lastRefreshTime: new Date(),
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to refresh devices',
            isRefreshing: false,
          });
        }
      },

      // Scan for new devices
      scanForDevices: async () => {
        set({ isScanning: true, error: null });
        try {
          await deviceApi.scanDevices();
          // After scan, refresh device list
          await get().refreshDevices();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to scan devices',
          });
        } finally {
          set({ isScanning: false });
        }
      },

      // Select device
      selectDevice: (device) => {
        set({ selectedDevice: device });
      },

      // Select device by ID
      selectDeviceById: (serialNumber) => {
        const device = get().devices.find(d => d.serialNumber === serialNumber);
        if (device) {
          set({ selectedDevice: device });
        }
      },

      // Clear selection
      clearSelection: () => {
        set({ selectedDevice: null });
      },

      // Toggle node expansion
      toggleNode: (nodeId) => {
        const expandedNodes = new Set(get().expandedNodes);
        if (expandedNodes.has(nodeId)) {
          expandedNodes.delete(nodeId);
        } else {
          expandedNodes.add(nodeId);
        }
        set({ expandedNodes });
      },

      // Expand node
      expandNode: (nodeId) => {
        const expandedNodes = new Set(get().expandedNodes);
        expandedNodes.add(nodeId);
        set({ expandedNodes });
      },

      // Collapse node
      collapseNode: (nodeId) => {
        const expandedNodes = new Set(get().expandedNodes);
        expandedNodes.delete(nodeId);
        set({ expandedNodes });
      },

      // Expand all nodes
      expandAll: () => {
        const { devices } = get();
        const expandedNodes = new Set<string>();

        // Add all building and subnet nodes
        const buildings = new Set(devices.map(d => d.buildingName || 'Default'));
        buildings.forEach(building => {
          expandedNodes.add(`building-${building}`);
        });

        set({ expandedNodes });
      },

      // Collapse all nodes
      collapseAll: () => {
        set({ expandedNodes: new Set<string>() });
      },

      // Add new device
      addDevice: async (device) => {
        try {
          const newDevice = await deviceApi.createDevice(device);
          set(state => ({
            devices: [...state.devices, newDevice],
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add device',
          });
          throw error;
        }
      },

      // Update device
      updateDevice: async (serialNumber, updates) => {
        try {
          const updatedDevice = await deviceApi.updateDevice(serialNumber, updates);
          set(state => ({
            devices: state.devices.map(d =>
              d.serialNumber === serialNumber ? updatedDevice : d
            ),
            selectedDevice: state.selectedDevice?.serialNumber === serialNumber
              ? updatedDevice
              : state.selectedDevice,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update device',
          });
          throw error;
        }
      },

      // Delete device
      deleteDevice: async (serialNumber) => {
        try {
          await deviceApi.deleteDevice(serialNumber);
          set(state => ({
            devices: state.devices.filter(d => d.serialNumber !== serialNumber),
            selectedDevice: state.selectedDevice?.serialNumber === serialNumber
              ? null
              : state.selectedDevice,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete device',
          });
          throw error;
        }
      },

      // Set filter text
      setFilterText: (text) => {
        set({ filterText: text });
      },

      // Set show offline devices
      setShowOfflineDevices: (show) => {
        set({ showOfflineDevices: show });
      },

      // Set sort by
      setSortBy: (sortBy) => {
        set({ sortBy });
      },

      // Update device status
      updateDeviceStatus: (serialNumber, status) => {
        set(state => ({
          devices: state.devices.map(d =>
            d.serialNumber === serialNumber
              ? { ...d, status }
              : d
          ),
        }));
      },

      // Check if device is online
      checkDeviceOnline: async (serialNumber) => {
        try {
          const isOnline = await deviceApi.checkDeviceStatus(serialNumber);
          get().updateDeviceStatus(serialNumber, isOnline ? 'online' : 'offline');
        } catch (error) {
          get().updateDeviceStatus(serialNumber, 'unknown');
        }
      },

      // Connect to device
      connectToDevice: async (serialNumber) => {
        try {
          const success = await deviceApi.connectDevice(serialNumber);
          if (success) {
            get().updateDeviceStatus(serialNumber, 'online');
          }
          return success;
        } catch (error) {
          console.error('Failed to connect to device:', error);
          return false;
        }
      },

      // Disconnect from device
      disconnectFromDevice: async (serialNumber) => {
        try {
          const success = await deviceApi.disconnectDevice(serialNumber);
          if (success) {
            get().updateDeviceStatus(serialNumber, 'offline');
          }
          return success;
        } catch (error) {
          console.error('Failed to disconnect from device:', error);
          return false;
        }
      },
    }),
    { name: 'DeviceTreeStore' }
  )
);
```

**Action**: Create this file and export it from the store index.

---

## Step 1.4: Update Store Index

**File**: `src/t3-react/store/index.ts`

```typescript
// Add this export
export { useDeviceTreeStore } from './deviceTreeStore';
export type { DeviceTreeState } from './deviceTreeStore';
```

---

## Step 1.5: Update Services Index

**File**: `src/t3-react/services/index.ts`

```typescript
// Add this export
export { deviceApi } from './deviceApi';
```

---

## Step 1.6: Create Types Index

**File**: `src/t3-react/types/index.ts`

```typescript
// Device types
export type {
  DeviceInfo,
  DeviceStatus,
  DeviceProtocol,
  NodeType,
  TreeNode,
  BuildingInfo,
  DeviceWithStats,
  DevicesResponse,
  ScanOptions,
} from './device';
```

---

# Phase 2: Core Tree Component

## Step 2.1: Create Tree Builder Utility

**File**: `src/t3-react/utils/treeBuilder.ts`

```typescript
/**
 * Tree Builder Utility
 * Converts flat device list into hierarchical tree structure
 *
 * C++ Equivalent: CImageTreeCtrl methods
 * ========================================
 * - InsertSubnetItem()   → Building node creation
 * - InsertFloorItem()    → Floor node creation
 * - InsertRoomItem()     → Room node creation
 * - InsertDeviceItem()   → Device node creation (HTREEITEM + icon index)
 *
 * React Approach:
 * - C++ creates HTREEITEM with CImageList icon index
 * - React creates TreeNode with icon name string
 * - C++ stores nodes in m_product vector with HTREEITEM reference
 * - React stores expandedNodes Set in Zustand store
 *
 * See LEFT_PANEL_CPP_DESIGN.md Section 2 for CImageTreeCtrl details
 */

import { DeviceInfo, TreeNode, DeviceStatus } from '@t3-react/types';

/**
 * Build tree structure from flat device list
 */
export function buildTreeStructure(
  devices: DeviceInfo[],
  options: {
    sortBy?: 'name' | 'type' | 'status';
    filterText?: string;
    showOffline?: boolean;
    expandedNodes?: Set<string>;
  } = {}
): TreeNode[] {
  const {
    sortBy = 'name',
    filterText = '',
    showOffline = true,
    expandedNodes = new Set<string>(),
  } = options;

  // Filter devices
  let filteredDevices = devices;

  if (filterText) {
    const searchLower = filterText.toLowerCase();
    filteredDevices = devices.filter(d =>
      d.nameShowOnTree.toLowerCase().includes(searchLower) ||
      d.productName.toLowerCase().includes(searchLower) ||
      d.buildingName?.toLowerCase().includes(searchLower)
    );
  }

  if (!showOffline) {
    filteredDevices = filteredDevices.filter(d => d.status === 'online');
  }

  // Sort devices
  const sortedDevices = sortDevices(filteredDevices, sortBy);

  // Group by building
  const buildingMap = new Map<string, DeviceInfo[]>();
  sortedDevices.forEach(device => {
    const buildingKey = device.buildingName || 'Default Building';
    if (!buildingMap.has(buildingKey)) {
      buildingMap.set(buildingKey, []);
    }
    buildingMap.get(buildingKey)!.push(device);
  });

  // Build tree nodes
  const treeNodes: TreeNode[] = [];
  buildingMap.forEach((buildingDevices, buildingName) => {
    const buildingNodeId = `building-${buildingName}`;

    treeNodes.push({
      id: buildingNodeId,
      type: 'building',
      label: `${buildingName} (${buildingDevices.length})`,
      icon: 'BuildingRegular',
      children: buildingDevices.map(device => createDeviceNode(device)),
      expanded: expandedNodes.has(buildingNodeId),
      level: 0,
    });
  });

  return treeNodes;
}

/**
 * Create device node from device info
 */
function createDeviceNode(device: DeviceInfo): TreeNode {
  return {
    id: `device-${device.serialNumber}`,
    type: 'device',
    label: device.nameShowOnTree || device.productName,
    icon: getDeviceIcon(device.productClassId),
    status: device.status,
    data: device,
    level: 1,
  };
}

/**
 * Sort devices by criteria
 */
function sortDevices(
  devices: DeviceInfo[],
  sortBy: 'name' | 'type' | 'status'
): DeviceInfo[] {
  return [...devices].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.nameShowOnTree || a.productName).localeCompare(
          b.nameShowOnTree || b.productName
        );
      case 'type':
        return a.productClassId - b.productClassId;
      case 'status':
        return statusOrder[a.status] - statusOrder[b.status];
      default:
        return 0;
    }
  });
}

/**
 * Status sort order (online first)
 */
const statusOrder: Record<DeviceStatus, number> = {
  online: 0,
  offline: 1,
  unknown: 2,
};

/**
 * Get device icon based on product class
 *
 * C++ Equivalent: CImageList m_ImageList + strImgPathName
 * ========================================================
 * C++ uses integer indices into CImageList (e.g., TREE_IMAGE_INPUT_ONLINE = 37)
 * and stores image paths in tree_product.strImgPathName
 *
 * React uses Fluent UI icon names as strings
 *
 * Icon Pattern Mapping:
 * - C++: TREE_IMAGE_INPUT_ONLINE (37), TREE_IMAGE_INPUT_OFFLINE (38), TREE_IMAGE_INPUT_UNKNOWN (39)
 * - React: getDeviceIcon() + getStatusColor() composition
 *
 * See LEFT_PANEL_CPP_DESIGN.md Section 6 for icon constants
 */
export function getDeviceIcon(productClassId: number): string {
  const iconMap: Record<number, string> = {
    1: 'DeviceRegular',           // Tstat
    2: 'LightbulbRegular',        // LED
    3: 'TabletRegular',           // Mini Panel
    4: 'ServerRegular',           // Controller
    5: 'PlugConnectedRegular',    // IO Module
    // Add more mappings as needed
  };

  return iconMap[productClassId] || 'DeviceRegular';
}

/**
 * Get status color
 */
export function getStatusColor(status: DeviceStatus): string {
  const colorMap: Record<DeviceStatus, string> = {
    online: '#107C10',    // Green
    offline: '#D13438',   // Red
    unknown: '#797979',   // Gray
  };

  return colorMap[status];
}

/**
 * Flatten tree to find node by ID
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
 * Get all node IDs in tree
 */
export function getAllNodeIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];

  function traverse(node: TreeNode) {
    ids.push(node.id);
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  nodes.forEach(traverse);
  return ids;
}
```

**Action**: Create this utility file.

---

## Step 2.2: Update TreePanel Component

**File**: `src/t3-react/layout/TreePanel.tsx`

Replace the existing placeholder with:

```typescript
/**
 * TreePanel Component
 * Left sidebar containing device tree
 */

import React, { useEffect, useMemo, useState } from 'react';
import { makeStyles, tokens, Spinner } from '@fluentui/react-components';
import { Tree, TreeItem, TreeItemLayout } from '@fluentui/react-components';
import {
  BuildingRegular,
  DeviceRegular,
  CircleFilled,
  ChevronRightRegular,
  ChevronDownRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '@t3-react/store';
import { buildTreeStructure, getDeviceIcon, getStatusColor } from '@t3-react/utils/treeBuilder';
import { TreeNode, DeviceInfo } from '@t3-react/types';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  toolbar: {
    padding: '8px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
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
    height: '200px',
  },
  statusIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '4px',
  },
  deviceLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
});

export const TreePanel: React.FC = () => {
  const styles = useStyles();
  const [contextMenu, setContextMenu] = useState<{
    device: DeviceInfo;
    position: { x: number; y: number };
  } | null>(null);

  // Store state
  const {
    devices,
    selectedDevice,
    expandedNodes,
    isLoading,
    filterText,
    showOfflineDevices,
    sortBy,
    loadDevices,
    selectDevice,
    toggleNode,
  } = useDeviceTreeStore();

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Build tree structure
  const treeData = useMemo(
    () =>
      buildTreeStructure(devices, {
        sortBy,
        filterText,
        showOffline: showOfflineDevices,
        expandedNodes,
      }),
    [devices, sortBy, filterText, showOfflineDevices, expandedNodes]
  );

  // Handle node click
  const handleNodeClick = (node: TreeNode) => {
    if (node.type === 'device' && node.data) {
      selectDevice(node.data);
    }
  };

  // Handle node toggle
  const handleNodeToggle = (nodeId: string) => {
    toggleNode(nodeId);
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, device: DeviceInfo) => {
    e.preventDefault();
    setContextMenu({
      device,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  // Render tree node
  const renderTreeNode = (node: TreeNode): React.ReactElement => {
    const isSelected = node.type === 'device' &&
      selectedDevice?.serialNumber === node.data?.serialNumber;

    if (node.type === 'building') {
      return (
        <TreeItem
          key={node.id}
          itemType="branch"
          value={node.id}
          open={node.expanded}
        >
          <TreeItemLayout
            iconBefore={<BuildingRegular />}
            expandIcon={node.expanded ? <ChevronDownRegular /> : <ChevronRightRegular />}
          >
            {node.label}
          </TreeItemLayout>
          <Tree>
            {node.children?.map(child => renderTreeNode(child))}
          </Tree>
        </TreeItem>
      );
    }

    if (node.type === 'device') {
      const IconComponent = getDeviceIconComponent(node.icon || 'DeviceRegular');
      const statusColor = node.status ? getStatusColor(node.status) : undefined;

      return (
        <TreeItem
          key={node.id}
          itemType="leaf"
          value={node.id}
        >
          <TreeItemLayout
            iconBefore={
              <div className={styles.deviceLabel}>
                {statusColor && (
                  <div
                    className={styles.statusIndicator}
                    style={{ backgroundColor: statusColor }}
                  />
                )}
                <IconComponent />
              </div>
            }
            onClick={() => handleNodeClick(node)}
            onContextMenu={(e) => node.data && handleContextMenu(e, node.data)}
            style={{
              backgroundColor: isSelected ? tokens.colorNeutralBackground1Selected : undefined,
            }}
          >
            {node.label}
          </TreeItemLayout>
        </TreeItem>
      );
    }

    return <></>;
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner label="Loading devices..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.treeContainer}>
        <Tree aria-label="Device Tree">
          {treeData.map(node => renderTreeNode(node))}
        </Tree>
      </div>
    </div>
  );
};

// Helper to get icon component
function getDeviceIconComponent(iconName: string): React.ComponentType {
  // Map icon names to actual components
  return DeviceRegular; // Simplified for now
}
```

**Action**: Update TreePanel.tsx with this code.

---

# Phase 3: Data Integration

## Step 3.1: Create Status Monitor Hook

**File**: `src/t3-react/hooks/useDeviceStatusMonitor.ts`

```typescript
/**
 * Device Status Monitor Hook
 * Polls device status at regular intervals
 *
 * C++ Equivalent: Background threads + OnTimer handler
 * =====================================================
 * C++ Implementation:
 * - m_pCheck_net_device_online: Dedicated thread that polls devices
 * - OnTimer(UINT_PTR nIDEvent): Periodic timer for UI updates and status checks
 * - Updates status_last_time[5] array in tree_product for history tracking
 * - Posts window messages back to main frame to refresh tree display
 *
 * React Implementation:
 * - useEffect + setInterval: JavaScript timer-based polling (30s interval)
 * - async/await fetch: Non-blocking status checks
 * - Zustand store updates: Direct state mutation triggers React re-renders
 * - statusHistory boolean array: Maps to C++ status_last_time[5]
 *
 * Threading Pattern Migration:
 * C++ Thread (blocking)          → React Timer (non-blocking)
 * PostMessage(WM_UPDATE)         → store.updateDeviceStatus()
 * CriticalSection locks          → No locks needed (single-threaded JS)
 *
 * See LEFT_PANEL_CPP_DESIGN.md Section 4 for threading details
 */

import { useEffect, useRef } from 'react';
import { useDeviceTreeStore } from '@t3-react/store';

export const useDeviceStatusMonitor = (intervalMs: number = 30000) => {
  const { devices, checkDeviceOnline } = useDeviceTreeStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start monitoring
    const startMonitoring = () => {
      intervalRef.current = setInterval(async () => {
        console.log('🔍 Checking device status...');

        // Check status for all devices
        for (const device of devices) {
          try {
            await checkDeviceOnline(device.serialNumber);
          } catch (error) {
            console.error(`Failed to check status for device ${device.serialNumber}:`, error);
          }
        }
      }, intervalMs);
    };

    // Only start if we have devices
    if (devices.length > 0) {
      startMonitoring();
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [devices, checkDeviceOnline, intervalMs]);
};
```

**Action**: Create this hook.

---

## Step 3.2: Create Background Sync Service

**File**: `src/t3-react/services/syncService.ts`

```typescript
/**
 * Background Sync Service
 * Periodically syncs device list from database
 *
 * C++ Equivalent: m_pFreshTree thread
 * ====================================
 * C++ Implementation:
 * - m_pFreshTree: CWinThread* background thread
 * - Periodically calls LoadProductFromDB() to refresh m_product vector
 * - Updates CImageTreeCtrl by posting messages to main window
 * - Thread synchronization with critical sections
 *
 * React Implementation:
 * - Singleton class with setInterval timers (60s sync, 30s status)
 * - Calls deviceApi.getAllDevices() and updates Zustand store
 * - No thread synchronization needed (single-threaded JavaScript)
 *
 * See LEFT_PANEL_CPP_DESIGN.md Section 3 for CMainFrame thread management
 */

```typescript
/**
 * Background Sync Service
 * Periodically syncs device list from database
 */

import { useDeviceTreeStore } from '@t3-react/store';

class SyncService {
  private syncInterval: number = 60000; // 1 minute
  private statusInterval: number = 30000; // 30 seconds
  private syncIntervalId: NodeJS.Timeout | null = null;
  private statusIntervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Start background sync
   */
  start() {
    if (this.isRunning) {
      console.warn('Sync service already running');
      return;
    }

    console.log('🚀 Starting background sync service...');
    this.isRunning = true;

    // Initial sync
    this.syncDevices();

    // Periodic sync
    this.syncIntervalId = setInterval(() => {
      this.syncDevices();
    }, this.syncInterval);

    // Periodic status check
    this.statusIntervalId = setInterval(() => {
      this.checkAllDeviceStatus();
    }, this.statusInterval);
  }

  /**
   * Stop background sync
   */
  stop() {
    console.log('⏹️ Stopping background sync service...');

    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }

    if (this.statusIntervalId) {
      clearInterval(this.statusIntervalId);
      this.statusIntervalId = null;
    }

    this.isRunning = false;
  }

  /**
   * Sync devices from database
   */
  private async syncDevices() {
    try {
      console.log('🔄 Syncing devices from database...');
      await useDeviceTreeStore.getState().refreshDevices();
      console.log('✅ Device sync complete');
    } catch (error) {
      console.error('❌ Device sync failed:', error);
    }
  }

  /**
   * Check status of all devices
   */
  private async checkAllDeviceStatus() {
    try {
      const { devices, checkDeviceOnline } = useDeviceTreeStore.getState();
      console.log(`🔍 Checking status for ${devices.length} devices...`);

      for (const device of devices) {
        await checkDeviceOnline(device.serialNumber);
      }
    } catch (error) {
      console.error('❌ Status check failed:', error);
    }
  }

  /**
   * Update sync interval
   */
  setSyncInterval(intervalMs: number) {
    this.syncInterval = intervalMs;

    // Restart if running
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      syncInterval: this.syncInterval,
      statusInterval: this.statusInterval,
    };
  }
}

// Export singleton
export const syncService = new SyncService();
```

**Action**: Create this service.

---

## Step 3.3: Initialize Sync in App

**File**: `src/t3-react/App.tsx`

Add sync service initialization:

```typescript
import { useEffect } from 'react';
import { syncService } from '@t3-react/services/syncService';

export const App: React.FC = () => {
  // ... existing code ...

  // Start background sync on app mount
  useEffect(() => {
    syncService.start();

    return () => {
      syncService.stop();
    };
  }, []);

  // ... rest of component ...
};
```

**Action**: Add sync service initialization to App component.

---

# Phase 4: Actions & Context Menu

## Step 4.1: Create Tree Toolbar Component

**File**: `src/t3-react/components/TreeToolbar.tsx`

```typescript
/**
 * Tree Toolbar Component
 * Action buttons for device tree
 */

import React from 'react';
import {
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  Tooltip,
  makeStyles,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ScanRegular,
  AddRegular,
  ExpandAllRegular,
  CollapseAllRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '@t3-react/store';

const useStyles = makeStyles({
  toolbar: {
    padding: '4px',
    borderBottom: '1px solid #e1e1e1',
  },
});

export const TreeToolbar: React.FC = () => {
  const styles = useStyles();
  const {
    refreshDevices,
    scanForDevices,
    expandAll,
    collapseAll,
    isRefreshing,
    isScanning,
  } = useDeviceTreeStore();

  const handleRefresh = async () => {
    await refreshDevices();
  };

  const handleScan = async () => {
    await scanForDevices();
  };

  const handleAddDevice = () => {
    // TODO: Open add device dialog
    console.log('Add device clicked');
  };

  return (
    <Toolbar className={styles.toolbar} size="small">
      <Tooltip content="Refresh device list" relationship="label">
        <ToolbarButton
          icon={<ArrowSyncRegular />}
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          Refresh
        </ToolbarButton>
      </Tooltip>

      <Tooltip content="Scan for new devices" relationship="label">
        <ToolbarButton
          icon={<ScanRegular />}
          onClick={handleScan}
          disabled={isScanning}
        >
          Scan
        </ToolbarButton>
      </Tooltip>

      <ToolbarDivider />

      <Tooltip content="Add device manually" relationship="label">
        <ToolbarButton icon={<AddRegular />} onClick={handleAddDevice}>
          Add
        </ToolbarButton>
      </Tooltip>

      <ToolbarDivider />

      <Tooltip content="Expand all nodes" relationship="label">
        <ToolbarButton icon={<ExpandAllRegular />} onClick={expandAll} />
      </Tooltip>

      <Tooltip content="Collapse all nodes" relationship="label">
        <ToolbarButton icon={<CollapseAllRegular />} onClick={collapseAll} />
      </Tooltip>
    </Toolbar>
  );
};
```

**Action**: Create TreeToolbar component.

---

## Step 4.2: Create Context Menu Component

**File**: `src/t3-react/components/TreeContextMenu.tsx`

```typescript
/**
 * Tree Context Menu Component
 * Right-click menu for device nodes
 *
 * C++ Equivalent: CImageTreeCtrl::DisplayContextMenu()
 * ====================================================
 * C++ Implementation:
 * - DisplayContextMenu(CPoint& point): Shows popup menu at cursor position
 * - DisplayContextOtherMenu(CPoint& point): Alternate menu for special nodes
 * - Menu items defined in .rc resource file
 * - Menu handlers: OnContextCmd(UINT uID) routes to specific operations
 * - Operations call C++ device communication modules then post refresh messages
 *
 * React Implementation:
 * - Fluent UI Menu components rendered at click coordinates
 * - Menu items defined in JSX with inline handlers
 * - Handlers call Zustand store actions (connectToDevice, updateDevice, etc.)
 * - Store actions call REST API which triggers C++ operations via Rust FFI
 *
 * Context Menu Actions Mapping:
 * C++ Handler                    → React Store Action
 * ------------------------------------------------
 * PingDevice()                   → (Future: API endpoint)
 * BM_Communicate()               → connectToDevice()
 * DoEditLabel()                  → updateDevice() rename
 * DoDeleteItem()                 → deleteDevice()
 * BM_Property()                  → (Future: properties dialog)
 * BM_IO_Mapping()                → (Future: mapping dialog)
 * SyncToController()             → (Future: sync endpoint)
 *
 * See LEFT_PANEL_CPP_DESIGN.md Section 2 & 5 for context menu details
 */

import React from 'react';
import {
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MenuDivider,
} from '@fluentui/react-components';
import {
  PlugConnectedRegular,
  PlugDisconnectedRegular,
  ArrowSyncRegular,
  EditRegular,
  DeleteRegular,
  SettingsRegular,
  InfoRegular,
} from '@fluentui/react-icons';
import { DeviceInfo } from '@t3-react/types';
import { useDeviceTreeStore } from '@t3-react/store';

interface TreeContextMenuProps {
  device: DeviceInfo;
  anchorPoint: { x: number; y: number };
  onClose: () => void;
}

export const TreeContextMenu: React.FC<TreeContextMenuProps> = ({
  device,
  anchorPoint,
  onClose,
}) => {
  const {
    connectToDevice,
    disconnectFromDevice,
    checkDeviceOnline,
    deleteDevice,
    updateDevice,
  } = useDeviceTreeStore();

  const handleConnect = async () => {
    await connectToDevice(device.serialNumber);
    onClose();
  };

  const handleDisconnect = async () => {
    await disconnectFromDevice(device.serialNumber);
    onClose();
  };

  const handleRefresh = async () => {
    await checkDeviceOnline(device.serialNumber);
    onClose();
  };

  const handleRename = () => {
    // TODO: Open rename dialog
    const newName = prompt('Enter new name:', device.nameShowOnTree);
    if (newName && newName !== device.nameShowOnTree) {
      updateDevice(device.serialNumber, { nameShowOnTree: newName });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (confirm(`Delete device "${device.nameShowOnTree}"?`)) {
      await deleteDevice(device.serialNumber);
    }
    onClose();
  };

  const handleProperties = () => {
    // TODO: Open properties dialog
    console.log('Properties for device:', device);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: anchorPoint.x,
        top: anchorPoint.y,
        zIndex: 1000,
      }}
    >
      <MenuList>
        <MenuItem
          icon={<PlugConnectedRegular />}
          onClick={handleConnect}
          disabled={device.status === 'online'}
        >
          Connect
        </MenuItem>
        <MenuItem
          icon={<PlugDisconnectedRegular />}
          onClick={handleDisconnect}
          disabled={device.status === 'offline'}
        >
          Disconnect
        </MenuItem>
        <MenuDivider />
        <MenuItem icon={<ArrowSyncRegular />} onClick={handleRefresh}>
          Refresh Status
        </MenuItem>
        <MenuItem icon={<EditRegular />} onClick={handleRename}>
          Rename
        </MenuItem>
        <MenuDivider />
        <MenuItem icon={<SettingsRegular />} onClick={handleProperties}>
          Properties
        </MenuItem>
        <MenuItem icon={<InfoRegular />}>
          View Details
        </MenuItem>
        <MenuDivider />
        <MenuItem icon={<DeleteRegular />} onClick={handleDelete}>
          Delete
        </MenuItem>
      </MenuList>
    </div>
  );
};
```

**Action**: Create TreeContextMenu component.

---

## Step 4.3: Integrate Toolbar into TreePanel

Update `TreePanel.tsx` to include the toolbar:

```typescript
import { TreeToolbar } from '@t3-react/components/TreeToolbar';

export const TreePanel: React.FC = () => {
  // ... existing code ...

  return (
    <div className={styles.container}>
      <TreeToolbar />  {/* Add this */}
      <div className={styles.treeContainer}>
        {/* existing tree code */}
      </div>
    </div>
  );
};
```

**Action**: Add TreeToolbar to TreePanel.

---

# Phase 5: Filtering & Sorting

## Step 5.1: Create Tree Filter Component

**File**: `src/t3-react/components/TreeFilter.tsx`

```typescript
/**
 * Tree Filter Component
 * Search and filter controls
 */

import React from 'react';
import {
  SearchBox,
  Checkbox,
  Dropdown,
  Option,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { useDeviceTreeStore } from '@t3-react/store';

const useStyles = makeStyles({
  container: {
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  searchBox: {
    width: '100%',
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
});

export const TreeFilter: React.FC = () => {
  const styles = useStyles();
  const {
    filterText,
    showOfflineDevices,
    sortBy,
    setFilterText,
    setShowOfflineDevices,
    setSortBy,
  } = useDeviceTreeStore();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value);
  };

  const handleShowOfflineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowOfflineDevices(e.target.checked);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value as 'name' | 'type' | 'status');
  };

  return (
    <div className={styles.container}>
      <SearchBox
        className={styles.searchBox}
        placeholder="Search devices..."
        value={filterText}
        onChange={handleSearchChange}
      />

      <div className={styles.filterRow}>
        <Checkbox
          label="Show offline"
          checked={showOfflineDevices}
          onChange={handleShowOfflineChange}
        />

        <Dropdown
          placeholder="Sort by..."
          value={sortBy}
          onOptionSelect={(_, data) => handleSortChange(data.optionValue as string)}
        >
          <Option value="name">Name</Option>
          <Option value="type">Type</Option>
          <Option value="status">Status</Option>
        </Dropdown>
      </div>
    </div>
  );
};
```

**Action**: Create TreeFilter component.

---

## Step 5.2: Add Filter to TreePanel

Update `TreePanel.tsx`:

```typescript
import { TreeFilter } from '@t3-react/components/TreeFilter';

export const TreePanel: React.FC = () => {
  // ... existing code ...

  return (
    <div className={styles.container}>
      <TreeToolbar />
      <TreeFilter />  {/* Add this */}
      <div className={styles.treeContainer}>
        {/* existing tree code */}
      </div>
    </div>
  );
};
```

**Action**: Add TreeFilter to TreePanel.

---

# Phase 6: Polish & Testing

## Step 6.1: Add Loading States

**File**: `src/t3-react/components/TreeLoadingSkeleton.tsx`

```typescript
/**
 * Tree Loading Skeleton
 * Shows skeleton while loading devices
 */

import React from 'react';
import { Skeleton, SkeletonItem, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
});

export const TreeLoadingSkeleton: React.FC = () => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i}>
          <SkeletonItem shape="rectangle" size={32} />
        </Skeleton>
      ))}
    </div>
  );
};
```

**Action**: Create loading skeleton.

---

## Step 6.2: Add Error Handling

**File**: `src/t3-react/components/TreeError.tsx`

```typescript
/**
 * Tree Error Component
 * Shows error state with retry button
 */

import React from 'react';
import { Button, makeStyles, Text } from '@fluentui/react-components';
import { ErrorCircleRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    gap: '16px',
  },
  icon: {
    fontSize: '48px',
    color: '#D13438',
  },
  message: {
    textAlign: 'center',
  },
});

interface TreeErrorProps {
  message: string;
  onRetry: () => void;
}

export const TreeError: React.FC<TreeErrorProps> = ({ message, onRetry }) => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <ErrorCircleRegular className={styles.icon} />
      <Text className={styles.message}>{message}</Text>
      <Button appearance="primary" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
};
```

**Action**: Create error component.

---

## Step 6.3: Update TreePanel with Error Handling

```typescript
export const TreePanel: React.FC = () => {
  const styles = useStyles();
  const {
    devices,
    selectedDevice,
    expandedNodes,
    isLoading,
    error,
    filterText,
    showOfflineDevices,
    sortBy,
    loadDevices,
    selectDevice,
    toggleNode,
  } = useDeviceTreeStore();

  // ... existing code ...

  if (isLoading) {
    return (
      <div className={styles.container}>
        <TreeLoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <TreeError message={error} onRetry={loadDevices} />
      </div>
    );
  }

  // ... rest of component ...
};
```

**Action**: Add error handling to TreePanel.

---

## Step 6.4: Create Unit Tests

**File**: `src/t3-react/utils/__tests__/treeBuilder.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { buildTreeStructure, getDeviceIcon, getStatusColor } from '../treeBuilder';
import { DeviceInfo } from '@t3-react/types';

describe('treeBuilder', () => {
  const mockDevices: DeviceInfo[] = [
    {
      serialNumber: 1,
      buildingName: 'Building A',
      productName: 'Device 1',
      nameShowOnTree: 'Device 1',
      productClassId: 1,
      productId: 1,
      status: 'online',
      statusHistory: [],
      protocol: 'BACnet',
    },
    {
      serialNumber: 2,
      buildingName: 'Building A',
      productName: 'Device 2',
      nameShowOnTree: 'Device 2',
      productClassId: 2,
      productId: 2,
      status: 'offline',
      statusHistory: [],
      protocol: 'Modbus',
    },
  ];

  describe('buildTreeStructure', () => {
    it('should group devices by building', () => {
      const tree = buildTreeStructure(mockDevices);
      expect(tree).toHaveLength(1);
      expect(tree[0].type).toBe('building');
      expect(tree[0].children).toHaveLength(2);
    });

    it('should filter devices by text', () => {
      const tree = buildTreeStructure(mockDevices, {
        filterText: 'Device 1',
      });
      expect(tree[0].children).toHaveLength(1);
    });

    it('should filter offline devices', () => {
      const tree = buildTreeStructure(mockDevices, {
        showOffline: false,
      });
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children?.[0].status).toBe('online');
    });

    it('should sort devices by name', () => {
      const tree = buildTreeStructure(mockDevices, {
        sortBy: 'name',
      });
      expect(tree[0].children?.[0].label).toBe('Device 1');
    });
  });

  describe('getDeviceIcon', () => {
    it('should return correct icon for device type', () => {
      expect(getDeviceIcon(1)).toBe('DeviceRegular');
      expect(getDeviceIcon(2)).toBe('LightbulbRegular');
    });

    it('should return default icon for unknown type', () => {
      expect(getDeviceIcon(999)).toBe('DeviceRegular');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct color for status', () => {
      expect(getStatusColor('online')).toBe('#107C10');
      expect(getStatusColor('offline')).toBe('#D13438');
      expect(getStatusColor('unknown')).toBe('#797979');
    });
  });
});
```

**Action**: Create unit tests for tree builder.

---

## Step 6.5: Create Integration Test

**File**: `src/t3-react/layout/__tests__/TreePanel.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TreePanel } from '../TreePanel';
import { useDeviceTreeStore } from '@t3-react/store';

// Mock the store
vi.mock('@t3-react/store', () => ({
  useDeviceTreeStore: vi.fn(),
}));

describe('TreePanel', () => {
  const mockLoadDevices = vi.fn();
  const mockSelectDevice = vi.fn();
  const mockToggleNode = vi.fn();

  const defaultStoreState = {
    devices: [
      {
        serialNumber: 1,
        buildingName: 'Building A',
        nameShowOnTree: 'Device 1',
        productClassId: 1,
        status: 'online',
      },
    ],
    selectedDevice: null,
    expandedNodes: new Set(),
    isLoading: false,
    error: null,
    filterText: '',
    showOfflineDevices: true,
    sortBy: 'name',
    loadDevices: mockLoadDevices,
    selectDevice: mockSelectDevice,
    toggleNode: mockToggleNode,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useDeviceTreeStore as any).mockReturnValue(defaultStoreState);
  });

  it('should render loading state', () => {
    (useDeviceTreeStore as any).mockReturnValue({
      ...defaultStoreState,
      isLoading: true,
    });

    render(<TreePanel />);
    expect(screen.getByText('Loading devices...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    const errorMessage = 'Failed to load devices';
    (useDeviceTreeStore as any).mockReturnValue({
      ...defaultStoreState,
      error: errorMessage,
    });

    render(<TreePanel />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should render tree with devices', async () => {
    render(<TreePanel />);
    await waitFor(() => {
      expect(screen.getByText('Building A (1)')).toBeInTheDocument();
      expect(screen.getByText('Device 1')).toBeInTheDocument();
    });
  });

  it('should call loadDevices on mount', () => {
    render(<TreePanel />);
    expect(mockLoadDevices).toHaveBeenCalledTimes(1);
  });

  it('should select device on click', async () => {
    const user = userEvent.setup();
    render(<TreePanel />);

    const deviceNode = await screen.findByText('Device 1');
    await user.click(deviceNode);

    expect(mockSelectDevice).toHaveBeenCalledWith(
      expect.objectContaining({ serialNumber: 1 })
    );
  });
});
```

**Action**: Create integration tests.

---

# Complete TODO Checklist

## Phase 1: Foundation ✅
- [ ] Create `src/t3-react/types/device.ts` with all TypeScript interfaces
- [ ] Create `src/t3-react/services/deviceApi.ts` with API service class
- [ ] Create `src/t3-react/store/deviceTreeStore.ts` with Zustand store
- [ ] Update `src/t3-react/store/index.ts` to export new store
- [ ] Update `src/t3-react/services/index.ts` to export API service
- [ ] Create `src/t3-react/types/index.ts` with type exports
- [ ] Test API endpoints with Rust backend
- [ ] Verify store actions work correctly

## Phase 2: Core Tree ✅
- [ ] Create `src/t3-react/utils/treeBuilder.ts` with tree utilities
- [ ] Update `src/t3-react/layout/TreePanel.tsx` with tree component
- [ ] Test tree rendering with mock data
- [ ] Verify expand/collapse functionality
- [ ] Test device selection
- [ ] Verify status indicators display correctly
- [ ] Test tree with multiple buildings
- [ ] Verify tree updates on data changes

## Phase 3: Data Integration ✅
- [ ] Create `src/t3-react/hooks/useDeviceStatusMonitor.ts`
- [ ] Create `src/t3-react/services/syncService.ts`
- [ ] Initialize sync service in `App.tsx`
- [ ] Test background polling
- [ ] Verify status updates work
- [ ] Test sync interval changes
- [ ] Monitor performance with many devices
- [ ] Add logging for debugging

## Phase 4: Actions & Context Menu ✅
- [ ] Create `src/t3-react/components/TreeToolbar.tsx`
- [ ] Create `src/t3-react/components/TreeContextMenu.tsx`
- [ ] Integrate toolbar into TreePanel
- [ ] Implement refresh action
- [ ] Implement scan action
- [ ] Implement expand/collapse all
- [ ] Implement context menu actions (connect, disconnect, rename, delete)
- [ ] Test all actions with real devices

## Phase 5: Filtering & Sorting ✅
- [ ] Create `src/t3-react/components/TreeFilter.tsx`
- [ ] Integrate filter into TreePanel
- [ ] Implement search functionality
- [ ] Implement show/hide offline filter
- [ ] Implement sort by name/type/status
- [ ] Test filter combinations
- [ ] Verify performance with large datasets
- [ ] Add clear filter button

## Phase 6: Polish & Testing ✅
- [ ] Create `src/t3-react/components/TreeLoadingSkeleton.tsx`
- [ ] Create `src/t3-react/components/TreeError.tsx`
- [ ] Add loading states to TreePanel
- [ ] Add error handling to TreePanel
- [ ] Create unit tests for tree builder
- [ ] Create integration tests for TreePanel
- [ ] Test with real Rust API
- [ ] Performance optimization
- [ ] Add keyboard navigation
- [ ] Add accessibility attributes
- [ ] Documentation and code comments
- [ ] Final code review

---

# Verification Steps

After implementing each phase, verify:

1. **Phase 1 Verification**:
   ```bash
   # Test API connection
   curl http://localhost:5173/api/devices

   # Check TypeScript compilation
   npm run type-check
   ```

2. **Phase 2 Verification**:
   - Open browser devtools
   - Check tree renders correctly
   - Verify no console errors
   - Test expand/collapse manually

3. **Phase 3 Verification**:
   - Check console logs for sync messages
   - Verify status updates every 30s
   - Monitor network tab for API calls

4. **Phase 4 Verification**:
   - Test each toolbar button
   - Right-click devices to show context menu
   - Verify actions execute correctly

5. **Phase 5 Verification**:
   - Type in search box
   - Toggle offline filter
   - Change sort options
   - Verify tree updates correctly

6. **Phase 6 Verification**:
   ```bash
   # Run tests
   npm run test

   # Run linter
   npm run lint

   # Check test coverage
   npm run test:coverage
   ```

---

# Implementation Roadmap

## Phase Timeline

### Phase 1: Foundation (Week 1)
- [ ] Create TypeScript interfaces and types
- [ ] Set up Zustand device tree store
- [ ] Create device API service layer
- [ ] Implement basic TreePanel container

### Phase 2: Core Tree (Week 2)
- [ ] Build DeviceTree component with Fluent UI Tree
- [ ] Implement tree node rendering (BuildingNode, DeviceNode)
- [ ] Add expand/collapse functionality
- [ ] Implement device selection
- [ ] Add device status indicators (online/offline)

### Phase 3: Data Integration (Week 3)
- [ ] Connect to existing Rust API endpoints
- [ ] Implement device loading from database
- [ ] Add real-time status monitoring
- [ ] Implement background sync service
- [ ] Handle connection state changes

### Phase 4: Actions & Context Menu (Week 4)
- [ ] Implement TreeToolbar with actions (refresh, scan, add)
- [ ] Build context menu component
- [ ] Add device CRUD operations
- [ ] Implement connect/disconnect functionality
- [ ] Add rename functionality

### Phase 5: Filtering & Sorting (Week 5)
- [ ] Implement search/filter input
- [ ] Add sorting options (name, type, status)
- [ ] Filter offline devices toggle
- [ ] Optimize tree rebuild performance
- [ ] Add keyboard navigation

### Phase 6: Polish & Testing (Week 6)
- [ ] Add loading states and skeletons
- [ ] Implement error handling
- [ ] Add animations and transitions
- [ ] Write unit tests
- [ ] Performance optimization
- [ ] Integration testing with C++ backend

## C++ Integration Points

### FFI Communication

The React app communicates with C++ T3000 through the Rust API:

```typescript
// src/t3-react/services/ffiService.ts

export class FFIService {
  // Trigger C++ scan operation
  async triggerScan(options: ScanOptions): Promise<void> {
    await fetch('/api/ffi/scan', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // Connect to device (C++ handles actual connection)
  async connectDevice(serialNumber: number): Promise<boolean> {
    const response = await fetch(`/api/ffi/connect/${serialNumber}`, {
      method: 'POST',
    });
    return response.ok;
  }

  // Disconnect from device
  async disconnectDevice(serialNumber: number): Promise<void> {
    await fetch(`/api/ffi/disconnect/${serialNumber}`, {
      method: 'POST',
    });
  }
}
```

### Matching C++ tree_product Structure

The TypeScript `DeviceInfo` interface maps directly to the C++ `tree_product` structure, ensuring compatibility with the existing T3000 codebase.

## Performance Considerations

### Optimization Strategies
1. **Virtual Scrolling**: For large device lists (>100 devices)
2. **Memoization**: Use `useMemo` for tree structure building
3. **Debouncing**: Filter input debounced at 300ms
4. **Lazy Loading**: Load device details on demand
5. **Incremental Updates**: Only update changed devices

### Caching Strategy
- Cache device list in Zustand store
- Refresh on user action or interval
- Invalidate on CRUD operations

## Error Handling Pattern

```typescript
// Standard error handling pattern
try {
  const devices = await deviceApi.getAllDevices();
  setDevices(devices);
} catch (error) {
  if (error instanceof NetworkError) {
    showNotification({
      type: 'error',
      message: 'Failed to connect to server',
      action: { label: 'Retry', onClick: () => loadDevices() }
    });
  } else if (error instanceof DatabaseError) {
    showNotification({
      type: 'error',
      message: 'Database error',
    });
  }
}
```

## Testing Strategy

### Unit Tests
- Tree builder logic
- Sorting and filtering functions
- Store actions and selectors
- API service methods

### Integration Tests
- Device loading flow
- CRUD operations
- Status updates
- Context menu actions

### E2E Tests
- Complete user workflows
- Multi-device scenarios
- Error recovery

---
