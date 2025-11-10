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
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../../../store/deviceTreeStore';
import styles from './TreeToolbar.module.css';

/**
 * TreeToolbar Component
 */
export const TreeToolbar: React.FC = () => {
  const { expandAll, collapseAll } = useDeviceTreeStore();

  return (
    <div className={styles.container}>
      <div className={styles.title}>Devices</div>
      <Toolbar aria-label="Device tree toolbar" size="small">
        <ToolbarButton
          aria-label="Expand all nodes"
          icon={<ChevronDoubleDown20Regular />}
          onClick={expandAll}
          appearance="subtle"
        />

        <ToolbarButton
          aria-label="Collapse all nodes"
          icon={<ChevronDoubleUp20Regular />}
          onClick={collapseAll}
          appearance="subtle"
        />
      </Toolbar>
    </div>
  );
};

export default TreeToolbar;
