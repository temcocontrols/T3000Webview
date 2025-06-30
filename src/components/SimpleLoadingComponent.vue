<template>
  <div class="simple-loading">
    <div class="loading-content">
      <div class="loading-spinner">
        <div class="spinner"></div>
      </div>
      <div class="loading-text">
        <p>{{ message }}</p>
        <p class="component-info" v-if="componentName">Loading: {{ componentName }}</p>
        <p class="loading-time">{{ loadingTime }}s</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  message: {
    type: String,
    default: 'Loading...'
  },
  componentName: {
    type: String,
    default: ''
  }
});

const loadingTime = ref(0);
let timer = null;

onMounted(() => {
  timer = setInterval(() => {
    loadingTime.value += 0.1;
  }, 100);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped>
.simple-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 20px;
  background: #f8f9fa;
}

.loading-content {
  text-align: center;
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.loading-spinner {
  margin-bottom: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text p {
  color: #6b7280;
  font-size: 16px;
  margin: 8px 0;
}

.component-info {
  font-size: 14px;
  color: #9ca3af;
  font-style: italic;
}

.loading-time {
  font-size: 12px;
  color: #d1d5db;
  font-family: monospace;
}
</style>
