/**
 * TreePanel Component
 *
 * Main container for device tree left panel
 * Integrates toolbar, filter, and DeviceTree components
 * Maps to C++ CMainFrame left panel structure
 *
 * C++ Reference (LEFT_PANEL_CPP_DESIGN.md Section 3):
 * - CMainFrame::m_pTreeCtrl → DeviceTree
 * - Toolbar buttons → TreeToolbar (Phase 4)
 * - m_pFreshTree thread → useDeviceSyncService (Phase 3)
 * - m_pCheck_net_device_online → useDeviceStatusMonitor (Phase 3)
 */

import React, { useEffect } from 'react';
import { Spinner } from '@fluentui/react-components';
import { ArrowClockwise16Regular, RouterRegular } from '@fluentui/react-icons';
import { DeviceTree } from './DeviceTree/DeviceTree';
import { ProjectPointTree } from './ProjectPointTree';
import { TreeToolbar } from './TreeToolbar/TreeToolbar';
import { TreeFilter } from './TreeFilter/TreeFilter';
import { useDeviceTreeStore } from '../store/deviceTreeStore';
import { useDeviceStatusMonitor } from '../../../shared/hooks/useDeviceStatusMonitor';
import { useDeviceSyncService } from '../../../shared/hooks/useDeviceSyncService';
import { useStatusBarStore } from '../../../store/statusBarStore';
import styles from './TreePanel.module.css';

/**
 * TreePanel Component
 */
export const TreePanel: React.FC = () => {
  const { viewMode, fetchDevices, loadDevicesWithSync, isLoading, error, devices, treeData } = useDeviceTreeStore();
  const [showFilter, setShowFilter] = React.useState(false);
  const hasInitialized = React.useRef(false);

  // Background services
  // Status monitor: polls device status every 30s (C++ m_pCheck_net_device_online)
  useDeviceStatusMonitor({ enabled: true, intervalMs: 30000 });

  // Sync service: refreshes device list every 5 minutes (C++ m_pFreshTree)
  useDeviceSyncService({ enabled: true, intervalMs: 300000 });

  // Initial data fetch with auto-sync if database is empty
  // Use ref to prevent React StrictMode from running this twice
  useEffect(() => {
    const initializeDevices = async () => {
      // Prevent duplicate runs in StrictMode
      if (hasInitialized.current) {
        console.log('[TreePanel] Already initialized, skipping...');
        return;
      }
      hasInitialized.current = true;

      console.log('[TreePanel] First-time initialization...');

      // First, check database
      await fetchDevices();

      // If database is empty, auto-sync from T3000
      const { devices } = useDeviceTreeStore.getState();
      if (devices.length === 0) {
        console.log('[TreePanel] No devices in database, auto-syncing from T3000...');
        await loadDevicesWithSync();
      } else {
        console.log(`[TreePanel] Found ${devices.length} devices in database, skipping auto-sync`);
      }
    };

    initializeDevices();
  }, []);

  const toggleFilter = () => {
    setShowFilter(!showFilter);
  };

  const handleRetry = () => {
    fetchDevices();
  };

  const handleLoadDevices = async () => {
    await loadDevicesWithSync();
  };

  return (
    <div className={styles.container}>
      {/* Toolbar with actions */}
      <TreeToolbar showFilter={showFilter} onToggleFilter={toggleFilter} />

      {/* Filter controls - collapsible */}
      {showFilter && <TreeFilter />}

      {/* Tree content area */}
      <div className={styles.treeContainer}>
        {/* Loading state */}
        {isLoading && (
          <div className={styles.loadingContainer}>
            <Spinner
              size="tiny"
              label="Loading devices..."
              labelPosition="after"
              className={styles.loadingSpinner}
            />
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className={styles.errorContainer}>
            <div className={styles.errorTitle}>No devices to display</div>
            <div className={styles.errorMessage}>
              There was a problem connecting to the server. Please check your connection and try again.
            </div>
            <button
              className={styles.retryButton}
              onClick={handleRetry}
            >
              <ArrowClockwise16Regular className={styles.buttonIcon} />
              Refresh
            </button>
          </div>
        )}

        {/* Empty state - no devices at all */}
        {!isLoading && !error && devices.length === 0 && (
          <div className={styles.emptyContainer}>
            <div className={styles.emptyIconWrapper}>
              <RouterRegular className={styles.emptyIcon} fontSize={32} />
            </div>
            <div className={styles.emptyTitle}>No Devices Found</div>
            <div className={styles.emptyMessage}>
              Load your devices to get started
            </div>
            <button
              className={styles.scanButton}
              onClick={handleLoadDevices}
            >
              Load Devices
            </button>
          </div>
        )}

        {/* No results state - filtered out */}
        {!isLoading && !error && devices.length > 0 && treeData.length === 0 && (
          <div className={styles.emptyContainer}>
            <div className={styles.emptyIcon}>🔍</div>
            <div className={styles.emptyTitle}>No Results Found</div>
            <div className={styles.emptyMessage}>
              Try adjusting your filters
            </div>
          </div>
        )}

        {/* Tree with devices */}
        {!isLoading && !error && treeData.length > 0 && (
          <>
            {viewMode === 'equipment' ? <DeviceTree /> : <ProjectPointTree />}
          </>
        )}
      </div>
    </div>
  );
};

export default TreePanel;
