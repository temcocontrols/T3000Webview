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
  const { expandAll, collapseAll, viewMode, setViewMode, refreshDevices } = useDeviceTreeStore();
  const setMessage = useStatusBarStore((state) => state.setMessage);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setMessage('Refreshing devices from FFI...', 'info');

    try {
      // Initialize T3Transport with FFI
      const transport = new T3Transport({
        apiBaseUrl: `${API_BASE_URL}/api`
      });
      await transport.connect('ffi');

      // Call action 4: GET_PANELS_LIST
      const response = await transport.getDeviceList();

      // Check if response has data
      if (response && response.data && response.data.data) {
        const panels = response.data.data;
        console.log('FFI returned panels:', panels);

        // Try to save to database (best effort, don't fail if database has issues)
        let savedCount = 0;
        let failedCount = 0;

        try {
          const db = new T3Database(`${API_BASE_URL}/api`);

          for (const panel of panels) {
            try {
              const serialNumber = panel.serial_number || panel.serialNumber;
              const deviceData = {
                serialNumber,
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
              };

              // Try to create device directly (skip GET since it returns 405)
              await db.devices.create(deviceData);
              console.log(`Created device ${serialNumber}`);
              savedCount++;
            } catch (error: any) {
              console.warn(`Failed to save device ${panel.serial_number || panel.serialNumber}:`, error.message);
              failedCount++;
            }
          }
        } catch (dbError) {
          console.warn('Database operations failed:', dbError);
          failedCount = panels.length;
        }

        // Show success message even if database save fails (FFI refresh succeeded)
        if (failedCount > 0 && savedCount === 0) {
          setMessage(`Refreshed ${panels.length} device(s) from FFI (database save unavailable)`, 'warning');
        } else if (failedCount > 0) {
          setMessage(`Refreshed ${panels.length} device(s), saved ${savedCount} to database`, 'success');
        } else {
          setMessage(`Refreshed ${panels.length} device(s) successfully`, 'success');
        }
      } else {
        console.warn('No data in response:', response);
        setMessage('No devices found', 'warning');
      }

      // Disconnect transport
      await transport.disconnect();

      // Refresh the tree view
      await refreshDevices();
    } catch (err) {
      console.error('Failed to refresh panels:', err);
      setMessage('Failed to refresh device list. Please try again.', 'error');
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
            icon={<ArrowSyncRegular fontSize={18} />}
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
