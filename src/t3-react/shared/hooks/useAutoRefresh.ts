/**
 * useAutoRefresh Hook
 *
 * Manages auto-refresh behavior based on UI configuration from APPLICATION_CONFIG.
 * Reads settings and triggers periodic refresh callbacks.
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config/constants';

export interface AutoRefreshConfig {
  autoRefreshEnabled: boolean;
  refreshIntervalSecs: number;
}

interface UseAutoRefreshOptions {
  pageName: string; // 'inputs', 'outputs', 'variables', etc.
  onRefresh: () => Promise<void>;
  enabled?: boolean; // Master switch to enable/disable this hook
}

interface UseAutoRefreshResult {
  config: AutoRefreshConfig | null;
  loading: boolean;
  error: string | null;
  updateConfig: (newConfig: AutoRefreshConfig) => Promise<void>;
  isRefreshing: boolean;
}

const DEFAULT_CONFIG: AutoRefreshConfig = {
  autoRefreshEnabled: false,
  refreshIntervalSecs: 30,
};

export const useAutoRefresh = ({
  pageName,
  onRefresh,
  enabled = true,
}: UseAutoRefreshOptions): UseAutoRefreshResult => {
  const [config, setConfig] = useState<AutoRefreshConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch configuration from backend
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/config/application/ui.refresh.${pageName}`);

      if (!response.ok) {
        // If config doesn't exist, use default
        if (response.status === 404) {
          setConfig(DEFAULT_CONFIG);
          return;
        }
        throw new Error(`Failed to fetch config: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse config_value if it's a JSON string
      let configValue: AutoRefreshConfig;
      if (typeof data.configValue === 'string') {
        configValue = JSON.parse(data.configValue);
      } else {
        configValue = data.configValue || data;
      }

      setConfig(configValue);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching auto-refresh config:', err);
      // Fallback to default on error
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, [pageName]);

  // Update configuration
  const updateConfig = useCallback(
    async (newConfig: AutoRefreshConfig) => {
      try {
        setError(null);

        const response = await fetch(`${API_BASE_URL}/api/config/application/ui.refresh.${pageName}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            configValue: JSON.stringify(newConfig),
            configType: 'json',
            description: `UI auto-refresh settings for ${pageName} page`,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update config: ${response.statusText}`);
        }

        setConfig(newConfig);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Error updating auto-refresh config:', err);
        throw err;
      }
    },
    [pageName]
  );

  // Load config on mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Auto-refresh interval
  useEffect(() => {
    if (!enabled || !config?.autoRefreshEnabled) return;

    const intervalMs = config.refreshIntervalSecs * 1000;

    const performRefresh = async () => {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (err) {
        console.error('Auto-refresh failed:', err);
      } finally {
        setIsRefreshing(false);
      }
    };

    const interval = setInterval(performRefresh, intervalMs);

    return () => clearInterval(interval);
  }, [enabled, config, onRefresh]);

  return {
    config,
    loading,
    error,
    updateConfig,
    isRefreshing,
  };
};
