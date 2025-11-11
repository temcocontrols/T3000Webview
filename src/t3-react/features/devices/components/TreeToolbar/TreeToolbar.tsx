/**
 * TreeToolbar Component
 *
 * Compact toolbar with essential device tree actions
 * - Removed: Refresh (auto-refresh every 60s handles this)
 * - Removed: Scan (moved to empty state CTA button)
 * - Kept: Expand/Collapse (icon-only for compact width)
 */

import React from 'react';
import {
  Toolbar,
  ToolbarButton,
} from '@fluentui/react-components';
import {
  ChevronDoubleDown20Regular,
  ChevronDoubleUp20Regular,
  Filter20Regular,
  BuildingRegular,
  DatabaseRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../store/deviceTreeStore';
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
  const { expandAll, collapseAll, viewMode, setViewMode } = useDeviceTreeStore();
  const [isExpanded, setIsExpanded] = React.useState(false);

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
        <ToolbarButton
          aria-label={isProjectMode ? 'Switch to Equipment View' : 'Switch to Project Point View'}
          icon={isProjectMode ? <DatabaseRegular /> : <BuildingRegular />}
          onClick={handleToggleViewMode}
          appearance="subtle"
          className={isProjectMode ? styles.activeButton : ''}
        />

        <ToolbarButton
          aria-label="Toggle filter"
          icon={<Filter20Regular />}
          onClick={onToggleFilter}
          appearance="subtle"
          className={showFilter ? styles.activeButton : ''}
        />

        <ToolbarButton
          aria-label={isExpanded ? 'Collapse all nodes' : 'Expand all nodes'}
          icon={isExpanded ? <ChevronDoubleUp20Regular /> : <ChevronDoubleDown20Regular />}
          onClick={handleToggleExpandCollapse}
          appearance="subtle"
          className={isExpanded ? styles.activeButton : ''}
        />
      </Toolbar>
    </div>
  );
};

export default TreeToolbar;
