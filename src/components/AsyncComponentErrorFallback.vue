<template>
  <div class="async-error-fallback">
    <div class="error-container">
      <div class="error-icon">
        <q-icon name="warning" size="48px" color="warning" />
      </div>

      <div class="error-content">
        <h4 class="error-title">Page Loading Error</h4>
        <p class="error-message">
          The page "{{ componentName }}" failed to load due to a timeout.
          <span v-if="isTimeout">The component took longer than {{ timeout / 1000 }} seconds to load.</span>
        </p>

        <div class="error-details" v-if="attempts > 1">
          <p class="text-caption">
            Attempted {{ attempts }} time{{ attempts > 1 ? 's' : '' }}
          </p>
        </div>

        <div class="error-suggestions">
          <p class="suggestions-title">This might be due to:</p>
          <ul class="suggestions-list">
            <li>Slow internet connection</li>
            <li>Server issues</li>
            <li v-if="category === 'slow'">Large component files (this is a complex page)</li>
            <li>Browser performance issues</li>
          </ul>
        </div>

        <div class="error-actions">
          <q-btn
            @click="retryLoad"
            color="primary"
            icon="refresh"
            :loading="isRetrying"
            :disable="retryDisabled"
            class="q-mr-sm"
          >
            {{ retryText }}
          </q-btn>

          <q-btn
            @click="goHome"
            color="secondary"
            icon="home"
            outline
            class="q-mr-sm"
          >
            Go to Home
          </q-btn>

          <q-btn
            @click="reloadPage"
            color="warning"
            icon="refresh"
            outline
          >
            Reload Page
          </q-btn>
        </div>

        <div class="additional-info" v-if="showTechnicalInfo">
          <q-expansion-item
            icon="info"
            label="Technical Information"
            class="q-mt-md"
          >
            <div class="technical-details">
              <p><strong>Component:</strong> {{ componentName }}</p>
              <p><strong>Category:</strong> {{ category }}</p>
              <p><strong>Timeout:</strong> {{ timeout }}ms</p>
              <p><strong>Attempts:</strong> {{ attempts }}</p>
              <p><strong>Error:</strong> {{ error?.message || 'Unknown error' }}</p>
              <p v-if="error?.stack"><strong>Stack:</strong></p>
              <pre v-if="error?.stack" class="error-stack">{{ error.stack }}</pre>
            </div>
          </q-expansion-item>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps({
  error: {
    type: Error,
    default: null
  },
  retry: {
    type: Function,
    default: null
  },
  componentName: {
    type: String,
    default: 'Unknown Component'
  },
  category: {
    type: String,
    default: 'normal'
  },
  timeout: {
    type: Number,
    default: 15000
  },
  attempts: {
    type: Number,
    default: 1
  }
});

const router = useRouter();
const isRetrying = ref(false);
const retryCount = ref(0);
const showTechnicalInfo = ref(false);

const isTimeout = computed(() => {
  return props.error?.message?.includes('timed out') || false;
});

const retryDisabled = computed(() => {
  return retryCount.value >= 3 || isRetrying.value;
});

const retryText = computed(() => {
  if (isRetrying.value) return 'Retrying...';
  if (retryDisabled.value) return 'Max Retries Reached';
  return `Retry Loading (${3 - retryCount.value} attempts left)`;
});

const retryLoad = async () => {
  if (retryDisabled.value || !props.retry) return;

  isRetrying.value = true;
  retryCount.value++;

  try {
    await props.retry();
  } catch (error) {
    console.error('Retry failed:', error);
  } finally {
    setTimeout(() => {
      isRetrying.value = false;
    }, 1000);
  }
};

const goHome = () => {
  router.push('/');
};

const reloadPage = () => {
  window.location.reload();
};

// Show technical info in development mode
if (process.env.NODE_ENV === 'development') {
  showTechnicalInfo.value = true;
}
</script>

<style scoped>
.async-error-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.error-container {
  max-width: 600px;
  text-align: center;
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #dee2e6;
}

.error-icon {
  margin-bottom: 20px;
}

.error-title {
  color: #495057;
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: 600;
}

.error-message {
  color: #6c757d;
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 20px;
}

.error-details {
  margin-bottom: 16px;
  color: #868e96;
}

.error-suggestions {
  text-align: left;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin: 20px 0;
}

.suggestions-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #495057;
}

.suggestions-list {
  margin: 0;
  padding-left: 20px;
}

.suggestions-list li {
  margin-bottom: 4px;
  color: #6c757d;
}

.error-actions {
  margin: 24px 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.additional-info {
  margin-top: 24px;
  text-align: left;
}

.technical-details {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 4px;
  text-align: left;
}

.technical-details p {
  margin: 8px 0;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.error-stack {
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  overflow-x: auto;
  max-height: 200px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Responsive design */
@media (max-width: 600px) {
  .async-error-fallback {
    padding: 16px;
    min-height: 300px;
  }

  .error-container {
    padding: 24px 16px;
  }

  .error-actions {
    flex-direction: column;
  }

  .error-actions .q-btn {
    width: 100%;
    margin: 4px 0;
  }
}
</style>
