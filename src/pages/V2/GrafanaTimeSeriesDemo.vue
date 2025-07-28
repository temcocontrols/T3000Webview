<template>
  <q-page class="grafana-demo-page">
    <div class="page-header">
      <h1>Grafana Time Series Demo</h1>
      <p>Real-time data visualization similar to Grafana UI with Vue 3 + TypeScript + D3</p>
    </div>

    <div class="demo-container">
      <div class="demo-grid">
        <!-- Main Time Series Chart -->
        <div class="chart-panel">
          <GrafanaTimeSeries
            title="BMC Temperature Sensors"
            :height="400"
            :update-interval="30000"
            time-range="15m"
          />
        </div>

        <!-- Smaller charts for comparison -->
        <div class="chart-panel small">
          <GrafanaTimeSeries
            title="CPU Usage"
            :height="250"
            :update-interval="15000"
            time-range="5m"
          />
        </div>

        <div class="chart-panel small">
          <GrafanaTimeSeries
            title="Memory Usage"
            :height="250"
            :update-interval="45000"
            time-range="30m"
          />
        </div>
      </div>

      <!-- Configuration Panel -->
      <div class="config-panel">
        <h3>Configuration</h3>
        <div class="config-grid">
          <div class="config-item">
            <label>Update Interval:</label>
            <select v-model="updateInterval">
              <option value="5000">5 seconds</option>
              <option value="15000">15 seconds</option>
              <option value="30000">30 seconds</option>
              <option value="60000">1 minute</option>
            </select>
          </div>

          <div class="config-item">
            <label>Chart Height:</label>
            <input
              type="range"
              v-model="chartHeight"
              min="200"
              max="600"
              step="50"
            />
            <span>{{ chartHeight }}px</span>
          </div>

          <div class="config-item">
            <label>Time Range:</label>
            <select v-model="timeRange">
              <option value="5m">5 minutes</option>
              <option value="15m">15 minutes</option>
              <option value="30m">30 minutes</option>
              <option value="1h">1 hour</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Stats Panel -->
      <div class="stats-panel">
        <h3>Real-time Statistics</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ activeCharts }}</div>
            <div class="stat-label">Active Charts</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ totalSeries }}</div>
            <div class="stat-label">Data Series</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ dataPointsPerMinute }}</div>
            <div class="stat-label">Points/Min</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ uptime }}</div>
            <div class="stat-label">Uptime</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Info -->
    <div class="features-section">
      <h2>Features Implemented</h2>
      <div class="features-grid">
        <div class="feature-card">
          <h4>🔄 Real-time Updates</h4>
          <p>Data updates every 30 seconds with smooth animations</p>
        </div>
        <div class="feature-card">
          <h4>📊 Multiple Series</h4>
          <p>Support for multiple data series with individual controls</p>
        </div>
        <div class="feature-card">
          <h4>🎨 Grafana-like UI</h4>
          <p>Dark theme with professional styling matching Grafana</p>
        </div>
        <div class="feature-card">
          <h4>⚡ Vue 3 + TypeScript</h4>
          <p>Modern Vue 3 Composition API with full TypeScript support</p>
        </div>
        <div class="feature-card">
          <h4>📈 D3.js Integration</h4>
          <p>Powerful D3.js for smooth animations and interactions</p>
        </div>
        <div class="feature-card">
          <h4>🎛️ Interactive Controls</h4>
          <p>Pause/resume, time range selection, series toggling</p>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMeta } from 'quasar'
import GrafanaTimeSeries from '../../components/NewUI/GrafanaTimeSeries.vue'

// Meta information
useMeta({ title: "Grafana Time Series Demo" })

// Reactive variables
const updateInterval = ref(30000)
const chartHeight = ref(400)
const timeRange = ref('15m')
const startTime = ref(new Date())

// Computed properties
const activeCharts = computed(() => 3)
const totalSeries = computed(() => 21) // 7 series × 3 charts
const dataPointsPerMinute = computed(() => {
  return Math.round((60000 / updateInterval.value) * totalSeries.value)
})

const uptime = computed(() => {
  const now = new Date()
  const diff = now.getTime() - startTime.value.getTime()
  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return `${minutes}m ${seconds}s`
})

// Update uptime every second
let uptimeInterval: NodeJS.Timeout

onMounted(() => {
  uptimeInterval = setInterval(() => {
    // Force reactivity update
    startTime.value = startTime.value
  }, 1000)
})

onUnmounted(() => {
  if (uptimeInterval) {
    clearInterval(uptimeInterval)
  }
})
</script>

<style scoped>
.grafana-demo-page {
  background: #0d1117;
  min-height: 100vh;
  padding: 24px;
  color: #ffffff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.page-header p {
  font-size: 16px;
  color: #8b949e;
  margin: 0;
}

.demo-container {
  max-width: 1400px;
  margin: 0 auto;
}

.demo-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

.chart-panel {
  background: #161b22;
  border-radius: 12px;
  border: 1px solid #30363d;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.chart-panel.small {
  grid-column: span 1;
}

.config-panel {
  background: #161b22;
  border-radius: 12px;
  border: 1px solid #30363d;
  padding: 24px;
  margin-bottom: 24px;
}

.config-panel h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item label {
  font-size: 14px;
  font-weight: 500;
  color: #f0f6fc;
}

.config-item select,
.config-item input[type="range"] {
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 12px;
  color: #f0f6fc;
  font-size: 14px;
}

.config-item input[type="range"] {
  padding: 4px 0;
}

.config-item span {
  font-size: 12px;
  color: #8b949e;
}

.stats-panel {
  background: #161b22;
  border-radius: 12px;
  border: 1px solid #30363d;
  padding: 24px;
  margin-bottom: 32px;
}

.stats-panel h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #0d1117;
  border-radius: 8px;
  border: 1px solid #21262d;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #4ecdc4;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.features-section {
  margin-top: 48px;
}

.features-section h2 {
  text-align: center;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 32px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.feature-card {
  background: #161b22;
  border-radius: 12px;
  border: 1px solid #30363d;
  padding: 24px;
  transition: transform 0.2s, border-color 0.2s;
}

.feature-card:hover {
  transform: translateY(-2px);
  border-color: #4ecdc4;
}

.feature-card h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #f0f6fc;
}

.feature-card p {
  margin: 0;
  font-size: 14px;
  color: #8b949e;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .demo-grid {
    grid-template-columns: 1fr;
  }

  .config-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
