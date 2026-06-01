/**
 * Shared Alarms Page Hook
 * Contains fetch + refresh business logic for Alarms page
 * Used by both Desktop and Mobile versions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeviceTreeStore } from '@t3-react/features/devices/store/deviceTreeStore';
import { API_BASE_URL } from '@t3-react/config/constants';
import { AlarmRefreshApi } from '@t3-react/features/alarms/services/alarmRefreshApi';
import { Alarm } from '../types/alarm.types';

export const useAlarmsPage = () => {
  const { selectedDevice } = useDeviceTreeStore();

  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
  const [autoRefreshed, setAutoRefreshed] = useState(false);
  const hasAutoRefreshedRef = useRef(false);

  const fetchAlarms = useCallback(async () => {
    if (!selectedDevice) {
      setAlarms([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/t3_device/devices/${selectedDevice.serialNumber}/table/ALARMS`
      );

      if (!response.ok) throw new Error('Failed to fetch alarms');

      const result = await response.json();
      setAlarms(result.data || []);
    } catch (err) {
      console.error('[useAlarmsPage] Error fetching alarms:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch alarms');
      setAlarms([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  // Reset state and re-fetch when device changes
  useEffect(() => {
    setAutoRefreshed(false);
    hasAutoRefreshedRef.current = false;
    fetchAlarms();
  }, [fetchAlarms]);

  // Auto-refresh from device on page load
  useEffect(() => {
    if (loading || !selectedDevice || autoRefreshed || hasAutoRefreshedRef.current) return;

    const checkAndRefresh = async () => {
      hasAutoRefreshedRef.current = true;
      try {
        await AlarmRefreshApi.refreshAllFromDevice(selectedDevice.serialNumber);
        await fetchAlarms();
        setAutoRefreshed(true);
      } catch (err) {
        console.error('[useAlarmsPage] Auto-refresh failed:', err);
      }
    };

    checkAndRefresh();
  }, [loading, selectedDevice, autoRefreshed, fetchAlarms]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAlarms();
    setRefreshing(false);
  };

  const handleRefreshFromDevice = async () => {
    if (!selectedDevice) return;

    setRefreshing(true);
    setError(null);

    try {
      await AlarmRefreshApi.refreshAllFromDevice(selectedDevice.serialNumber);
      await fetchAlarms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh from device');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshSingleAlarm = async (alarm: Alarm) => {
    if (!selectedDevice || !alarm.alarm_id) return;

    const alarmKey = alarm.alarm_id;
    setRefreshingItems(prev => new Set(prev).add(alarmKey));

    try {
      await AlarmRefreshApi.refreshSingleFromDevice(
        selectedDevice.serialNumber,
        parseInt(alarm.alarm_id)
      );
      await fetchAlarms();
    } catch (err) {
      console.error(`[useAlarmsPage] Failed to refresh alarm ${alarm.alarm_id}:`, err);
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(alarmKey);
        return newSet;
      });
    }
  };

  return {
    alarms,
    loading,
    error,
    refreshing,
    refreshingItems,
    selectedDevice,
    handleRefresh,
    handleRefreshFromDevice,
    handleRefreshSingleAlarm,
  };
};
