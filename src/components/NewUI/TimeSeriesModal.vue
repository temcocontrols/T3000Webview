<template>
  <a-config-provider :theme="{
    token: {
      colorPrimary: '#0064c8',
    },
  }">
    <a-modal
      v-model:visible="timeSeriesModalVisible"
      :title="modalTitle"
      :width="1400"
      :footer="null"
      style="border-radius: 0px; top: 30px;"
      wrapClassName="t3-timeseries-modal"
      @cancel="handleCancel"
      centered
    >
      <!-- Top Controls Bar -->
      <div class="top-controls-bar">
        <div class="controls-group">
          <!-- Left Side Controls -->
          <div class="controls-left">
            <!-- Time Base -->
            <div class="control-item">
              <a-typography-text class="control-label">Time Base:</a-typography-text>
              <a-select
                v-model:value="timeBase"
                size="small"
                style="width: 120px;"
                @change="onTimeBaseChange"
              >
                <a-select-option value="5m">5 minutes</a-select-option>
                <a-select-option value="15m">15 minutes</a-select-option>
                <a-select-option value="30m">30 minutes</a-select-option>
                <a-select-option value="1h">1 hour</a-select-option>
                <a-select-option value="6h">6 hours</a-select-option>
                <a-select-option value="12h">12 hours</a-select-option>
                <a-select-option value="24h">24 hours</a-select-option>
                <a-select-option value="7d">7 days</a-select-option>
                <a-select-option value="custom">Custom Define</a-select-option>
              </a-select>
            </div>

            <!-- Navigation Arrows -->
            <div class="control-item">
              <a-button-group size="small">
                <a-button @click="moveTimeLeft" :disabled="isRealTime">
                  <template #icon><LeftOutlined /></template>
                </a-button>
                <a-button @click="moveTimeRight" :disabled="isRealTime">
                  <template #icon><RightOutlined /></template>
                </a-button>
              </a-button-group>
            </div>

            <!-- Zoom Controls -->
            <div class="control-item">
              <a-button-group size="small">
                <a-button @click="zoomIn">
                  <template #icon><ZoomInOutlined /></template>
                  Zoom In
                </a-button>
                <a-button @click="zoomOut">
                  <template #icon><ZoomOutOutlined /></template>
                  Zoom Out
                </a-button>
              </a-button-group>
            </div>

            <!-- View Buttons -->
            <div class="control-item">
              <a-button-group size="small">
                <a-button
                  :type="currentView === 1 ? 'primary' : 'default'"
                  @click="setView(1)"
                >
                  View 1
                </a-button>
                <a-button
                  :type="currentView === 2 ? 'primary' : 'default'"
                  @click="setView(2)"
                >
                  View 2
                </a-button>
                <a-button
                  :type="currentView === 3 ? 'primary' : 'default'"
                  @click="setView(3)"
                >
                  View 3
                </a-button>
              </a-button-group>
            </div>
          </div>

          <!-- Right Side Controls -->
          <div class="controls-right">
            <!-- Chart Options -->
            <div class="control-item chart-options">
              <a-typography-text class="control-label">Chart Options:</a-typography-text>
              <div class="chart-options-flex">
                <a-checkbox v-model:checked="showGrid" size="small">Grid</a-checkbox>
                <a-checkbox v-model:checked="showLegend" size="small">Legend</a-checkbox>
                <a-checkbox v-model:checked="smoothLines" size="small">Smooth</a-checkbox>
                <a-checkbox v-model:checked="showPoints" size="small">Points</a-checkbox>
              </div>
            </div>

            <!-- Export Options -->
            <div class="control-item export-options">
              <a-typography-text class="control-label">Export:</a-typography-text>
              <div class="export-options-flex">
                <a-button size="small" @click="exportChart">
                  <template #icon><DownloadOutlined /></template>
                  PNG
                </a-button>
                <a-button size="small" @click="exportData">
                  <template #icon><FileExcelOutlined /></template>
                  CSV
                </a-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="timeseries-container">
        <!-- Left Panel: Data Series and Options -->
        <div class="left-panel">
          <!-- Data Series -->
          <div class="control-section">
            <div class="data-series-header">
              <h4>Data Series</h4>
              <div class="auto-scroll-toggle">
                <a-typography-text class="toggle-label">Auto Scroll:</a-typography-text>
                <a-switch
                  v-model:checked="isRealTime"
                  size="small"
                  checked-children="On"
                  un-checked-children="Off"
                  @change="onRealTimeToggle"
                />
              </div>
            </div>
            <div class="series-list">                <div
                  v-for="(series, index) in dataSeries"
                  :key="series.name"
                  class="series-item"
                  :class="{
                    'series-disabled': !series.visible,
                    'series-empty': series.isEmpty
                  }"
                >
                  <div class="series-header" @click="series.isEmpty ? null : toggleSeries(index)">
                    <div class="series-color" :style="{ backgroundColor: series.color }"></div>
                    <span class="series-name">
                      {{ series.name }}
                      <span v-if="series.isEmpty" class="empty-indicator">(No Data)</span>
                    </span>
                    <div class="series-controls" v-if="!series.isEmpty">
                      <a-button
                        size="small"
                        type="text"
                        class="expand-toggle"
                        @click="(e) => toggleSeriesExpansion(index, e)"
                      >
                        <template #icon>
                          <DownOutlined
                            v-if="expandedSeries.has(index)"
                            class="expand-icon expanded"
                          />
                          <RightOutlined
                            v-else
                            class="expand-icon"
                          />
                        </template>
                      </a-button>
                      <a-switch
                        v-model:checked="series.visible"
                        size="small"
                        @change="onSeriesVisibilityChange(index)"
                      />
                    </div>
                    <div class="series-controls" v-else>
                      <span class="empty-placeholder">—</span>
                    </div>
                  </div>
                  <div v-if="expandedSeries.has(index) && !series.isEmpty" class="series-stats">
                  <div class="stat-item">
                    <span class="stat-label">Last:</span>
                    <span class="stat-value">{{ getLastValue(series.data) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Avg:</span>
                    <span class="stat-value">{{ getAverageValue(series.data) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Min:</span>
                    <span class="stat-value">{{ getMinValue(series.data) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Max:</span>
                    <span class="stat-value">{{ getMaxValue(series.data) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Custom Date Range (only shown when Custom Define is selected) -->
          <div v-if="timeBase === 'custom'" class="control-section custom-date-section">
            <h4>Custom Range</h4>
            <a-space direction="vertical" size="small" style="width: 100%;">
              <a-date-picker
                v-model:value="customStartDate"
                placeholder="Start Date"
                size="small"
                style="width: 100%;"
                @change="onCustomDateChange"
              />
              <a-date-picker
                v-model:value="customEndDate"
                placeholder="End Date"
                size="small"
                style="width: 100%;"
                @change="onCustomDateChange"
              />
            </a-space>
          </div>
        </div>

        <!-- Right Panel: Chart -->
        <div class="right-panel">
          <div class="chart-header">
            <div class="chart-title-section">
              <h3>{{ chartTitle }}</h3>
              <a-alert
                v-if="viewAlert.visible"
                :message="viewAlert.message"
                type="info"
                show-icon
                class="view-alert"
              />
            </div>
            <div class="chart-info">
              <div class="chart-info-left">
                <a-tag color="green" v-if="isRealTime">
                  <template #icon><SyncOutlined :spin="true" /></template>
                  Live Data
                </a-tag>
                <a-tag color="blue" v-else>Historical Data</a-tag>
                <span class="info-text">{{ totalDataPoints }} data points</span>
                <span class="info-text">{{ visibleSeriesCount }} series visible</span>
                <span class="info-text">Updated: {{ lastUpdateTime }}</span>
              </div>
              <div class="chart-info-right">
                <div class="status-indicators">
                  <div class="status-section">
                    <a-typography-text class="status-label">Range:</a-typography-text>
                    <a-tag size="small">{{ timeBase === 'custom' ? 'Custom Range' : timeBaseLabel }}</a-tag>
                  </div>
                  <div class="status-section">
                    <a-typography-text class="status-label">Zoom:</a-typography-text>
                    <a-tag size="small">{{ Math.round(zoomLevel * 100) }}%</a-tag>
                  </div>
                  <div class="status-section">
                    <a-typography-text class="status-label">View:</a-typography-text>
                    <a-tag color="blue" size="small">View {{ currentView }}</a-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-container" ref="chartContainer">
            <canvas ref="chartCanvas" class="chart-canvas"></canvas>
          </div>
        </div>
      </div>

      <!-- Loading overlay -->
      <div v-if="isLoading" class="loading-overlay">
        <a-spin size="large" />
        <div class="loading-text">Loading trend log data...</div>
      </div>
    </a-modal>
  </a-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { message, notification } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import Chart from 'chart.js/auto'
import 'chartjs-adapter-date-fns'
import {
  LeftOutlined,
  RightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  SyncOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  DownOutlined
} from '@ant-design/icons-vue'
import LogUtil from 'src/lib/T3000/Hvac/Util/LogUtil'

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
  unit?: string
  isEmpty?: boolean
}

interface Props {
  visible?: boolean
  itemData?: any
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  itemData: null
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

// Reactive state
const timeSeriesModalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// New reactive variables for top controls
const timeBase = ref('1h')
const currentView = ref(1)
const zoomLevel = ref(1)
const customStartDate = ref<Dayjs | null>(null)
const customEndDate = ref<Dayjs | null>(null)
const isRealTime = ref(true)
const updateInterval = ref(30000) // 30 seconds
const isLoading = ref(false)
const showGrid = ref(true)
const showLegend = ref(true)
const smoothLines = ref(false)
const showPoints = ref(false)
const lastUpdateTime = ref('')

// View switch alert state
const viewAlert = ref({
  visible: false,
  message: ''
})

// Series detail expansion state
const expandedSeries = ref<Set<number>>(new Set())

// Chart data - T3000 temperature sensor series (always 14 items)
const generateDataSeries = (): SeriesConfig[] => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE',
    '#FFB366', '#6BCF7F', '#A8E6CF', '#FF8A95', '#B8860B', '#9370DB', '#20B2AA'
  ]

  const baseSeries = [
    'BMC01E1E-1P1B', 'BMC01E1E-2P1B', 'BMC01E1E-3P1B', 'BMC01E1E-4P1B',
    'BMC01E1E-5P1B', 'BMC01E1E-6P1B', 'BMC01E1E-7P1B', 'BMC01E1E-8P1B',
    'BMC01E1E-9P1B', 'BMC01E1E-10P1B', 'BMC01E1E-11P1B', 'BMC01E1E-12P1B',
    'BMC01E1E-13P1B', 'BMC01E1E-14P1B'
  ]

  return baseSeries.map((name, index) => ({
    name: name,
    color: colors[index % colors.length],
    data: [],
    visible: index < 7, // Only first 7 visible by default
    unit: '°C',
    isEmpty: index >= 7 // Mark items 8-14 as empty by default
  }))
}

const dataSeries = ref<SeriesConfig[]>(generateDataSeries())

// Chart references
const chartContainer = ref<HTMLElement>()
const chartCanvas = ref<HTMLCanvasElement>()
let chartInstance: Chart | null = null
let realtimeInterval: NodeJS.Timeout | null = null

// Computed properties
const modalTitle = computed(() => {
  const name = props.itemData?.t3Entry?.description ||
               props.itemData?.t3Entry?.label ||
               props.itemData?.title ||
               'Trend Log Chart'
  return `Time Series: ${name}`
})

const chartTitle = computed(() => {
  return props.itemData?.t3Entry?.description || 'T3000 Temperature Sensors'
})

const totalDataPoints = computed(() => {
  return dataSeries.value
    .filter(series => !series.isEmpty)
    .reduce((total, series) => total + series.data.length, 0)
})

const visibleSeriesCount = computed(() => {
  return dataSeries.value.filter(series => series.visible && !series.isEmpty).length
})

const timeBaseLabel = computed(() => {
  const labels = {
    '5m': 'Last 5 minutes',
    '15m': 'Last 15 minutes',
    '30m': 'Last 30 minutes',
    '1h': 'Last 1 hour',
    '6h': 'Last 6 hours',
    '12h': 'Last 12 hours',
    '24h': 'Last 24 hours',
    '7d': 'Last 7 days'
  }
  return labels[timeBase.value] || 'Unknown'
})

// Chart configuration with Grafana-like styling
const getChartConfig = () => ({
  type: 'line' as const,
  data: {
    datasets: dataSeries.value
      .filter(series => series.visible && !series.isEmpty)
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
        tension: smoothLines.value ? 0.4 : 0,
        pointRadius: showPoints.value ? 3 : 0,
        pointHoverRadius: 6,
        pointBackgroundColor: series.color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }))
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const
    },
    plugins: {
      legend: {
        display: showLegend.value,
        position: 'bottom' as const,
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
        cornerRadius: 0, /* No border radius */
        displayColors: true,
        callbacks: {
          title: (context: any) => {
            const date = new Date(context[0].parsed.x)
            return date.toLocaleString()
          },
          label: (context: any) => {
            const series = dataSeries.value.find(s => s.name === context.dataset.label)
            const unit = series?.unit || ''
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}${unit}`
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'MM/DD'
          }
        },
        grid: {
          color: showGrid.value ? '#36414b' : 'transparent',
          display: showGrid.value
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
          color: showGrid.value ? '#36414b' : 'transparent',
          display: showGrid.value
        },
        ticks: {
          color: '#8e8e8e',
          font: {
            size: 11,
            family: 'Inter, Helvetica, Arial, sans-serif'
          },
          callback: function(value: any) {
            return `${value}°C`
          }
        }
      }
    },
    elements: {
      line: {
        borderWidth: 2
      },
      point: {
        radius: showPoints.value ? 3 : 0,
        hoverRadius: 6
      }
    }
  }
})

// Data generation and management
const generateMockData = (seriesIndex: number, timeRangeMinutes: number): DataPoint[] => {
  const now = Date.now()
  const points = Math.min(timeRangeMinutes * 2, 200) // 1 point every 30 seconds, max 200 points
  const baseTemp = 20 + seriesIndex * 2
  const data: DataPoint[] = []

  for (let i = 0; i < points; i++) {
    const timestamp = now - (points - i) * 30000 // 30 second intervals
    const variation = Math.sin(i * 0.1) * 2 + Math.random() * 1.5 - 0.75
    const value = baseTemp + variation
    data.push({ timestamp, value })
  }

  return data
}

const getTimeRangeMinutes = (range: string): number => {
  const ranges = {
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '6h': 360,
    '12h': 720,
    '24h': 1440,
    '7d': 10080
  }
  return ranges[range] || 60
}

const initializeData = () => {
  const minutes = getTimeRangeMinutes(timeBase.value)
  dataSeries.value.forEach((series, index) => {
    if (!series.isEmpty) {
      series.data = generateMockData(index, minutes)
    }
  })
  updateChart()
}

const addRealtimeDataPoint = () => {
  const now = Date.now()
  dataSeries.value.forEach((series, index) => {
    if (series.isEmpty) return

    const lastPoint = series.data[series.data.length - 1]
    const baseTemp = 20 + index * 2
    const variation = Math.sin(Date.now() * 0.0001) * 2 + Math.random() * 1.5 - 0.75
    const newValue = baseTemp + variation

    series.data.push({ timestamp: now, value: newValue })

    // Keep only the last 200 points for performance
    if (series.data.length > 200) {
      series.data.shift()
    }
  })

  lastUpdateTime.value = new Date().toLocaleTimeString()
  updateChart()
}

const createChart = () => {
  if (!chartCanvas.value) return

  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return

  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy()
  }

  chartInstance = new Chart(ctx, getChartConfig())
}

const updateChart = () => {
  if (!chartInstance) return

  chartInstance.data.datasets = dataSeries.value
    .filter(series => series.visible && !series.isEmpty && series.data.length > 0)
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
      tension: smoothLines.value ? 0.4 : 0,
      pointRadius: showPoints.value ? 3 : 0,
      pointHoverRadius: 6,
      pointBackgroundColor: series.color,
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    }))

  chartInstance.update('none')
}

// New control functions
const moveTimeLeft = () => {
  if (isRealTime.value) return

  // Move time window left by 15 minutes (or timebase/4)
  const baseMinutes = getTimeRangeMinutes(timeBase.value)
  const shiftMinutes = Math.max(baseMinutes / 4, 15)

  dataSeries.value.forEach((series) => {
    series.data = series.data.map(point => ({
      ...point,
      timestamp: point.timestamp - (shiftMinutes * 60 * 1000)
    }))
  })

  updateChart()
  message.info(`Moved ${shiftMinutes} minutes back`)
}

const moveTimeRight = () => {
  if (isRealTime.value) return

  // Move time window right by 15 minutes (or timebase/4)
  const baseMinutes = getTimeRangeMinutes(timeBase.value)
  const shiftMinutes = Math.max(baseMinutes / 4, 15)

  dataSeries.value.forEach((series) => {
    series.data = series.data.map(point => ({
      ...point,
      timestamp: point.timestamp + (shiftMinutes * 60 * 1000)
    }))
  })

  updateChart()
  message.info(`Moved ${shiftMinutes} minutes forward`)
}

const zoomIn = () => {
  if (zoomLevel.value < 4) {
    zoomLevel.value = Math.min(zoomLevel.value * 1.5, 4)

    if (chartInstance) {
      const xScale = chartInstance.scales.x
      const range = xScale.max - xScale.min
      const newRange = range / 1.5
      const center = (xScale.max + xScale.min) / 2

      chartInstance.options.scales.x.min = center - newRange / 2
      chartInstance.options.scales.x.max = center + newRange / 2
      chartInstance.update('none')
    }

    message.info(`Zoomed to ${Math.round(zoomLevel.value * 100)}%`)
  }
}

const zoomOut = () => {
  if (zoomLevel.value > 0.25) {
    zoomLevel.value = Math.max(zoomLevel.value / 1.5, 0.25)

    if (chartInstance) {
      const xScale = chartInstance.scales.x
      const range = xScale.max - xScale.min
      const newRange = range * 1.5
      const center = (xScale.max + xScale.min) / 2

      chartInstance.options.scales.x.min = center - newRange / 2
      chartInstance.options.scales.x.max = center + newRange / 2
      chartInstance.update('none')
    }

    message.info(`Zoomed to ${Math.round(zoomLevel.value * 100)}%`)
  }
}

const setView = (viewNumber: number) => {
  currentView.value = viewNumber

  // Different view configurations
  const viewConfigs = {
    1: {
      showGrid: true,
      showLegend: true,
      smoothLines: false,
      showPoints: false,
      title: 'Standard View',
      description: 'Grid lines and legend enabled for comprehensive data analysis'
    },
    2: {
      showGrid: false,
      showLegend: false,
      smoothLines: true,
      showPoints: false,
      title: 'Clean View',
      description: 'Minimalist display with smooth lines for focused viewing'
    },
    3: {
      showGrid: true,
      showLegend: true,
      smoothLines: true,
      showPoints: true,
      title: 'Detailed View',
      description: 'All features enabled for maximum data visualization detail'
    }
  }

  const config = viewConfigs[viewNumber]
  if (config) {
    showGrid.value = config.showGrid
    showLegend.value = config.showLegend
    smoothLines.value = config.smoothLines
    showPoints.value = config.showPoints

    if (chartInstance) {
      chartInstance.destroy()
      createChart()
    }

    // Show alert with view details
    viewAlert.value = {
      visible: true,
      message: `Switched to ${config.title}`
    }

    // Auto-hide alert after 4 seconds
    setTimeout(() => {
      viewAlert.value.visible = false
    }, 4000)
  }
}

// Event handlers
const onTimeBaseChange = () => {
  if (timeBase.value !== 'custom') {
    initializeData()
  }
}

const onCustomDateChange = () => {
  if (timeBase.value === 'custom' && customStartDate.value && customEndDate.value) {
    // Generate data for custom date range
    initializeData()
  }
}

const onRealTimeToggle = (checked: boolean) => {
  if (checked) {
    startRealTimeUpdates()
  } else {
    stopRealTimeUpdates()
  }
}

const onSeriesVisibilityChange = (index) => {
  LogUtil.Debug(`Toggling visibility for series ${dataSeries.value[index].name}`)
  toggleSeries(index)
}

const toggleSeries = (index: number) => {
  if (dataSeries.value[index].isEmpty) return
  dataSeries.value[index].visible = !dataSeries.value[index].visible
  updateChart()
}

const toggleSeriesExpansion = (index: number, event?: Event) => {
  // Stop event propagation to prevent triggering parent handlers
  if (event && typeof event.stopPropagation === 'function') {
    event.stopPropagation()
  }

  if (expandedSeries.value.has(index)) {
    expandedSeries.value.delete(index)
  } else {
    expandedSeries.value.add(index)
  }
}

const startRealTimeUpdates = () => {
  if (realtimeInterval) {
    clearInterval(realtimeInterval)
  }
  realtimeInterval = setInterval(addRealtimeDataPoint, updateInterval.value)
}

const stopRealTimeUpdates = () => {
  if (realtimeInterval) {
    clearInterval(realtimeInterval)
    realtimeInterval = null
  }
}

// Utility functions
const getLastValue = (data: DataPoint[]): string => {
  if (data.length === 0) return 'N/A'
  return data[data.length - 1].value.toFixed(2) + '°C'
}

const getAverageValue = (data: DataPoint[]): string => {
  if (data.length === 0) return 'N/A'
  const avg = data.reduce((sum, point) => sum + point.value, 0) / data.length
  return avg.toFixed(2) + '°C'
}

const getMinValue = (data: DataPoint[]): string => {
  if (data.length === 0) return 'N/A'
  const min = Math.min(...data.map(p => p.value))
  return min.toFixed(2) + '°C'
}

const getMaxValue = (data: DataPoint[]): string => {
  if (data.length === 0) return 'N/A'
  const max = Math.max(...data.map(p => p.value))
  return max.toFixed(2) + '°C'
}

const exportChart = () => {
  if (!chartInstance) return

  const link = document.createElement('a')
  link.download = `${chartTitle.value}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.png`
  link.href = chartInstance.toBase64Image()
  link.click()

  message.success('Chart exported successfully')
}

const exportData = () => {
  const activeSeriesData = dataSeries.value.filter(s => s.visible && !s.isEmpty)
  const csvData = []
  const headers = ['Timestamp', ...activeSeriesData.map(s => s.name)]
  csvData.push(headers.join(','))

  // Find max data length
  const maxLength = Math.max(...activeSeriesData.map(s => s.data.length))

  for (let i = 0; i < maxLength; i++) {
    const row = []
    const timestamp = activeSeriesData.find(s => s.data[i])?.data[i]?.timestamp
    if (timestamp) {
      row.push(new Date(timestamp).toISOString())
      activeSeriesData.forEach(series => {
        row.push(series.data[i]?.value?.toFixed(2) || '')
      })
      csvData.push(row.join(','))
    }
  }

  const blob = new Blob([csvData.join('\n')], { type: 'text/csv' })
  const link = document.createElement('a')
  link.download = `${chartTitle.value}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`
  link.href = URL.createObjectURL(blob)
  link.click()

  message.success('Data exported successfully')
}

const handleCancel = () => {
  stopRealTimeUpdates()
  timeSeriesModalVisible.value = false
}

// Watchers
watch([showGrid, showLegend, smoothLines, showPoints], () => {
  if (chartInstance) {
    chartInstance.destroy()
    createChart()
  }
})

watch(() => props.visible, (newVal) => {
  if (newVal) {
    nextTick(() => {
      initializeData()
      createChart()
      if (isRealTime.value) {
        startRealTimeUpdates()
      }
      lastUpdateTime.value = new Date().toLocaleTimeString()
    })
  } else {
    stopRealTimeUpdates()
  }
})

// Lifecycle
onMounted(() => {
  if (props.visible) {
    nextTick(() => {
      initializeData()
      createChart()
      if (isRealTime.value) {
        startRealTimeUpdates()
      }
    })
  }
})

onUnmounted(() => {
  stopRealTimeUpdates()
  if (chartInstance) {
    chartInstance.destroy()
  }
})
</script>

<style scoped>
.timeseries-container {
  display: flex;
  height: calc(65vh - 60px); /* Reduced height for more compact design */
  min-height: 420px; /* Reduced minimum height */
  max-height: 550px; /* Reduced maximum height */
  gap: 12px; /* Reduced gap for more compactness */
  background: #0f1419;
  border-radius: 0px; /* No border radius */
  overflow: visible;
  padding: 0; /* Remove any default padding */
}

.left-panel {
  width: 280px; /* Reduced from 300px */
  background: #181b1f;
  border: 1px solid #36414b;
  border-radius: 0px; /* No border radius */
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.right-panel {
  flex: 1;
  background: #181b1f;
  border: 1px solid #36414b;
  border-radius: 0px; /* No border radius */
  display: flex;
  flex-direction: column;
  min-width: 0; /* Allow flex shrinking */
  overflow: hidden; /* Contain content properly */
}

.control-section {
  padding: 12px; /* Reduced padding */
  border-bottom: 1px solid #36414b;
}

.control-section:last-child {
  border-bottom: none;
}

/* Data Series section takes up remaining space */
.control-section:first-child {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.control-section h4 {
  margin: 0 0 10px 0; /* Reduced margin */
  color: #d9d9d9;
  font-size: 13px; /* Slightly smaller */
  font-weight: 600;
}

.data-series-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.data-series-header h4 {
  margin: 0;
  color: #d9d9d9;
  font-size: 13px;
  font-weight: 600;
}

.auto-scroll-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toggle-label {
  color: #8e8e8e !important;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.series-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.series-item {
  margin-bottom: 8px; /* Reduced margin */
  border: 1px solid #36414b;
  border-radius: 0px; /* No border radius */
  background: #1e2328;
  transition: all 0.2s ease;
}

.series-item:hover {
  background: #262c35;
}

.series-disabled {
  opacity: 0.6;
}

.series-empty {
  opacity: 0.4;
  pointer-events: none;
}

.series-empty .series-header {
  cursor: default;
}

.empty-indicator {
  color: #8e8e8e;
  font-style: italic;
  font-size: 10px;
  margin-left: 4px;
}

.empty-placeholder {
  color: #5a5a5a;
  font-size: 14px;
  width: 52px;
  text-align: center;
}

.series-header {
  display: flex;
  align-items: center;
  padding: 6px 10px; /* Reduced padding */
  cursor: pointer;
  gap: 6px; /* Reduced gap */
}

.series-color {
  width: 12px;
  height: 12px;
  border-radius: 0px; /* No border radius */
  flex-shrink: 0;
}

.series-name {
  flex: 1;
  color: #d9d9d9;
  font-size: 12px;
  font-weight: 500;
}

.series-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-toggle {
  padding: 0 !important;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8e8e8e !important;
  border: none !important;
  background: transparent !important;
}

.expand-toggle:hover {
  color: #d9d9d9 !important;
  background: rgba(255, 255, 255, 0.1) !important;
}

.expand-icon {
  font-size: 10px;
  transition: transform 0.2s ease;
}

.expand-icon.expanded {
  transform: rotate(0deg);
}

.series-stats {
  padding: 6px 10px; /* Reduced padding */
  border-top: 1px solid #36414b;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px; /* Reduced gap */
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.stat-label {
  color: #8e8e8e;
}

.stat-value {
  color: #d9d9d9;
  font-weight: 500;
}

.chart-header {
  padding: 12px 16px; /* Reduced padding */
  border-bottom: 1px solid #36414b;
  background: #1e2328;
}

.chart-title-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 3px;
}

.chart-header h3 {
  margin: 0; /* Remove margin since it's now in flex */
  color: #d9d9d9;
  font-size: 16px; /* Slightly smaller font */
  font-weight: 600;
  flex-shrink: 0; /* Prevent title from shrinking */
}

.view-alert {
  max-width: 400px;
  flex-shrink: 1;
}

.chart-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px; /* Reduced gap */
}

.chart-info-left {
  display: flex;
  gap: 12px; /* Reduced gap */
  align-items: center;
  flex-wrap: wrap;
}

.chart-info-right {
  display: flex;
  align-items: center;
}

.status-indicators {
  display: flex;
  gap: 12px; /* Reduced gap */
  align-items: center;
  flex-wrap: wrap;
}

.status-section {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-label {
  color: #8e8e8e !important;
  font-size: 11px;
  font-weight: 500;
}

.info-text {
  color: #8e8e8e;
  font-size: 12px;
  white-space: nowrap;
}

.chart-container {
  flex: 1;
  padding: 12px; /* Reduced padding */
  position: relative;
  min-height: 280px; /* Reduced min height */
  display: flex;
  flex-direction: column;
}

.chart-canvas {
  width: 100% !important;
  height: 100% !important;
  min-height: 260px; /* Reduced min height */
}

/* Top Controls Bar Styling */
.top-controls-bar {
  background: #181b1f;
  border: 1px solid #36414b;
  border-radius: 0px; /* No border radius */
  padding: 10px 14px; /* More compact padding */
  margin-bottom: 12px; /* Reduced margin */
}

.controls-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px; /* Reduced gap */
  flex-wrap: wrap;
}

.controls-left {
  display: flex;
  align-items: center;
  gap: 16px; /* Reduced gap */
  flex-wrap: wrap;
}

.controls-right {
  display: flex;
  align-items: center;
  gap: 16px; /* Reduced gap */
  flex-wrap: wrap;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.chart-options {
  border-left: 1px solid #36414b;
  padding-left: 16px;
  margin-left: 8px;
}

.chart-options-flex {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.export-options {
  border-left: 1px solid #36414b;
  padding-left: 16px;
  margin-left: 8px;
}

.export-options-flex {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

/* Export options styling in top bar */
.export-options-flex :deep(.ant-btn) {
  padding: 4px 8px !important;
  height: auto !important;
  font-size: 11px !important;
}

.export-options-flex :deep(.ant-btn .anticon) {
  font-size: 12px !important;
}

.control-label {
  color: #d9d9d9 !important;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

/* Compact controls styling */
.compact-controls {
  padding: 8px 0;
}

.compact-controls .ant-space-item {
  width: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 20, 25, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-text {
  margin-top: 16px;
  color: #d9d9d9;
  font-size: 14px;
}

/* Dark theme overrides for Ant Design components */
:deep(.ant-select-selector) {
  background: #262c35 !important;
  border-color: #36414b !important;
  color: #d9d9d9 !important;
}

:deep(.ant-select-selection-item) {
  color: #d9d9d9 !important;
}

:deep(.ant-picker) {
  background: #262c35 !important;
  border-color: #36414b !important;
}

:deep(.ant-picker input) {
  color: #d9d9d9 !important;
}

:deep(.ant-switch) {
  background: #555 !important;
}

:deep(.ant-switch-checked) {
  background: #0064c8 !important;
}

:deep(.ant-checkbox-wrapper) {
  color: #d9d9d9 !important;
  margin-bottom: 8px;
  display: block;
}

:deep(.ant-btn) {
  background: #262c35 !important;
  border-color: #36414b !important;
  color: #d9d9d9 !important;
}

:deep(.ant-btn:hover) {
  background: #2f3c45 !important;
  border-color: #52616b !important;
}

/* Modal styling */
:deep(.t3-timeseries-modal .ant-modal-content) {
  background: #0f1419 !important;
  border: 1px solid #36414b;
  border-radius: 0px !important; /* No border radius */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6) !important; /* Modern shadow */
}

:deep(.t3-timeseries-modal .ant-modal-header) {
  background: #181b1f !important;
  border-bottom: 1px solid #36414b !important;
  border-radius: 0px !important; /* No border radius */
  padding: 12px 16px !important; /* Reduced padding */
}

:deep(.t3-timeseries-modal .ant-modal-title) {
  color: #d9d9d9 !important;
  font-weight: 600;
  font-size: 16px !important; /* Slightly smaller */
}

:deep(.t3-timeseries-modal .ant-modal-close-x) {
  color: #8e8e8e !important;
}

:deep(.t3-timeseries-modal .ant-modal-body) {
  padding: 12px !important; /* Reduced padding */
  background: #0f1419 !important;
  margin: 0;
}

/* Scrollbar styling */
.left-panel::-webkit-scrollbar,
.series-list::-webkit-scrollbar {
  width: 6px;
}

.left-panel::-webkit-scrollbar-track,
.series-list::-webkit-scrollbar-track {
  background: #1e2328;
}

.left-panel::-webkit-scrollbar-thumb,
.series-list::-webkit-scrollbar-thumb {
  background: #36414b;
  border-radius: 0px; /* No border radius */
}

.left-panel::-webkit-scrollbar-thumb:hover,
.series-list::-webkit-scrollbar-thumb:hover {
  background: #52616b;
}

/* Responsive behavior for top controls */
@media (max-width: 1200px) {
  .controls-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .controls-left,
  .controls-right {
    width: 100%;
    justify-content: flex-start;
  }

  .chart-options {
    border-left: none;
    border-top: 1px solid #36414b;
    padding-left: 0;
    padding-top: 12px;
    margin-left: 0;
    margin-top: 8px;
  }

  .export-options {
    border-left: none;
    border-top: 1px solid #36414b;
    padding-left: 0;
    padding-top: 12px;
    margin-left: 0;
    margin-top: 8px;
  }

  .timeseries-container {
    height: calc(60vh - 60px);
    min-height: 400px;
  }

  .left-panel {
    width: 280px;
  }

  .chart-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .chart-info-right {
    width: 100%;
  }

  .status-indicators {
    gap: 12px;
  }
}

/* Responsive behavior for smaller screens */
@media (max-width: 900px) {
  .timeseries-container {
    flex-direction: column;
    height: auto;
    min-height: 600px;
  }

  .left-panel {
    width: 100%;
    max-height: 250px;
  }

  .right-panel {
    min-height: 350px;
  }

  .chart-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .chart-info-left,
  .chart-info-right {
    width: 100%;
  }

  .status-indicators {
    justify-content: flex-start;
    gap: 8px;
  }
}

/* Enhanced checkbox styling in top bar */
.chart-options-flex :deep(.ant-checkbox-wrapper) {
  margin-bottom: 0 !important;
  color: #d9d9d9 !important;
  font-size: 11px;
}

.chart-options-flex :deep(.ant-checkbox-wrapper:hover) {
  color: #ffffff !important;
}

/* Custom Date Range section styling */
.control-section:has(.ant-space) {
  flex-shrink: 0;
  min-height: auto;
}

/* Alternative approach for browsers that don't support :has() */
.custom-date-section {
  flex-shrink: 0;
  min-height: auto;
}

/* Notification styling */
:deep(.ant-notification) {
  z-index: 9999 !important;
}

:deep(.ant-notification .ant-notification-notice) {
  background: #181b1f !important;
  border: 1px solid #36414b !important;
  border-radius: 0px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
}

:deep(.ant-notification .ant-notification-notice .ant-notification-notice-message) {
  color: #d9d9d9 !important;
  font-weight: 600 !important;
}

:deep(.ant-notification .ant-notification-notice .ant-notification-notice-description) {
  color: #8e8e8e !important;
}

:deep(.ant-notification .ant-notification-notice .ant-notification-notice-icon) {
  color: #52c41a !important;
}

:deep(.ant-notification .ant-notification-notice .ant-notification-notice-close) {
  color: #8e8e8e !important;
}

:deep(.ant-notification .ant-notification-notice .ant-notification-notice-close:hover) {
  color: #d9d9d9 !important;
}

/* Alert styling for view switching */
:deep(.view-alert) {
  background: #1e2328 !important;
  border: 1px solid #36414b !important;
  border-radius: 0px !important;
}

:deep(.view-alert .ant-alert-message) {
  color: #d9d9d9 !important;
  font-weight: 600 !important;
  font-size: 12px !important;
}

:deep(.view-alert .ant-alert-description) {
  color: #8e8e8e !important;
  font-size: 11px !important;
}

:deep(.view-alert .ant-alert-icon) {
  color: #1890ff !important;
}

:deep(.view-alert .ant-alert-close-icon) {
  color: #8e8e8e !important;
}

:deep(.view-alert .ant-alert-close-icon:hover) {
  color: #d9d9d9 !important;
}
</style>
