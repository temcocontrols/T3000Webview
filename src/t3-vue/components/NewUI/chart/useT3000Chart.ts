import { ref, reactive } from 'vue'

// T3000 native chart interfaces
export interface T3000ChartData {
  time: number;
  value: number;
  label?: string;
}

export interface T3000TimeRange {
  from: Date;
  to: Date;
}

export interface T3000DataSeries {
  name: string;
  data: T3000ChartData[];
  unit?: string;
  color?: string;
}

export interface T3000ChartState {
  loading: boolean;
  series: T3000DataSeries[];
  timeRange: T3000TimeRange;
  error?: string;
}

export interface T3000Config {
  panelId: string;
  refreshInterval?: number;
  timeRange?: T3000TimeRange;
}

export interface T3000ApiResponse {
  success: boolean;
  data: T3000ChartData[];
  error?: string;
}

export interface T3000DataPoint {
  timestamp: number;
  value: number;
  quality?: string;
}

// Mock API for demonstration
const t3000Api = {
  async fetchData(config: T3000Config): Promise<T3000ApiResponse> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate sample data
    const now = Date.now();
    const data: T3000ChartData[] = [];

    for (let i = 0; i < 100; i++) {
      data.push({
        time: now - (i * 60000), // 1 minute intervals
        value: Math.random() * 100,
        label: `Point ${i}`
      });
    }

    return {
      success: true,
      data: data.reverse() // Chronological order
    };
  }
};

export function useT3000Chart(config: T3000Config) {
  // Reactive state
  const isLoading = ref(false)
  const error = ref<string>('')

  // T3000 native data structure
  const data = ref<T3000ChartState>({
    loading: false,
    series: [],
    timeRange: {
      from: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      to: new Date()
    }
  })

  // Time range for queries
  const timeRange = ref<T3000TimeRange>({
    from: new Date(Date.now() - 30 * 60 * 1000),
    to: new Date()
  })

  // Convert T3000 API response to chart series
  const convertToSeries = (apiResponse: T3000ApiResponse): T3000DataSeries[] => {
    if (!apiResponse.success || !apiResponse.data) {
      return [];
    }

    return [{
      name: `Panel ${config.panelId}`,
      data: apiResponse.data,
      unit: '°C', // Default unit
      color: '#1f77b4'
    }];
  }

  // Fetch data from T3000 API
  const fetchData = async (): Promise<void> => {
    try {
      isLoading.value = true;
      data.value.loading = true;
      error.value = '';

      const response = await t3000Api.fetchData({
        ...config,
        timeRange: timeRange.value
      });

      if (response.success) {
        const series = convertToSeries(response);

        data.value = {
          loading: false,
          series,
          timeRange: timeRange.value
        };
      } else {
        throw new Error(response.error || 'Failed to fetch data');
      }
    } catch (err: any) {
      error.value = err.message || 'An error occurred';
      data.value.loading = false;
      data.value.error = error.value;
    } finally {
      isLoading.value = false;
    }
  }

  // Update time range
  const updateTimeRange = (newTimeRange: T3000TimeRange): void => {
    timeRange.value = newTimeRange;
    data.value.timeRange = newTimeRange;
    fetchData(); // Refresh data with new time range
  }

  // Refresh data
  const refresh = (): void => {
    fetchData();
  }

  // Auto-refresh setup
  let refreshInterval: NodeJS.Timeout | null = null;

  const startAutoRefresh = (intervalMs: number = 30000): void => {
    stopAutoRefresh();
    refreshInterval = setInterval(fetchData, intervalMs);
  }

  const stopAutoRefresh = (): void => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  // Initialize
  if (config.refreshInterval) {
    startAutoRefresh(config.refreshInterval);
  }

  return {
    // State
    data,
    isLoading,
    error,
    timeRange,

    // Methods
    fetchData,
    updateTimeRange,
    refresh,
    startAutoRefresh,
    stopAutoRefresh,

    // Computed properties
    hasData: () => data.value.series.length > 0,
    isEmpty: () => data.value.series.length === 0,
    hasError: () => !!error.value
  }
}

export default useT3000Chart;
