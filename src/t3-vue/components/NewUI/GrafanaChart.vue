<template>
  <div class="grafana-chart-container">
    <ReactBridge
      :component="GrafanaPanel"
      :props="panelProps"
      @update:props="handlePropsUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from 'vue';
import ReactBridge from './chart/ReactBridge.vue';
import GrafanaPanel from './chart/GrafanaPanel';
import { useT3000Chart } from './chart/useT3000Chart';
import type { T3000Config } from './chart/types';

interface Props {
  deviceId?: string;
  config?: Partial<T3000Config>;
  width?: number;
  height?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

const props = withDefaults(defineProps<Props>(), {
  deviceId: 'default',
  config: () => ({}),
  width: 800,
  height: 400,
  autoRefresh: true,
  refreshInterval: 30
});

// Default configuration merged with user config
const chartConfig = reactive<T3000Config>({
  deviceId: props.deviceId,
  refreshInterval: props.refreshInterval * 1000, // Convert to milliseconds
  maxDataPoints: 1000,
  enableRealTime: props.autoRefresh,
  fields: {
    analog: ['temperature', 'humidity', 'pressure'],
    digital: ['fan_status', 'alarm_status'],
    calculated: ['dew_point', 'enthalpy']
  },
  yAxisConfig: {
    left: {
      label: 'Temperature/Pressure',
      unit: '°C / kPa',
      min: 'auto',
      max: 'auto'
    },
    right: {
      label: 'Humidity',
      unit: '%',
      min: 0,
      max: 100
    }
  },
  ...props.config
});

// Use the T3000 chart composable
const {
  data,
  timeRange,
  isLoading,
  error,
  updateTimeRange,
  loadData
} = useT3000Chart(chartConfig);

// Auto-refresh timer
let refreshTimer: NodeJS.Timeout | null = null;

// Panel props for Grafana component
const panelProps = computed(() => ({
  data: data.value,
  timeRange: timeRange.value,
  onTimeRangeChange: updateTimeRange,
  config: chartConfig,
  onDataRefresh: loadData,
  width: props.width,
  height: props.height
}));

const handlePropsUpdate = (newProps: any) => {
  // Handle any prop updates from the React component
  console.log('Panel props updated:', newProps);
};

// Setup auto-refresh
const setupAutoRefresh = () => {
  if (props.autoRefresh && props.refreshInterval > 0) {
    refreshTimer = setInterval(() => {
      loadData();
    }, props.refreshInterval * 1000);
  }
};

const clearAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

// Lifecycle hooks
onMounted(() => {
  // Setup auto-refresh timer
  setupAutoRefresh();

  // Initial data load
  loadData();
});

onUnmounted(() => {
  clearAutoRefresh();
});

// Expose methods for parent components
defineExpose({
  refreshData: loadData,
  updateTimeRange,
  setConfig: (newConfig: Partial<T3000Config>) => {
    Object.assign(chartConfig, newConfig);
  }
});
</script>

<style scoped>
.grafana-chart-container {
  width: 100%;
  height: 100%;
  background: var(--q-dark-page, #1a1a1a);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
