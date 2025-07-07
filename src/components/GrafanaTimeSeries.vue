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
      <canvas 
        ref="canvasRef"
        class="chart-canvas"
      ></canvas>
    </div>

    <div class="grafana-panel-footer">
      <span class="footer-text">Last update: {{ lastUpdateTime }}</span>
      <span class="footer-text">{{ totalDataPoints }} data points</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { 
  DataFrame, 
  FieldType, 
  TimeRange,
  dateTime,
  MutableDataFrame
} from '@grafana/data'
import Chart from 'chart.js/auto'
import 'chartjs-adapter-date-fns'

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
const canvasRef = ref<HTMLCanvasElement>()
const isRealtime = ref(true)
const timeRange = ref(props.timeRange)
const lastUpdateTime = ref('')
const realtimeInterval = ref<NodeJS.Timeout>()
let chartInstance: Chart | null = null

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
  updateChart()
}

// Convert data to Grafana DataFrame format (for potential future use)
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

// Create chart with Chart.js (styled like Grafana)
const createChart = () => {
  if (!canvasRef.value) return

  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy()
  }

  const datasets = dataSeries.value
    .filter(series => series.visible)
    .map(series => ({
      label: series.name,
      data: series.data.map(point => ({
        x: point.timestamp,
        y: point.value
      })),
      borderColor: series.color,
      backgroundColor: series.color + '20',
      borderWidth: 2,
      fill: false,
      tension: 0.1,
      pointRadius: 0,
      pointHoverRadius: 4
    }))

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#d9d9d9',
            font: {
              size: 12,
              family: 'Inter, Helvetica, Arial, sans-serif'
            },
            usePointStyle: true,
            pointStyle: 'line'
          }
        },
        tooltip: {
          backgroundColor: '#2d3748',
          titleColor: '#d9d9d9',
          bodyColor: '#d9d9d9',
          borderColor: '#4a5568',
          borderWidth: 1,
          cornerRadius: 4,
          displayColors: true,
          callbacks: {
            title: (context) => {
              const date = new Date(context[0].parsed.x)
              return date.toLocaleString()
            },
            label: (context) => {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            displayFormats: {
              minute: 'HH:mm',
              hour: 'HH:mm'
            }
          },
          grid: {
            color: '#36414b',
            display: true
          },
          ticks: {
            color: '#8e8e8e',
            font: {
              size: 11,
              family: 'Inter, Helvetica, Arial, sans-serif'
            }
          }
        },
        y: {
          grid: {
            color: '#36414b',
            display: true
          },
          ticks: {
            color: '#8e8e8e',
            font: {
              size: 11,
              family: 'Inter, Helvetica, Arial, sans-serif'
            }
          }
        }
      },
      elements: {
        line: {
          borderWidth: 2
        },
        point: {
          radius: 0,
          hoverRadius: 4
        }
      }
    }
  })
}

// Update existing chart
const updateChart = () => {
  if (!chartInstance) {
    createChart()
    return
  }

  // Update datasets
  chartInstance.data.datasets = dataSeries.value
    .filter(series => series.visible)
    .map(series => ({
      label: series.name,
      data: series.data.map(point => ({
        x: point.timestamp,
        y: point.value
      })),
      borderColor: series.color,
      backgroundColor: series.color + '20',
      borderWidth: 2,
      fill: false,
      tension: 0.1,
      pointRadius: 0,
      pointHoverRadius: 4
    }))

  chartInstance.update('none')
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
  createChart()
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
  createChart()
  if (isRealtime.value) {
    startRealtime()
  }
})

onUnmounted(() => {
  stopRealtime()
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})
</script>

<style scoped>
.grafana-timeseries-container {
  background: #181b1f;
  border: 1px solid #36414b;
  border-radius: 3px;
  font-family: Inter, Helvetica, Arial, sans-serif;
  color: #d9d9d9;
  overflow: hidden;
}

.grafana-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #1e2328;
  border-bottom: 1px solid #36414b;
  min-height: 32px;
}

.panel-title {
  font-size: 14px;
  font-weight: 500;
  color: #d9d9d9;
  margin: 0;
  line-height: 1.25;
}

.panel-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.grafana-button {
  background: #262c35;
  border: 1px solid #36414b;
  color: #d9d9d9;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  height: 24px;
  line-height: 16px;
  transition: all 0.15s ease-in-out;
  font-family: inherit;
}

.grafana-button:hover {
  background: #2f3c45;
  border-color: #52616b;
}

.grafana-button--primary {
  background: #1f77b4;
  border-color: #1f77b4;
  color: #fff;
}

.grafana-button--primary:hover {
  background: #1a6ca8;
  border-color: #1a6ca8;
}

.grafana-select {
  background: #262c35;
  border: 1px solid #36414b;
  color: #d9d9d9;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  height: 24px;
  font-family: inherit;
  cursor: pointer;
}

.grafana-select:hover {
  border-color: #52616b;
}

.grafana-select:focus {
  outline: none;
  border-color: #1f77b4;
  box-shadow: 0 0 0 2px rgba(31, 119, 180, 0.3);
}

.grafana-timeseries-panel {
  background: #181b1f;
  width: 100%;
  position: relative;
  padding: 16px;
}

.chart-canvas {
  width: 100% !important;
  height: 100% !important;
}

.grafana-panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 16px;
  background: #1e2328;
  border-top: 1px solid #36414b;
  font-size: 11px;
  color: #8e8e8e;
  min-height: 24px;
}

.footer-text {
  font-size: 11px;
  color: #8e8e8e;
}

/* Grafana UI overrides for dark theme */
:deep(.grafana-ui-panel) {
  background: transparent !important;
}

:deep(.react-grid-layout) {
  background: transparent !important;
}

/* Override any light theme colors */
:deep(*) {
  color-scheme: dark;
}
</style>
