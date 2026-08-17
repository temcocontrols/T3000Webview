/**
 * Device Tree Zustand Store
 *
 * Manages all device tree state and operations
 * Maps to C++ m_product vector and CMainFrame methods
 *
 * C++ Reference:
 * - m_product vector devices array
 * - product_register_value deviceStatuses map
 * - m_refresh_net_label needsRefresh flag
 * - m_pFreshTree thread startSync() / stopSync()
 * - m_pCheck_net_device_online startStatusMonitor()
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
import { buildTreeFromDevices, buildFlatDeviceNodes } from '../lib/treeBuilder';
import { useStatusBarStore } from '../../../store/statusBarStore';
import { API_BASE_URL } from '../../../config/constants';
import { T3Transport } from '../../../../lib/t3-transport/core/T3Transport';
import { T3Database } from '../../../../lib/t3-database';
import PanelDataRefreshService from '../../../shared/services/panelDataRefreshService';
import LogUtil from '@common/t3-hvac/Util/LogUtil';

/**
 * Clean device name: remove null bytes and garbage characters from C++ buffers
 */
const cleanDeviceName = (name: string | undefined | null, fallback: string = 'Unknown'): string => {
  if (!name) return fallback;
  // Remove null bytes and everything after, then trim
  const cleaned = name.split('\0')[0].trim();
  return cleaned || fallback;
};

// A sub-device has a non-zero parent serial (it lives on its parent's subnet
// and is not directly addressable). Hidden from the tree until the UI supports
// nesting them under their parent like C++ does.
const isSubDevice = (d: DeviceInfo): boolean =>
  Number(d.parentSerialNumber ?? d.noteParentSerialNumber ?? 0) > 0;

// Prevent duplicate bursts when multiple components trigger fetches at the same time.
let fetchDevicesInFlight: Promise<void> | null = null;
let scanInProgress = false;

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
  showOfflineDevices: boolean;

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
  loadDevicesWithSync: (options?: { skipInitialFetch?: boolean }) => Promise<void>;
  syncDatabaseWithCpp: () => Promise<void>; // Manual cleanup: sync DB with C++ side
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
  toggleShowOfflineDevices: () => void;
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
      showOfflineDevices: false,

      isSyncing: false,
      lastSyncTime: null,
      syncInterval: null,
      statusMonitorInterval: null,

      // Fetch devices from API
      fetchDevices: async () => {
        if (fetchDevicesInFlight) {
          return fetchDevicesInFlight;
        }

        fetchDevicesInFlight = (async () => {
          set({ isLoading: true, error: null });
          try {
            const response = await DeviceApiService.getAllDevices();

            // Clean device names (remove null bytes and garbage from C++ buffers).
            // Unknown devices are kept in the store (saved to DB) but hidden from the tree
            // by buildTreeStructure.  Their name is left as-is �?do NOT format them as
            // "Panel X (SN YYYY)" since they don't have real discovery data.
            const cleanedDevices = response.devices
              .map(device => ({
                ...device,
                nameShowOnTree: cleanDeviceName(device.nameShowOnTree, ''),
                productName: cleanDeviceName(device.productName, ''),
              }));

            set({
              devices: cleanedDevices,
              isLoading: false,
              lastSyncTime: new Date(),
            });

            // Seed deviceStatuses from persisted isOnline field (only if scan has run)
            const newStatuses = new Map<number, DeviceStatus>();
            cleanedDevices.forEach((d) => {
              // Only trust persisted status if last_checked is set (scan actually ran)
              if (d.lastChecked) {
                if (d.isOnline === true || d.isOnline === (1 as any)) {
                  newStatuses.set(d.serialNumber, 'online');
                } else {
                  newStatuses.set(d.serialNumber, 'offline');
                }
              }
              // No last_checked �?stays 'unknown' (info icon)
            });
            set({ deviceStatuses: newStatuses });

            // Auto-expand root building on first load (devices directly under building, no subnet level)
            const { expandedNodes } = get();
            if (expandedNodes.size === 0) {
              const nodesToExpand = new Set<string>();
              response.devices.forEach((device) => {
                const rootBuilding = device.mainBuildingName || 'Default_Building';
                nodesToExpand.add(`building-${rootBuilding}`);
              });
              set({ expandedNodes: nodesToExpand });
            }

            get().buildTreeStructure();

            // Auto-select first device if none is selected
            // Use same filtering & sorting as buildTreeStructure so selection matches the tree
            const { selectedDevice, selectDevice, devices, deviceStatuses } = get();

            if (!selectedDevice && devices.length > 0) {
              // Match buildTreeStructure: filter unknown + sort alphabetically
              const isUnknown = (d: DeviceInfo) =>
                !d.nameShowOnTree || d.nameShowOnTree === 'Unknown' || d.nameShowOnTree === '(Unknown)';
              const knownDevices = devices.filter(d => !isUnknown(d) && !isSubDevice(d));
              knownDevices.sort((a, b) => a.nameShowOnTree.localeCompare(b.nameShowOnTree));

              // Prefer ONLINE devices for the default selection. Offline devices
              // are hidden by default (the offline group starts collapsed), so
              // selecting one would leave the tree with no visible selection.
              const isOnline = (d: DeviceInfo) => deviceStatuses.get(d.serialNumber) === 'online';
              const onlineDevices = knownDevices.filter(isOnline);

              // Try to restore last-selected device from localStorage first,
              // but only if it is still online (otherwise fall back to online).
              const lastSerial = localStorage.getItem('t3.lastSelectedDevice');
              const lastDevice = lastSerial
                ? onlineDevices.find(d => String(d.serialNumber) === lastSerial)
                : null;

              if (lastDevice) {
                selectDevice(lastDevice);
              } else {
                // Default to the first ONLINE device; fall back to the first
                // known device when no online status is confirmed yet.
                const firstDevice =
                  onlineDevices.length > 0
                    ? onlineDevices[0]
                    : (knownDevices.length > 0 ? knownDevices[0] : null);
                if (firstDevice) {
                  selectDevice(firstDevice);
                }
              }
            }

            // Update status bar with device counts from DB
            const allDevices = response.devices;
            const isUnknownDevice = (d: any) => {
              const name = (d.productName || d.showLabelName || '').trim();
              return !name || name === '(Unknown)' || name === 'Unknown';
            };
            const visible = allDevices.filter((d: any) => !isUnknownDevice(d));
            const hidden = allDevices.filter((d: any) => isUnknownDevice(d));
            const onlineList = visible.filter((d: any) => d.isOnline === 1 || d.isOnline === true);
            const offlineList = visible.filter((d: any) => !(d.isOnline === 1 || d.isOnline === true));
            const parts: string[] = [];
            if (onlineList.length > 0) {
              parts.push(`${onlineList.length} online (${onlineList.map((d: any) => d.productName).join(', ')})`);
            }
            if (offlineList.length > 0) {
              const names = offlineList.map((d: any) => d.productName).join(', ');
              parts.push(`${offlineList.length} offline (${names})`);
            }
            if (hidden.length > 0) {
              const sns = hidden.map((d: any) => `SN${d.serialNumber}`).join(', ');
              parts.push(`${hidden.length} unknown (${sns})`);
            }
            useStatusBarStore.getState().setMessage(parts.join(' | '), 'success');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch devices';
            set({
              error: errorMessage,
              isLoading: false,
            });

            // Send error to status bar instead of inline display
            useStatusBarStore.getState().setMessage(`Error: ${errorMessage}`, 'error');
            LogUtil.Error('Device fetch error:', errorMessage);
          } finally {
            fetchDevicesInFlight = null;
          }
        })();

        return fetchDevicesInFlight;
      },

      // Refresh devices (alias for fetchDevices)
      refreshDevices: async () => {
        await get().fetchDevices();
      },

      // Scan for new devices
      scanForDevices: async (options?: ScanOptions) => {
        if (scanInProgress) return;
        scanInProgress = true;
        const { setMessage } = useStatusBarStore.getState();
        try {
          setMessage('Scanning network for T3000 devices...', 'info');
          const response = await DeviceApiService.scanAndRefreshDevices(options?.timeout ?? 8);

          const cleanedDevices = response.devices
            .map(device => ({
              ...device,
              nameShowOnTree: cleanDeviceName(device.nameShowOnTree, ''),
              productName: cleanDeviceName(device.productName, ''),
            }));

          const newStatuses = new Map<number, DeviceStatus>();
          cleanedDevices.forEach((d) => {
            if (d.lastChecked) {
              newStatuses.set(d.serialNumber, d.isOnline === true || d.isOnline === (1 as any) ? 'online' : 'offline');
            }
          });

          // Keep ALL devices in the store — buildTreeStructure splits online (top)
          // and offline (collapsible group at bottom).
          set({ devices: cleanedDevices, deviceStatuses: newStatuses, lastSyncTime: new Date() });
          get().buildTreeStructure();
          const scannedCount = response.scanned ?? 0;
          setMessage(`Scan complete — ${scannedCount} device(s) found on network`, 'success');
        } catch (error) {
          setMessage('Network scan failed', 'warning');
        } finally {
          scanInProgress = false;
        }
      },

      // Load devices with full sync (device list + selected device points)
      loadDevicesWithSync: async (options) => {
        const { setMessage } = useStatusBarStore.getState();
        const skipInitialFetch = Boolean(options?.skipInitialFetch);

        try {
          // Step 1: Optional load from DB (instant)
          if (!skipInitialFetch) {
            setMessage('Loading devices from database...', 'info');
            await get().fetchDevices();

            const { devices } = get();
            if (devices.length === 0) {
              setMessage('No devices in database', 'warning');
            }
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


            // Log detailed panel information for debugging
            panels.forEach((_panel: any, _idx: number) => {
            });

            // Filter out unknown devices before processing
            const _knownPanels = panels.filter((_panel: any) => {
              const name = (_panel.panel_name || _panel.panelName || '').trim();
              return name !== '(Unknown)' && name !== '';
            });

            // Save ALL panels to database (including Unknown ones)
            // Tree display will filter them out later via buildTreeFromDevices
            let savedCount = 0;
            let failedCount = 0;
            try {
              const db = new T3Database(`${API_BASE_URL}/api`);

              for (const panel of panels) {
                let serialNumber: number | undefined;
                let deviceData: any = undefined;
                try {
                  serialNumber = panel.serial_number || panel.serialNumber;

                  // Keep raw panel_name (including "(Unknown)") �?do NOT format as
                  // "Panel X (SN YYYY)" since unknown devices should be hidden.
                  const rawPanelName = panel.panel_name || panel.panelName;
                  const panelName = cleanDeviceName(rawPanelName, '');
                  const panelNumber = panel.panel_number || panel.Panel_Number;

                  deviceData = {
                    SerialNumber: serialNumber,
                    Product_Name: panelName,
                    Product_ID: panel.pid || panel.Product_ID || null,
                    Panel_Number: panelNumber,
                    MainBuilding_Name: 'Default_Building',
                    Building_Name: 'Local View',
                    show_label_name: panelName,
                    is_online: 1,
                    last_checked: new Date().toISOString(),
                    // Don't set description - let backend handle it or leave null
                  };

                  // Add BACnet_MSTP_MAC_ID if available (from object_instance)
                  if (panel.object_instance !== undefined && panel.object_instance !== null) {
                    deviceData.BACnet_MSTP_MAC_ID = panel.object_instance;
                  }

                  await db.devices.create(deviceData);
                  savedCount++;
                } catch (error: any) {
                  // Create may fail if device already exists �?try update to at least refresh online status
                  if (serialNumber && (error?.message || '').toLowerCase().includes('duplicate') || String(error).includes('already exists')) {
                    try {
                      await fetch(`${API_BASE_URL}/api/t3_device/devices/${serialNumber}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_online: 1, last_checked: new Date().toISOString() }),
                      });
                      savedCount++;
                      continue;
                    } catch (updateErr) {
                      LogUtil.Error(`[loadDevicesWithSync] Update also failed for ${serialNumber}:`, updateErr);
                    }
                  }
                  failedCount++;
                  LogUtil.Error(`[loadDevicesWithSync] Failed to save device ${serialNumber ?? 'UNKNOWN'}:`, error);
                  LogUtil.Error('[loadDevicesWithSync] Device data was:', deviceData ?? 'NOT_SET');
                  LogUtil.Error('[loadDevicesWithSync] Error details:', error?.message || error);
                }
              }
            } catch (dbError) {
              console.warn('[loadDevicesWithSync] Database operations failed:', dbError);
            }

            // Show detailed statistics
            if (savedCount > 0) {
              setMessage(`Found ${panels.length} device(s), saved ${savedCount} successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`, savedCount === panels.length ? 'success' : 'warning');
            } else {
              setMessage(`Found ${panels.length} device(s) but failed to save any to database`, 'error');
            }

            // Mark offline devices: update last_checked for all DB devices not in FFI response,
            // so the frontend can trust their isOnline=0 status (otherwise they stay "unknown")
            try {
              const onlineSerials = panels.map((p: any) => p.serial_number || p.serialNumber).filter(Boolean);
              const allDbSerials = get().devices.map(d => d.serialNumber);
              const offlineSerials = allDbSerials.filter(s => !onlineSerials.includes(s));
              if (offlineSerials.length > 0) {
                const now = new Date().toISOString();
                await Promise.all(offlineSerials.map(s =>
                  fetch(`${API_BASE_URL}/api/t3_device/devices/${s}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_online: 0, last_checked: now }),
                  }).catch(() => { })
                ));
              }
            } catch (e) {
              console.warn('[loadDevicesWithSync] Failed to mark offline:', e);
            }

            // Step 3: Reload from DB to get updated list
            await get().fetchDevices();

            // Show final summary: FFI result vs DB state (with device names)
            const { devices: updatedDevices, selectDevice, deviceStatuses: finalStatuses } = get();
            const ffiNames = panels.map((p: any) => p.panel_name || p.panelName || '').filter(Boolean);
            const isUnknown = (d: DeviceInfo) => {
              const name = (d.productName || d.showLabelName || '').trim();
              return !name || name === '(Unknown)' || name === 'Unknown';
            };
            const visibleDevs = updatedDevices.filter(d => !isUnknown(d));
            const hiddenDevs = updatedDevices.filter(d => isUnknown(d));
            const onlineList = visibleDevs.filter(d => finalStatuses.get(d.serialNumber) === 'online');
            const offlineList = visibleDevs.filter(d => finalStatuses.get(d.serialNumber) === 'offline');
            const summaryParts: string[] = [];
            if (ffiNames.length > 0) summaryParts.push(`FFI: ${ffiNames.join(', ')}`);
            if (onlineList.length > 0) summaryParts.push(`${onlineList.length} online (${onlineList.map(d => d.nameShowOnTree).join(', ')})`);
            if (offlineList.length > 0) summaryParts.push(`${offlineList.length} offline (${offlineList.map(d => d.nameShowOnTree).join(', ')})`);
            if (hiddenDevs.length > 0) summaryParts.push(`${hiddenDevs.length} unknown (${hiddenDevs.map(d => `SN${d.serialNumber}`).join(', ')})`);
            setMessage(summaryParts.join(' | '), offlineList.length > 0 ? 'warning' : 'success');

            if (updatedDevices.length > 0) {
              // Sort devices alphabetically, pushing (Unknown) devices to the bottom
              const sortedDevices = [...updatedDevices].sort((a, b) => {
                const aUnknown = a.nameShowOnTree === '(Unknown)' || a.nameShowOnTree === 'Unknown';
                const bUnknown = b.nameShowOnTree === '(Unknown)' || b.nameShowOnTree === 'Unknown';
                if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
                return a.nameShowOnTree.localeCompare(b.nameShowOnTree);
              });
              const firstDevice = sortedDevices[0];
              selectDevice(firstDevice);
            }
          } else {
            console.warn('[loadDevicesWithSync] No data in response:', response);
            setMessage('No devices found in T3000', 'warning');
          }

          await transport.disconnect();

          // Step 4: Background UDP LAN scan to enrich device info (non-blocking)
          get().scanForDevices({ timeout: 8 }).catch(() => {});
        } catch (error) {
          LogUtil.Error('[loadDevicesWithSync] Failed:', error);
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

      // Clear all devices from database via API
      syncDatabaseWithCpp: async () => {
        const { setMessage } = useStatusBarStore.getState();

        try {
          setMessage('Removing all devices from list...', 'info');

          // Call API to delete all devices
          const response = await fetch(`${API_BASE_URL}/api/t3_device/devices`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          const deletedCount = result.rows_affected || 0;

          if (deletedCount > 0) {
            setMessage(`Removed ${deletedCount} device(s) from list`, 'success');
          } else {
            setMessage('No devices to remove', 'info');
          }

          // Clear the state and reload
          set({ devices: [], selectedDevice: null, selectedNodeId: null });
          get().buildTreeStructure();

        } catch (error) {
          LogUtil.Error('[syncDatabaseWithCpp] Error:', error);
          setMessage('Failed to remove devices', 'error');
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

          const inputCount = inputsResult.savedCount || inputsResult.itemCount || 0;
          const outputCount = outputsResult.savedCount || outputsResult.itemCount || 0;
          const variableCount = variablesResult.savedCount || variablesResult.itemCount || 0;

          setMessage(
            `Synced ${device.nameShowOnTree}: ${inputCount} inputs, ${outputCount} outputs, ${variableCount} variables`,
            'success'
          );
        } catch (error) {
          LogUtil.Error('[syncDevicePoints] Failed:', error);
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
          // Guard: if the API returned a malformed object (no serialNumber), fall back to
          // merging the updates into the existing local device so selectedDevice is never broken.
          const safeDevice: DeviceInfo = updatedDevice?.serialNumber
            ? updatedDevice
            : (() => {
              const merged = { ...(get().devices.find(d => d.serialNumber === serialNumber)!), ...updates };
              return {
                ...merged,
                nameShowOnTree: (updates as any).showLabelName || merged.showLabelName || merged.productName || `Device ${serialNumber}`,
              };
            })();
          set((state) => ({
            devices: state.devices.map((d) =>
              d.serialNumber === serialNumber ? safeDevice : d
            ),
            // Also update selectedDevice so the UI header reflects the new name immediately
            selectedDevice:
              state.selectedDevice?.serialNumber === serialNumber
                ? safeDevice
                : state.selectedDevice,
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
          LogUtil.Error(`Failed to check status for device ${serialNumber}:`, error);
        }
      },

      // Connect to device
      connectDevice: async (serialNumber: number) => {
        try {
          await DeviceApiService.connectDevice(serialNumber);
        } catch (error) {
          LogUtil.Error(`Failed to connect to device ${serialNumber}:`, error);
          throw error;
        }
      },

      // Disconnect from device
      disconnectDevice: async (serialNumber: number) => {
        try {
          await DeviceApiService.disconnectDevice(serialNumber);
        } catch (error) {
          LogUtil.Error(`Failed to disconnect from device ${serialNumber}:`, error);
          throw error;
        }
      },

      // Build tree structure from flat device list
      buildTreeStructure: () => {
        const { devices, filterText, filterProtocol, filterBuilding, showOfflineDevices, deviceStatuses, expandedNodes } = get();

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

        // Hide unknown devices from the tree — they are saved to DB but have no
        // real discovery data and would clutter the UI with empty entries.
        const isUnknownDevice = (d: DeviceInfo) =>
          !d.nameShowOnTree || d.nameShowOnTree === 'Unknown' || d.nameShowOnTree === '(Unknown)';
        filteredDevices = filteredDevices.filter(d => !isUnknownDevice(d));

        // Hide sub-devices (parent serial != 0): they are reached through their
        // parent and are not directly addressable via GET_WEBVIEW_LIST.
        filteredDevices = filteredDevices.filter(d => !isSubDevice(d));

        // Split into online (top) and offline (collapsible group at bottom)
        const byName = (a: DeviceInfo, b: DeviceInfo) => a.nameShowOnTree.localeCompare(b.nameShowOnTree);
        const onlineDevices = filteredDevices
          .filter((d) => deviceStatuses.get(d.serialNumber) === 'online')
          .sort(byName);
        const offlineDevices = filteredDevices
          .filter((d) => deviceStatuses.get(d.serialNumber) !== 'online')
          .sort(byName);

        // Use treeBuilder utility to construct tree (online devices only at top)
        const treeNodes = buildTreeFromDevices(onlineDevices, expandedNodes, deviceStatuses);

        // Append offline group (leaf) + its devices as flat siblings inside the building
        if (offlineDevices.length > 0) {
          const offlineGroupNode: TreeNode = {
            id: 'offline-group',
            type: 'device',
            label: showOfflineDevices
              ? 'Hide offline devices'
              : `Show ${offlineDevices.length} more offline`,
            icon: 'Devices3',
            expanded: showOfflineDevices,
            level: 1,
          };

          const extraNodes: TreeNode[] = showOfflineDevices
            ? [offlineGroupNode, ...buildFlatDeviceNodes(offlineDevices, expandedNodes, deviceStatuses)]
            : [offlineGroupNode];

          if (treeNodes.length > 0) {
            const lastBuilding = treeNodes[treeNodes.length - 1];
            lastBuilding.children = [...(lastBuilding.children || []), ...extraNodes];
          } else {
            treeNodes.push(...extraNodes);
          }
        }

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

        // Update status bar with selected device
        if (node?.data) {
          const { setDeviceLabel } = useStatusBarStore.getState();
          setDeviceLabel(node.data.nameShowOnTree || node.data.productName || '', node.data.serialNumber, node.data.panelId ?? node.data.panelNumber);
        }

        // Persist selection so it survives page refresh
        if (node?.data) {
          localStorage.setItem('t3.lastSelectedDevice', String(node.data.serialNumber));
          // Notify the MCP server so device_current tool knows the UI selection
          fetch(`${API_BASE_URL}/api/mcp/current-device`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serial_number: node.data.serialNumber, device_name: node.data.showLabelName ?? node.data.productName ?? null }),
          }).catch(() => {});
        }
      },

      // Select device directly
      selectDevice: async (device: DeviceInfo | null) => {
        set({
          selectedDevice: device,
          selectedNodeId: device ? `device-${device.serialNumber}` : null,
        });

        // Update status bar with selected device
        if (device) {
          const { setDeviceLabel } = useStatusBarStore.getState();
          setDeviceLabel(device.nameShowOnTree || device.productName || '', device.serialNumber, device.panelId ?? device.panelNumber);
        }

        // Persist selection so it survives page refresh
        if (device) {
          localStorage.setItem('t3.lastSelectedDevice', String(device.serialNumber));
          // Notify the MCP server so device_current tool knows the UI selection
          fetch(`${API_BASE_URL}/api/mcp/current-device`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serial_number: device.serialNumber, device_name: device.showLabelName ?? device.productName ?? null }),
          }).catch(() => {}); // fire-and-forget, don't block UI
        } else {
          localStorage.removeItem('t3.lastSelectedDevice');
        }

        // Smart auto-sync: Check if device needs sync (DB is empty)
        if (device) {
          const needsSync = await get().checkIfDeviceNeedsSync(device.serialNumber);
          if (needsSync) {
            // DB is empty, auto-sync from device
            await get().syncDevicePoints(device);
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

      toggleShowOfflineDevices: () => {
        const { showOfflineDevices, selectedDevice, deviceStatuses, devices } = get();
        const willShow = !showOfflineDevices;

        set({ showOfflineDevices: willShow });

        // When collapsing the offline group, the currently selected offline device
        // becomes hidden. Fall back to selecting the first online device instead.
        if (!willShow && selectedDevice) {
          const selectedStatus = deviceStatuses.get(selectedDevice.serialNumber);
          if (selectedStatus !== 'online') {
            const onlineDevices = devices
              .filter((d) => !isSubDevice(d) && deviceStatuses.get(d.serialNumber) === 'online')
              .sort((a, b) => a.nameShowOnTree.localeCompare(b.nameShowOnTree));
            if (onlineDevices.length > 0) {
              get().selectNode(`device-${onlineDevices[0].serialNumber}`);
            } else {
              set({ selectedDevice: null, selectedNodeId: null });
            }
          }
        }

        get().buildTreeStructure();
      },

      clearFilters: () => {
        set({
          filterText: '',
          filterProtocol: 'All',
          filterBuilding: 'All',
          showOfflineDevices: false,
        });
        get().buildTreeStructure();
      },

      // Get filtered devices list (applies same filters as buildTreeStructure)
      getFilteredDevices: () => {
        const { devices, filterText, filterProtocol, filterBuilding, deviceStatuses } = get();

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

        // Hide sub-devices — only top-level (parent) devices are navigable.
        filteredDevices = filteredDevices.filter(d => !isSubDevice(d));

        // Sort: online first, then offline; alphabetically within each group
        const statusRank = (d: DeviceInfo): number => {
          const s = deviceStatuses.get(d.serialNumber);
          if (s === 'online') return 0;
          if (s === 'offline') return 1;
          return 2;
        };
        filteredDevices.sort((a, b) => {
          const rankDiff = statusRank(a) - statusRank(b);
          if (rankDiff !== 0) return rankDiff;
          return a.nameShowOnTree.localeCompare(b.nameShowOnTree);
        });

        return filteredDevices;
      },

      // Get next device in filtered list
      getNextDevice: () => {
        const { selectedDevice } = get();
        const filteredDevices = get().getFilteredDevices();


        if (!selectedDevice) {
          return null;
        }

        if (filteredDevices.length === 0) {
          return null;
        }

        // Only one device - no next device
        if (filteredDevices.length === 1) {
          return null;
        }

        const currentIndex = filteredDevices.findIndex(d => d.serialNumber === selectedDevice.serialNumber);


        if (currentIndex === -1) {
          return null;
        }

        const nextIndex = currentIndex + 1;

        // Circular navigation: if at last device, loop back to first
        if (nextIndex >= filteredDevices.length) {
          const firstDevice = filteredDevices[0];
          return firstDevice;
        }

        const nextDevice = filteredDevices[nextIndex];

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
        // Guard against concurrent calls �?return early if already fetching
        const { isLoading } = get();
        if (isLoading) return;

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
          LogUtil.Error('Error fetching device capacity:', error);
        }
      },
    }),
    { name: 'DeviceTreeStore' }
  )
);

export default useDeviceTreeStore;