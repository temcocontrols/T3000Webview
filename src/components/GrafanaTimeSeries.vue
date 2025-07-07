<template>
  <div class="grafana-timeseries-container">
    <div class="grafana-panel-header">
      <div class="panel-title">{{ title }}</div>
      <div class="panel-controls">
        <button 
          class="grafana-button" 
          :class="{ 'grafana-button--primary': isRealtime }"
          @click="toggleRealtime"
        >
          {{ isRealtime ? 'Pause' : 'Resume' }}
        </button>
        <select 
          class="grafana-select"
          v-model="timeRange" 
          @change="onTimeRangeChange"
        >
          <option value="5m">Last 5 minutes</option>
          <option value="15m">Last 15 minutes</option>
          <option value="30m">Last 30 minutes</option>
          <option value="1h">Last 1 hour</option>
          <option value="6h">Last 6 hours</option>
          <option value="24h">Last 24 hours</option>
        </select>
      </div>
    </div>

    <div 
      ref="timeSeriesContainer" 
      class="grafana-timeseries-panel"
      :style="{ height: `${height}px` }"
    >
      <!-- Grafana TimeSeries component will be rendered here -->
    </div>

    <div class="grafana-panel-footer">
      <span class="footer-text">Last update: {{ lastUpdateTime }}</span>
      <span class="footer-text">{{ totalDataPoints }} data points</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { 
  TimeSeries, 
  VizLegend,
  PanelContainer 
} from '@grafana/ui'
import { 
  DataFrame, 
  FieldType, 
  TimeRange,
  dateTime,
  MutableDataFrame,
  createTheme,
  GrafanaTheme2
} from '@grafana/data'
import { setEchoSrv } from '@grafana/runtime'

// Mock echo service for Grafana runtime
const mockEchoSrv = {
  addEvent: () => {},
  flush: () => {},
  subscribe: () => ({ unsubscribe: () => {} })
}
setEchoSrv(mockEchoSrv)

// Types
interface DataPoint {
  timestamp: number
  value: number
}

interface SeriesConfig {
  name: string
  color: string
  data: DataPoint[]
  visible: boolean
}

interface Props {
  title?: string
  height?: number
  updateInterval?: number
  maxDataPoints?: number
  timeRange?: string
}

// Props with defaults
const props = withDefaults(defineProps<Props>(), {
  title: 'Time Series Chart',
  height: 400,
  updateInterval: 30000, // 30 seconds
  maxDataPoints: 200,
  timeRange: '15m'
})

// Reactive variables
const timeSeriesContainer = ref<HTMLElement>()
const isRealtime = ref(true)
const timeRange = ref(props.timeRange)
const lastUpdateTime = ref('')
const realtimeInterval = ref<NodeJS.Timeout>()
const reactRoot = ref<any>(null)

// Series configuration - matching your graphic.png
const seriesConfigs: SeriesConfig[] = [
  { name: 'BMC01E1E-1P1B', color: '#FF6B6B', data: [], visible: true },
  { name: 'BMC01E1E-2P1B', color: '#4ECDC4', data: [], visible: true },
  { name: 'BMC01E1E-3P1B', color: '#45B7D1', data: [], visible: true },
  { name: 'BMC01E1E-4P1B', color: '#96CEB4', data: [], visible: true },
  { name: 'BMC01E1E-5P1B', color: '#FECA57', data: [], visible: true },
  { name: 'BMC01E1E-6P1B', color: '#FF9FF3', data: [], visible: true },
  { name: 'BMC01E1E-7P1B', color: '#54A0FF', data: [], visible: true }
]

const dataSeries = ref<SeriesConfig[]>([...seriesConfigs])

// Computed properties
const totalDataPoints = computed(() => {
  return dataSeries.value.reduce((total, series) => total + series.data.length, 0)
})

const timeRangeMs = computed(() => {
  const ranges: Record<string, number> = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000
  }
  return ranges[timeRange.value] || ranges['15m']
})

const currentTimeRange = computed((): TimeRange => {
  const now = Date.now()
  const from = now - timeRangeMs.value
  return {
    from: dateTime(from),
    to: dateTime(now),
    raw: {
      from: dateTime(from),
      to: dateTime(now)
    }
  }
})

// Generate realistic mock data
const generateMockData = (): number => {
  const baseValue = 65 + Math.sin(Date.now() / 100000) * 5
  const noise = (Math.random() - 0.5) * 8
  const spike = Math.random() < 0.05 ? (Math.random() - 0.5) * 20 : 0
  return Math.max(60, Math.min(70, baseValue + noise + spike))
}

// Initialize data
const initializeData = () => {
  const now = Date.now()
  const pointsToGenerate = Math.floor(timeRangeMs.value / props.updateInterval)

  dataSeries.value.forEach(series => {
    series.data = []
    for (let i = pointsToGenerate; i >= 0; i--) {
      const timestamp = now - i * props.updateInterval
      const value = generateMockData()
      series.data.push({ timestamp, value })
    }
  })
}

// Add new data point
const addDataPoint = () => {
  const now = Date.now()
  const cutoffTime = now - timeRangeMs.value

  dataSeries.value.forEach(series => {
    const value = generateMockData()
    series.data.push({ timestamp: now, value })

    // Remove old data points
    series.data = series.data.filter(point => point.timestamp >= cutoffTime)

    // Limit total data points
    if (series.data.length > props.maxDataPoints) {
      series.data = series.data.slice(-props.maxDataPoints)
    }
  })

  lastUpdateTime.value = new Date().toLocaleTimeString()
  renderChart()
}

// Convert data to Grafana DataFrame format
const createDataFrames = (): DataFrame[] => {
  return dataSeries.value
    .filter(series => series.visible && series.data.length > 0)
    .map(series => {
      const frame = new MutableDataFrame({
        name: series.name,
        fields: [
          {
            name: 'Time',
            type: FieldType.time,
            values: series.data.map(d => d.timestamp)
          },
          {
            name: 'Value',
            type: FieldType.number,
            values: series.data.map(d => d.value),
            config: {
              color: {
                mode: 'fixed',
                fixedColor: series.color
              },
              displayName: series.name
            }
          }
        ]
      })
      return frame
    })
}

// Render Grafana TimeSeries component
const renderChart = () => {
  if (!timeSeriesContainer.value) return

  const dataFrames = createDataFrames()
  if (dataFrames.length === 0) return

  const theme = createTheme({ colors: { mode: 'dark' } })

  const TimeSeriesComponent = React.createElement(
    PanelContainer,
    {},
    React.createElement(TimeSeries, {
      data: {
        series: dataFrames,
        timeRange: currentTimeRange.value,
        state: 'Done'
      },
      timeRange: currentTimeRange.value,
      timeZone: 'browser',
      options: {
        legend: {
          displayMode: 'list',
          placement: 'bottom',
          calcs: ['lastNotNull']
        },
        tooltip: {
          mode: 'single',
          sort: 'none'
        }
      },
      fieldConfig: {
        defaults: {
          custom: {
            drawStyle: 'line',
            lineInterpolation: 'linear',
            lineWidth: 2,
            fillOpacity: 0,
            gradientMode: 'none',
            spanNulls: false,
            insertNulls: false,
            showPoints: 'never',
            pointSize: 5,
            stacking: {
              mode: 'none',
              group: 'A'
            },
            axisPlacement: 'auto',
            axisLabel: '',
            axisColorMode: 'text',
            scaleDistribution: {
              type: 'linear'
            },
            axisCenteredZero: false,
            hideFrom: {
              legend: false,
              tooltip: false,
              vis: false
            },
            thresholdsStyle: {
              mode: 'off'
            }
          },
          color: {
            mode: 'palette-classic'
          },
          mappings: [],
          thresholds: {
            mode: 'absolute',
            steps: [
              {
                color: 'green',
                value: null
              },
              {
                color: 'red',
                value: 80
              }
            ]
          }
        },
        overrides: []
      },
      width: timeSeriesContainer.value.clientWidth,
      height: props.height - 80 // Account for header/footer
    })
  )

  // Clean up previous render
  if (reactRoot.value) {
    reactRoot.value.unmount()
  }

  // Create new React root and render
  reactRoot.value = ReactDOM.createRoot(timeSeriesContainer.value)
  reactRoot.value.render(TimeSeriesComponent)
}

// Event handlers
const toggleRealtime = () => {
  isRealtime.value = !isRealtime.value
  if (isRealtime.value) {
    startRealtime()
  } else {
    stopRealtime()
  }
}

const onTimeRangeChange = () => {
  renderChart()
}

const startRealtime = () => {
  if (realtimeInterval.value) {
    clearInterval(realtimeInterval.value)
  }
  realtimeInterval.value = setInterval(addDataPoint, props.updateInterval)
}

const stopRealtime = () => {
  if (realtimeInterval.value) {
    clearInterval(realtimeInterval.value)
    realtimeInterval.value = undefined
  }
}

// Lifecycle
onMounted(async () => {
  initializeData()
  await nextTick()
  renderChart()
  if (isRealtime.value) {
    startRealtime()
  }
})

onUnmounted(() => {
  stopRealtime()
  if (reactRoot.value) {
    reactRoot.value.unmount()
  }
})
</script>

<style scoped>
.grafana-timeseries-container {
  background: #1f1f1f;
  border-radius: 8px;
  border: 1px solid #333;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #ffffff;
}

.grafana-timeseries-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #ffffff;
}

.panel-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.panel-controls button {
  background: #333;
  border: 1px solid #555;
  color: #fff;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.panel-controls button:hover {
  background: #444;
}

.panel-controls button.active {
  background: #1f77b4;
  border-color: #1f77b4;
}

.panel-controls select {
  background: #333;
  border: 1px solid #555;
  color: #fff;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.grafana-timeseries-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
  font-size: 12px;
}

.legend-item:hover {
  background: #333;
}

.legend-item.disabled {
  opacity: 0.5;
}

.legend-item.disabled .legend-color {
  background: #666 !important;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-name {
  font-weight: 500;
  min-width: 120px;
}

.legend-value {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  color: #ccc;
}

.grafana-timeseries-chart {
  padding: 16px;
  background: #161616;
}

.grafana-timeseries-footer {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  font-size: 11px;
  color: #888;
  border-top: 1px solid #333;
}

/* D3 Chart Styles */
:deep(.x-axis text),
:deep(.y-axis text) {
  fill: #ccc;
  font-size: 11px;
}

:deep(.x-axis path),
:deep(.y-axis path) {
  stroke: #555;
}

:deep(.x-axis .tick line),
:deep(.y-axis .tick line) {
  stroke: #555;
}

:deep(.grid line) {
  stroke: #333;
  stroke-dasharray: 2,2;
  opacity: 0.7;
}

:deep(.grid path) {
  stroke-width: 0;
}

:deep(.line) {
  stroke-width: 2;
  fill: none;
}
</style>
