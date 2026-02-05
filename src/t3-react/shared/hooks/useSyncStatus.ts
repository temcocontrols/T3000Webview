/**
 * useSyncStatus Hook
 *
 * Fetches and manages data sync status from the backend DATA_SYNC_METADATA table.
 * Shows when data was last synced (FFI backend or UI manual refresh).
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config/constants';

export interface SyncStatus {
  id: number;
  syncTime: number;
  syncTimeFmt: string;
  dataType: string;
  serialNumber: string;
  panelId: number | null;
  recordsSynced: number;
  syncMethod: 'FFI_BACKEND' | 'UI_REFRESH';
  success: boolean;
  errorMessage: string | null;
  createdAt: number;
}

interface UseSyncStatusOptions {
  serialNumber: string;
  dataType: string;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

interface UseSyncStatusResult {
  syncStatus: SyncStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  timeAgo: string;
}

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp * 1000;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
};

export const useSyncStatus = ({
  serialNumber,
  dataType,
  autoRefresh = false,
  refreshIntervalMs = 30000, // 30 seconds default
}: UseSyncStatusOptions): UseSyncStatusResult => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeAgo, setTimeAgo] = useState('');

  const fetchSyncStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/sync-status/${serialNumber}/${dataType}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch sync status: ${response.statusText}`);
      }

      const data = await response.json();
      setSyncStatus(data);

      // Update time ago
      if (data?.syncTime) {
        setTimeAgo(formatTimeAgo(data.syncTime));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching sync status:', err);
    } finally {
      setLoading(false);
    }
  }, [serialNumber, dataType]);

  // Initial fetch
  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSyncStatus();
    }, refreshIntervalMs);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshIntervalMs, fetchSyncStatus]);

  // Update "time ago" every 10 seconds
  useEffect(() => {
    if (!syncStatus?.syncTime) return;

    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(syncStatus.syncTime));
    }, 10000);

    return () => clearInterval(interval);
  }, [syncStatus?.syncTime]);

  return {
    syncStatus,
    loading,
    error,
    refresh: fetchSyncStatus,
    timeAgo,
  };
};
