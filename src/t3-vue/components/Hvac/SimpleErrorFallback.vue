<template>
  <div class="simple-error-fallback">
    <div class="error-content">
      <div class="error-icon">⚠️</div>
      <h3>Component Loading Error</h3>
      <p>Failed to load the requested component.</p>
      <p class="error-details" v-if="error">
        <strong>Error:</strong> {{ error.message }}
      </p>
      <p class="error-details" v-if="error && error.stack">
        <strong>Stack trace:</strong>
        <pre>{{ error.stack }}</pre>
      </p>
      <div class="debug-info">
        <h4>Debug Information:</h4>
        <p><strong>Component Name:</strong> {{ componentName || 'Unknown' }}</p>
        <p><strong>Current Route:</strong> {{ currentRoute }}</p>
        <p><strong>Timestamp:</strong> {{ timestamp }}</p>
        <p><strong>User Agent:</strong> {{ userAgent }}</p>
      </div>
      <div class="error-actions">
        <button @click="reload" class="reload-btn">Reload Page</button>
        <button @click="goHome" class="home-btn">Go Home</button>
        <button @click="clearCache" class="cache-btn">Clear Cache & Reload</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const props = defineProps({
  error: {
    type: Error,
    default: null
  },
  componentName: {
    type: String,
    default: 'Unknown'
  }
});

const router = useRouter();
const route = useRoute();

const currentRoute = computed(() => route.fullPath);
const timestamp = computed(() => new Date().toLocaleString());
const userAgent = computed(() => navigator.userAgent);

const reload = () => {
  window.location.reload();
};

const goHome = () => {
  router.push('/');
};

const clearCache = () => {
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    });
  }
  localStorage.clear();
  sessionStorage.clear();
  window.location.reload();
};
</script>

<style scoped>
.simple-error-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 20px;
  background: #f8f9fa;
}

.error-content {
  text-align: center;
  background: #ffffff;
  border: 2px solid #dc3545;
  border-radius: 8px;
  padding: 30px;
  max-width: 700px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-content h3 {
  color: #dc3545;
  margin-bottom: 16px;
}

.error-content p {
  margin-bottom: 12px;
  color: #6c757d;
}

.error-details {
  font-family: monospace;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 8px;
  margin: 16px 0;
  word-break: break-word;
  text-align: left;
}

.error-details pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 200px;
  overflow-y: auto;
  margin: 8px 0 0 0;
  font-size: 12px;
}

.debug-info {
  background: #e9ecef;
  border-radius: 4px;
  padding: 16px;
  margin: 20px 0;
  text-align: left;
}

.debug-info h4 {
  margin: 0 0 12px 0;
  color: #495057;
}

.debug-info p {
  margin: 6px 0;
  font-size: 14px;
}

.error-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.reload-btn, .home-btn, .cache-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.reload-btn {
  background: #007bff;
  color: white;
}

.reload-btn:hover {
  background: #0056b3;
}

.home-btn {
  background: #6c757d;
  color: white;
}

.home-btn:hover {
  background: #545b62;
}

.cache-btn {
  background: #fd7e14;
  color: white;
}

.cache-btn:hover {
  background: #e35710;
}

@media (max-width: 600px) {
  .error-actions {
    flex-direction: column;
  }

  .reload-btn, .home-btn, .cache-btn {
    width: 100%;
    margin: 4px 0;
  }
}
</style>
