/**
 * Trend Store - Manages trend data state
 *
 * Responsibilities:
 * - Cache trend log configurations
 * - Cache trend data
 * - Chart state management
 * - Data export
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { TrendLogData, TrendDataPoint } from '@common/types/bacnet';
import { bacnetTrendsApi } from '@common/api';

interface TrendChartConfig {
  trendLogId: number;
  color: string;
  visible: boolean;
  yAxisId: 'left' | 'right';
}

export interface TrendState {
  // Data
  trendLogs: TrendLogData[];
  trendData: Map<number, TrendDataPoint[]>; // trendLogId -> data points
  currentDeviceId: string | null; // Track which device we're viewing

  // Chart configuration
  chartConfigs: TrendChartConfig[];
  timeRange: {
    start: Date;
    end: Date;
  };
  autoRefresh: boolean;
  refreshInterval: number; // milliseconds

  // UI state
  selectedTrendId: number | null;
  isLoading: boolean;
  isLoadingData: boolean;
  error: string | null;

  // Trend log management
  loadTrendLogs: (deviceId: string) => Promise<void>;
  loadTrendData: (deviceId: string, trendLogId: number, start?: Date, end?: Date) => Promise<void>;
  loadMultipleTrends: (deviceId: string, trendLogIds: number[]) => Promise<void>;
  refreshTrendData: (deviceId: string, trendLogId: number) => Promise<void>;

  // Chart configuration
  addToChart: (trendLogId: number, config?: Partial<TrendChartConfig>) => void;
  removeFromChart: (trendLogId: number) => void;
  updateChartConfig: (trendLogId: number, config: Partial<TrendChartConfig>) => void;
  clearChart: () => void;

  // Time range
  setTimeRange: (start: Date, end: Date) => void;
  setTimeRangePreset: (preset: 'hour' | 'day' | 'week' | 'month' | 'year') => void;

  // Auto refresh
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;

  // Selection
  selectTrend: (trendLogId: number | null) => void;

  // Computed
  getChartData: () => Array<{ trendLogId: number; data: TrendDataPoint[]; config: TrendChartConfig }>;
  getVisibleTrends: () => TrendChartConfig[];

  // Export
  exportToCSV: (trendLogIds: number[]) => Promise<string>;

  // Utilities
  clearCache: () => void;
  reset: () => void;
}

const getDefaultTimeRange = () => ({
  start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  end: new Date(),
});

const initialState = {
  trendLogs: [],
  trendData: new Map(),
  currentDeviceId: null,
  chartConfigs: [],
  timeRange: getDefaultTimeRange(),
  autoRefresh: false,
  refreshInterval: 60000, // 1 minute
  selectedTrendId: null,
  isLoading: false,
  isLoadingData: false,
  error: null,
};

export const useTrendStore = create<TrendState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Trend log management
      loadTrendLogs: async (deviceId: string) => {
        set({ isLoading: true, error: null, currentDeviceId: deviceId });
        try {
          const response = await bacnetTrendsApi.getTrendLogs(deviceId);
          set({
            trendLogs: response.data || [],
            isLoading: false
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load trend logs'
          });
        }
      },

      loadTrendData: async (deviceId: string, trendLogId: number, start?: Date, end?: Date) => {
        set({ isLoadingData: true, error: null });
        try {
          const { timeRange } = get();
          const startTime = start || timeRange.start;
          const endTime = end || timeRange.end;

          const response = await bacnetTrendsApi.getTrendData(
            deviceId,
            trendLogId,
            startTime,
            endTime
          );

          set((state: TrendState) => {
            const newTrendData = new Map(state.trendData);
            newTrendData.set(trendLogId, response.data || []);

            return {
              trendData: newTrendData,
              isLoadingData: false,
            };
          });
        } catch (error) {
          set({
            isLoadingData: false,
            error: error instanceof Error ? error.message : 'Failed to load trend data'
          });
        }
      },

      loadMultipleTrends: async (deviceId: string, trendLogIds: number[]) => {
        set({ isLoadingData: true, error: null });
        try {
          const { timeRange } = get();

          const promises = trendLogIds.map((id) =>
            bacnetTrendsApi.getTrendData(
              deviceId,
              id,
              timeRange.start,
              timeRange.end
            )
          );

          const responses = await Promise.all(promises);

          set((state: TrendState) => {
            const newTrendData = new Map(state.trendData);
            trendLogIds.forEach((id, index) => {
              newTrendData.set(id, responses[index].data || []);
            });

            return {
              trendData: newTrendData,
              isLoadingData: false,
            };
          });
        } catch (error) {
          set({
            isLoadingData: false,
            error: error instanceof Error ? error.message : 'Failed to load multiple trends'
          });
        }
      },

      refreshTrendData: async (deviceId: string, trendLogId: number) => {
        await get().loadTrendData(deviceId, trendLogId);
      },

      // Chart configuration
      addToChart: (trendLogId: number, config?: Partial<TrendChartConfig>) => {
        set((state: TrendState) => {
          // Don't add if already exists
          if (state.chartConfigs.some((c) => c.trendLogId === trendLogId)) {
            return state;
          }

          const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];
          const color = colors[state.chartConfigs.length % colors.length];

          const newConfig: TrendChartConfig = {
            trendLogId,
            color,
            visible: true,
            yAxisId: 'left',
            ...config,
          };

          return {
            chartConfigs: [...state.chartConfigs, newConfig],
          };
        });

        // Load data for this trend if we have a device
        const { currentDeviceId } = get();
        if (currentDeviceId) {
          get().loadTrendData(currentDeviceId, trendLogId);
        }
      },

      removeFromChart: (trendLogId: number) => {
        set((state: TrendState) => ({
          chartConfigs: state.chartConfigs.filter((c) => c.trendLogId !== trendLogId),
        }));
      },

      updateChartConfig: (trendLogId: number, config: Partial<TrendChartConfig>) => {
        set((state: TrendState) => ({
          chartConfigs: state.chartConfigs.map((c) =>
            c.trendLogId === trendLogId ? { ...c, ...config } : c
          ),
        }));
      },

      clearChart: () => {
        set({
          chartConfigs: [],
          trendData: new Map(),
        });
      },

      // Time range
      setTimeRange: (start: Date, end: Date) => {
        set({ timeRange: { start, end } });

        // Reload data for visible trends if we have a device
        const { currentDeviceId, getVisibleTrends } = get();
        const visibleTrends = getVisibleTrends();
        if (currentDeviceId && visibleTrends.length > 0) {
          get().loadMultipleTrends(currentDeviceId, visibleTrends.map((t) => t.trendLogId));
        }
      },

      setTimeRangePreset: (preset: 'hour' | 'day' | 'week' | 'month' | 'year') => {
        const now = new Date();
        let start: Date;

        switch (preset) {
          case 'hour':
            start = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case 'day':
            start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        }

        get().setTimeRange(start, now);
      },

      // Auto refresh
      setAutoRefresh: (enabled: boolean) => {
        set({ autoRefresh: enabled });

        if (enabled) {
          // Start refresh timer (in real implementation)
          // You'd want to store the timer ID and clear it when disabled
        }
      },

      setRefreshInterval: (interval: number) => {
        set({ refreshInterval: interval });

        // Restart auto-refresh if active
        if (get().autoRefresh) {
          get().setAutoRefresh(false);
          get().setAutoRefresh(true);
        }
      },

      // Selection
      selectTrend: (trendLogId: number | null) => {
        set({ selectedTrendId: trendLogId });
      },

      // Computed
      getChartData: () => {
        const { chartConfigs, trendData } = get();

        return chartConfigs.map((config) => ({
          trendLogId: config.trendLogId,
          data: trendData.get(config.trendLogId) || [],
          config,
        }));
      },

      getVisibleTrends: () => {
        return get().chartConfigs.filter((c) => c.visible);
      },

      // Export
      exportToCSV: async (trendLogIds: number[]) => {
        try {
          const { trendData, trendLogs } = get();

          let csv = 'Timestamp';

          // Header row
          trendLogIds.forEach((id) => {
            const log = trendLogs.find((l) => l.id === id);
            csv += `,${log?.name || `Trend ${id}`}`;
          });
          csv += '\n';

          // Find all unique timestamps
          const timestamps = new Set<number>();
          trendLogIds.forEach((id) => {
            const data = trendData.get(id) || [];
            data.forEach((point) => timestamps.add(new Date(point.timestamp).getTime()));
          });

          // Sort timestamps
          const sortedTimestamps = Array.from(timestamps).sort();

          // Data rows
          sortedTimestamps.forEach((timestamp) => {
            csv += new Date(timestamp).toISOString();

            trendLogIds.forEach((id) => {
              const data = trendData.get(id) || [];
              const point = data.find((p) => new Date(p.timestamp).getTime() === timestamp);
              csv += `,${point?.value ?? ''}`;
            });

            csv += '\n';
          });

          return csv;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Export failed'
          });
          return '';
        }
      },

      // Utilities
      clearCache: () => {
        set({
          trendLogs: [],
          trendData: new Map(),
          chartConfigs: [],
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'TrendStore',
    }
  )
);

// Selectors
export const trendSelectors = {
  trendLogs: (state: TrendState) => state.trendLogs,
  chartData: (state: TrendState) => state.getChartData(),
  timeRange: (state: TrendState) => state.timeRange,
  isLoading: (state: TrendState) => state.isLoading || state.isLoadingData,
};
