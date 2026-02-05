/**
 * Control Menu Hook
 * React hook for Control menu operations
 */

import { useState, useCallback } from 'react';
import { ControlMenuService } from '../../services/controlMenuService';

export const useControlMenu = () => {
  const [loading, setLoading] = useState(false);

  const handleGraphics = useCallback(async () => {
    setLoading(true);
    try {
      await ControlMenuService.openGraphics();
    } catch (error) {
      console.error('Failed to open graphics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePrograms = useCallback(async () => {
    setLoading(true);
    try {
      await ControlMenuService.openPrograms();
    } catch (error) {
      console.error('Failed to open programs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputs = useCallback(async () => {
    setLoading(true);
    try {
      await ControlMenuService.openInputs();
    } catch (error) {
      console.error('Failed to open inputs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOutputs = useCallback(async () => {
    setLoading(true);
    try {
      await ControlMenuService.openOutputs();
    } catch (error) {
      console.error('Failed to open outputs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVariables = useCallback(async () => {
    setLoading(true);
    try {
      await ControlMenuService.openVariables();
    } catch (error) {
      console.error('Failed to open variables:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoops = useCallback(async () => {
    setLoading(true);
    try {
      await ControlMenuService.openLoops();
    } catch (error) {
      console.error('Failed to open loops:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSchedules = useCallback(async () => {
    setLoading(true);
    try {
      await ControlMenuService.openSchedules();
    } catch (error) {
      console.error('Failed to open schedules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleHolidays = useCallback(async () => {
    setLoading(true);
    try {
      await ControlMenuService.openHolidays();
    } catch (error) {
      console.error('Failed to open holidays:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTrendLogs = useCallback(async () => {
    setLoading(true);
    try {
      await ControlMenuService.openTrendLogs();
    } catch (error) {
      console.error('Failed to open trend logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAlarms = useCallback(async () => {
    setLoading(true);
    try {
      await ControlMenuService.openAlarms();
    } catch (error) {
      console.error('Failed to open alarms:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNetworkPanel = useCallback(async () => {
    setLoading(true);
    try {
      await ControlMenuService.openNetworkPanel();
    } catch (error) {
      console.error('Failed to open network panel:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRemotePoints = useCallback(async () => {
    setLoading(true);
    try {
      await ControlMenuService.openRemotePoints();
    } catch (error) {
      console.error('Failed to open remote points:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConfiguration = useCallback(async () => {
    setLoading(true);
    try {
      await ControlMenuService.openConfiguration();
    } catch (error) {
      console.error('Failed to open configuration:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    handlers: {
      handleGraphics,
      handlePrograms,
      handleInputs,
      handleOutputs,
      handleVariables,
      handleLoops,
      handleSchedules,
      handleHolidays,
      handleTrendLogs,
      handleAlarms,
      handleNetworkPanel,
      handleRemotePoints,
      handleConfiguration,
    },
  };
};
