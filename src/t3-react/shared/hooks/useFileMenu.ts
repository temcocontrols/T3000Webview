/**
 * File Menu Hook
 *
 * Provides handlers for all File menu operations
 * Integrates with FileMenuService and provides UI feedback
 */

import { useState, useCallback } from 'react';
import { FileMenuService } from '../../services/fileMenuService';
import type { DeviceInfo } from '../types/device';

export interface FileMenuState {
  isLoading: boolean;
  error: string | null;
  lastOperation: string | null;
}

export interface FileMenuHandlers {
  handleNewProject: () => Promise<void>;
  handleSaveAs: (device: DeviceInfo) => Promise<void>;
  handleLoadFile: (device: DeviceInfo) => Promise<void>;
  handleImport: () => Promise<void>;
  handleExit: () => void;
}

export interface UseFileMenuResult {
  state: FileMenuState;
  handlers: FileMenuHandlers;
  resetState: () => void;
}

/**
 * Hook for File menu operations
 * Manages state and provides handlers for all File menu actions
 */
export function useFileMenu(
  onSuccess?: (message: string) => void,
  onError?: (error: string) => void
): UseFileMenuResult {
  const [state, setState] = useState<FileMenuState>({
    isLoading: false,
    error: null,
    lastOperation: null,
  });

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      lastOperation: null,
    });
  }, []);

  /**
   * Handle New Project
   * Prompts for project name and creates new project
   */
  const handleNewProject = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null, lastOperation: 'new-project' }));

      // Prompt user for project name
      const projectName = window.prompt('Please enter a project name:');

      if (!projectName) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const result = await FileMenuService.newProject(projectName);

      if (result.success) {
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
        onSuccess?.(result.message);
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: result.message }));
        onError?.(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [onSuccess, onError]);

  /**
   * Handle Save As
   * Opens save dialog and saves device configuration
   */
  const handleSaveAs = useCallback(async (device: DeviceInfo) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null, lastOperation: 'save-as' }));

      // Determine file extension based on device type
      let extension = 'prog';
      let description = 'Program Files';

      if (device.productName?.includes('TSTAT') || device.productName?.includes('PM5E')) {
        extension = 'txt';
        description = 'Text Files';
      } else if (device.productName?.includes('CO2') || device.productName?.includes('HUM')) {
        extension = 'ini';
        description = 'INI Files';
      }

      // Suggest file name based on device
      const suggestedName = `${device.productName || 'config'}_${device.serialNumber}.${extension}`;

      // Show save dialog
      const fileName = await FileMenuService.showSaveDialog(suggestedName, [
        {
          description,
          accept: { [`application/${extension}`]: [`.${extension}`] },
        },
      ]);

      if (!fileName) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // Call save service
      const result = await FileMenuService.saveAs(
        device.serialNumber,
        fileName,
        device.productName || '',
        device.protocol || 'MODBUS'
      );

      if (result.success) {
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
        onSuccess?.(result.message);
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: result.message }));
        onError?.(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [onSuccess, onError]);

  /**
   * Handle Load File
   * Opens file dialog and loads configuration to device
   */
  const handleLoadFile = useCallback(async (device: DeviceInfo) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null, lastOperation: 'load-file' }));

      // Determine accepted file types based on device
      let accept = '.prog';
      if (device.productName?.includes('TSTAT') || device.productName?.includes('PM5E')) {
        accept = '.txt';
      } else if (device.productName?.includes('CO2') || device.productName?.includes('HUM')) {
        accept = '.ini';
      }

      // Show file dialog
      const file = await FileMenuService.showFileDialog(accept);

      if (!file) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // Load file to device
      const result = await FileMenuService.loadFile(device.serialNumber, file);

      if (result.success) {
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
        onSuccess?.(result.message);
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: result.message }));
        onError?.(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load configuration';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [onSuccess, onError]);

  /**
   * Handle Import
   * Opens file dialog and imports database
   */
  const handleImport = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null, lastOperation: 'import' }));

      // Show file dialog for database files
      const file = await FileMenuService.showFileDialog('.mdb,.db,.sqlite,.json');

      if (!file) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // Import database
      const result = await FileMenuService.importData(file);

      if (result.success) {
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
        onSuccess?.(result.message);
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: result.message }));
        onError?.(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import data';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [onSuccess, onError]);

  /**
   * Handle Exit
   * Cleans up and exits application
   */
  const handleExit = useCallback(() => {
    // Confirm before exit
    const confirmed = window.confirm('Are you sure you want to exit?');

    if (confirmed) {
      FileMenuService.exit();

      // Redirect to home or show exit message
      window.location.href = '/';
    }
  }, []);

  return {
    state,
    handlers: {
      handleNewProject,
      handleSaveAs,
      handleLoadFile,
      handleImport,
      handleExit,
    },
    resetState,
  };
}

export default useFileMenu;
