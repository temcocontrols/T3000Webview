<template>
  <div class="grafana-timeseries-container">
    <div class="grafana-panel-header">
      <div class="panel-title">{{ title }} (SVG Version)</div>
      <div class="panel-controls">
        <button
          class="grafana-button"
          :class="{ 'grafana-button--primary': isRealtime }"
          @click="toggleRealtime"
        >
          {{ isRealtime ? 'Pause' : 'Resume' }}
        </button>
      </div>
    </div>

    <!-- Pure SVG - NO CANVAS -->
    <div class="svg-chart-container" :style="{ height: `${height}px` }">
      <svg
        :width="chartWidth"
        :height="chartHeight"
        viewBox="0 0 800 400"
        class="chart-svg"
      >
        <!-- Grid lines -->
        <defs>
          <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#36414b" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        <!-- Y-axis -->
        <line x1="60" y1="20" x2="60" :y2="chartHeight - 40" stroke="#555" stroke-width="1"/>

        <!-- X-axis -->
        <line :x1="60" :y1="chartHeight - 40" :x2="chartWidth - 20" :y2="chartHeight - 40" stroke="#555" stroke-width="1"/>

        <!-- Data lines -->
        <g v-for="series in visibleSeries" :key="series.name">
          <path
            v-if="series.data && series.data.length > 0"
            :d="generateLinePath(series.data)"
            :stroke="series.color"
            stroke-width="2"
            fill="none"
          />
          <!-- Data points -->
          <template v-if="series.data && series.data.length > 0">
            <g v-for="point in series.data.slice(-10)" :key="`${series.name}-${point.timestamp}`">
              <circle
                :cx="getPointX(point.timestamp)"
                :cy="getPointY(point.value)"
                r="2"
                :fill="series.color"
                opacity="0.7"
              />
            </g>
          </template>
        </g>

        <!-- Y-axis labels -->
        <g v-for="(tick, index) in yTicks" :key="index">
          <text
            x="50"
            :y="tick.y + 5"
            fill="#8e8e8e"
            text-anchor="end"
            font-size="11"
          >
            {{ tick.value }}°C
          </text>
        </g>

        <!-- X-axis time labels -->
        <g v-for="(timeLabel, index) in timeLabels" :key="index">
          <text
            :x="timeLabel.x"
            :y="chartHeight - 25"
            fill="#8e8e8e"
            text-anchor="middle"
            font-size="10"
          >
            {{ timeLabel.label }}
          </text>
        </g>

        <!-- Chart title -->
        <text
          :x="chartWidth / 2"
          y="15"
          fill="#d9d9d9"
          text-anchor="middle"
          font-size="12"
          font-weight="500"
        >
          Temperature Sensors (°C) - {{ visibleSeries.length }} series
        </text>
      </svg>
    </div>

    <!-- Legend -->
    <div class="svg-legend">
      <div
        v-for="series in dataSeries"
        :key="series.name"
        class="legend-item"
        :class="{ disabled: !series.visible }"
        @click="toggleSeries(series.name)"
      >
        <div
          class="legend-color"
          :style="{ backgroundColor: series.color }"
        ></div>
        <span class="legend-name">{{ series.name }}</span>
        <span class="legend-value">{{ getLastValue(series.data) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

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

const props = withDefaults(defineProps<{
  title?: string
  height?: number
  updateInterval?: number
  maxDataPoints?: number
}>(), {
  title: 'SVG Time Series',
  height: 400,
  updateInterval: 30000,
  maxDataPoints: 50
})

const isRealtime = ref(true)
const realtimeInterval = ref<NodeJS.Timeout>()
const chartWidth = 800
const chartHeight = 400

// Initialize with test data series matching your graphic.png
const dataSeries = ref<SeriesConfig[]>([
  { name: 'BMC01E1E-1P1B', color: '#FF6B6B', data: [], visible: true },
  { name: 'BMC01E1E-2P1B', color: '#4ECDC4', data: [], visible: true },
  { name: 'BMC01E1E-3P1B', color: '#45B7D1', data: [], visible: true },
  { name: 'BMC01E1E-4P1B', color: '#96CEB4', data: [], visible: true },
  { name: 'BMC01E1E-5P1B', color: '#FECA57', data: [], visible: true }
])

const visibleSeries = computed(() => dataSeries.value.filter(s => s.visible))

const yTicks = computed(() => {
  const ticks = []
  for (let i = 0; i <= 5; i++) {
    ticks.push({
      value: 60 + i * 2,
      y: chartHeight - 40 - (i * (chartHeight - 60) / 5)
    })
  }
  return ticks
})

// Generate realistic test data
const generateMockData = (seriesIndex: number): number => {
  const time = Date.now() / 1000
  const baseValue = 65 + Math.sin(time / 100 + seriesIndex) * 3
  const noise = (Math.random() - 0.5) * 4
  const spike = Math.random() < 0.03 ? (Math.random() - 0.5) * 10 : 0

  return Math.max(60, Math.min(70, baseValue + noise + spike))
}

// Initialize data
const initializeData = () => {
  const now = Date.now()
  const pointsToGenerate = 20 // Start with 20 points

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

  dataSeries.value.forEach((series, seriesIndex) => {
    const value = generateMockData(seriesIndex)
    series.data.push({ timestamp: now, value })

    // Keep only the latest points
    if (series.data.length > props.maxDataPoints) {
      series.data = series.data.slice(-props.maxDataPoints)
    }
  })
}

const generateLinePath = (data: DataPoint[]): string => {
  if (data.length === 0) return ''

  try {
    const timeSpan = 15 * 60 * 1000 // 15 minutes
    const now = Date.now()
    const startTime = now - timeSpan

    // Filter to recent data
    const recentData = data.filter(point => point.timestamp >= startTime)
    if (recentData.length === 0) return ''

    const xScale = (chartWidth - 80) / timeSpan
    const yScale = (chartHeight - 60) / 10 // 10 degree range (60-70)

    return recentData
      .map((point, index) => {
        const x = 60 + (point.timestamp - startTime) * xScale
        const y = chartHeight - 40 - ((point.value - 60) * yScale)
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  } catch (error) {
    console.error('Error generating line path:', error)
    return ''
  }
}

// Helper functions for SVG positioning
const getPointX = (timestamp: number): number => {
  try {
    const timeSpan = 15 * 60 * 1000
    const now = Date.now()
    const startTime = now - timeSpan
    const xScale = (chartWidth - 80) / timeSpan
    return 60 + (timestamp - startTime) * xScale
  } catch (error) {
    console.error('Error calculating point X:', error)
    return 60
  }
}

const getPointY = (value: number): number => {
  try {
    const yScale = (chartHeight - 60) / 10
    return chartHeight - 40 - ((value - 60) * yScale)
  } catch (error) {
    console.error('Error calculating point Y:', error)
    return chartHeight - 40
  }
}

// Time labels for X-axis
const timeLabels = computed(() => {
  const labels = []
  const now = Date.now()
  const timeSpan = 15 * 60 * 1000
  const startTime = now - timeSpan

  for (let i = 0; i <= 5; i++) {
    const time = startTime + (i * timeSpan / 5)
    const x = 60 + (i * (chartWidth - 80) / 5)
    labels.push({
      x,
      label: new Date(time).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      })
    })
  }
  return labels
})

// Toggle series visibility
const toggleSeries = (seriesName: string) => {
  const series = dataSeries.value.find(s => s.name === seriesName)
  if (series) {
    series.visible = !series.visible
  }
}

// Get last value for legend
const getLastValue = (data: DataPoint[]): string => {
  if (data.length === 0) return 'N/A'
  return data[data.length - 1].value.toFixed(1) + '°C'
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

const toggleRealtime = () => {
  isRealtime.value = !isRealtime.value
  if (isRealtime.value) {
    startRealtime()
  } else {
    stopRealtime()
  }
}

// Lifecycle
onMounted(() => {
  initializeData()
  if (isRealtime.value) {
    startRealtime()
  }
})

onUnmounted(() => {
  stopRealtime()
})
</script>

<style scoped>
.grafana-timeseries-container {
  background: #181b1f;
  border: 1px solid #36414b;
  border-radius: 3px;
  color: #d9d9d9;
}

.grafana-panel-header {
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

.grafana-button {
  background: #262c35;
  border: 1px solid #36414b;
  color: #d9d9d9;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.grafana-button--primary {
  background: #1f77b4;
  border-color: #1f77b4;
}

.svg-chart-container {
  background: #181b1f;
  padding: 16px;
}

.chart-svg {
  width: 100%;
  height: calc(100% - 60px); /* Leave space for legend */
}

.svg-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 16px;
  border-top: 1px solid #36414b;
  background: #1e2328;
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
  background: #262c35;
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
  color: #d9d9d9;
}

.legend-value {
  font-family: Monaco, Consolas, monospace;
  font-size: 11px;
  color: #8e8e8e;
}
</style>
