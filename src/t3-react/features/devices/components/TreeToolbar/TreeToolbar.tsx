/**
 * TreeToolbar Component
 *
 * Compact toolbar with essential device tree actions:
 * - Refresh: full FFI sync (load devices → save to DB → update tree)
 * - Expand/Collapse / Filter / View Mode toggle
 */

import React from 'react';
import {
  Toolbar,
  ToolbarButton,
  Tooltip,
} from '@fluentui/react-components';
import {
  ChevronDoubleDown20Regular,
  ChevronDoubleUp20Regular,
  Filter20Regular,
  BuildingRegular,
  DatabaseRegular,
  ArrowSyncRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../store/deviceTreeStore';
import { useStatusBarStore } from '@t3-react/store/statusBarStore';
import styles from './TreeToolbar.module.css';

/**
 * TreeToolbar Component Props
 */
interface TreeToolbarProps {
  showFilter: boolean;
  onToggleFilter: () => void;
}

/**
 * TreeToolbar Component
 */
export const TreeToolbar: React.FC<TreeToolbarProps> = ({ showFilter, onToggleFilter }) => {
  const { expandAll, collapseAll, viewMode, setViewMode, scanForDevices, loadDevicesWithSync, fetchDevices } = useDeviceTreeStore();
  const setMessage = useStatusBarStore((state) => state.setMessage);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // Both passes are independent sources, so they run concurrently and the
      // slow one (full discovery: serial COM + TCP sub-port) no longer waits for
      // the panel list. The panel list stays quiet so the scan's own summary is
      // the one left in the status bar; warnings/errors still show.
      setMessage('Refreshing device list — T3000 panel list + full scan…', 'info');
      const panelListDone = loadDevicesWithSync({ skipInitialFetch: true, quiet: true });
      const scanDone = scanForDevices({ timeout: 8, mode: 'full' });

      panelListDone
        .then(() => setMessage('T3000 panel list received…', 'info'))
        .catch(() => {});

      await Promise.allSettled([panelListDone, scanDone]);
      // One authoritative read after both writes landed.
      await fetchDevices();
    } catch (err) {
      console.error('Failed to refresh devices:', err);
      setMessage('Failed to refresh device list. Please try again.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleViewMode = () => {
    const newMode = viewMode === 'equipment' ? 'projectPoint' : 'equipment';
    setViewMode(newMode);
  };

  const handleToggleExpandCollapse = () => {
    if (isExpanded) {
      collapseAll();
      setIsExpanded(false);
    } else {
      expandAll();
      setIsExpanded(true);
    }
  };

  const isProjectMode = viewMode === 'projectPoint';

  return (
    <div className={styles.container}>
      <div className={styles.leftSection}>
        <div className={styles.title}>Devices</div>
      </div>
      <Toolbar aria-label="Device tree toolbar" size="small">

        <Tooltip
          content="Refresh the device list from T3000, then scan the network (UDP), serial COM ports and TCP sub-ports"          relationship="label"
          positioning="below-start"
          size="small"
        >
          <ToolbarButton
            aria-label="Scan network for T3000 devices"
            icon={<ArrowSyncRegular fontSize={18} className={isRefreshing ? styles.spinIcon : undefined} />}
            onClick={handleRefresh}
            appearance="subtle"
            disabled={isRefreshing}
          />
        </Tooltip>

        <Tooltip
          content={isProjectMode ? 'Switch to Equipment View' : 'Switch to Project Point View'}
          relationship="label"
          positioning="below-start"
          size="small"
        >
          <ToolbarButton
            aria-label={isProjectMode ? 'Switch to Equipment View' : 'Switch to Project Point View'}
            icon={isProjectMode ? <DatabaseRegular /> : <BuildingRegular />}
            onClick={handleToggleViewMode}
            appearance="subtle"
            className={isProjectMode ? styles.activeButton : ''}
          />
        </Tooltip>

        {/* Filter and Expand/Collapse disabled for now
        <Tooltip
          content={showFilter ? 'Hide Filter' : 'Show Filter'}
          relationship="label"
          positioning="below-start"
          size="small"
        >
          <ToolbarButton
            aria-label="Toggle filter"
            icon={<Filter20Regular />}
            onClick={onToggleFilter}
            appearance="subtle"
            className={showFilter ? styles.activeButton : ''}
          />
        </Tooltip>

        <Tooltip
          content={isExpanded ? 'Collapse All' : 'Expand All'}
          relationship="label"
          positioning="below-start"
          size="small"
        >
          <ToolbarButton
            aria-label={isExpanded ? 'Collapse all nodes' : 'Expand all nodes'}
            icon={isExpanded ? <ChevronDoubleUp20Regular /> : <ChevronDoubleDown20Regular />}
            onClick={handleToggleExpandCollapse}
            appearance="subtle"
            className={isExpanded ? styles.activeButton : ''}
          />
        </Tooltip>
        */}
      </Toolbar>
    </div>
  );
};

export default TreeToolbar;
