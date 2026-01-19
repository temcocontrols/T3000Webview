/**
 * Tools Menu Hook
 *
 * Provides handlers for all Tools menu operations
 * Integrates with ToolsMenuService and provides UI feedback
 */

import { useState, useCallback } from 'react';
import { ToolsMenuService } from '../../services/toolsMenuService';
import type { DeviceInfo } from '../types/device';

export interface ToolsMenuState {
  isLoading: boolean;
  error: string | null;
  lastOperation: string | null;
  isConnected: boolean;
}

export interface ToolsMenuHandlers {
  handleConnect: () => Promise<void>;
  handleDisconnect: () => Promise<void>;
  handleChangeModbusId: (device: DeviceInfo) => Promise<void>;
  handleBacnetTool: () => void;
  handleModbusPoll: () => void;
  handleRegisterViewer: () => void;
  handleModbusRegisterV2: () => void;
  handleRegisterListFolder: () => Promise<void>;
  handleLoadFirmwareSingle: (device: DeviceInfo) => Promise<void>;
  handleLoadFirmwareMany: () => void;
  handleFlashSN: (device: DeviceInfo) => Promise<void>;
  handlePsychrometry: () => void;
  handlePhChart: () => void;
  handleOptions: () => void;
  handleLoginMyAccount: () => void;
}

export interface UseToolsMenuResult {
  state: ToolsMenuState;
  handlers: ToolsMenuHandlers;
  resetState: () => void;
}

/**
 * Hook for Tools menu operations
 * Manages state and provides handlers for all Tools menu actions
 */
export function useToolsMenu(
  onSuccess?: (message: string) => void,
  onError?: (error: string) => void
): UseToolsMenuResult {
  const [state, setState] = useState<ToolsMenuState>({
    isLoading: false,
    error: null,
    lastOperation: null,
    isConnected: false,
  });

  const resetState = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: null,
      lastOperation: null,
    }));
  }, []);

  /**
   * Handle Connect
   * Opens connection dialog and connects to device
   */
  const handleConnect = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null, lastOperation: 'connect' }));

      // In a real implementation, this would open a connection dialog
      // For now, we'll use a simple prompt
      const port = window.prompt('Enter port (e.g., COM1 or IP address):');
      if (!port) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const protocol = window.prompt('Enter protocol (MODBUS_RS485, MODBUS_TCPIP, BACNET_IP, BACNET_MSTP):') as any;
      if (!protocol) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const result = await ToolsMenuService.connect({
        port,
        protocol,
        connected: false,
      });

      if (result.success) {
        setState((prev) => ({ ...prev, isLoading: false, error: null, isConnected: true }));
        onSuccess?.(result.message);
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: result.message }));
        onError?.(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [onSuccess, onError]);

  /**
   * Handle Disconnect
   */
  const handleDisconnect = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null, lastOperation: 'disconnect' }));

      const result = await ToolsMenuService.disconnect();

      if (result.success) {
        setState((prev) => ({ ...prev, isLoading: false, error: null, isConnected: false }));
        onSuccess?.(result.message);
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: result.message }));
        onError?.(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Disconnect failed';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [onSuccess, onError]);

  /**
   * Handle Change Modbus ID
   */
  const handleChangeModbusId = useCallback(async (device: DeviceInfo) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null, lastOperation: 'change-modbus-id' }));

      const oldId = device.serialNumber;
      const newIdStr = window.prompt(`Enter new Modbus ID for device ${oldId}:`);
      if (!newIdStr) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const newId = parseInt(newIdStr, 10);
      if (isNaN(newId)) {
        setState((prev) => ({ ...prev, isLoading: false, error: 'Invalid Modbus ID' }));
        onError?.('Invalid Modbus ID');
        return;
      }

      const result = await ToolsMenuService.changeModbusId({
        deviceSerialNumber: device.serialNumber,
        oldId,
        newId,
      });

      if (result.success) {
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
        onSuccess?.(result.message);
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: result.message }));
        onError?.(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change Modbus ID';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [onSuccess, onError]);

  /**
   * Handle BACnet Tool
   */
  const handleBacnetTool = useCallback(() => {
    ToolsMenuService.openBacnetTool();
  }, []);

  /**
   * Handle Modbus Poll
   */
  const handleModbusPoll = useCallback(() => {
    ToolsMenuService.openModbusPoll();
  }, []);

  /**
   * Handle Register Viewer
   */
  const handleRegisterViewer = useCallback(() => {
    ToolsMenuService.openRegisterViewer();
  }, []);

  /**
   * Handle Modbus Register v2
   */
  const handleModbusRegisterV2 = useCallback(() => {
    ToolsMenuService.openModbusRegisterV2();
  }, []);

  /**
   * Handle RegisterList Database Folder
   */
  const handleRegisterListFolder = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null, lastOperation: 'register-list-folder' }));

      const result = await ToolsMenuService.openRegisterListFolder();

      if (result.success) {
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
        onSuccess?.(result.message);
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: result.message }));
        onError?.(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to open register list folder';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [onSuccess, onError]);

  /**
   * Handle Load Firmware Single
   */
  const handleLoadFirmwareSingle = useCallback(async (device: DeviceInfo) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null, lastOperation: 'load-firmware-single' }));

      // Show file dialog
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.hex,.bin';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        const result = await ToolsMenuService.loadFirmwareSingle({
          deviceSerialNumber: device.serialNumber,
          firmwareFile: file,
          deviceType: device.productName || '',
        });

        if (result.success) {
          setState((prev) => ({ ...prev, isLoading: false, error: null }));
          onSuccess?.(result.message);
        } else {
          setState((prev) => ({ ...prev, isLoading: false, error: result.message }));
          onError?.(result.message);
        }
      };

      input.oncancel = () => {
        setState((prev) => ({ ...prev, isLoading: false }));
      };

      input.click();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load firmware';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [onSuccess, onError]);

  /**
   * Handle Load Firmware Many (currently inactive)
   */
  const handleLoadFirmwareMany = useCallback(() => {
    onError?.('This feature is currently inactive');
  }, [onError]);

  /**
   * Handle Flash SN
   */
  const handleFlashSN = useCallback(async (device: DeviceInfo) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null, lastOperation: 'flash-sn' }));

      const newSnStr = window.prompt(`Enter new serial number for device ${device.serialNumber}:`);
      if (!newSnStr) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const newSn = parseInt(newSnStr, 10);
      if (isNaN(newSn)) {
        setState((prev) => ({ ...prev, isLoading: false, error: 'Invalid serial number' }));
        onError?.('Invalid serial number');
        return;
      }

      const result = await ToolsMenuService.flashSerialNumber(device.serialNumber, newSn);

      if (result.success) {
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
        onSuccess?.(result.message);
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: result.message }));
        onError?.(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to flash serial number';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [onSuccess, onError]);

  /**
   * Handle Psychrometry
   */
  const handlePsychrometry = useCallback(() => {
    ToolsMenuService.openPsychrometry();
  }, []);

  /**
   * Handle PH Chart
   */
  const handlePhChart = useCallback(() => {
    ToolsMenuService.openPhChart();
  }, []);

  /**
   * Handle Options
   */
  const handleOptions = useCallback(() => {
    ToolsMenuService.openOptions();
  }, []);

  /**
   * Handle Login My Account
   */
  const handleLoginMyAccount = useCallback(() => {
    ToolsMenuService.loginMyAccount();
  }, []);

  return {
    state,
    handlers: {
      handleConnect,
      handleDisconnect,
      handleChangeModbusId,
      handleBacnetTool,
      handleModbusPoll,
      handleRegisterViewer,
      handleModbusRegisterV2,
      handleRegisterListFolder,
      handleLoadFirmwareSingle,
      handleLoadFirmwareMany,
      handleFlashSN,
      handlePsychrometry,
      handlePhChart,
      handleOptions,
      handleLoginMyAccount,
    },
    resetState,
  };
}

export default useToolsMenu;
