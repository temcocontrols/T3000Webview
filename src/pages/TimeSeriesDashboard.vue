<template>
  <q-page class="timeseries-dashboard-page">
    <div class="dashboard-header">
      <h1>T3000 Time Series Dashboard</h1>
      <p>Interactive real-time monitoring with Chart.js components styled like Grafana</p>
    </div>

    <div class="dashboard-container">
      <!-- Main Grid Layout -->
      <a-row :gutter="[16, 16]" class="dashboard-grid">
        <!-- Large Chart - Main Temperature Monitoring -->
        <a-col :span="16">
          <a-card class="chart-card large" :bordered="false">
            <template #title>
              <div class="card-title">
                <h3>BMC Temperature Sensors - Real-time Monitoring</h3>
                <div class="card-actions">
                  <a-button size="small" @click="refreshChart('main')">
                    <template #icon><ReloadOutlined /></template>
                    Refresh
                  </a-button>
                  <a-button size="small" @click="openFullscreen('main')">
                    <template #icon><FullscreenOutlined /></template>
                    Fullscreen
                  </a-button>
                </div>
              </div>
            </template>
            <div class="chart-wrapper" style="height: 400px;">
              <GrafanaTimeSeries
                title="BMC01E1E Temperature Monitoring"
                :height="400"
                :update-interval="30000"
                time-range="1h"
              />
            </div>
          </a-card>
        </a-col>

        <!-- System Overview -->
        <a-col :span="8">
          <a-card class="chart-card stats" :bordered="false">
            <template #title>
              <h3>System Overview</h3>
            </template>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">{{ systemStats.totalSensors }}</div>
                <div class="stat-label">Total Sensors</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ systemStats.activeSensors }}</div>
                <div class="stat-label">Active Sensors</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ systemStats.avgTemp }}°C</div>
                <div class="stat-label">Avg Temperature</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ systemStats.alertCount }}</div>
                <div class="stat-label">Active Alerts</div>
              </div>
            </div>

            <div class="system-status">
              <h4>Sensor Status</h4>
              <div class="status-list">
                <div
                  v-for="sensor in sensorStatus"
                  :key="sensor.name"
                  class="status-item"
                  :class="sensor.status"
                >
                  <div class="status-indicator" :style="{ backgroundColor: sensor.color }"></div>
                  <span class="sensor-name">{{ sensor.name }}</span>
                  <span class="sensor-value">{{ sensor.value }}°C</span>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>

        <!-- High Frequency Chart -->
        <a-col :span="12">
          <a-card class="chart-card medium" :bordered="false">
            <template #title>
              <div class="card-title">
                <h3>High Frequency Monitoring</h3>
                <a-tag color="green">5s Updates</a-tag>
              </div>
            </template>
            <div class="chart-wrapper" style="height: 250px;">
              <GrafanaTimeSeriesReactSimple
                title="React Integration Demo"
                :height="250"
                :update-interval="5000"
                time-range="5m"
              />
            </div>
          </a-card>
        </a-col>

        <!-- SVG Pure Chart -->
        <a-col :span="12">
          <a-card class="chart-card medium" :bordered="false">
            <template #title>
              <div class="card-title">
                <h3>SVG Chart Demo</h3>
                <a-tag color="blue">Pure SVG</a-tag>
              </div>
            </template>
            <div class="chart-wrapper" style="height: 250px;">
              <GrafanaTimeSeriesSVG
                title="SVG Implementation"
                :height="250"
                :update-interval="15000"
                time-range="15m"
              />
            </div>
          </a-card>
        </a-col>

        <!-- Historical Data Comparison -->
        <a-col :span="16">
          <a-card class="chart-card large" :bordered="false">
            <template #title>
              <div class="card-title">
                <h3>Historical Data Analysis - Last 24 Hours</h3>
                <div class="card-actions">
                  <a-select v-model:value="historicalRange" style="width: 120px;" size="small">
                    <a-select-option value="1h">1 Hour</a-select-option>
                    <a-select-option value="6h">6 Hours</a-select-option>
                    <a-select-option value="12h">12 Hours</a-select-option>
                    <a-select-option value="24h">24 Hours</a-select-option>
                  </a-select>
                </div>
              </div>
            </template>
            <div class="chart-wrapper" style="height: 300px;">
              <GrafanaTimeSeries
                title="Historical Temperature Analysis"
                :height="300"
                :update-interval="60000"
                :time-range="historicalRange"
              />
            </div>
          </a-card>
        </a-col>

        <!-- Performance Metrics -->
        <a-col :span="8">
          <a-card class="chart-card stats" :bordered="false">
            <template #title>
              <h3>Performance Metrics</h3>
            </template>
            <div class="performance-grid">
              <div class="perf-item">
                <div class="perf-label">Data Points/sec</div>
                <div class="perf-value">{{ performanceMetrics.dataPointsPerSec }}</div>
                <div class="perf-chart">
                  <div class="mini-chart" :style="{ width: performanceMetrics.throughputPercent + '%' }"></div>
                </div>
              </div>

              <div class="perf-item">
                <div class="perf-label">Memory Usage</div>
                <div class="perf-value">{{ performanceMetrics.memoryUsage }}MB</div>
                <div class="perf-chart">
                  <div class="mini-chart" :style="{ width: performanceMetrics.memoryPercent + '%' }"></div>
                </div>
              </div>

              <div class="perf-item">
                <div class="perf-label">Update Latency</div>
                <div class="perf-value">{{ performanceMetrics.latency }}ms</div>
                <div class="perf-chart">
                  <div class="mini-chart" :style="{ width: (100 - performanceMetrics.latencyPercent) + '%' }"></div>
                </div>
              </div>
            </div>

            <div class="alerts-section">
              <h4>Recent Alerts</h4>
              <div class="alerts-list">
                <div
                  v-for="alert in recentAlerts"
                  :key="alert.id"
                  class="alert-item"
                  :class="alert.severity"
                >
                  <div class="alert-time">{{ alert.time }}</div>
                  <div class="alert-message">{{ alert.message }}</div>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>

        <!-- Interactive Controls -->
        <a-col :span="24">
          <a-card class="chart-card controls" :bordered="false">
            <template #title>
              <h3>Dashboard Controls</h3>
            </template>
            <div class="controls-grid">
              <div class="control-group">
                <h4>Global Settings</h4>
                <a-space direction="vertical" style="width: 100%;">
                  <div class="control-item">
                    <label>Update Frequency:</label>
                    <a-select v-model:value="globalUpdateInterval" style="width: 150px;">
                      <a-select-option value="5000">5 seconds</a-select-option>
                      <a-select-option value="15000">15 seconds</a-select-option>
                      <a-select-option value="30000">30 seconds</a-select-option>
                      <a-select-option value="60000">1 minute</a-select-option>
                    </a-select>
                  </div>

                  <div class="control-item">
                    <label>Theme:</label>
                    <a-select v-model:value="currentTheme" style="width: 150px;" @change="onThemeChange">
                      <a-select-option value="dark">Dark (Grafana)</a-select-option>
                      <a-select-option value="light">Light</a-select-option>
                    </a-select>
                  </div>

                  <div class="control-item">
                    <a-checkbox v-model:checked="autoRefresh">Auto Refresh</a-checkbox>
                  </div>
                </a-space>
              </div>

              <div class="control-group">
                <h4>Chart Options</h4>
                <a-space direction="vertical" style="width: 100%;">
                  <a-checkbox v-model:checked="showGridLines">Show Grid Lines</a-checkbox>
                  <a-checkbox v-model:checked="showLegends">Show Legends</a-checkbox>
                  <a-checkbox v-model:checked="smoothCurves">Smooth Curves</a-checkbox>
                  <a-checkbox v-model:checked="showDataPoints">Show Data Points</a-checkbox>
                </a-space>
              </div>

              <div class="control-group">
                <h4>Data Export</h4>
                <a-space direction="vertical" style="width: 100%;">
                  <a-button block @click="exportAllCharts">Export All Charts</a-button>
                  <a-button block @click="exportDashboardConfig">Export Configuration</a-button>
                  <a-button block @click="resetDashboard">Reset Dashboard</a-button>
                </a-space>
              </div>

              <div class="control-group">
                <h4>System Actions</h4>
                <a-space direction="vertical" style="width: 100%;">
                  <a-button type="primary" block @click="openTimeSeriesModal">
                    Open Time Series Modal
                  </a-button>
                  <a-button block @click="refreshAllData">Refresh All Data</a-button>
                  <a-button block @click="clearAllData">Clear All Data</a-button>
                </a-space>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- Time Series Modal for Testing -->
    <TimeSeriesModal
      v-model:visible="timeSeriesModalVisible"
      :item-data="mockTrendLogItem"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, FullscreenOutlined } from '@ant-design/icons-vue'
import GrafanaTimeSeries from 'src/components/NewUI/GrafanaTimeSeries.vue'
import GrafanaTimeSeriesReactSimple from 'src/components/NewUI/GrafanaTimeSeriesReactSimple.vue'
import GrafanaTimeSeriesSVG from 'src/components/NewUI/GrafanaTimeSeriesSVG.vue'
import TimeSeriesModal from 'src/components/NewUI/TimeSeriesModal.vue'

defineOptions({
  name: 'TimeSeriesDashboard'
})

// Reactive state
const historicalRange = ref('24h')
const globalUpdateInterval = ref(30000)
const currentTheme = ref('dark')
const autoRefresh = ref(true)
const showGridLines = ref(true)
const showLegends = ref(true)
const smoothCurves = ref(false)
const showDataPoints = ref(false)
const timeSeriesModalVisible = ref(false)

// System stats
const systemStats = reactive({
  totalSensors: 7,
  activeSensors: 7,
  avgTemp: 23.4,
  alertCount: 0
})

// Sensor status
const sensorStatus = reactive([
  { name: 'BMC01E1E-1P1B', value: 22.5, color: '#FF6B6B', status: 'normal' },
  { name: 'BMC01E1E-2P1B', value: 23.1, color: '#4ECDC4', status: 'normal' },
  { name: 'BMC01E1E-3P1B', value: 24.2, color: '#45B7D1', status: 'warning' },
  { name: 'BMC01E1E-4P1B', value: 21.8, color: '#FFA07A', status: 'normal' },
  { name: 'BMC01E1E-5P1B', value: 23.7, color: '#98D8C8', status: 'normal' },
  { name: 'BMC01E1E-6P1B', value: 22.9, color: '#F7DC6F', status: 'normal' },
  { name: 'BMC01E1E-7P1B', value: 24.5, color: '#BB8FCE', status: 'normal' }
])

// Performance metrics
const performanceMetrics = reactive({
  dataPointsPerSec: 14,
  throughputPercent: 70,
  memoryUsage: 45.2,
  memoryPercent: 45,
  latency: 120,
  latencyPercent: 12
})

// Recent alerts
const recentAlerts = reactive([
  { id: 1, time: '10:34', message: 'Sensor 3 temperature above normal', severity: 'warning' },
  { id: 2, time: '09:15', message: 'Data connection restored', severity: 'info' },
  { id: 3, time: '08:42', message: 'System backup completed', severity: 'success' }
])

// Mock trend log item for modal testing
const mockTrendLogItem = {
  t3Entry: {
    type: 'MON',
    description: 'BMC Temperature Monitoring System',
    label: 'BMC01E1E Temperature Sensors',
    id: 'TREND_001'
  },
  title: 'Temperature Trend Log'
}

// Update system stats periodically
let statsInterval: NodeJS.Timeout | null = null

const updateSystemStats = () => {
  // Simulate real-time data updates
  systemStats.avgTemp = 20 + Math.random() * 8

  sensorStatus.forEach(sensor => {
    const variation = (Math.random() - 0.5) * 0.5
    sensor.value = Math.max(18, Math.min(28, sensor.value + variation))

    // Update status based on temperature
    if (sensor.value > 25) {
      sensor.status = 'warning'
      systemStats.alertCount = Math.max(0, systemStats.alertCount + 1)
    } else if (sensor.value < 19) {
      sensor.status = 'error'
      systemStats.alertCount = Math.max(0, systemStats.alertCount + 1)
    } else {
      sensor.status = 'normal'
    }
  })

  // Update performance metrics
  performanceMetrics.dataPointsPerSec = 10 + Math.floor(Math.random() * 10)
  performanceMetrics.throughputPercent = Math.min(100, performanceMetrics.dataPointsPerSec * 5)
  performanceMetrics.memoryUsage = 40 + Math.random() * 20
  performanceMetrics.memoryPercent = Math.min(100, performanceMetrics.memoryUsage)
  performanceMetrics.latency = 80 + Math.floor(Math.random() * 80)
  performanceMetrics.latencyPercent = Math.min(100, performanceMetrics.latency / 2)
}

// Event handlers
const refreshChart = (chartId: string) => {
  message.success(`Refreshing ${chartId} chart data`)
}

const openFullscreen = (chartId: string) => {
  message.info(`Opening ${chartId} chart in fullscreen mode`)
}

const onThemeChange = (theme: string) => {
  message.info(`Theme changed to ${theme}`)
}

const exportAllCharts = () => {
  message.success('Exporting all charts as images')
}

const exportDashboardConfig = () => {
  const config = {
    theme: currentTheme.value,
    updateInterval: globalUpdateInterval.value,
    chartOptions: {
      showGridLines: showGridLines.value,
      showLegends: showLegends.value,
      smoothCurves: smoothCurves.value,
      showDataPoints: showDataPoints.value
    }
  }

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.download = 'dashboard-config.json'
  link.href = URL.createObjectURL(blob)
  link.click()

  message.success('Dashboard configuration exported')
}

const resetDashboard = () => {
  historicalRange.value = '24h'
  globalUpdateInterval.value = 30000
  currentTheme.value = 'dark'
  autoRefresh.value = true
  showGridLines.value = true
  showLegends.value = true
  smoothCurves.value = false
  showDataPoints.value = false

  message.success('Dashboard reset to defaults')
}

const openTimeSeriesModal = () => {
  timeSeriesModalVisible.value = true
}

const refreshAllData = () => {
  updateSystemStats()
  message.success('All data refreshed')
}

const clearAllData = () => {
  message.info('All chart data cleared')
}

// Lifecycle
onMounted(() => {
  updateSystemStats()
  if (autoRefresh.value) {
    statsInterval = setInterval(updateSystemStats, globalUpdateInterval.value)
  }
})

onUnmounted(() => {
  if (statsInterval) {
    clearInterval(statsInterval)
  }
})
</script>

<style scoped>
.timeseries-dashboard-page {
  background: #0f1419;
  min-height: 100vh;
  padding: 20px;
  color: #d9d9d9;
  font-family: Inter, Helvetica, Arial, sans-serif;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 30px 20px;
  background: linear-gradient(135deg, #181b1f 0%, #1e2328 100%);
  border-radius: 12px;
  border: 1px solid #36414b;
}

.dashboard-header h1 {
  margin: 0 0 10px 0;
  font-size: 42px;
  font-weight: 700;
  background: linear-gradient(135deg, #4ECDC4 0%, #45B7D1 50%, #FF6B6B 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 30px rgba(78, 205, 196, 0.3);
}

.dashboard-header p {
  margin: 0;
  font-size: 18px;
  color: #8e8e8e;
  font-weight: 300;
}

.dashboard-container {
  max-width: 1600px;
  margin: 0 auto;
}

.dashboard-grid {
  margin: 0;
}

.chart-card {
  background: #181b1f !important;
  border: 1px solid #36414b !important;
  border-radius: 8px !important;
  transition: all 0.3s ease;
  overflow: hidden;
}

.chart-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  border-color: #52616b !important;
}

.chart-card.large {
  min-height: 480px;
}

.chart-card.medium {
  min-height: 320px;
}

.chart-card.stats {
  min-height: 400px;
}

.chart-card.controls {
  background: #1e2328 !important;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.card-title h3 {
  margin: 0;
  color: #d9d9d9;
  font-size: 16px;
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.chart-wrapper {
  background: #0f1419;
  border-radius: 6px;
  border: 1px solid #36414b;
  overflow: hidden;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #0f1419;
  border-radius: 8px;
  border: 1px solid #36414b;
  transition: all 0.2s ease;
}

.stat-item:hover {
  border-color: #4ECDC4;
  box-shadow: 0 0 10px rgba(78, 205, 196, 0.2);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #4ECDC4;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #8e8e8e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* System Status */
.system-status h4 {
  margin: 0 0 12px 0;
  color: #d9d9d9;
  font-size: 14px;
  font-weight: 600;
}

.status-list {
  max-height: 200px;
  overflow-y: auto;
}

.status-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 4px;
  background: #0f1419;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.status-item:hover {
  background: #262c35;
}

.status-item.warning {
  border-color: rgba(255, 193, 7, 0.3);
  background: rgba(255, 193, 7, 0.05);
}

.status-item.error {
  border-color: rgba(255, 107, 107, 0.3);
  background: rgba(255, 107, 107, 0.05);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
}

.sensor-name {
  flex: 1;
  font-size: 11px;
  color: #d9d9d9;
}

.sensor-value {
  font-size: 11px;
  color: #4ECDC4;
  font-weight: 600;
}

/* Performance Metrics */
.performance-grid {
  margin-bottom: 24px;
}

.perf-item {
  margin-bottom: 16px;
  padding: 12px;
  background: #0f1419;
  border-radius: 6px;
  border: 1px solid #36414b;
}

.perf-label {
  font-size: 12px;
  color: #8e8e8e;
  margin-bottom: 4px;
}

.perf-value {
  font-size: 16px;
  color: #4ECDC4;
  font-weight: 600;
  margin-bottom: 6px;
}

.perf-chart {
  height: 4px;
  background: #36414b;
  border-radius: 2px;
  overflow: hidden;
}

.mini-chart {
  height: 100%;
  background: linear-gradient(90deg, #4ECDC4, #45B7D1);
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Alerts */
.alerts-section h4 {
  margin: 0 0 12px 0;
  color: #d9d9d9;
  font-size: 14px;
  font-weight: 600;
}

.alerts-list {
  max-height: 120px;
  overflow-y: auto;
}

.alert-item {
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 4px;
  border-left: 3px solid #36414b;
}

.alert-item.warning {
  border-left-color: #ffc107;
  background: rgba(255, 193, 7, 0.05);
}

.alert-item.info {
  border-left-color: #17a2b8;
  background: rgba(23, 162, 184, 0.05);
}

.alert-item.success {
  border-left-color: #28a745;
  background: rgba(40, 167, 69, 0.05);
}

.alert-time {
  font-size: 10px;
  color: #8e8e8e;
  margin-bottom: 2px;
}

.alert-message {
  font-size: 11px;
  color: #d9d9d9;
}

/* Controls */
.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.control-group h4 {
  margin: 0 0 16px 0;
  color: #d9d9d9;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 2px solid #4ECDC4;
  padding-bottom: 8px;
}

.control-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.control-item label {
  color: #d9d9d9;
  font-size: 14px;
  font-weight: 500;
}

/* Dark theme overrides for Ant Design */
:deep(.ant-card) {
  background: #181b1f !important;
  border: 1px solid #36414b !important;
}

:deep(.ant-card-head) {
  background: #1e2328 !important;
  border-bottom: 1px solid #36414b !important;
}

:deep(.ant-card-head-title) {
  color: #d9d9d9 !important;
  font-weight: 600;
}

:deep(.ant-card-body) {
  background: #181b1f !important;
  color: #d9d9d9 !important;
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

:deep(.ant-btn-primary) {
  background: #4ECDC4 !important;
  border-color: #4ECDC4 !important;
}

:deep(.ant-btn-primary:hover) {
  background: #45B7D1 !important;
  border-color: #45B7D1 !important;
}

:deep(.ant-select-selector) {
  background: #262c35 !important;
  border-color: #36414b !important;
  color: #d9d9d9 !important;
}

:deep(.ant-select-selection-item) {
  color: #d9d9d9 !important;
}

:deep(.ant-tag) {
  background: rgba(78, 205, 196, 0.1) !important;
  border-color: rgba(78, 205, 196, 0.3) !important;
  color: #4ECDC4 !important;
}

:deep(.ant-checkbox-wrapper) {
  color: #d9d9d9 !important;
}

/* Scrollbar styling */
.status-list::-webkit-scrollbar,
.alerts-list::-webkit-scrollbar {
  width: 4px;
}

.status-list::-webkit-scrollbar-track,
.alerts-list::-webkit-scrollbar-track {
  background: #1e2328;
}

.status-list::-webkit-scrollbar-thumb,
.alerts-list::-webkit-scrollbar-thumb {
  background: #36414b;
  border-radius: 2px;
}

.status-list::-webkit-scrollbar-thumb:hover,
.alerts-list::-webkit-scrollbar-thumb:hover {
  background: #52616b;
}

/* Responsive design */
@media (max-width: 1200px) {
  .dashboard-grid .ant-col {
    margin-bottom: 16px;
  }

  .controls-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

@media (max-width: 768px) {
  .timeseries-dashboard-page {
    padding: 10px;
  }

  .dashboard-header {
    padding: 20px 15px;
  }

  .dashboard-header h1 {
    font-size: 28px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .controls-grid {
    grid-template-columns: 1fr;
  }
}
</style>
