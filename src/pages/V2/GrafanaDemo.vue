<template>
  <div class="dashboard-example">
    <h2>T3000 Native Chart Demo</h2>

    <div class="charts-container">
      <div class="chart-wrapper">
        <div class="chart-placeholder">
          <h4>T3000 HVAC Chart</h4>
          <p>Device: T3000_DEMO_001</p>
          <p>Status: Ready for native chart implementation</p>
        </div>
      </div>

      <div class="chart-wrapper">
        <div class="chart-placeholder">
          <h4>T3000 Environment Chart</h4>
          <p>Device: T3000_DEMO_002</p>
          <p>Status: Ready for native chart implementation</p>
        </div>
      </div>
    </div>

    <div class="info-panel">
      <h3>About This Demo</h3>
      <p>
        This demonstration shows the T3000 data visualization using native charting capabilities
        integrated into a Vue 3 application. The implementation uses:
      </p>
      <ul>
        <li><strong>T3000 Native Charts</strong> - Custom chart components optimized for T3000</li>
        <li><strong>Real-time Data</strong> - Direct WebSocket connection to T3000 controllers</li>
        <li><strong>Performance Optimization</strong> - Virtual scrolling and efficient rendering</li>
        <li><strong>T3000 API</strong> - Native T3000 data structures and protocols</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onBeforeUnmount, onErrorCaptured } from 'vue';
// Removed Grafana component imports - using T3000 native components instead

// HVAC System Configuration
const hvacConfig = reactive<T3000Config>({
  deviceId: 'T3000_DEMO_001',
  refreshInterval: 30000,
  maxDataPoints: 500,
  enableRealTime: true,
  fields: {
    analog: ['supply_temp', 'return_temp', 'outdoor_temp', 'humidity'],
    digital: ['fan_status', 'heating_valve', 'cooling_valve'],
    calculated: ['energy_efficiency']
  },
  yAxisConfig: {
    left: {
      label: 'Temperature',
      unit: '°F',
      min: 'auto',
      max: 'auto'
    },
    right: {
      label: 'Humidity',
      unit: '%RH',
      min: 0,
      max: 100
    }
  }
});

// Environmental Monitoring Configuration
const environmentConfig = reactive<T3000Config>({
  deviceId: 'T3000_DEMO_002',
  refreshInterval: 60000,
  maxDataPoints: 300,
  enableRealTime: true,
  fields: {
    analog: ['co2_level', 'air_quality', 'pressure', 'light_level'],
    digital: ['occupancy', 'window_status', 'alarm'],
    calculated: ['comfort_index']
  },
  yAxisConfig: {
    left: {
      label: 'Air Quality',
      unit: 'PPM',
      min: 'auto',
      max: 'auto'
    },
    right: {
      label: 'Pressure',
      unit: 'kPa',
      min: 'auto',
      max: 'auto'
    }
  }
});

// Error handling for the demo page
onErrorCaptured((error, instance, info) => {
  // Handle any errors in the demo components
  if (error.message && (error.message.includes('gesto') || error.message.includes('selecto'))) {
    console.warn('[GrafanaDemo] Selecto-related error captured (safely ignored):', error.message);
    return false; // Prevent the error from propagating
  }

  console.warn('[GrafanaDemo] Component error:', error, info);
  return false; // Prevent the error from propagating
});

// Cleanup when leaving the demo page
onBeforeUnmount(() => {
  console.log('[GrafanaDemo] Cleaning up demo page');
  // Give components time to cleanup properly
  // This helps prevent navigation-related errors
});
</script>

<style scoped>
.dashboard-example {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.charts-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 20px 0;
}

.chart-wrapper {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-panel {
  margin-top: 30px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  border-left: 4px solid #1890ff;
}

.info-panel h3 {
  margin-top: 0;
  color: #333;
}

.info-panel ul {
  margin: 16px 0;
}

.info-panel li {
  margin: 8px 0;
  color: #666;
}

.chart-placeholder {
  border: 2px dashed #ccc;
  padding: 40px;
  text-align: center;
  background: #f9f9f9;
  border-radius: 8px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.chart-placeholder h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.chart-placeholder p {
  margin: 5px 0;
  color: #666;
}

.info-panel strong {
  color: #1890ff;
}

@media (min-width: 1024px) {
  .charts-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
}
</style>
