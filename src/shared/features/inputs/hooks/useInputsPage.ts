/**
 * Shared Inputs Page Hook
 * Contains all business logic for Inputs page
 * Used by both Desktop and Mobile versions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeviceTreeStore } from '../../../../t3-react/features/devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../../t3-react/config/constants';
import { PanelDataRefreshService } from '../../../../t3-react/shared/services/panelDataRefreshService';
import { useStatusBarStore } from '../../../../t3-react/store/statusBarStore';
import { InputPoint } from '../types/input.types';

export const useInputsPage = () => {
  const { selectedDevice } = useDeviceTreeStore();
  const setMessage = useStatusBarStore((state: any) => state.setMessage);

  // State
  const [inputs, setInputs] = useState<InputPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
  const [autoRefreshed, setAutoRefreshed] = useState(false);
  const hasAutoRefreshedRef = useRef(false);

  // Fetch inputs from backend
  const fetchInputs = useCallback(async () => {
    if (!selectedDevice) {
      setInputs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/input-points`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch inputs: ${response.statusText}`);
      }

      const data = await response.json();
      const fetchedInputs = data.input_points || [];
      setInputs(fetchedInputs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load inputs';
      setError(errorMessage);
      console.error('Error fetching inputs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  // Reset state when device changes
  useEffect(() => {
    setInputs([]);
    setAutoRefreshed(false);
    hasAutoRefreshedRef.current = false;
  }, [selectedDevice?.serialNumber]);

  // Auto-refresh once after page load if database is empty
  useEffect(() => {
    if (loading || !selectedDevice || autoRefreshed || hasAutoRefreshedRef.current) return;

    const checkAndRefresh = async () => {
      hasAutoRefreshedRef.current = true;

      if (inputs.length > 0) {
        console.log('[useInputsPage] Database has data, skipping auto-refresh');
        setAutoRefreshed(true);
        return;
      }

      console.log('[useInputsPage] Database empty, auto-refreshing from device...');
      setLoading(true);

      try {
        const result = await PanelDataRefreshService.refreshFromDevice({
          serialNumber: selectedDevice.serialNumber,
          type: 'input',
          onLoadingChange: (loading: boolean) => {
            if (loading) {
              setMessage(`Loading inputs from ${selectedDevice.nameShowOnTree} (Action 17)...`, 'info');
            }
          }
        });
        setMessage(`✓ Synced ${result.itemCount} inputs from ${selectedDevice.nameShowOnTree}`, 'success');
      } catch (error) {
        console.error('[useInputsPage] Auto-refresh failed:', error);
        setMessage(`Failed to sync inputs: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      } finally {
        await fetchInputs();
        setAutoRefreshed(true);
        setLoading(false);
      }
    };

    checkAndRefresh();
  }, [loading, selectedDevice, autoRefreshed, fetchInputs, inputs.length, setMessage]);

  // Initial fetch
  useEffect(() => {
    fetchInputs();
  }, [fetchInputs]);

  // Refresh from database only
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInputs();
    setRefreshing(false);
  };

  // Refresh all inputs from device
  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    setMessage('Refreshing inputs from device...', 'info');

    try {
      console.log('[useInputsPage] Refreshing all inputs from device via FFI...');
      const result = await PanelDataRefreshService.refreshFromDevice({
        serialNumber: selectedDevice.serialNumber,
        type: 'input',
        onLoadingChange: (loading: boolean) => {
          if (loading) {
            setMessage('Loading data from device (Action 17)...', 'info');
          }
        }
      });
      console.log('[useInputsPage] Refresh result:', result);
      setMessage(result.message, 'success');
    } catch (error) {
      console.error('[useInputsPage] Failed to refresh from device:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to refresh from device';
      setError(errorMsg);
      setMessage(errorMsg, 'error');
    } finally {
      await fetchInputs();
      setRefreshing(false);
    }
  };

  // Refresh single input from device
  const handleRefreshSingleInput = async (inputIndex: string) => {
    if (!selectedDevice) return;

    const index = parseInt(inputIndex, 10);
    if (isNaN(index)) {
      console.error('[useInputsPage] Invalid input index:', inputIndex);
      return;
    }

    setRefreshingItems(prev => new Set(prev).add(inputIndex));
    try {
      console.log(`[useInputsPage] Refreshing input ${index} from device via FFI...`);
      const result = await PanelDataRefreshService.refreshSingleInput(selectedDevice.serialNumber, index);
      console.log('[useInputsPage] Refresh result:', result);

      await fetchInputs();
    } catch (error) {
      console.error(`[useInputsPage] Failed to refresh input ${index}:`, error);
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(inputIndex);
        return newSet;
      });
    }
  };

  // Update input field using Action 16
  const updateInputField = async (
    inputIndex: string,
    field: string,
    newValue: string,
    currentInput: InputPoint
  ) => {
    if (!selectedDevice) return;

    try {
      console.log(`[useInputsPage] Updating ${field} for Input ${inputIndex}`);

      const payload = {
        fullLabel: field === 'fullLabel' ? newValue : (currentInput.fullLabel || ''),
        label: field === 'label' ? newValue : (currentInput.label || ''),
        value: field === 'fValue' ? parseFloat(newValue || '0') : parseFloat(currentInput.fValue || '0') / 1000,
        range: field === 'range' ? parseInt(newValue || '0', 10) : parseInt(currentInput.rangeField || currentInput.range || '0', 10),
        autoManual: field === 'autoManual' ? parseInt(newValue || '0', 10) : parseInt(currentInput.autoManual || '0', 10),
        control: 0,
        filter: parseInt(currentInput.filterField || '0', 10),
        digitalAnalog: parseInt(currentInput.digitalAnalog || '0', 10),
        calibrationSign: parseInt(currentInput.sign || '0', 10),
        calibrationH: parseInt(currentInput.calibration?.split('.')[0] || '0', 10),
        calibrationL: parseInt(currentInput.calibration?.split('.')[1] || '0', 10),
        decom: 0,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/t3_device/inputs/${selectedDevice.serialNumber}/${inputIndex}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[useInputsPage] Update success:', result);

      // Update local state optimistically
      setInputs(prevInputs =>
        prevInputs.map(input =>
          input.inputIndex === inputIndex
            ? {
                ...input,
                [field]: field === 'fValue'
                  ? (parseFloat(newValue || '0') * 1000).toString()
                  : newValue
              }
            : input
        )
      );

      return result;
    } catch (error) {
      console.error('[useInputsPage] Failed to update:', error);
      throw error;
    }
  };

  return {
    // State
    inputs,
    loading,
    error,
    refreshing,
    refreshingItems,
    selectedDevice,

    // Methods
    fetchInputs,
    handleRefresh,
    handleRefreshFromDevice,
    handleRefreshSingleInput,
    updateInputField,
  };
};
