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
import { ArrowClockwise16Regular } from '@fluentui/react-icons';
import { DeviceTree } from './DeviceTree/DeviceTree';
import { ProjectPointTree } from './ProjectPointTree';
import { TreeToolbar } from './TreeToolbar/TreeToolbar';
import { TreeFilter } from './TreeFilter/TreeFilter';
import { useDeviceTreeStore } from '../store/deviceTreeStore';
import { useDeviceStatusMonitor } from '../hooks/useDeviceStatusMonitor';
import { useDeviceSyncService } from '../hooks/useDeviceSyncService';
import styles from './TreePanel.module.css';

/**
 * TreePanel Component
 */
export const TreePanel: React.FC = () => {
  const { viewMode, fetchDevices, isLoading, error, devices, treeData } = useDeviceTreeStore();
  const [showFilter, setShowFilter] = React.useState(false);

  // Background services
  // Status monitor: polls device status every 30s (C++ m_pCheck_net_device_online)
  useDeviceStatusMonitor({ enabled: true, intervalMs: 30000 });

  // Sync service: refreshes device list every 60s (C++ m_pFreshTree)
  useDeviceSyncService({ enabled: true, intervalMs: 60000 });

  // Initial data fetch
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const toggleFilter = () => {
    setShowFilter(!showFilter);
  };

  const handleRetry = () => {
    fetchDevices();
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
            <Spinner size="medium" label="Loading devices..." />
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
            <div className={styles.emptyIcon}>📡</div>
            <div className={styles.emptyTitle}>No Devices Found</div>
            <div className={styles.emptyMessage}>
              Start by scanning for devices on your network
            </div>
            <button
              className={styles.scanButton}
              onClick={() => fetchDevices()}
            >
              Scan for Devices
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
