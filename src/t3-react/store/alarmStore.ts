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
import type { AlarmRecord, AlarmStatus } from '@common/types/alarm';
import { bacnetAlarmsApi } from '@common/api';

// Alarm severity (simplified from priority)
export enum AlarmSeverity {
  Critical = 'critical',  // Priority 1-4
  High = 'high',         // Priority 5-8
  Medium = 'medium',     // Priority 9-12
  Low = 'low',           // Priority 13-16
}

interface AlarmFilter {
  severity?: AlarmSeverity[];
  status?: AlarmStatus[];
  deviceId?: string;
  searchText?: string;
}

export interface AlarmState {
  // Data
  activeAlarms: AlarmRecord[];
  alarmHistory: AlarmRecord[];

  // Filter and sort
  filter: AlarmFilter;
  sortBy: 'timestamp' | 'severity' | 'device';
  sortOrder: 'asc' | 'desc';

  // UI state
  selectedAlarmId: string | null;
  isLoading: boolean;
  error: string | null;

  // Alarm management
  loadActiveAlarms: (deviceId: string) => Promise<void>;
  loadAlarmHistory: (deviceId?: string, startDate?: Date, endDate?: Date) => Promise<void>;
  acknowledgeAlarm: (deviceId: string, alarmId: number, recordId: string) => Promise<void>;
  acknowledgeAll: (deviceId: string) => Promise<void>;
  clearAlarm: (deviceId: string, alarmId: number, recordId: string) => Promise<void>;

  // Filter and sort
  setFilter: (filter: Partial<AlarmFilter>) => void;
  clearFilter: () => void;
  setSortBy: (sortBy: 'timestamp' | 'severity' | 'device') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Selection
  selectAlarm: (alarmId: string | null) => void;

  // Computed
  getFilteredAlarms: () => AlarmRecord[];
  getUnacknowledgedCount: () => number;
  getCriticalAlarmsCount: () => number;
  getAlarmsByDevice: (deviceId: string) => AlarmRecord[];

  // Utilities
  reset: () => void;
}

const initialState: Omit<AlarmState, keyof {
  loadActiveAlarms: any;
  loadAlarmHistory: any;
  acknowledgeAlarm: any;
  acknowledgeAll: any;
  clearAlarm: any;
  setFilter: any;
  clearFilter: any;
  setSortBy: any;
  setSortOrder: any;
  selectAlarm: any;
  getFilteredAlarms: any;
  getUnacknowledgedCount: any;
  getCriticalAlarmsCount: any;
  getAlarmsByDevice: any;
  reset: any;
}> = {
  activeAlarms: [],
  alarmHistory: [],
  filter: {},
  sortBy: 'timestamp',
  sortOrder: 'desc',
  selectedAlarmId: null,
  isLoading: false,
  error: null,
};

export const useAlarmStore = create<AlarmState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Alarm management
      loadActiveAlarms: async (deviceId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await bacnetAlarmsApi.getActiveAlarms(deviceId);

          set({
            activeAlarms: response.data || [],
            isLoading: false
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load alarms'
          });
        }
      },

      loadAlarmHistory: async (deviceId?: string, startDate?: Date, endDate?: Date) => {
        if (!deviceId) {
          set({ error: 'Device ID is required' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const response = await bacnetAlarmsApi.getAlarmRecords(deviceId, {
            startDate,
            endDate,
          });

          set({
            alarmHistory: response.data || [],
            isLoading: false
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load alarm history'
          });
        }
      },

      acknowledgeAlarm: async (deviceId: string, alarmId: number, recordId: string) => {
        try {
          await bacnetAlarmsApi.acknowledgeAlarm(deviceId, alarmId, recordId);

          set((state: AlarmState) => ({
            activeAlarms: state.activeAlarms.map((alarm) =>
              alarm.id === recordId
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

      acknowledgeAll: async (deviceId: string) => {
        try {
          // Acknowledge each active alarm individually
          const { activeAlarms } = get();
          const ackPromises = activeAlarms
            .filter(alarm => alarm.status === 'active')
            .map(alarm =>
              bacnetAlarmsApi.acknowledgeAlarm(deviceId, alarm.objectId, alarm.id)
            );

          await Promise.all(ackPromises);

          set((state: AlarmState) => ({
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

      clearAlarm: async (deviceId: string, alarmId: number, recordId: string) => {
        try {
          await bacnetAlarmsApi.clearAlarm(deviceId, alarmId, recordId);

          set((state: AlarmState) => ({
            activeAlarms: state.activeAlarms.filter((alarm) => alarm.id !== recordId),
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to clear alarm'
          });
        }
      },

      // Filter and sort
      setFilter: (filter: Partial<AlarmFilter>) => {
        set((state: AlarmState) => ({
          filter: { ...state.filter, ...filter },
        }));
      },

      clearFilter: () => {
        set({ filter: {} });
      },

      setSortBy: (sortBy: 'timestamp' | 'severity' | 'device') => {
        set({ sortBy });
      },

      setSortOrder: (order: 'asc' | 'desc') => {
        set({ sortOrder: order });
      },

      // Selection
      selectAlarm: (alarmId: string | null) => {
        set({ selectedAlarmId: alarmId });
      },

      // Computed
      getFilteredAlarms: () => {
        const { activeAlarms, filter, sortBy, sortOrder } = get();

        let filtered = [...activeAlarms];

        // Apply filters
        if (filter.severity && filter.severity.length > 0) {
          // Convert severity to priority ranges for filtering
          const priorityRanges: Record<AlarmSeverity, [number, number]> = {
            [AlarmSeverity.Critical]: [1, 4],
            [AlarmSeverity.High]: [5, 8],
            [AlarmSeverity.Medium]: [9, 12],
            [AlarmSeverity.Low]: [13, 16],
          };

          filtered = filtered.filter((alarm) => {
            return filter.severity!.some(sev => {
              const [min, max] = priorityRanges[sev];
              return alarm.priority >= min && alarm.priority <= max;
            });
          });
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
              // Lower priority number = higher severity
              comparison = a.priority - b.priority;
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
        // Priority 1-4 are critical
        return get().activeAlarms.filter((alarm) => alarm.priority >= 1 && alarm.priority <= 4).length;
      },

      getAlarmsByDevice: (deviceId: string) => {
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
