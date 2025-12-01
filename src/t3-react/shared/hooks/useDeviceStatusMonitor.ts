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

  const { devices, checkDeviceStatus } = useDeviceTreeStore();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || devices.length === 0) {
      return;
    }

    // Check all devices immediately on mount
    const checkAllDevices = () => {
      devices.forEach((device) => {
        checkDeviceStatus(device.serialNumber);
      });
    };

    // Initial check
    checkAllDevices();

    // Set up polling interval
    intervalRef.current = window.setInterval(() => {
      checkAllDevices();
    }, intervalMs);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, devices, checkDeviceStatus]);
}

export default useDeviceStatusMonitor;
