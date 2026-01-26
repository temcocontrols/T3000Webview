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
  Tooltip,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
} from '@fluentui/react-components';
import {
  ChevronDoubleDown20Regular,
  ChevronDoubleUp20Regular,
  Filter20Regular,
  BuildingRegular,
  DatabaseRegular,
  ArrowSyncRegular,
  DismissCircleRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../store/deviceTreeStore';
import { useStatusBarStore } from '../../../../store/statusBarStore';
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
  const { expandAll, collapseAll, viewMode, setViewMode, loadDevicesWithSync, syncDatabaseWithCpp } = useDeviceTreeStore();
  const setMessage = useStatusBarStore((state) => state.setMessage);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Use the same full sync as "Load Devices" button
      await loadDevicesWithSync();
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
    await loadDevicesWithSync();
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

  const handleCleanDatabase = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      console.log('[TreeToolbar] Starting clear all devices...');
      await syncDatabaseWithCpp();
      console.log('[TreeToolbar] Clear all devices completed');
    } catch (error) {
      console.error('[TreeToolbar] Clear all devices failed:', error);
      setMessage('Failed to clear devices', 'error');
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
          content="Clear all devices"
          relationship="label"
          positioning="below-start"
          size="small"
        >
          <ToolbarButton
            aria-label="Clear all devices"
            icon={<DismissCircleRegular fontSize={18} />}
            onClick={handleCleanDatabase}
            appearance="subtle"
          />
        </Tooltip>

        <Tooltip content="Refresh" relationship="label" positioning="below-start" size="small">
          <ToolbarButton
            aria-label="Refresh devices"
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
      </Toolbar>

      <Dialog open={showDeleteConfirm} onOpenChange={(e, data) => setShowDeleteConfirm(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle style={{ fontSize: '16px', fontWeight: 'normal' }}>Clear device cache?</DialogTitle>
            <DialogContent>
              This will clear all cached device data from the local database. You can reload devices from the connected panels anytime.
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setShowDeleteConfirm(false)} style={{ fontSize: '14px', fontWeight: 'normal' }}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleConfirmDelete} style={{ fontSize: '14px', fontWeight: 'normal' }}>
                Clear cache
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default TreeToolbar;
