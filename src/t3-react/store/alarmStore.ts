/**
 * Alarm Store - Manages alarm state
 * 
 * Responsibilities:
 * - Cache active alarms
 * - Alarm history
 * - Alarm acknowledgment
 * - Alarm filtering and sorting
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AlarmData, AlarmSeverity, AlarmStatus } from '@common/types/bacnet';
import { bacnetAlarmsApi } from '@common/api';

interface AlarmFilter {
  severity?: AlarmSeverity[];
  status?: AlarmStatus[];
  deviceId?: number;
  searchText?: string;
}

interface AlarmState {
  // Data
  activeAlarms: AlarmData[];
  alarmHistory: AlarmData[];
  
  // Filter and sort
  filter: AlarmFilter;
  sortBy: 'timestamp' | 'severity' | 'device';
  sortOrder: 'asc' | 'desc';
  
  // UI state
  selectedAlarmId: number | null;
  isLoading: boolean;
  error: string | null;
  
  // Alarm management
  loadActiveAlarms: (deviceId?: number) => Promise<void>;
  loadAlarmHistory: (deviceId?: number, startDate?: Date, endDate?: Date) => Promise<void>;
  acknowledgeAlarm: (alarmId: number) => Promise<void>;
  acknowledgeAll: () => Promise<void>;
  clearAlarm: (alarmId: number) => Promise<void>;
  
  // Filter and sort
  setFilter: (filter: Partial<AlarmFilter>) => void;
  clearFilter: () => void;
  setSortBy: (sortBy: 'timestamp' | 'severity' | 'device') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  
  // Selection
  selectAlarm: (alarmId: number | null) => void;
  
  // Computed
  getFilteredAlarms: () => AlarmData[];
  getUnacknowledgedCount: () => number;
  getCriticalAlarmsCount: () => number;
  getAlarmsByDevice: (deviceId: number) => AlarmData[];
  
  // Utilities
  reset: () => void;
}

const initialState = {
  activeAlarms: [],
  alarmHistory: [],
  filter: {},
  sortBy: 'timestamp' as const,
  sortOrder: 'desc' as const,
  selectedAlarmId: null,
  isLoading: false,
  error: null,
};

export const useAlarmStore = create<AlarmState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Alarm management
      loadActiveAlarms: async (deviceId) => {
        set({ isLoading: true, error: null });
        try {
          const response = deviceId
            ? await bacnetAlarmsApi.getAlarms(deviceId)
            : await bacnetAlarmsApi.getAllAlarms();
          
          set({ 
            activeAlarms: response.data,
            isLoading: false 
          });
        } catch (error) {
          set({ 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load alarms'
          });
        }
      },

      loadAlarmHistory: async (deviceId, startDate, endDate) => {
        set({ isLoading: true, error: null });
        try {
          const response = await bacnetAlarmsApi.getAlarmHistory({
            deviceId,
            startDate,
            endDate,
          });
          
          set({ 
            alarmHistory: response.data,
            isLoading: false 
          });
        } catch (error) {
          set({ 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load alarm history'
          });
        }
      },

      acknowledgeAlarm: async (alarmId) => {
        try {
          await bacnetAlarmsApi.acknowledgeAlarm(alarmId);
          
          set((state) => ({
            activeAlarms: state.activeAlarms.map((alarm) =>
              alarm.id === alarmId
                ? { ...alarm, status: 'acknowledged' as AlarmStatus }
                : alarm
            ),
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to acknowledge alarm'
          });
        }
      },

      acknowledgeAll: async () => {
        try {
          await bacnetAlarmsApi.acknowledgeAll();
          
          set((state) => ({
            activeAlarms: state.activeAlarms.map((alarm) => ({
              ...alarm,
              status: 'acknowledged' as AlarmStatus,
            })),
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to acknowledge all alarms'
          });
        }
      },

      clearAlarm: async (alarmId) => {
        try {
          await bacnetAlarmsApi.clearAlarm(alarmId);
          
          set((state) => ({
            activeAlarms: state.activeAlarms.filter((alarm) => alarm.id !== alarmId),
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to clear alarm'
          });
        }
      },

      // Filter and sort
      setFilter: (filter) => {
        set((state) => ({
          filter: { ...state.filter, ...filter },
        }));
      },

      clearFilter: () => {
        set({ filter: {} });
      },

      setSortBy: (sortBy) => {
        set({ sortBy });
      },

      setSortOrder: (order) => {
        set({ sortOrder: order });
      },

      // Selection
      selectAlarm: (alarmId) => {
        set({ selectedAlarmId: alarmId });
      },

      // Computed
      getFilteredAlarms: () => {
        const { activeAlarms, filter, sortBy, sortOrder } = get();
        
        let filtered = [...activeAlarms];
        
        // Apply filters
        if (filter.severity && filter.severity.length > 0) {
          filtered = filtered.filter((alarm) =>
            filter.severity!.includes(alarm.severity)
          );
        }
        
        if (filter.status && filter.status.length > 0) {
          filtered = filtered.filter((alarm) =>
            filter.status!.includes(alarm.status)
          );
        }
        
        if (filter.deviceId) {
          filtered = filtered.filter((alarm) =>
            alarm.deviceId === filter.deviceId
          );
        }
        
        if (filter.searchText) {
          const search = filter.searchText.toLowerCase();
          filtered = filtered.filter((alarm) =>
            alarm.message.toLowerCase().includes(search) ||
            alarm.deviceName?.toLowerCase().includes(search)
          );
        }
        
        // Sort
        filtered.sort((a, b) => {
          let comparison = 0;
          
          switch (sortBy) {
            case 'timestamp':
              comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
              break;
            case 'severity':
              const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
              comparison = (severityOrder[a.severity] || 0) - (severityOrder[b.severity] || 0);
              break;
            case 'device':
              comparison = (a.deviceName || '').localeCompare(b.deviceName || '');
              break;
          }
          
          return sortOrder === 'asc' ? comparison : -comparison;
        });
        
        return filtered;
      },

      getUnacknowledgedCount: () => {
        return get().activeAlarms.filter((alarm) => alarm.status === 'active').length;
      },

      getCriticalAlarmsCount: () => {
        return get().activeAlarms.filter((alarm) => alarm.severity === 'critical').length;
      },

      getAlarmsByDevice: (deviceId) => {
        return get().activeAlarms.filter((alarm) => alarm.deviceId === deviceId);
      },

      // Utilities
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'AlarmStore',
    }
  )
);

// Selectors
export const alarmSelectors = {
  activeAlarms: (state: AlarmState) => state.activeAlarms,
  filteredAlarms: (state: AlarmState) => state.getFilteredAlarms(),
  unacknowledgedCount: (state: AlarmState) => state.getUnacknowledgedCount(),
  criticalAlarmsCount: (state: AlarmState) => state.getCriticalAlarmsCount(),
  isLoading: (state: AlarmState) => state.isLoading,
};
