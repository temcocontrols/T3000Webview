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
  const { expandAll, collapseAll, viewMode, setViewMode, scanForDevices, loadDevicesWithSync } = useDeviceTreeStore();
  const setMessage = useStatusBarStore((state) => state.setMessage);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // Phase 1: refresh the device list from T3000 (FFI action 4). Fast — the
      // tree updates as soon as it returns.
      await loadDevicesWithSync({ skipInitialFetch: true });

      // Phase 2: deep discovery (UDP + serial COM + TCP sub-port). This can take
      // minutes on a machine with many COM ports, so it runs in the background —
      // the status bar reports progress and the tree repaints when it finishes.
      scanForDevices({ timeout: 8, mode: 'full' }).catch(() => {});
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
