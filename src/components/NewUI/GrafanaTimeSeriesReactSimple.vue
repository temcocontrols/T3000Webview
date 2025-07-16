<template>
  <div class="react-timeseries-container">
    <div class="panel-header">
      <div class="panel-title">{{ title }} (React Integration)</div>
      <div class="panel-controls">
        <button
          class="control-button"
          :class="{ 'control-button--primary': isRealtime }"
          @click="toggleRealtime"
        >
          {{ isRealtime ? 'Pause' : 'Resume' }}
        </button>
        <select
          class="control-select"
          v-model="timeRange"
          @change="onTimeRangeChange"
        >
          <option value="5m">Last 5 minutes</option>
          <option value="15m">Last 15 minutes</option>
          <option value="30m">Last 30 minutes</option>
          <option value="1h">Last 1 hour</option>
        </select>
      </div>
    </div>

    <!-- React Chart Container -->
    <div
      ref="reactContainer"
      class="react-chart-container"
      :style="{ height: `${height - 80}px` }"
    ></div>

    <div class="panel-footer">
      <span class="footer-text">Last update: {{ lastUpdateTime }}</span>
      <span class="footer-text">{{ totalDataPoints }} data points</span>
      <span class="footer-text">React + Vue Integration Demo</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import React from 'react'
import ReactDOM from 'react-dom/client'

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

const props = withDefaults(defineProps<Props>(), {
  title: 'React Time Series',
  height: 400,
  updateInterval: 30000,
  maxDataPoints: 50,
  timeRange: '15m'
})

// Reactive state
const isRealtime = ref(true)
const realtimeInterval = ref<NodeJS.Timeout>()
const timeRange = ref(props.timeRange)
const lastUpdateTime = ref(new Date().toLocaleTimeString())
const reactContainer = ref<HTMLElement>()
const reactRoot = ref<any>(null)

// Data series matching graphic.png
const dataSeries = ref<SeriesConfig[]>([
  { name: 'BMC01E1E-1P1B', color: '#FF6B6B', data: [], visible: true },
  { name: 'BMC01E1E-2P1B', color: '#4ECDC4', data: [], visible: true },
  { name: 'BMC01E1E-3P1B', color: '#45B7D1', data: [], visible: true },
  { name: 'BMC01E1E-4P1B', color: '#96CEB4', data: [], visible: true },
  { name: 'BMC01E1E-5P1B', color: '#FECA57', data: [], visible: true }
])

const totalDataPoints = computed(() => {
  return dataSeries.value.reduce((total, series) => total + series.data.length, 0)
})

const timeRangeMs = computed(() => {
  const ranges: Record<string, number> = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000
  }
  return ranges[timeRange.value] || ranges['15m']
})

// React Chart Component
const createReactChart = () => {
  const chartData = dataSeries.value.filter(s => s.visible)

  return React.createElement('div', {
    style: {
      width: '100%',
      height: '100%',
      background: '#1f2329',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, Arial, sans-serif',
      color: '#d9d9d9'
    }
  }, [
    // Chart Area
    React.createElement('div', {
      key: 'chart',
      style: {
        flex: 1,
        position: 'relative',
        padding: '20px',
        background: '#181b1f'
      }
    }, [
      // Simple Chart Representation
      React.createElement('div', {
        key: 'chart-content',
        style: {
          width: '100%',
          height: '100%',
          border: '1px solid #36414b',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '20px'
        }
      }, [
        React.createElement('h3', {
          key: 'title',
          style: { margin: 0, color: '#d9d9d9' }
        }, 'React Time Series Chart'),
        React.createElement('div', {
          key: 'data-summary',
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
            width: '100%',
            maxWidth: '600px'
          }
        }, chartData.map(series =>
          React.createElement('div', {
            key: series.name,
            style: {
              padding: '10px',
              background: '#262c35',
              borderRadius: '4px',
              borderLeft: `3px solid ${series.color}`
            }
          }, [
            React.createElement('div', {
              key: 'name',
              style: { fontWeight: 'bold', fontSize: '12px' }
            }, series.name),
            React.createElement('div', {
              key: 'value',
              style: { fontSize: '14px', marginTop: '4px' }
            }, series.data.length > 0
              ? `${series.data[series.data.length - 1]?.value.toFixed(1)}°C`
              : 'No data'
            ),
            React.createElement('div', {
              key: 'points',
              style: { fontSize: '10px', color: '#8e8e8e', marginTop: '2px' }
            }, `${series.data.length} points`)
          ])
        ))
      ])
    ]),
    // Legend
    React.createElement('div', {
      key: 'legend',
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '12px 20px',
        borderTop: '1px solid #36414b',
        background: '#1e2328'
      }
    }, chartData.map(series =>
      React.createElement('div', {
        key: series.name,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          cursor: 'pointer'
        },
        onClick: () => toggleSeries(series.name)
      }, [
        React.createElement('div', {
          key: 'color',
          style: {
            width: '12px',
            height: '12px',
            borderRadius: '2px',
            backgroundColor: series.color
          }
        }),
        React.createElement('span', { key: 'name' }, series.name)
      ])
    ))
  ])
}

// Generate realistic mock data
const generateMockData = (seriesIndex: number): number => {
  const time = Date.now() / 1000
  const baseValue = 65 + Math.sin(time / 100 + seriesIndex) * 3
  const noise = (Math.random() - 0.5) * 4
  const spike = Math.random() < 0.03 ? (Math.random() - 0.5) * 15 : 0

  const patterns = [0, 2, -1, 1, -2]
  return Math.max(60, Math.min(70, baseValue + patterns[seriesIndex] + noise + spike))
}

// Initialize data
const initializeData = () => {
  const now = Date.now()
  const pointsToGenerate = Math.floor(timeRangeMs.value / props.updateInterval)

  dataSeries.value.forEach((series, seriesIndex) => {
    series.data = []
    for (let i = pointsToGenerate; i >= 0; i--) {
      const timestamp = now - i * props.updateInterval
      const value = generateMockData(seriesIndex)
      series.data.push({ timestamp, value })
    }
  })
}

// Add new data point
const addDataPoint = () => {
  const now = Date.now()
  const cutoffTime = now - timeRangeMs.value

  dataSeries.value.forEach((series, seriesIndex) => {
    const value = generateMockData(seriesIndex)
    series.data.push({ timestamp: now, value })

    // Remove old data points
    series.data = series.data.filter(point => point.timestamp >= cutoffTime)

    // Limit total data points
    if (series.data.length > props.maxDataPoints) {
      series.data = series.data.slice(-props.maxDataPoints)
    }
  })

  lastUpdateTime.value = new Date().toLocaleTimeString()
  renderReactChart()
}

// Toggle series visibility
const toggleSeries = (seriesName: string) => {
  const series = dataSeries.value.find(s => s.name === seriesName)
  if (series) {
    series.visible = !series.visible
    renderReactChart()
  }
}

// Render React chart
const renderReactChart = () => {
  if (reactContainer.value && reactRoot.value) {
    reactRoot.value.render(createReactChart())
  }
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
  initializeData()
  renderReactChart()
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
  await nextTick()

  if (reactContainer.value) {
    // Initialize React root
    reactRoot.value = ReactDOM.createRoot(reactContainer.value)

    // Initialize data and render
    initializeData()
    renderReactChart()

    if (isRealtime.value) {
      startRealtime()
    }
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
.react-timeseries-container {
  background: #181b1f;
  border: 1px solid #36414b;
  border-radius: 3px;
  color: #d9d9d9;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #1e2328;
  border-bottom: 1px solid #36414b;
}

.panel-title {
  font-size: 14px;
  font-weight: 500;
}

.panel-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.control-button {
  background: #262c35;
  border: 1px solid #36414b;
  color: #d9d9d9;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.control-button--primary {
  background: #1f77b4;
  border-color: #1f77b4;
}

.control-select {
  background: #262c35;
  border: 1px solid #36414b;
  color: #d9d9d9;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
}

.react-chart-container {
  background: #181b1f;
}

.panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #1e2328;
  border-top: 1px solid #36414b;
  font-size: 11px;
  color: #8e8e8e;
}

.footer-text {
  font-family: Monaco, Consolas, monospace;
}
</style>
