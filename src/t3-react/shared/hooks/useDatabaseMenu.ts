/**
 * Database Menu Hook
 * React hook for Database menu operations
 */

import { useState, useCallback } from 'react';
import { DatabaseMenuService } from '../../services/databaseMenuService';

export const useDatabaseMenu = () => {
  const [loading, setLoading] = useState(false);

  const handleBuildingConfigDatabase = useCallback(async () => {
    setLoading(true);
    try {
      await DatabaseMenuService.openBuildingConfigDatabase();
    } catch (error) {
      console.error('Failed to open building config database:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAllNodesDatabase = useCallback(async () => {
    setLoading(true);
    try {
      await DatabaseMenuService.openAllNodesDatabase();
    } catch (error) {
      console.error('Failed to open all nodes database:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleIONameConfig = useCallback(async () => {
    setLoading(true);
    try {
      await DatabaseMenuService.openIONameConfig();
    } catch (error) {
      console.error('Failed to open IOName config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogDetail = useCallback(async () => {
    setLoading(true);
    try {
      await DatabaseMenuService.openLogDetail();
    } catch (error) {
      console.error('Failed to open log detail:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    handlers: {
      handleBuildingConfigDatabase,
      handleAllNodesDatabase,
      handleIONameConfig,
      handleLogDetail,
    },
  };
};
