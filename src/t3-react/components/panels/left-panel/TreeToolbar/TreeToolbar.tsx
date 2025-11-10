/**
 * TreeToolbar Component
 *
 * Toolbar with device tree actions
 * Maps to C++ toolbar buttons
 */

import React from 'react';
import {
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
} from '@fluentui/react-components';
import {
  ArrowSync20Regular,
  Scan20Regular,
  ChevronDoubleDown20Regular,
  ChevronDoubleUp20Regular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../../../store/deviceTreeStore';
import styles from './TreeToolbar.module.css';

/**
 * TreeToolbar Component
 */
export const TreeToolbar: React.FC = () => {
  const {
    refreshDevices,
    scanForDevices,
    expandAll,
    collapseAll,
    isLoading,
  } = useDeviceTreeStore();

  const handleRefresh = () => {
    refreshDevices();
  };

  const handleScan = () => {
    scanForDevices();
  };

  const handleExpandAll = () => {
    expandAll();
  };

  const handleCollapseAll = () => {
    collapseAll();
  };

  return (
    <div className={styles.container}>
      <Toolbar aria-label="Device tree toolbar" size="small">
        <ToolbarButton
          aria-label="Refresh devices"
          icon={<ArrowSync20Regular />}
          onClick={handleRefresh}
          disabled={isLoading}
        >
          Refresh
        </ToolbarButton>

        <ToolbarButton
          aria-label="Scan for devices"
          icon={<Scan20Regular />}
          onClick={handleScan}
          disabled={isLoading}
        >
          Scan
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          aria-label="Expand all"
          icon={<ChevronDoubleDown20Regular />}
          onClick={handleExpandAll}
        >
          Expand All
        </ToolbarButton>

        <ToolbarButton
          aria-label="Collapse all"
          icon={<ChevronDoubleUp20Regular />}
          onClick={handleCollapseAll}
        >
          Collapse All
        </ToolbarButton>
      </Toolbar>
    </div>
  );
};

export default TreeToolbar;
