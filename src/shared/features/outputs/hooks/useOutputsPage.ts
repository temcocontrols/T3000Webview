/**
 * Shared Output Page Hook
 * Contains fetch + refresh business logic for Outputs page
 * Used by both Desktop and Mobile versions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeviceTreeStore } from '../../../../t3-react/features/devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../../t3-react/config/constants';
import { PanelDataRefreshService } from '../../../../t3-react/shared/services/panelDataRefreshService';
import { useStatusBarStore } from '../../../../t3-react/store/statusBarStore';
import { OutputPoint } from '../types/output.types';

export const useOutputsPage = () => {
  const { selectedDevice } = useDeviceTreeStore();
  const setMessage = useStatusBarStore((state: any) => state.setMessage);

  const [outputs, setOutputs] = useState<OutputPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
  const [autoRefreshed, setAutoRefreshed] = useState(false);
  const hasAutoRefreshedRef = useRef(false);

  const fetchOutputs = useCallback(async () => {
    if (!selectedDevice) {
      setOutputs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/output-points`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch outputs: ${response.statusText}`);
      }

      const data = await response.json();
      setOutputs(data.output_points || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load outputs';
      setError(errorMessage);
      console.error('[useOutputsPage] Error fetching outputs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  // Reset state when device changes
  useEffect(() => {
    setOutputs([]);
    setAutoRefreshed(false);
    hasAutoRefreshedRef.current = false;
  }, [selectedDevice?.serialNumber]);

  // Auto-refresh once after page load if database is empty
  useEffect(() => {
    if (loading || !selectedDevice || autoRefreshed || hasAutoRefreshedRef.current) return;

    const checkAndRefresh = async () => {
      hasAutoRefreshedRef.current = true;

      if (outputs.length > 0) {
        setAutoRefreshed(true);
        return;
      }

      setLoading(true);
      try {
        const result = await PanelDataRefreshService.refreshFromDevice({
          serialNumber: selectedDevice.serialNumber,
          type: 'output',
          onLoadingChange: (loading: boolean) => {
            if (loading) {
              setMessage(`Loading outputs from ${selectedDevice.nameShowOnTree} (Action 17)...`, 'info');
            }
          }
        });
        setMessage(`✓ Synced ${result.itemCount} outputs from ${selectedDevice.nameShowOnTree}`, 'success');
      } catch (error) {
        console.error('[useOutputsPage] Auto-refresh failed:', error);
      } finally {
        await fetchOutputs();
        setAutoRefreshed(true);
        setLoading(false);
      }
    };

    checkAndRefresh();
  }, [loading, selectedDevice, autoRefreshed, fetchOutputs, outputs.length, setMessage]);

  // Initial fetch
  useEffect(() => {
    fetchOutputs();
  }, [fetchOutputs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOutputs();
    setRefreshing(false);
  };

  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    setMessage('Refreshing outputs from device...', 'info');

    try {
      const result = await PanelDataRefreshService.refreshFromDevice({
        serialNumber: selectedDevice.serialNumber,
        type: 'output',
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
      await fetchOutputs();
      setRefreshing(false);
    }
  };

  const handleRefreshSingleOutput = async (outputIndex: string) => {
    if (!selectedDevice) return;

    const index = parseInt(outputIndex, 10);
    if (isNaN(index)) return;

    setRefreshingItems(prev => new Set(prev).add(outputIndex));
    try {
      await PanelDataRefreshService.refreshSingleOutput(selectedDevice.serialNumber, index);
      await fetchOutputs();
    } catch (error) {
      console.error(`[useOutputsPage] Failed to refresh output ${index}:`, error);
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(outputIndex);
        return newSet;
      });
    }
  };

  return {
    outputs,
    loading,
    error,
    refreshing,
    refreshingItems,
    selectedDevice,
    handleRefresh,
    handleRefreshFromDevice,
    handleRefreshSingleOutput,
  };
};
