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
  const { expandAll, collapseAll, viewMode, setViewMode, loadDevicesWithSync } = useDeviceTreeStore();
  const setMessage = useStatusBarStore((state) => state.setMessage);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadDevicesWithSync({ skipInitialFetch: true });
    } catch (err) {
      console.error('Failed to refresh devices:', err);
      setMessage('Failed to refresh device list. Please try again.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleViewMode = async () => {
    const newMode = viewMode === 'equipment' ? 'projectPoint' : 'equipment';
    setViewMode(newMode);
    // Trigger full sync to load the device tree view
    await loadDevicesWithSync({ skipInitialFetch: true });
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
          content="Sync devices from T3000 — fetches the device list via FFI, saves all devices to the database, and refreshes the tree"
          relationship="label"
          positioning="below-start"
          size="small"
        >
          <ToolbarButton
            aria-label="Sync devices from T3000"
            icon={<ArrowSyncRegular fontSize={18} />}
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
