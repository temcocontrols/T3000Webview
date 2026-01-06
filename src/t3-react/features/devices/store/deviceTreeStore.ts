/**
 * Device Tree Zustand Store
 *
 * Manages all device tree state and operations
 * Maps to C++ m_product vector and CMainFrame methods
 *
 * C++ Reference:
 * - m_product vector �?devices array
 * - product_register_value �?deviceStatuses map
 * - m_refresh_net_label �?needsRefresh flag
 * - m_pFreshTree thread �?startSync() / stopSync()
 * - m_pCheck_net_device_online �?startStatusMonitor()
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
} from '../../../shared/types/device';
import DeviceApiService from '../../../services/deviceApi';
import { buildTreeFromDevices } from '../lib/treeBuilder';
import { useStatusBarStore } from '../../../store/statusBarStore';
import { API_BASE_URL } from '../../../config/constants';
import { T3Transport } from '../../../../lib/t3-transport/core/T3Transport';
import { T3Database } from '../../../../lib/t3-database';
import PanelDataRefreshService from '../../../shared/services/panelDataRefreshService';

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

  // View Mode (Equipment View vs Project Point View)
  viewMode: 'equipment' | 'projectPoint';
  projectTreeData: TreeNode | null;
  deviceCapacities: Map<string, any>;

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

  // Actions: View Mode
  setViewMode: (mode: 'equipment' | 'projectPoint') => void;
  fetchProjectPointTree: () => Promise<void>;
  fetchDeviceCapacity: (serialNumber: string) => Promise<void>;

  // Actions: Data fetching
  fetchDevices: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  scanForDevices: (options?: ScanOptions) => Promise<void>;
  loadDevicesWithSync: () => Promise<void>;
  syncDevicePoints: (device: DeviceInfo) => Promise<void>;
  checkIfDeviceNeedsSync: (serialNumber: number) => Promise<boolean>;

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

  // Actions: Device Navigation
  getNextDevice: () => DeviceInfo | null;
  getPreviousDevice: () => DeviceInfo | null;
  getFilteredDevices: () => DeviceInfo[];

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

      // View Mode state
      viewMode: (localStorage.getItem('t3000-tree-view-mode') as 'equipment' | 'projectPoint') || 'equipment',
      projectTreeData: null,
      deviceCapacities: new Map<string, any>(),

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

          // Auto-expand root building and subnet nodes on first load
          const { expandedNodes } = get();
          if (expandedNodes.size === 0) {
            // Get unique root building names, auto-expand all levels
            const nodesToExpand = new Set<string>();
            response.devices.forEach((device) => {
              const rootBuilding = device.mainBuildingName || 'Default_Building';

              // Add root building node
              nodesToExpand.add(`building-${rootBuilding}`);

              // Add subnet node - ALWAYS "Local View" (hardcoded like C++)
              nodesToExpand.add(`subnet-${rootBuilding}-Local View`);
            });
            set({ expandedNodes: nodesToExpand });
          }

          get().buildTreeStructure();

          // Auto-select first device if none is selected
          const { selectedDevice, selectDevice, devices } = get();
          console.log(`[fetchDevices] Devices loaded:`, response.devices.map((d, idx) => `[${idx}] ${d.nameShowOnTree} (SN: ${d.serialNumber})`));
          console.log(`[fetchDevices] Current selectedDevice:`, selectedDevice?.nameShowOnTree || 'none');

          if (!selectedDevice && devices.length > 0) {
            // Sort devices alphabetically to match tree order
            const sortedDevices = [...devices].sort((a, b) => a.nameShowOnTree.localeCompare(b.nameShowOnTree));
            const firstDevice = sortedDevices[0];
            console.log(`[fetchDevices] Auto-selecting first device (alphabetically): ${firstDevice.nameShowOnTree} (SN: ${firstDevice.serialNumber})`);
            selectDevice(firstDevice);
          }

          // Update status bar with success message
          useStatusBarStore.getState().setMessage(`Loaded ${response.devices.length} devices`, 'success');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch devices';
          set({
            error: errorMessage,
            isLoading: false,
          });

          // Send error to status bar instead of inline display
          useStatusBarStore.getState().setMessage(`Error: ${errorMessage}`, 'error');
          console.error('Device fetch error:', errorMessage);
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

      // Load devices with full sync (device list + selected device points)
      loadDevicesWithSync: async () => {
        const { setMessage } = useStatusBarStore.getState();

        try {
          // Step 1: Load from DB (instant)
          setMessage('Loading devices from database...', 'info');
          await get().fetchDevices();

          const { devices } = get();
          if (devices.length === 0) {
            setMessage('No devices in database', 'warning');
          }

          // Step 2: Sync device list with T3000
          setMessage('Syncing device list with T3000...', 'info');

          // Initialize T3Transport with FFI
          const transport = new T3Transport({
            apiBaseUrl: `${API_BASE_URL}/api`
          });
          await transport.connect('ffi');

          // Call action 4: GET_PANELS_LIST
          const response = await transport.getDeviceList();

          // Check if response has data
          if (response && response.data && response.data.data) {
            const panels = response.data.data;
            console.log('[loadDevicesWithSync] FFI returned panels:', panels);

            // Save to database (best effort)
            let savedCount = 0;
            try {
              const db = new T3Database(`${API_BASE_URL}/api`);

              for (const panel of panels) {
                try {
                  const serialNumber = panel.serial_number || panel.serialNumber;
                  const panelName = panel.panel_name || panel.panelName || `Panel ${panel.panel_number}`;
                  const deviceData = {
                    SerialNumber: serialNumber,
                    Product_Name: panelName,
                    Product_ID: panel.pid || 0,
                    Panel_Number: panel.panel_number || 0,
                    MainBuilding_Name: 'Default_Building',
                    Building_Name: 'Local View',
                    show_label_name: panelName,
                    ip_address: panel.ip_address || panel.ipAddress || '',
                    port: panel.port || 0,
                  };

                  console.log(`[loadDevicesWithSync] Creating device ${serialNumber}:`, JSON.stringify(deviceData, null, 2));
                  await db.devices.create(deviceData);
                  console.log(`[loadDevicesWithSync] ✅ Device ${serialNumber} saved successfully`);
                  savedCount++;
                } catch (error: any) {
                  console.error(`[loadDevicesWithSync] Failed to save device ${serialNumber}:`, error);
                  console.error('[loadDevicesWithSync] Device data was:', JSON.stringify(deviceData, null, 2));
                }
              }
            } catch (dbError) {
              console.warn('[loadDevicesWithSync] Database operations failed:', dbError);
            }

            setMessage(`Found ${panels.length} device(s)`, 'success');

            // Step 3: Reload from DB to get updated list
            await get().fetchDevices();

            // Step 4: Auto-select first device (point sync handled by each page)
            const { devices: updatedDevices, selectDevice } = get();
            console.log(`[loadDevicesWithSync] Devices after reload:`, updatedDevices.map((d, idx) => `[${idx}] ${d.nameShowOnTree} (SN: ${d.serialNumber})`));

            if (updatedDevices.length > 0) {
              // Sort devices alphabetically to match tree order
              const sortedDevices = [...updatedDevices].sort((a, b) => a.nameShowOnTree.localeCompare(b.nameShowOnTree));
              const firstDevice = sortedDevices[0];
              console.log(`[loadDevicesWithSync] Selecting first device (alphabetically): ${firstDevice.nameShowOnTree} (SN: ${firstDevice.serialNumber})`);
              selectDevice(firstDevice);
            }
          } else {
            console.warn('[loadDevicesWithSync] No data in response:', response);
            setMessage('No devices found in T3000', 'warning');
          }

          await transport.disconnect();
        } catch (error) {
          console.error('[loadDevicesWithSync] Failed:', error);
          const errorMsg = error instanceof Error ? error.message : 'Failed to load devices';
          setMessage(errorMsg, 'error');
        }
      },

      // Check if device needs sync (DB is empty)
      checkIfDeviceNeedsSync: async (serialNumber: number): Promise<boolean> => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/t3_device/devices/${serialNumber}/points-count`);
          if (!response.ok) return false;

          const data = await response.json();
          const { inputCount, outputCount, variableCount } = data;

          // If all counts are zero, DB is empty - need sync
          return inputCount === 0 && outputCount === 0 && variableCount === 0;
        } catch (error) {
          console.warn('[checkIfDeviceNeedsSync] Failed:', error);
          return false; // On error, don't auto-sync
        }
      },

      // Sync device point data from T3000 via FFI
      syncDevicePoints: async (device: DeviceInfo) => {
        const { setMessage } = useStatusBarStore.getState();

        setMessage(`Syncing data for ${device.nameShowOnTree}...`, 'info');

        try {
          const [inputsResult, outputsResult, variablesResult] = await Promise.all([
            PanelDataRefreshService.refreshAllInputs(device.serialNumber),
            PanelDataRefreshService.refreshAllOutputs(device.serialNumber),
            PanelDataRefreshService.refreshAllVariables(device.serialNumber),
          ]);

          const inputCount = inputsResult.count || 0;
          const outputCount = outputsResult.count || 0;
          const variableCount = variablesResult.count || 0;
          const totalPoints = inputCount + outputCount + variableCount;

          setMessage(
            `✓ Synced ${device.nameShowOnTree}: ${inputCount} inputs, ${outputCount} outputs, ${variableCount} variables`,
            'success'
          );
        } catch (error) {
          console.error('[syncDevicePoints] Failed:', error);
          setMessage(`Failed to sync ${device.nameShowOnTree}, showing cached data`, 'warning');
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
        // TODO: Commented out - API endpoint not implemented yet
        // try {
        //   const statusResult = await DeviceApiService.checkDeviceStatus(serialNumber);
        //   set((state) => {
        //     const newStatuses = new Map(state.deviceStatuses);
        //     newStatuses.set(serialNumber, statusResult.status);
        //     return { deviceStatuses: newStatuses };
        //   });
        // } catch (error) {
        //   console.error(`Failed to check status for device ${serialNumber}:`, error);
        // }
        console.log(`checkDeviceStatus called for device ${serialNumber} (disabled)`);
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

        // Sort devices by name (alphabetically) for consistent order in tree
        filteredDevices.sort((a, b) => a.nameShowOnTree.localeCompare(b.nameShowOnTree));

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
        console.log(`[selectNode] Called with nodeId: ${nodeId}`);
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
        console.log(`[selectNode] Found node:`, node?.data ? `${node.data.nameShowOnTree} (SN: ${node.data.serialNumber})` : 'none');
        set({
          selectedNodeId: nodeId,
          selectedDevice: node?.data || null,
        });
      },

      // Select device directly
      selectDevice: async (device: DeviceInfo | null) => {
        console.log(`[selectDevice] Called with device:`, device ? `${device.nameShowOnTree} (SN: ${device.serialNumber})` : 'null');
        set({
          selectedDevice: device,
          selectedNodeId: device ? `device-${device.serialNumber}` : null,
        });

        // Smart auto-sync: Check if device needs sync (DB is empty)
        if (device) {
          const needsSync = await get().checkIfDeviceNeedsSync(device.serialNumber);
          if (needsSync) {
            // DB is empty, auto-sync from device
            console.log(`[selectDevice] Auto-syncing ${device.nameShowOnTree} (DB empty)`);
            await get().syncDevicePoints(device);
          } else {
            console.log(`[selectDevice] Using cached data for ${device.nameShowOnTree}`);
          }
        }
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

      // Get filtered devices list (applies same filters as buildTreeStructure)
      getFilteredDevices: () => {
        const { devices, filterText, filterProtocol, filterBuilding, showOfflineOnly, deviceStatuses } = get();

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

        // Sort devices by name (alphabetically) for consistent order
        filteredDevices.sort((a, b) => a.nameShowOnTree.localeCompare(b.nameShowOnTree));

        return filteredDevices;
      },

      // Get next device in filtered list
      getNextDevice: () => {
        const { selectedDevice } = get();
        const filteredDevices = get().getFilteredDevices();

        console.log('[deviceTreeStore] getNextDevice called:', {
          selectedDevice: selectedDevice ? `${selectedDevice.nameShowOnTree} (SN: ${selectedDevice.serialNumber})` : 'none',
          totalFilteredDevices: filteredDevices.length,
          deviceList: filteredDevices.map(d => `${d.nameShowOnTree} (SN: ${d.serialNumber})`),
        });

        if (!selectedDevice) {
          console.log('[deviceTreeStore] No selected device');
          return null;
        }

        if (filteredDevices.length === 0) {
          console.log('[deviceTreeStore] No filtered devices available');
          return null;
        }

        // Only one device - no next device
        if (filteredDevices.length === 1) {
          console.log('[deviceTreeStore] Only one device available');
          return null;
        }

        const currentIndex = filteredDevices.findIndex(d => d.serialNumber === selectedDevice.serialNumber);

        console.log('[deviceTreeStore] Current device index:', currentIndex);

        if (currentIndex === -1) {
          console.log('[deviceTreeStore] Current device not in filtered list');
          return null;
        }

        const nextIndex = currentIndex + 1;

        // Circular navigation: if at last device, loop back to first
        if (nextIndex >= filteredDevices.length) {
          const firstDevice = filteredDevices[0];
          console.log(`[deviceTreeStore] At last device (${currentIndex + 1}/${filteredDevices.length}), looping to first: ${firstDevice.nameShowOnTree}`);
          return firstDevice;
        }

        const nextDevice = filteredDevices[nextIndex];
        console.log(`[deviceTreeStore] Next device found: ${nextDevice.nameShowOnTree} (SN: ${nextDevice.serialNumber}) - ${nextIndex + 1}/${filteredDevices.length}`);

        return nextDevice;
      },

      // Get previous device in filtered list
      getPreviousDevice: () => {
        const { selectedDevice } = get();
        const filteredDevices = get().getFilteredDevices();

        if (!selectedDevice || filteredDevices.length === 0) return null;

        const currentIndex = filteredDevices.findIndex(d => d.serialNumber === selectedDevice.serialNumber);

        if (currentIndex === -1) return null; // Current device not in filtered list

        const previousIndex = currentIndex - 1;

        return previousIndex >= 0 ? filteredDevices[previousIndex] : null;
      },

      // Background sync thread (maps to C++ m_pFreshTree)
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

      // View Mode actions
      setViewMode: (mode: 'equipment' | 'projectPoint') => {
        localStorage.setItem('t3000-tree-view-mode', mode);
        set({ viewMode: mode });

        // If switching to project point view, fetch the tree data
        if (mode === 'projectPoint') {
          get().fetchProjectPointTree();
        }
      },

      fetchProjectPointTree: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE_URL}/api/t3_device/tree/project-view`);
          if (!response.ok) {
            throw new Error('Failed to fetch project point tree');
          }
          const data = await response.json();
          set({
            projectTreeData: data,
            isLoading: false,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch project point tree';
          set({
            error: errorMessage,
            isLoading: false,
          });
          useStatusBarStore.getState().setMessage(errorMessage, 'error');
        }
      },

      fetchDeviceCapacity: async (serialNumber: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/t3_device/devices/${serialNumber}/capacity`);
          if (!response.ok) {
            throw new Error('Failed to fetch device capacity');
          }
          const data = await response.json();
          const { deviceCapacities } = get();
          deviceCapacities.set(serialNumber, data);
          set({ deviceCapacities: new Map(deviceCapacities) });
        } catch (error) {
          console.error('Error fetching device capacity:', error);
        }
      },
    }),
    { name: 'DeviceTreeStore' }
  )
);

export default useDeviceTreeStore;
