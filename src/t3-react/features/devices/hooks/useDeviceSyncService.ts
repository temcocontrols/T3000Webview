/**
 * Device Sync Service Hook
 *
 * Periodically refreshes device list from backend
 * Maps to C++ m_pFreshTree thread
 *
 * C++ Reference (LEFT_PANEL_CPP_DESIGN.md Section 5):
 * - m_pFreshTree thread → useDeviceSyncService
 * - Refreshes every 60 seconds
 * - Calls LoadProductFromDB()
 * - Rebuilds tree structure
 */

import { useEffect, useRef } from 'react';
import { useDeviceTreeStore } from '../store/deviceTreeStore';

/**
 * Hook configuration
 */
interface SyncServiceConfig {
  enabled?: boolean;
  intervalMs?: number;
}

/**
 * Device Sync Service Hook
 *
 * Usage in component:
 * ```tsx
 * useDeviceSyncService({ enabled: true, intervalMs: 60000 });
 * ```
 */
export function useDeviceSyncService(config: SyncServiceConfig = {}) {
  const {
    enabled = true,
    intervalMs = 60000, // Default: 60 seconds
  } = config;

  const { fetchDevices } = useDeviceTreeStore();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Set up sync interval
    // Note: Initial fetch is done in TreePanel component on mount
    intervalRef.current = window.setInterval(() => {
      fetchDevices();
    }, intervalMs);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, fetchDevices]);
}

export default useDeviceSyncService;
