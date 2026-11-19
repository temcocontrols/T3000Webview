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
import { ArrowClockwise16Regular, ArrowSyncRegular, ArrowRoutingRectangleMultiple24Regular } from '@fluentui/react-icons';
import { DeviceTree } from './DeviceTree/DeviceTree';
import { ProjectPointTree } from './ProjectPointTree';
import { TreeToolbar } from './TreeToolbar/TreeToolbar';
import { TreeFilter } from './TreeFilter/TreeFilter';
import { useDeviceTreeStore } from '../store/deviceTreeStore';
import { useDeviceStatusMonitor } from '@t3-react/shared/hooks/useDeviceStatusMonitor';
import { useDeviceSyncService } from '@t3-react/shared/hooks/useDeviceSyncService';
import { useStatusBarStore } from '../../../store/statusBarStore';
import styles from './TreePanel.module.css';

/**
 * TreePanel Component
 */
export const TreePanel: React.FC = () => {
  const { viewMode, fetchDevices, loadDevicesWithSync, scanForDevices, fetchProjectPointTree, isLoading, error, devices, treeData } = useDeviceTreeStore();
  const [showFilter, setShowFilter] = React.useState(false);
  const hasInitialized = React.useRef(false);

  // Background services
  // Status monitor is kept off by default to avoid a startup burst of device status calls.
  // Individual status checks still happen on demand from the tree item context menu.
  useDeviceStatusMonitor({ enabled: false, intervalMs: 30000 });

  // Sync service: refreshes device list every 5 minutes (C++ m_pFreshTree)
  useDeviceSyncService({ enabled: true, intervalMs: 300000 });

  // Initial data fetch with auto-sync if database is empty
  // Use ref to prevent React StrictMode from running this twice
  useEffect(() => {
    const initializeDevices = async () => {
      // Prevent duplicate runs in StrictMode
      if (hasInitialized.current) {
        return;
      }
      hasInitialized.current = true;

      // Phase 0: paint the tree from the local DB cache — instant, no network.
      await fetchDevices();

      // Prefetch the project point tree so switching views is instant (no loading flash)
      fetchProjectPointTree();

      // Phase 1 + 2 run **concurrently**: the FFI panel list (action 4) and the
      // UDP scan are independent sources, so the tree is ready after
      // max(t_panels, t_scan) instead of their sum. Each pass reports the moment
      // it lands; the final message and the authoritative DB re-read happen once
      // both are done (see the merge in scanForDevices / loadDevicesWithSync).
      const { setMessage } = useStatusBarStore.getState();
      setMessage('Loading device list (T3000 panel list + network scan)...', 'info');

      const panelListDone = loadDevicesWithSync({ skipInitialFetch: true, quiet: true });
      const scanDone = scanForDevices({ timeout: 8, mode: 'udp', quiet: true });

      panelListDone
        .then(() => setMessage('T3000 panel list received...', 'info'))
        .catch(() => {});
      scanDone
        .then(() => setMessage('Network scan finished...', 'info'))
        .catch(() => {});

      await Promise.allSettled([panelListDone, scanDone]);

      // Reconcile with the DB — both passes wrote into it, so one read gives the
      // merged, authoritative list (and rebuilds the tree).
      await fetchDevices();

      const { devices: finalDevices, deviceStatuses: finalStatuses } = useDeviceTreeStore.getState();
      if (finalDevices.length > 0) {
        const online = finalDevices.filter((d) => finalStatuses.get(d.serialNumber) === 'online').length;
        setMessage(`Device list ready: ${finalDevices.length} device(s), ${online} online`, 'success');
      }
      // With zero devices the passes' own diagnostic warnings are the useful
      // message, so leave them in place.
    };

    initializeDevices();
  }, []);

  const toggleFilter = () => {
    setShowFilter(!showFilter);
  };

  const handleRetry = () => {
    fetchDevices();
  };

  // A background refresh (FFI panel list, UDP scan, 5-min timer) must never blank
  // a tree we already painted from the DB cache. Only a first load with nothing
  // to show gets the spinner; a populated tree stays on screen.
  const isInitialLoading = isLoading && devices.length === 0;

  return (
    <div className={styles.container}>
      {/* Toolbar with actions */}
      <TreeToolbar showFilter={showFilter} onToggleFilter={toggleFilter} />

      {/* Filter controls - collapsible */}
      {showFilter && <TreeFilter />}

      {/* Tree content area */}
      <div className={styles.treeContainer}>
        {/* Loading state — first load only; a refresh keeps the tree visible */}
        {isInitialLoading && (
          <div className={styles.loadingContainer}>
            <Spinner
              size="tiny"
              label="Loading devices..."
              labelPosition="after"
              className={styles.loadingSpinner}
            />
          </div>
        )}

        {/* Error state — only when there is nothing on screen to keep */}
        {!isInitialLoading && error && devices.length === 0 && (
          <div className={styles.errorContainer}>
            <div className={styles.errorTitle}>No devices to display</div>
            <div className={styles.errorMessage}>
              There was a problem connecting to the server (T3000). Please check whether the T3000 application is running and try again.
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
        {!isInitialLoading && !error && devices.length === 0 && (
          <div className={styles.emptyContainer}>
            <div className={styles.emptyIconWrapper}>
              <ArrowRoutingRectangleMultiple24Regular className={styles.emptyIcon} fontSize={32} />
            </div>
            <div className={styles.emptyTitle}>No Devices Found</div>
            <div className={styles.emptyMessage}>
              Click the{' '}
              <span className={styles.inlineRefreshHint}>
                <ArrowSyncRegular fontSize={14} /> 
              </span>{' '}button above to load your devices from the network.
            </div>
          </div>
        )}

        {/* No results state - rows exist in the DB but none is displayable */}
        {!isInitialLoading && devices.length > 0 && treeData.length === 0 && (
          <div className={styles.emptyContainer}>
            <div className={styles.emptyIconWrapper}>
              <ArrowRoutingRectangleMultiple24Regular className={styles.emptyIcon} fontSize={32} />
            </div>
            <div className={styles.emptyTitle}>No displayable devices</div>
            <div className={styles.emptyMessage}>
              {devices.length} device(s) are known, but none has a usable panel name (they are
              listed as "(Unknown)"), so the tree hides them. Rename the panels in T3000, or refresh
              so the names are re-read.
            </div>
          </div>
        )}

        {/* Tree with devices — stays visible during background refreshes */}
        {!isInitialLoading && treeData.length > 0 && (
          <>
            {viewMode === 'equipment' ? <DeviceTree /> : <ProjectPointTree />}
          </>
        )}
      </div>
    </div>
  );
};

export default TreePanel;
