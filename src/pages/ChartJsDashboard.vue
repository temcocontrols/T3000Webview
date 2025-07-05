<!-- Chart.js Complex Dashboard Demo -->
<template>
  <div class="complex-dashboard">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
      <h1>T3000 Complex Dashboard - Chart.js Implementation</h1>
      <div class="dashboard-controls">
        <select v-model="timeRange" @change="updateTimeRange">
          <option value="5m">Last 5 minutes</option>
          <option value="1h">Last hour</option>
          <option value="24h">Last 24 hours</option>
        </select>
        <button
          @click="toggleStreaming"
          :class="{ active: isStreaming }"
          class="stream-button"
        >
          {{ isStreaming ? '⏸️ Pause' : '▶️ Start' }} Real-time
        </button>
        <button @click="exportDashboard" class="export-button">
          📊 Export
        </button>
      </div>
    </div>

    <!-- Device Status Bar -->
    <div class="device-status-bar">
      <div
        v-for="device in devices"
        :key="device.id"
        class="device-status"
        :class="{ active: selectedDevices.includes(device.id) }"
        @click="toggleDevice(device.id)"
      >
        <div class="status-indicator" :class="device.status"></div>
        <span>{{ device.name }}</span>
        <small>{{ device.sensors.length }} sensors</small>
      </div>
    </div>

    <!-- Main Dashboard Grid -->
    <div class="dashboard-grid">
      <!-- Temperature Trends - Multi-line Chart -->
      <div class="chart-panel large-panel">
        <div class="panel-header">
          <h3>🌡️ Temperature Trends</h3>
          <div class="panel-controls">
            <button @click="resetZoom('temperature')" title="Reset Zoom">🔍</button>
            <button @click="toggleLegend('temperature')" title="Toggle Legend">📊</button>
          </div>
        </div>
        <canvas ref="temperatureChart" class="chart-canvas"></canvas>
      </div>

      <!-- Humidity Gauges -->
      <div class="chart-panel medium-panel">
        <div class="panel-header">
          <h3>💧 Humidity Levels</h3>
        </div>
        <div class="gauge-grid">
          <canvas
            v-for="device in activeDevices"
            :key="`humidity-${device.id}`"
            :ref="el => humidityCharts[device.id] = el as HTMLCanvasElement"
            class="gauge-canvas"
          ></canvas>
        </div>
      </div>

      <!-- System Performance Bar Chart -->
      <div class="chart-panel medium-panel">
        <div class="panel-header">
          <h3>⚡ System Performance</h3>
        </div>
        <canvas ref="performanceChart" class="chart-canvas"></canvas>
      </div>

      <!-- Pressure vs Temperature Scatter -->
      <div class="chart-panel large-panel">
        <div class="panel-header">
          <h3>🌪️ Pressure vs Temperature Correlation</h3>
          <div class="panel-controls">
            <select v-model="scatterTimeWindow" @change="updateScatterData">
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
            </select>
          </div>
        </div>
        <canvas ref="scatterChart" class="chart-canvas"></canvas>
      </div>

      <!-- Alerts and Notifications -->
      <div class="chart-panel small-panel alerts-panel">
        <div class="panel-header">
          <h3>🔔 Active Alerts</h3>
        </div>
        <div class="alerts-list">
          <div
            v-for="alert in activeAlerts"
            :key="alert.id"
            class="alert-item"
            :class="alert.severity"
          >
            <div class="alert-icon">{{ getAlertIcon(alert.type) }}</div>
            <div class="alert-content">
              <strong>{{ alert.device }}</strong>
              <p>{{ alert.message }}</p>
              <small>{{ formatTime(alert.timestamp) }}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Export Panel -->
      <div class="chart-panel small-panel export-panel">
        <div class="panel-header">
          <h3>📈 Quick Stats</h3>
        </div>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ totalDevices }}</div>
            <div class="stat-label">Active Devices</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ totalSensors }}</div>
            <div class="stat-label">Sensors</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ dataPointsPerSecond }}</div>
            <div class="stat-label">Data Points/sec</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ formatUptime(systemUptime) }}</div>
            <div class="stat-label">System Uptime</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import {
  Chart,
  LineController,
  BarController,
  DoughnutController,
  ScatterController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  TimeSeriesScale
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import zoomPlugin from 'chartjs-plugin-zoom'
import annotationPlugin from 'chartjs-plugin-annotation'

// Register Chart.js components
Chart.register(
  LineController,
  BarController,
  DoughnutController,
  ScatterController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  TimeSeriesScale,
  zoomPlugin,
  annotationPlugin
)

// Types
interface Device {
  id: number
  name: string
  status: 'online' | 'offline' | 'warning'
  sensors: string[]
  location: string
}

interface SensorReading {
  deviceId: number
  sensor: string
  value: number
  timestamp: Date
  unit: string
}

interface Alert {
  id: string
  device: string
  type: 'temperature' | 'humidity' | 'pressure' | 'system'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: Date
}

// Reactive state
const timeRange = ref('1h')
const isStreaming = ref(false)
const selectedDevices = ref<number[]>([])
const scatterTimeWindow = ref('1h')
const systemUptime = ref(Date.now())

// Chart refs
const temperatureChart = ref<HTMLCanvasElement>()
const performanceChart = ref<HTMLCanvasElement>()
const scatterChart = ref<HTMLCanvasElement>()
const humidityCharts = ref<Record<number, HTMLCanvasElement>>({})

// Chart instances
let temperatureChartInstance: Chart | null = null
let performanceChartInstance: Chart | null = null
let scatterChartInstance: Chart | null = null
let humidityChartInstances: Record<number, Chart> = {}

// Data
const devices = ref<Device[]>([
  { id: 1, name: 'HVAC-01', status: 'online', sensors: ['temperature', 'humidity', 'pressure'], location: 'Floor 1' },
  { id: 2, name: 'HVAC-02', status: 'online', sensors: ['temperature', 'humidity'], location: 'Floor 2' },
  { id: 3, name: 'AQ-Monitor', status: 'warning', sensors: ['co2', 'temperature', 'pressure'], location: 'Lobby' },
  { id: 4, name: 'Climate-Ctrl', status: 'online', sensors: ['temperature', 'humidity', 'pressure'], location: 'Server Room' }
])

const sensorReadings = ref<SensorReading[]>([])
const activeAlerts = ref<Alert[]>([
  {
    id: '1',
    device: 'HVAC-01',
    type: 'temperature',
    severity: 'medium',
    message: 'Temperature above normal range (28.5°C)',
    timestamp: new Date(Date.now() - 120000)
  },
  {
    id: '2',
    device: 'AQ-Monitor',
    type: 'system',
    severity: 'low',
    message: 'Sensor calibration due in 7 days',
    timestamp: new Date(Date.now() - 300000)
  }
])

// Computed properties
const activeDevices = computed(() =>
  selectedDevices.value.length > 0
    ? devices.value.filter(d => selectedDevices.value.includes(d.id))
    : devices.value
)

const totalDevices = computed(() => devices.value.filter(d => d.status === 'online').length)
const totalSensors = computed(() => devices.value.reduce((acc, d) => acc + d.sensors.length, 0))
const dataPointsPerSecond = computed(() => isStreaming.value ? totalSensors.value : 0)

// Streaming interval
let streamingInterval: NodeJS.Timeout | null = null

// Chart creation functions
const createTemperatureChart = () => {
  if (!temperatureChart.value) return

  // Destroy existing chart if it exists
  if (temperatureChartInstance) {
    temperatureChartInstance.destroy()
    temperatureChartInstance = null
  }

  const ctx = temperatureChart.value.getContext('2d')
  if (!ctx) return

  temperatureChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: activeDevices.value.map((device, index) => ({
        label: device.name,
        data: [],
        borderColor: getDeviceColor(index),
        backgroundColor: getDeviceColor(index, 0.1),
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        title: {
          display: false
        },
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x'
          },
          zoom: {
            wheel: {
              enabled: true
            },
            pinch: {
              enabled: true
            },
            mode: 'x'
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
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Temperature (°C)'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 300
      }
    }
  })
}

const createHumidityGauges = () => {
  activeDevices.value.forEach((device, index) => {
    const canvas = humidityCharts.value[device.id]
    if (!canvas) return

    // Destroy existing chart if it exists
    if (humidityChartInstances[device.id]) {
      humidityChartInstances[device.id].destroy()
      delete humidityChartInstances[device.id]
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const latestHumidity = getLatestSensorValue(device.id, 'humidity')

    humidityChartInstances[device.id] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [latestHumidity, 100 - latestHumidity],
          backgroundColor: [
            getHumidityColor(latestHumidity),
            'rgba(200, 200, 200, 0.2)'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        }
      },
      plugins: [{
        id: 'centerText',
        beforeDraw: (chart) => {
          const ctx = chart.ctx
          const width = chart.width
          const height = chart.height

          ctx.restore()
          ctx.font = 'bold 16px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = '#333'

          const text = `${latestHumidity.toFixed(1)}%`
          const deviceText = device.name

          ctx.fillText(text, width / 2, height / 2 - 10)
          ctx.font = '12px Arial'
          ctx.fillText(deviceText, width / 2, height / 2 + 15)
          ctx.save()
        }
      }]
    })
  })
}

const createPerformanceChart = () => {
  if (!performanceChart.value) return

  // Destroy existing chart if it exists
  if (performanceChartInstance) {
    performanceChartInstance.destroy()
    performanceChartInstance = null
  }

  const ctx = performanceChart.value.getContext('2d')
  if (!ctx) return

  const performanceData = activeDevices.value.map(device => ({
    device: device.name,
    cpu: Math.random() * 100,
    memory: Math.random() * 100,
    network: Math.random() * 100
  }))

  performanceChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: performanceData.map(d => d.device),
      datasets: [
        {
          label: 'CPU Usage %',
          data: performanceData.map(d => d.cpu),
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        },
        {
          label: 'Memory Usage %',
          data: performanceData.map(d => d.memory),
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        },
        {
          label: 'Network I/O %',
          data: performanceData.map(d => d.network),
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Usage %'
          }
        }
      }
    }
  })
}

const createScatterChart = () => {
  if (!scatterChart.value) return

  // Destroy existing chart if it exists
  if (scatterChartInstance) {
    scatterChartInstance.destroy()
    scatterChartInstance = null
  }

  const ctx = scatterChart.value.getContext('2d')
  if (!ctx) return

  scatterChartInstance = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: activeDevices.value.map((device, index) => ({
        label: device.name,
        data: generateScatterData(device.id),
        backgroundColor: getDeviceColor(index, 0.6),
        borderColor: getDeviceColor(index),
        pointRadius: 4,
        pointHoverRadius: 8
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'xy'
          },
          zoom: {
            wheel: {
              enabled: true
            },
            pinch: {
              enabled: true
            },
            mode: 'xy'
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Temperature (°C)'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Pressure (kPa)'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      }
    }
  })
}

// Helper functions
const getDeviceColor = (index: number, alpha = 1) => {
  const colors = [
    [31, 119, 180],   // Blue
    [255, 127, 14],   // Orange
    [44, 160, 44],    // Green
    [214, 39, 40],    // Red
    [148, 103, 189],  // Purple
    [140, 86, 75],    // Brown
    [227, 119, 194],  // Pink
    [127, 127, 127]   // Gray
  ]

  const [r, g, b] = colors[index % colors.length]
  return alpha < 1 ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`
}

const getHumidityColor = (value: number) => {
  if (value < 30) return '#ff6b6b'      // Too dry
  if (value < 40) return '#ffa726'      // Dry
  if (value <= 60) return '#66bb6a'     // Optimal
  if (value <= 70) return '#ffa726'     // Humid
  return '#ff6b6b'                      // Too humid
}

const getLatestSensorValue = (deviceId: number, sensor: string) => {
  const readings = sensorReadings.value
    .filter(r => r.deviceId === deviceId && r.sensor === sensor)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  return readings.length > 0 ? readings[0].value : 0
}

const generateScatterData = (deviceId: number) => {
  const tempReadings = sensorReadings.value.filter(r => r.deviceId === deviceId && r.sensor === 'temperature')
  const pressureReadings = sensorReadings.value.filter(r => r.deviceId === deviceId && r.sensor === 'pressure')

  const data = []
  const timeWindow = getTimeWindowMs(scatterTimeWindow.value)
  const cutoff = Date.now() - timeWindow

  tempReadings.forEach(tempReading => {
    if (tempReading.timestamp.getTime() < cutoff) return

    const pressureReading = pressureReadings.find(p =>
      Math.abs(p.timestamp.getTime() - tempReading.timestamp.getTime()) < 60000 // Within 1 minute
    )

    if (pressureReading) {
      data.push({
        x: tempReading.value,
        y: pressureReading.value
      })
    }
  })

  return data.slice(-50) // Last 50 correlated readings
}

const getTimeWindowMs = (window: string) => {
  switch (window) {
    case '1h': return 3600000
    case '6h': return 6 * 3600000
    case '24h': return 24 * 3600000
    default: return 3600000
  }
}

const generateMockReading = (deviceId: number, sensor: string): SensorReading => {
  let value: number
  let unit: string

  switch (sensor) {
    case 'temperature':
      value = 20 + Math.random() * 10 + Math.sin(Date.now() / 60000) * 3 // 20-30°C with sine wave
      unit = '°C'
      break
    case 'humidity':
      value = 45 + Math.random() * 20 + Math.sin(Date.now() / 120000) * 10 // 35-75%
      unit = '%'
      break
    case 'pressure':
      value = 1000 + Math.random() * 20 + Math.sin(Date.now() / 180000) * 5 // 995-1025 kPa
      unit = 'kPa'
      break
    case 'co2':
      value = 400 + Math.random() * 200 // 400-600 ppm
      unit = 'ppm'
      break
    default:
      value = Math.random() * 100
      unit = ''
  }

  return {
    deviceId,
    sensor,
    value,
    timestamp: new Date(),
    unit
  }
}

// Event handlers
const toggleDevice = (deviceId: number) => {
  const index = selectedDevices.value.indexOf(deviceId)
  if (index > -1) {
    selectedDevices.value.splice(index, 1)
  } else {
    selectedDevices.value.push(deviceId)
  }
}

const toggleStreaming = () => {
  if (isStreaming.value) {
    stopStreaming()
  } else {
    startStreaming()
  }
}

const startStreaming = () => {
  if (streamingInterval) return

  isStreaming.value = true
  streamingInterval = setInterval(() => {
    // Generate new readings
    activeDevices.value.forEach(device => {
      device.sensors.forEach(sensor => {
        const reading = generateMockReading(device.id, sensor)
        sensorReadings.value.push(reading)

        // Update temperature chart
        if (sensor === 'temperature' && temperatureChartInstance) {
          const datasetIndex = activeDevices.value.findIndex(d => d.id === device.id)
          if (datasetIndex >= 0 && temperatureChartInstance.data.datasets[datasetIndex]) {
            temperatureChartInstance.data.datasets[datasetIndex].data.push({
              x: reading.timestamp.getTime(),
              y: reading.value
            })

            // Keep only last 100 points
            if (temperatureChartInstance.data.datasets[datasetIndex].data.length > 100) {
              temperatureChartInstance.data.datasets[datasetIndex].data.shift()
            }
          }
        }

        // Update humidity gauges
        if (sensor === 'humidity' && humidityChartInstances[device.id]) {
          humidityChartInstances[device.id].data.datasets[0].data = [
            reading.value,
            100 - reading.value
          ]
          humidityChartInstances[device.id].data.datasets[0].backgroundColor = [
            getHumidityColor(reading.value),
            'rgba(200, 200, 200, 0.2)'
          ]
          humidityChartInstances[device.id].update('none')
        }
      })
    })

    if (temperatureChartInstance) {
      temperatureChartInstance.update('none')
    }

    // Keep only last 1000 readings per device to manage memory
    if (sensorReadings.value.length > devices.value.length * 1000) {
      sensorReadings.value = sensorReadings.value.slice(-devices.value.length * 500)
    }
  }, 1000) // 1Hz updates
}

const stopStreaming = () => {
  isStreaming.value = false
  if (streamingInterval) {
    clearInterval(streamingInterval)
    streamingInterval = null
  }
}

const updateTimeRange = () => {
  // Filter data based on time range and update charts
  console.log('Time range updated:', timeRange.value)
}

const updateScatterData = () => {
  if (scatterChartInstance) {
    scatterChartInstance.data.datasets = activeDevices.value.map((device, index) => ({
      label: device.name,
      data: generateScatterData(device.id),
      backgroundColor: getDeviceColor(index, 0.6),
      borderColor: getDeviceColor(index),
      pointRadius: 4,
      pointHoverRadius: 8
    }))
    scatterChartInstance.update()
  }
}

const resetZoom = (chartType: string) => {
  switch (chartType) {
    case 'temperature':
      temperatureChartInstance?.resetZoom()
      break
    case 'scatter':
      scatterChartInstance?.resetZoom()
      break
  }
}

const toggleLegend = (chartType: string) => {
  const chart = chartType === 'temperature' ? temperatureChartInstance : null
  if (chart && chart.options.plugins?.legend) {
    chart.options.plugins.legend.display = !chart.options.plugins.legend.display
    chart.update()
  }
}

const exportDashboard = () => {
  // Export dashboard data as JSON or PDF
  const exportData = {
    timestamp: new Date().toISOString(),
    devices: devices.value,
    readings: sensorReadings.value.slice(-100), // Last 100 readings
    alerts: activeAlerts.value
  }

  const dataStr = JSON.stringify(exportData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)

  const link = document.createElement('a')
  link.href = url
  link.download = `t3000-dashboard-${new Date().toISOString().split('T')[0]}.json`
  link.click()

  URL.revokeObjectURL(url)
}

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'temperature': return '🌡️'
    case 'humidity': return '💧'
    case 'pressure': return '🌪️'
    case 'system': return '⚙️'
    default: return '⚠️'
  }
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString()
}

const formatUptime = (startTime: number) => {
  const uptime = Date.now() - startTime
  const hours = Math.floor(uptime / 3600000)
  const minutes = Math.floor((uptime % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}

// Chart recreation debouncing
let chartRecreationTimeout: NodeJS.Timeout | null = null

// Watchers
watch(selectedDevices, async () => {
  // Clear previous timeout
  if (chartRecreationTimeout) {
    clearTimeout(chartRecreationTimeout)
  }

  // Debounce chart recreation to prevent rapid recreations
  chartRecreationTimeout = setTimeout(async () => {
    await nextTick()
    destroyCharts()
    initializeCharts()
  }, 100)
}, { deep: true })

// Chart management
const initializeCharts = async () => {
  await nextTick()
  createTemperatureChart()
  createHumidityGauges()
  createPerformanceChart()
  createScatterChart()
}

const destroyCharts = () => {
  try {
    if (temperatureChartInstance) {
      temperatureChartInstance.destroy()
      temperatureChartInstance = null
    }
    if (performanceChartInstance) {
      performanceChartInstance.destroy()
      performanceChartInstance = null
    }
    if (scatterChartInstance) {
      scatterChartInstance.destroy()
      scatterChartInstance = null
    }

    Object.values(humidityChartInstances).forEach(chart => {
      if (chart) chart.destroy()
    })
    humidityChartInstances = {}
  } catch (error) {
    console.warn('Error destroying charts:', error)
  }
}

// Lifecycle
onMounted(async () => {
  // Initialize with all devices selected
  selectedDevices.value = devices.value.map(d => d.id)

  // Generate initial data
  devices.value.forEach(device => {
    device.sensors.forEach(sensor => {
      for (let i = 0; i < 50; i++) {
        const reading = generateMockReading(device.id, sensor)
        reading.timestamp = new Date(Date.now() - (50 - i) * 30000) // 30 second intervals
        sensorReadings.value.push(reading)
      }
    })
  })

  await initializeCharts()
  startStreaming()
})

onUnmounted(() => {
  // Clear any pending timeouts
  if (chartRecreationTimeout) {
    clearTimeout(chartRecreationTimeout)
  }
  if (streamingInterval) {
    clearInterval(streamingInterval)
  }

  stopStreaming()
  destroyCharts()
})
</script>

<style scoped>
.complex-dashboard {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e9ecef;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  z-index: 100;
}

.dashboard-header h1 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
  font-weight: 600;
}

.dashboard-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.dashboard-controls select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  font-size: 14px;
}

.stream-button {
  padding: 8px 16px;
  border: 1px solid #28a745;
  background: #28a745;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.stream-button:hover {
  background: #218838;
}

.stream-button.active {
  background: #dc3545;
  border-color: #dc3545;
}

.export-button {
  padding: 8px 16px;
  border: 1px solid #6c757d;
  background: #6c757d;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.export-button:hover {
  background: #5a6268;
}

.device-status-bar {
  display: flex;
  gap: 16px;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e9ecef;
  overflow-x: auto;
}

.device-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
}

.device-status:hover {
  background: #f8f9fa;
}

.device-status.active {
  border-color: #007bff;
  background: #e7f3ff;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-bottom: 4px;
}

.status-indicator.online {
  background: #28a745;
}

.status-indicator.offline {
  background: #6c757d;
}

.status-indicator.warning {
  background: #ffc107;
}

.device-status span {
  font-weight: 500;
  font-size: 14px;
}

.device-status small {
  color: #6c757d;
  font-size: 12px;
}

.dashboard-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 16px;
  padding: 16px;
  overflow-y: auto;
}

.chart-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.large-panel {
  grid-column: span 8;
  grid-row: span 2;
}

.medium-panel {
  grid-column: span 4;
  grid-row: span 2;
}

.small-panel {
  grid-column: span 4;
  grid-row: span 1;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
}

.panel-controls {
  display: flex;
  gap: 8px;
}

.panel-controls button,
.panel-controls select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.chart-canvas {
  flex: 1;
  padding: 16px;
}

.gauge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  padding: 16px;
  flex: 1;
}

.gauge-canvas {
  width: 100%;
  height: 120px;
}

.alerts-panel {
  grid-column: span 4;
  grid-row: span 2;
}

.alerts-list {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.alert-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  border-left: 4px solid;
}

.alert-item.low {
  background: #e7f3ff;
  border-left-color: #007bff;
}

.alert-item.medium {
  background: #fff3cd;
  border-left-color: #ffc107;
}

.alert-item.high {
  background: #f8d7da;
  border-left-color: #dc3545;
}

.alert-item.critical {
  background: #f5c6cb;
  border-left-color: #721c24;
}

.alert-icon {
  font-size: 18px;
  margin-top: 2px;
}

.alert-content {
  flex: 1;
}

.alert-content strong {
  color: #2c3e50;
  font-size: 14px;
}

.alert-content p {
  margin: 4px 0;
  color: #495057;
  font-size: 13px;
}

.alert-content small {
  color: #6c757d;
  font-size: 11px;
}

.export-panel {
  grid-column: span 4;
  grid-row: span 1;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 16px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.8rem;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Responsive design */
@media (max-width: 1400px) {
  .dashboard-grid {
    grid-template-columns: repeat(8, 1fr);
  }
  .large-panel {
    grid-column: span 8;
  }
  .medium-panel {
    grid-column: span 4;
  }
}

@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  .large-panel,
  .medium-panel,
  .small-panel {
    grid-column: span 4;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    gap: 12px;
    padding: 12px 16px;
  }

  .dashboard-controls {
    flex-wrap: wrap;
  }

  .device-status-bar {
    padding: 8px 16px;
  }

  .dashboard-grid {
    padding: 8px;
    gap: 8px;
  }
}

/* Chart animations */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
