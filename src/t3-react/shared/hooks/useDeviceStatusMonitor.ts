/**
 * Device Status Monitor Hook
 *
 * Polls device online/offline status at regular intervals
 * Maps to C++ m_pCheck_net_device_online thread
 *
 * C++ Reference (LEFT_PANEL_CPP_DESIGN.md Section 5):
 * - m_pCheck_net_device_online thread → useDeviceStatusMonitor
 * - Polls every 30 seconds
 * - Updates status history (last 5 pings)
 * - Updates tree icons based on status
 */

import { useEffect, useRef } from 'react';
import { useDeviceTreeStore } from '../../store';

/**
 * Hook configuration
 */
interface StatusMonitorConfig {
  enabled?: boolean;
  intervalMs?: number;
}

/**
 * Device Status Monitor Hook
 *
 * Usage in component:
 * ```tsx
 * useDeviceStatusMonitor({ enabled: true, intervalMs: 30000 });
 * ```
 */
export function useDeviceStatusMonitor(config: StatusMonitorConfig = {}) {
  const {
    enabled = true,
    intervalMs = 30000, // Default: 30 seconds
  } = config;

  const { selectedDevice, checkDeviceStatus } = useDeviceTreeStore();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const serialNumber = selectedDevice?.serialNumber;
    if (!enabled || !serialNumber) {
      return;
    }

    // Only check the selected device to avoid a startup burst across the entire tree.
    const checkSelectedDevice = () => {
      checkDeviceStatus(serialNumber);
    };

    // Initial check
    checkSelectedDevice();

    // Set up polling interval
    intervalRef.current = window.setInterval(() => {
      checkSelectedDevice();
    }, intervalMs);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [checkDeviceStatus, enabled, intervalMs, selectedDevice?.serialNumber]);
}

export default useDeviceStatusMonitor;
