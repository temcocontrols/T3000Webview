<template>
  <q-page class="grafana-react-demo-page">
    <div class="page-header">
      <h1>Grafana UI React Integration Demo</h1>
      <p>Using actual Grafana data structures (@grafana/data) with React components in Vue 3</p>
    </div>

    <div class="demo-container">
      <div class="demo-grid">
        <!-- Main React Component -->
        <div class="chart-panel large">
          <GrafanaTimeSeriesReact
            title="BMC Temperature Sensors (React + Vue)"
            :height="450"
            :update-interval="30000"
            time-range="15m"
          />
        </div>

        <!-- Comparison with the original Canvas version -->
        <div class="chart-panel medium">
          <GrafanaTimeSeries
            title="Canvas Version (Chart.js)"
            :height="300"
            :update-interval="45000"
            time-range="30m"
          />
        </div>

        <!-- Another React instance with different settings -->
        <div class="chart-panel medium">
          <GrafanaTimeSeriesReact
            title="High Frequency Updates (React)"
            :height="300"
            :update-interval="15000"
            time-range="5m"
          />
        </div>
      </div>

      <!-- Technical Information -->
      <div class="info-panel">
        <h3>🔧 Technical Implementation</h3>
        <div class="info-grid">
          <div class="info-item">
            <h4>React Integration</h4>
            <ul>
              <li>✅ React 18 components in Vue 3</li>
              <li>✅ ReactDOM.createRoot() for rendering</li>
              <li>✅ Proper cleanup on unmount</li>
              <li>✅ Real-time data updates</li>
            </ul>
          </div>

          <div class="info-item">
            <h4>Grafana Data Structures</h4>
            <ul>
              <li>✅ <code>@grafana/data</code> v12.0.2</li>
              <li>✅ <code>MutableDataFrame</code> for series</li>
              <li>✅ <code>FieldType.time</code> and <code>FieldType.number</code></li>
              <li>✅ <code>TimeRange</code> and <code>PanelData</code></li>
            </ul>
          </div>

          <div class="info-item">
            <h4>Runtime Services</h4>
            <ul>
              <li>✅ Mock <code>EchoSrv</code> for events</li>
              <li>✅ Grafana theme configuration</li>
              <li>✅ Compatible data format</li>
              <li>⚠️ Limited UI components (TypeScript issues)</li>
            </ul>
          </div>

          <div class="info-item">
            <h4>Data Features</h4>
            <ul>
              <li>📊 7 temperature sensor series</li>
              <li>🔄 30-second update intervals</li>
              <li>📈 Real-time statistics (last, average, trend)</li>
              <li>🎨 Color-coded series visualization</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Configuration Panel -->
      <div class="config-panel">
        <h3>⚙️ Configuration</h3>
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
            <label>Time Range:</label>
            <select v-model="timeRange">
              <option value="5m">5 minutes</option>
              <option value="15m">15 minutes</option>
              <option value="30m">30 minutes</option>
              <option value="1h">1 hour</option>
            </select>
          </div>

          <div class="config-item">
            <label>Theme:</label>
            <select v-model="theme">
              <option value="dark">Dark (Grafana)</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div class="config-item">
            <label>Data Points:</label>
            <select v-model="maxDataPoints">
              <option value="50">50 points</option>
              <option value="100">100 points</option>
              <option value="200">200 points</option>
              <option value="500">500 points</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Grafana Compatibility Info -->
      <div class="compatibility-panel">
        <h3>🔗 Grafana Compatibility Status</h3>
        <div class="status-grid">
          <div class="status-item success">
            <span class="status-icon">✅</span>
            <div>
              <strong>Data Structures</strong>
              <p>Full compatibility with Grafana DataFrame format</p>
            </div>
          </div>

          <div class="status-item success">
            <span class="status-icon">✅</span>
            <div>
              <strong>Time Handling</strong>
              <p>Uses Grafana's dateTime and TimeRange</p>
            </div>
          </div>

          <div class="status-item warning">
            <span class="status-icon">⚠️</span>
            <div>
              <strong>UI Components</strong>
              <p>Limited by TypeScript compatibility issues</p>
            </div>
          </div>

          <div class="status-item success">
            <span class="status-icon">✅</span>
            <div>
              <strong>Runtime Services</strong>
              <p>Successfully mocked for standalone operation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GrafanaTimeSeriesReact from 'src/components/NewUI/GrafanaTimeSeriesReact.vue'
import GrafanaTimeSeries from 'src/components/NewUI/GrafanaTimeSeries.vue'

defineOptions({
  name: 'GrafanaReactDemo'
})

// Configuration state
const updateInterval = ref(30000)
const timeRange = ref('15m')
const theme = ref('dark')
const maxDataPoints = ref(200)
</script>

<style scoped>
.grafana-react-demo-page {
  background: #0f1419;
  min-height: 100vh;
  padding: 20px;
  color: #d9d9d9;
  font-family: Inter, Helvetica, Arial, sans-serif;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 20px;
  background: #181b1f;
  border-radius: 8px;
  border: 1px solid #36414b;
}

.page-header h1 {
  margin: 0 0 10px 0;
  font-size: 32px;
  font-weight: 600;
  background: linear-gradient(135deg, #1f77b4 0%, #ff6b6b 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.page-header p {
  margin: 0;
  font-size: 16px;
  color: #8e8e8e;
}

.demo-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.demo-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.chart-panel {
  background: #181b1f;
  border-radius: 8px;
  border: 1px solid #36414b;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.chart-panel:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.chart-panel.large {
  grid-row: span 2;
}

.info-panel {
  background: #181b1f;
  border-radius: 8px;
  border: 1px solid #36414b;
  padding: 25px;
}

.info-panel h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #d9d9d9;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.info-item {
  background: #262c35;
  padding: 20px;
  border-radius: 6px;
  border: 1px solid #36414b;
}

.info-item h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #1f77b4;
}

.info-item ul {
  margin: 0;
  padding-left: 20px;
}

.info-item li {
  margin-bottom: 6px;
  font-size: 14px;
  color: #d9d9d9;
}

.info-item code {
  background: #1e2328;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: Monaco, Consolas, monospace;
  font-size: 12px;
  color: #ff6b6b;
}

.config-panel {
  background: #181b1f;
  border-radius: 8px;
  border: 1px solid #36414b;
  padding: 25px;
}

.config-panel h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #d9d9d9;
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
  color: #d9d9d9;
}

.config-item select {
  background: #262c35;
  border: 1px solid #36414b;
  color: #d9d9d9;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.config-item select:focus {
  outline: none;
  border-color: #1f77b4;
  box-shadow: 0 0 0 2px rgba(31, 119, 180, 0.3);
}

.compatibility-panel {
  background: #181b1f;
  border-radius: 8px;
  border: 1px solid #36414b;
  padding: 25px;
}

.compatibility-panel h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #d9d9d9;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
}

.status-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 20px;
  border-radius: 6px;
  border: 1px solid #36414b;
}

.status-item.success {
  background: rgba(82, 196, 26, 0.1);
  border-color: rgba(82, 196, 26, 0.3);
}

.status-item.warning {
  background: rgba(250, 173, 20, 0.1);
  border-color: rgba(250, 173, 20, 0.3);
}

.status-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.status-item strong {
  display: block;
  margin-bottom: 5px;
  font-size: 16px;
  color: #d9d9d9;
}

.status-item p {
  margin: 0;
  font-size: 14px;
  color: #8e8e8e;
  line-height: 1.4;
}

/* Responsive design */
@media (max-width: 1200px) {
  .demo-grid {
    grid-template-columns: 1fr;
  }

  .chart-panel.large {
    grid-row: span 1;
  }
}

@media (max-width: 768px) {
  .grafana-react-demo-page {
    padding: 15px;
  }

  .info-grid,
  .config-grid,
  .status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
