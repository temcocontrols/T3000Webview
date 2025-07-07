<template>
  <q-page class="svg-demo-page">
    <div class="page-header">
      <h1>SVG Time Series Demo</h1>
      <p>Pure SVG implementation without Canvas or external chart libraries</p>
    </div>

    <div class="demo-container">
      <div class="demo-grid">
        <!-- SVG Time Series Chart -->
        <div class="chart-panel">
          <GrafanaTimeSeriesSVG
            title="Temperature Sensors (Pure SVG)"
            :height="400"
            :update-interval="30000"
            :max-data-points="50"
          />
        </div>

        <!-- Comparison with other implementations -->
        <div class="chart-panel small">
          <GrafanaTimeSeries
            title="Canvas Version"
            :height="250"
            :update-interval="45000"
            time-range="15m"
          />
        </div>

        <div class="chart-panel small">
          <GrafanaTimeSeriesSVG
            title="Fast Update SVG"
            :height="250"
            :update-interval="15000"
            :max-data-points="30"
          />
        </div>
      </div>

      <!-- Technical Information -->
      <div class="info-panel">
        <h3>🎨 SVG Implementation Features</h3>
        <div class="info-grid">
          <div class="info-item">
            <h4>Pure SVG</h4>
            <ul>
              <li>✅ No Canvas element required</li>
              <li>✅ Vector graphics (scalable)</li>
              <li>✅ DOM-based (inspectable)</li>
              <li>✅ CSS styleable</li>
            </ul>
          </div>

          <div class="info-item">
            <h4>Real-time Data</h4>
            <ul>
              <li>📊 5 temperature sensor series</li>
              <li>🔄 Configurable update intervals</li>
              <li>📈 Live path generation</li>
              <li>🎯 Interactive data points</li>
            </ul>
          </div>

          <div class="info-item">
            <h4>Interactive Features</h4>
            <ul>
              <li>🖱️ Clickable legend</li>
              <li>👁️ Series visibility toggle</li>
              <li>⏯️ Real-time pause/resume</li>
              <li>🎨 Color-coded visualization</li>
            </ul>
          </div>

          <div class="info-item">
            <h4>Performance</h4>
            <ul>
              <li>⚡ Lightweight (no external libs)</li>
              <li>🚀 Vue 3 reactive updates</li>
              <li>💾 Memory efficient</li>
              <li>📱 Mobile friendly</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SVG Advantages -->
      <div class="advantages-panel">
        <h3>🆚 SVG vs Canvas vs React Comparison</h3>
        <div class="comparison-grid">
          <div class="comparison-item svg">
            <h4>📊 SVG Version</h4>
            <div class="pros">
              <strong>✅ Advantages:</strong>
              <ul>
                <li>Vector graphics (infinitely scalable)</li>
                <li>DOM elements (accessible)</li>
                <li>CSS styleable</li>
                <li>No external dependencies</li>
                <li>Easy to debug/inspect</li>
                <li>SEO friendly</li>
              </ul>
            </div>
            <div class="cons">
              <strong>⚠️ Limitations:</strong>
              <ul>
                <li>Complex animations can be slow</li>
                <li>Large datasets may impact performance</li>
                <li>Manual path calculations required</li>
              </ul>
            </div>
          </div>

          <div class="comparison-item canvas">
            <h4>🎨 Canvas Version</h4>
            <div class="pros">
              <strong>✅ Advantages:</strong>
              <ul>
                <li>High performance for complex graphics</li>
                <li>Excellent for large datasets</li>
                <li>Rich charting library ecosystem</li>
                <li>Smooth animations</li>
              </ul>
            </div>
            <div class="cons">
              <strong>⚠️ Limitations:</strong>
              <ul>
                <li>Raster graphics (pixelated when scaled)</li>
                <li>Not accessible to screen readers</li>
                <li>Requires external libraries</li>
                <li>Canvas element required</li>
              </ul>
            </div>
          </div>

          <div class="comparison-item react">
            <h4>⚛️ React Version</h4>
            <div class="pros">
              <strong>✅ Advantages:</strong>
              <ul>
                <li>Native Grafana compatibility</li>
                <li>Professional components</li>
                <li>Rich feature set</li>
                <li>Industry standard</li>
              </ul>
            </div>
            <div class="cons">
              <strong>⚠️ Limitations:</strong>
              <ul>
                <li>React dependency in Vue app</li>
                <li>TypeScript compatibility issues</li>
                <li>Additional bundle size</li>
                <li>Complex integration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import GrafanaTimeSeriesSVG from 'src/components/GrafanaTimeSeriesSVG.vue'
import GrafanaTimeSeries from 'src/components/GrafanaTimeSeries.vue'

defineOptions({
  name: 'SVGDemo'
})
</script>

<style scoped>
.svg-demo-page {
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
  background: linear-gradient(135deg, #52c41a 0%, #1890ff 100%);
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
  color: #52c41a;
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

.advantages-panel {
  background: #181b1f;
  border-radius: 8px;
  border: 1px solid #36414b;
  padding: 25px;
}

.advantages-panel h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #d9d9d9;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
}

.comparison-item {
  padding: 20px;
  border-radius: 6px;
  border: 1px solid #36414b;
}

.comparison-item.svg {
  background: rgba(82, 196, 26, 0.1);
  border-color: rgba(82, 196, 26, 0.3);
}

.comparison-item.canvas {
  background: rgba(24, 144, 255, 0.1);
  border-color: rgba(24, 144, 255, 0.3);
}

.comparison-item.react {
  background: rgba(255, 107, 107, 0.1);
  border-color: rgba(255, 107, 107, 0.3);
}

.comparison-item h4 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #d9d9d9;
}

.pros, .cons {
  margin-bottom: 15px;
}

.pros strong {
  color: #52c41a;
}

.cons strong {
  color: #faad14;
}

.pros ul, .cons ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.pros li, .cons li {
  margin-bottom: 4px;
  font-size: 13px;
  color: #d9d9d9;
  line-height: 1.4;
}

/* Responsive design */
@media (max-width: 1200px) {
  .demo-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .svg-demo-page {
    padding: 15px;
  }

  .info-grid,
  .comparison-grid {
    grid-template-columns: 1fr;
  }
}
</style>
