<template>
  <q-page class="flex flex-center">
    <div class="diagnostic-container">
      <h2>🔧 T3000 WebView Diagnostic</h2>
      <div class="status-section">
        <h3>Application Status</h3>
        <div class="status-item">
          <span class="label">Vue.js:</span>
          <span class="value success">✅ Running</span>
        </div>
        <div class="status-item">
          <span class="label">Quasar:</span>
          <span class="value success">✅ Loaded</span>
        </div>
        <div class="status-item">
          <span class="label">Router:</span>
          <span class="value success">✅ Working</span>
        </div>
        <div class="status-item">
          <span class="label">Current Route:</span>
          <span class="value">{{ $route.fullPath }}</span>
        </div>
        <div class="status-item">
          <span class="label">Timestamp:</span>
          <span class="value">{{ timestamp }}</span>
        </div>
      </div>

      <div class="navigation-section">
        <h3>Navigation Test</h3>
        <div class="nav-buttons">
          <q-btn @click="testHome" color="primary" icon="home">
            Test Home Route
          </q-btn>
          <q-btn @click="testNew" color="secondary" icon="new_releases">
            Test New UI
          </q-btn>
          <q-btn @click="testHvac" color="positive" icon="thermostat">
            Test HVAC
          </q-btn>
        </div>
      </div>

      <div class="debug-section">
        <h3>Debug Information</h3>
        <pre class="debug-info">{{ debugInfo }}</pre>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const timestamp = computed(() => new Date().toLocaleString());

const debugInfo = computed(() => {
  return JSON.stringify({
    vue: '3.x',
    quasar: true,
    currentRoute: route.fullPath,
    availableRoutes: router.getRoutes().map(r => r.path),
    userAgent: navigator.userAgent.substring(0, 100) + '...',
    window: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight
    }
  }, null, 2);
});

const testHome = () => {
  router.push('/');
};

const testNew = () => {
  router.push('/new');
};

const testHvac = () => {
  router.push('/hvac');
};
</script>

<style scoped>
.diagnostic-container {
  max-width: 800px;
  padding: 20px;
  text-align: left;
}

.diagnostic-container h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #1976d2;
}

.status-section, .navigation-section, .debug-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f8f9fa;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #dee2e6;
}

.label {
  font-weight: 600;
  color: #495057;
}

.value {
  color: #6c757d;
}

.value.success {
  color: #28a745;
}

.nav-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.debug-info {
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 16px;
  overflow-x: auto;
  font-size: 12px;
  max-height: 300px;
}
</style>
