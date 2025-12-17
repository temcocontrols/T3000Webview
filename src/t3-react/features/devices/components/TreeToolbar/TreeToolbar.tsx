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
import { T3Transport } from '../../../../../lib/t3-transport/core/T3Transport';
import { T3Database } from '../../../../../lib/t3-database';
import { API_BASE_URL } from '../../../../config/constants';
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
  const { expandAll, collapseAll, viewMode, setViewMode, refreshDevices } = useDeviceTreeStore();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Initialize T3Transport with FFI
      const transport = new T3Transport({
        apiBaseUrl: `${API_BASE_URL}/api`
      });
      await transport.connect('ffi');

      // Call action 4: GET_PANELS_LIST
      const response = await transport.getDeviceList();

      // Check if response has data
      if (response && response.data) {
        const panels = response.data;

        // Save to database using t3-database
        const db = new T3Database(`${API_BASE_URL}/api`);
        for (const panel of panels) {
          await db.devices.upsert({
            serialNumber: panel.serial_number || panel.serialNumber,
            panelName: panel.panel_name || panel.panelName || `Panel ${panel.panel_number}`,
            deviceType: panel.pid || 0,
            objectInstance: panel.object_instance || panel.objectInstance || 0,
            ipAddress: panel.ip_address || panel.ipAddress || '',
            port: panel.port || 0,
            protocol: 'BACnet',
            mainBuildingName: 'Default_Building',
            subnetName: 'Local View',
            isOnline: true,
            lastOnlineTime: panel.online_time || Date.now(),
          });
        }

        console.log(`Refreshed ${panels.length} panels from FFI and saved to database`);
      }

      // Disconnect transport
      await transport.disconnect();

      // Refresh the tree view
      await refreshDevices();
    } catch (error) {
      console.error('Failed to refresh panels:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleViewMode = async () => {
    const newMode = viewMode === 'equipment' ? 'projectPoint' : 'equipment';
    setViewMode(newMode);
    // Trigger refresh to load the device tree view by default
    await refreshDevices();
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
        <Tooltip content="Refresh" relationship="label">
          <ToolbarButton
            aria-label="Refresh devices"
            icon={<ArrowSyncRegular />}
            onClick={handleRefresh}
            appearance="subtle"
            disabled={isRefreshing}
          />
        </Tooltip>

        <Tooltip content={isProjectMode ? 'Switch to Equipment View' : 'Switch to Project Point View'} relationship="label">
          <ToolbarButton
            aria-label={isProjectMode ? 'Switch to Equipment View' : 'Switch to Project Point View'}
            icon={isProjectMode ? <DatabaseRegular /> : <BuildingRegular />}
            onClick={handleToggleViewMode}
            appearance="subtle"
            className={isProjectMode ? styles.activeButton : ''}
          />
        </Tooltip>

        <Tooltip content={showFilter ? 'Hide Filter' : 'Show Filter'} relationship="label">
          <ToolbarButton
            aria-label="Toggle filter"
            icon={<Filter20Regular />}
            onClick={onToggleFilter}
            appearance="subtle"
            className={showFilter ? styles.activeButton : ''}
          />
        </Tooltip>

        <Tooltip content={isExpanded ? 'Collapse All' : 'Expand All'} relationship="label">
          <ToolbarButton
            aria-label={isExpanded ? 'Collapse all nodes' : 'Expand all nodes'}
            icon={isExpanded ? <ChevronDoubleUp20Regular /> : <ChevronDoubleDown20Regular />}
            onClick={handleToggleExpandCollapse}
            appearance="subtle"
            className={isExpanded ? styles.activeButton : ''}
          />
        </Tooltip>
      </Toolbar>
    </div>
  );
};

export default TreeToolbar;
