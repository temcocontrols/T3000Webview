/**
 * Shared Variable Page Hook
 * Contains fetch + refresh business logic for Variables page
 * Used by both Desktop and Mobile versions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeviceTreeStore } from '../../../../t3-react/features/devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../../t3-react/config/constants';
import { PanelDataRefreshService } from '../../../../t3-react/shared/services/panelDataRefreshService';
import { useStatusBarStore } from '../../../../t3-react/store/statusBarStore';
import { VariablePoint } from '../types/variable.types';

export const useVariablesPage = () => {
  const { selectedDevice } = useDeviceTreeStore();
  const setMessage = useStatusBarStore((state: any) => state.setMessage);

  const [variables, setVariables] = useState<VariablePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
  const [autoRefreshed, setAutoRefreshed] = useState(false);
  const hasAutoRefreshedRef = useRef(false);

  const fetchVariables = useCallback(async () => {
    if (!selectedDevice) {
      setVariables([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/variable-points`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch variables: ${response.statusText}`);
      }

      const data = await response.json();
      setVariables(data.variable_points || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load variables';
      setError(errorMessage);
      console.error('[useVariablesPage] Error fetching variables:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  // Reset state when device changes
  useEffect(() => {
    setVariables([]);
    setAutoRefreshed(false);
    hasAutoRefreshedRef.current = false;
  }, [selectedDevice?.serialNumber]);

  // Auto-refresh once after page load if database is empty
  useEffect(() => {
    if (loading || !selectedDevice || autoRefreshed || hasAutoRefreshedRef.current) return;

    const checkAndRefresh = async () => {
      hasAutoRefreshedRef.current = true;

      if (variables.length > 0) {
        setAutoRefreshed(true);
        return;
      }

      setLoading(true);
      try {
        const result = await PanelDataRefreshService.refreshFromDevice({
          serialNumber: selectedDevice.serialNumber,
          type: 'variable',
          onLoadingChange: (loading: boolean) => {
            if (loading) {
              setMessage(`Loading variables from ${selectedDevice.nameShowOnTree} (Action 17)...`, 'info');
            }
          }
        });
        setMessage(`✓ Synced ${result.itemCount} variables from ${selectedDevice.nameShowOnTree}`, 'success');
      } catch (error) {
        console.error('[useVariablesPage] Auto-refresh failed:', error);
      } finally {
        await fetchVariables();
        setAutoRefreshed(true);
        setLoading(false);
      }
    };

    checkAndRefresh();
  }, [loading, selectedDevice, autoRefreshed, fetchVariables, variables.length, setMessage]);

  // Initial fetch
  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVariables();
    setRefreshing(false);
  };

  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    setMessage('Refreshing variables from device...', 'info');

    try {
      const result = await PanelDataRefreshService.refreshFromDevice({
        serialNumber: selectedDevice.serialNumber,
        type: 'variable',
        onLoadingChange: (loading: boolean) => {
          if (loading) setMessage('Loading data from device (Action 17)...', 'info');
        }
      });
      setMessage(result.message, 'success');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to refresh from device';
      setError(errorMsg);
      setMessage(errorMsg, 'error');
    } finally {
      await fetchVariables();
      setRefreshing(false);
    }
  };

  const handleRefreshSingleVariable = async (variableIndex: string) => {
    if (!selectedDevice) return;

    const index = parseInt(variableIndex, 10);
    if (isNaN(index)) return;

    setRefreshingItems(prev => new Set(prev).add(variableIndex));
    try {
      await PanelDataRefreshService.refreshSingleVariable(selectedDevice.serialNumber, index);
      await fetchVariables();
    } catch (error) {
      console.error(`[useVariablesPage] Failed to refresh variable ${index}:`, error);
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(variableIndex);
        return newSet;
      });
    }
  };

  return {
    variables,
    loading,
    error,
    refreshing,
    refreshingItems,
    selectedDevice,
    handleRefresh,
    handleRefreshFromDevice,
    handleRefreshSingleVariable,
  };
};
