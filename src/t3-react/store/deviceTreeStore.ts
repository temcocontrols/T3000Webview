/**
 * Device Tree Zustand Store
 *
 * Manages all device tree state and operations
 * Maps to C++ m_product vector and CMainFrame methods
 *
 * C++ Reference:
 * - m_product vector → devices array
 * - product_register_value → deviceStatuses map
 * - m_refresh_net_label → needsRefresh flag
 * - m_pFreshTree thread → startSync() / stopSync()
 * - m_pCheck_net_device_online → startStatusMonitor()
 *
 * See LEFT_PANEL_CPP_DESIGN.md Section 2 & 3 for threading patterns
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  DeviceInfo,
  TreeNode,
  BuildingInfo,
  ScanOptions,
  DeviceStatus,
} from '../types/device';
import { DeviceApiService } from '../services/deviceApi';
import { buildTreeFromDevices } from '../components/panels/left-panel/utils/treeBuilder';

/**
 * Device Tree State Interface
 */
interface DeviceTreeState {
  // Data
  devices: DeviceInfo[];
  buildings: BuildingInfo[];
  treeData: TreeNode[];
  selectedDevice: DeviceInfo | null;
  selectedNodeId: string | null;
  expandedNodes: Set<string>;
  deviceStatuses: Map<number, DeviceStatus>;

  // UI State
  isLoading: boolean;
  error: string | null;
  filterText: string;
  filterProtocol: string;
  filterBuilding: string;
  showOfflineOnly: boolean;

  // Background sync
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncInterval: number | null;
  statusMonitorInterval: number | null;

  // Actions: Data fetching
  fetchDevices: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  scanForDevices: (options?: ScanOptions) => Promise<void>;

  // Actions: Device operations
  addDevice: (device: Partial<DeviceInfo>) => Promise<void>;
  updateDevice: (serialNumber: number, updates: Partial<DeviceInfo>) => Promise<void>;
  deleteDevice: (serialNumber: number) => Promise<void>;
  checkDeviceStatus: (serialNumber: number) => Promise<void>;
  connectDevice: (serialNumber: number) => Promise<void>;
  disconnectDevice: (serialNumber: number) => Promise<void>;

  // Actions: Tree operations
  buildTreeStructure: () => void;
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  selectNode: (nodeId: string) => void;
  selectDevice: (device: DeviceInfo | null) => void;

  // Actions: Filtering
  setFilterText: (text: string) => void;
  setFilterProtocol: (protocol: string) => void;
  setFilterBuilding: (building: string) => void;
  setShowOfflineOnly: (show: boolean) => void;
  clearFilters: () => void;

  // Actions: Background services
  startSync: (intervalMs?: number) => void;
  stopSync: () => void;
  startStatusMonitor: (intervalMs?: number) => void;
  stopStatusMonitor: () => void;

  // Actions: Utility
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * Create Device Tree Store
 */
export const useDeviceTreeStore = create<DeviceTreeState>()(
  devtools(
    (set, get) => ({
      // Initial state
      devices: [],
      buildings: [],
      treeData: [],
      selectedDevice: null,
      selectedNodeId: null,
      expandedNodes: new Set<string>(),
      deviceStatuses: new Map<number, DeviceStatus>(),

      isLoading: false,
      error: null,
      filterText: '',
      filterProtocol: 'All',
      filterBuilding: 'All',
      showOfflineOnly: false,

      isSyncing: false,
      lastSyncTime: null,
      syncInterval: null,
      statusMonitorInterval: null,

      // Fetch devices from API
      fetchDevices: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await DeviceApiService.getAllDevices();
          set({
            devices: response.devices,
            isLoading: false,
            lastSyncTime: new Date(),
          });
          get().buildTreeStructure();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch devices',
            isLoading: false,
          });
        }
      },

      // Refresh devices (alias for fetchDevices)
      refreshDevices: async () => {
        await get().fetchDevices();
      },

      // Scan for new devices
      scanForDevices: async (options?: ScanOptions) => {
        set({ isLoading: true, error: null });
        try {
          const newDevices = await DeviceApiService.scanDevices(options);
          // TODO: Add discovered devices to database
          console.log('Discovered devices:', newDevices);
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to scan for devices',
            isLoading: false,
          });
        }
      },

      // Add new device
      addDevice: async (device: Partial<DeviceInfo>) => {
        set({ error: null });
        try {
          const newDevice = await DeviceApiService.createDevice(device);
          set((state) => ({
            devices: [...state.devices, newDevice],
          }));
          get().buildTreeStructure();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add device',
          });
          throw error;
        }
      },

      // Update device
      updateDevice: async (serialNumber: number, updates: Partial<DeviceInfo>) => {
        set({ error: null });
        try {
          const updatedDevice = await DeviceApiService.updateDevice(serialNumber, updates);
          set((state) => ({
            devices: state.devices.map((d) =>
              d.serialNumber === serialNumber ? updatedDevice : d
            ),
          }));
          get().buildTreeStructure();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update device',
          });
          throw error;
        }
      },

      // Delete device
      deleteDevice: async (serialNumber: number) => {
        set({ error: null });
        try {
          await DeviceApiService.deleteDevice(serialNumber);
          set((state) => ({
            devices: state.devices.filter((d) => d.serialNumber !== serialNumber),
            selectedDevice:
              state.selectedDevice?.serialNumber === serialNumber
                ? null
                : state.selectedDevice,
          }));
          get().buildTreeStructure();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete device',
          });
          throw error;
        }
      },

      // Check device online status
      checkDeviceStatus: async (serialNumber: number) => {
        try {
          const statusResult = await DeviceApiService.checkDeviceStatus(serialNumber);
          set((state) => {
            const newStatuses = new Map(state.deviceStatuses);
            newStatuses.set(serialNumber, statusResult.status);
            return { deviceStatuses: newStatuses };
          });
        } catch (error) {
          console.error(`Failed to check status for device ${serialNumber}:`, error);
        }
      },

      // Connect to device
      connectDevice: async (serialNumber: number) => {
        try {
          await DeviceApiService.connectDevice(serialNumber);
        } catch (error) {
          console.error(`Failed to connect to device ${serialNumber}:`, error);
          throw error;
        }
      },

      // Disconnect from device
      disconnectDevice: async (serialNumber: number) => {
        try {
          await DeviceApiService.disconnectDevice(serialNumber);
        } catch (error) {
          console.error(`Failed to disconnect from device ${serialNumber}:`, error);
          throw error;
        }
      },

      // Build tree structure from flat device list
      buildTreeStructure: () => {
        const { devices, filterText, filterProtocol, filterBuilding, showOfflineOnly, deviceStatuses, expandedNodes } = get();

        // Apply filters
        let filteredDevices = [...devices];

        if (filterText) {
          const searchLower = filterText.toLowerCase();
          filteredDevices = filteredDevices.filter(
            (d) =>
              d.nameShowOnTree.toLowerCase().includes(searchLower) ||
              d.serialNumber.toString().includes(searchLower) ||
              d.ipAddress?.toLowerCase().includes(searchLower)
          );
        }

        if (filterProtocol !== 'All') {
          filteredDevices = filteredDevices.filter((d) => d.protocol === filterProtocol);
        }

        if (filterBuilding !== 'All') {
          filteredDevices = filteredDevices.filter(
            (d) => d.mainBuildingName === filterBuilding || d.buildingName === filterBuilding
          );
        }

        if (showOfflineOnly) {
          filteredDevices = filteredDevices.filter(
            (d) => deviceStatuses.get(d.serialNumber) === 'offline'
          );
        }

        // Use treeBuilder utility to construct tree
        const treeNodes = buildTreeFromDevices(filteredDevices, expandedNodes, deviceStatuses);

        // Extract buildings list for filter dropdown
        const buildingMap = new Map<string, DeviceInfo[]>();
        filteredDevices.forEach((device) => {
          const buildingKey = device.mainBuildingName || device.buildingName || 'Unknown Building';
          if (!buildingMap.has(buildingKey)) {
            buildingMap.set(buildingKey, []);
          }
          buildingMap.get(buildingKey)!.push(device);
        });

        const buildingsList: BuildingInfo[] = Array.from(buildingMap.entries()).map(
          ([name, devicesInBuilding]) => ({
            id: name,
            name,
            protocol: devicesInBuilding[0]?.protocol || 'Unknown',
            deviceCount: devicesInBuilding.length,
            ipAddress: devicesInBuilding[0]?.ipAddress,
            port: devicesInBuilding[0]?.port?.toString(),
          })
        );

        set({ treeData: treeNodes, buildings: buildingsList });
      },

      // Expand tree node
      expandNode: (nodeId: string) => {
        set((state) => {
          const newExpanded = new Set(state.expandedNodes);
          newExpanded.add(nodeId);
          return { expandedNodes: newExpanded };
        });
        get().buildTreeStructure();
      },

      // Collapse tree node
      collapseNode: (nodeId: string) => {
        set((state) => {
          const newExpanded = new Set(state.expandedNodes);
          newExpanded.delete(nodeId);
          return { expandedNodes: newExpanded };
        });
        get().buildTreeStructure();
      },

      // Expand all nodes
      expandAll: () => {
        const allNodeIds = new Set<string>();
        const collectIds = (nodes: TreeNode[]) => {
          nodes.forEach((node) => {
            allNodeIds.add(node.id);
            if (node.children) collectIds(node.children);
          });
        };
        collectIds(get().treeData);
        set({ expandedNodes: allNodeIds });
        get().buildTreeStructure();
      },

      // Collapse all nodes
      collapseAll: () => {
        set({ expandedNodes: new Set() });
        get().buildTreeStructure();
      },

      // Select tree node
      selectNode: (nodeId: string) => {
        const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
          for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
              const found = findNode(node.children, id);
              if (found) return found;
            }
          }
          return null;
        };

        const node = findNode(get().treeData, nodeId);
        set({
          selectedNodeId: nodeId,
          selectedDevice: node?.data || null,
        });
      },

      // Select device directly
      selectDevice: (device: DeviceInfo | null) => {
        set({
          selectedDevice: device,
          selectedNodeId: device ? `device-${device.serialNumber}` : null,
        });
      },

      // Filter actions
      setFilterText: (text: string) => {
        set({ filterText: text });
        get().buildTreeStructure();
      },

      setFilterProtocol: (protocol: string) => {
        set({ filterProtocol: protocol });
        get().buildTreeStructure();
      },

      setFilterBuilding: (building: string) => {
        set({ filterBuilding: building });
        get().buildTreeStructure();
      },

      setShowOfflineOnly: (show: boolean) => {
        set({ showOfflineOnly: show });
        get().buildTreeStructure();
      },

      clearFilters: () => {
        set({
          filterText: '',
          filterProtocol: 'All',
          filterBuilding: 'All',
          showOfflineOnly: false,
        });
        get().buildTreeStructure();
      },

      // Start background sync (maps to C++ m_pFreshTree thread)
      startSync: (intervalMs: number = 60000) => {
        const interval = window.setInterval(() => {
          get().fetchDevices();
        }, intervalMs);

        set({
          isSyncing: true,
          syncInterval: interval,
        });
      },

      // Stop background sync
      stopSync: () => {
        const { syncInterval } = get();
        if (syncInterval !== null) {
          window.clearInterval(syncInterval);
          set({ isSyncing: false, syncInterval: null });
        }
      },

      // Start status monitoring (maps to C++ m_pCheck_net_device_online thread)
      startStatusMonitor: (intervalMs: number = 30000) => {
        const interval = window.setInterval(() => {
          const { devices } = get();
          devices.forEach((device) => {
            get().checkDeviceStatus(device.serialNumber);
          });
        }, intervalMs);

        set({ statusMonitorInterval: interval });
      },

      // Stop status monitoring
      stopStatusMonitor: () => {
        const { statusMonitorInterval } = get();
        if (statusMonitorInterval !== null) {
          window.clearInterval(statusMonitorInterval);
          set({ statusMonitorInterval: null });
        }
      },

      // Error handling
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    { name: 'DeviceTreeStore' }
  )
);

export default useDeviceTreeStore;
