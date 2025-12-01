<template>
  <div class="error-component" :class="{ compact: compact, fullscreen: fullscreen }">
    <div class="error-content">
      <div class="error-icon" v-if="!customIcon">
        <q-icon
          :name="iconName"
          :size="iconSize"
          :color="iconColor"
        />
      </div>
      <div class="custom-icon" v-else>
        <slot name="icon" />
      </div>

      <div class="error-title">
        <h5 class="q-ma-none">{{ title }}</h5>
      </div>

      <div class="error-message" v-if="message || $slots.message">
        <slot name="message">
          <p class="text-body2 text-grey-7">{{ message }}</p>
        </slot>
      </div>

      <div class="error-details" v-if="showDetails && (details || error)">
        <q-expansion-item
          icon="info"
          label="Error Details"
          class="q-mt-md"
        >
          <div class="q-pa-md bg-grey-1 rounded-borders">
            <pre class="error-stack" v-if="error">{{ formatError(error) }}</pre>
            <p v-else-if="details" class="text-caption">{{ details }}</p>
          </div>
        </q-expansion-item>
      </div>

      <div class="error-actions q-mt-lg">
        <q-btn
          v-if="showRetry"
          @click="handleRetry"
          color="primary"
          :loading="retrying"
          class="q-mr-sm"
        >
          {{ retryText }}
        </q-btn>

        <q-btn
          v-if="showReload"
          @click="handleReload"
          color="secondary"
          outline
          class="q-mr-sm"
        >
          {{ reloadText }}
        </q-btn>

        <q-btn
          v-if="showGoBack"
          @click="handleGoBack"
          color="grey"
          flat
        >
          {{ goBackText }}
        </q-btn>

        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: 'Something went wrong'
  },
  message: {
    type: String,
    default: 'An error occurred while loading this component.'
  },
  details: {
    type: String,
    default: ''
  },
  error: {
    type: [Error, Object, String],
    default: null
  },
  showDetails: {
    type: Boolean,
    default: false
  },
  showRetry: {
    type: Boolean,
    default: true
  },
  showReload: {
    type: Boolean,
    default: false
  },
  showGoBack: {
    type: Boolean,
    default: false
  },
  retryText: {
    type: String,
    default: 'Try Again'
  },
  reloadText: {
    type: String,
    default: 'Reload Page'
  },
  goBackText: {
    type: String,
    default: 'Go Back'
  },
  compact: {
    type: Boolean,
    default: false
  },
  fullscreen: {
    type: Boolean,
    default: false
  },
  iconName: {
    type: String,
    default: 'error_outline'
  },
  iconSize: {
    type: String,
    default: '3rem'
  },
  iconColor: {
    type: String,
    default: 'negative'
  },
  customIcon: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['retry', 'reload', 'go-back']);

const retrying = ref(false);

const handleRetry = async () => {
  retrying.value = true;
  try {
    await emit('retry');
  } finally {
    retrying.value = false;
  }
};

const handleReload = () => {
  emit('reload');
  if (!emit('reload').defaultPrevented) {
    window.location.reload();
  }
};

const handleGoBack = () => {
  emit('go-back');
  if (!emit('go-back').defaultPrevented) {
    window.history.back();
  }
};

const formatError = (error) => {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n\n${error.stack || 'No stack trace available'}`;
  }

  if (typeof error === 'object') {
    return JSON.stringify(error, null, 2);
  }

  return String(error);
};
</script>

<style scoped>
.error-component {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 2rem;
}

.error-component.compact {
  min-height: 100px;
  padding: 1rem;
}

.error-component.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  z-index: 9999;
  min-height: 100vh;
}

.error-content {
  text-align: center;
  max-width: 500px;
}

.error-icon {
  margin-bottom: 1rem;
}

.error-title h5 {
  color: var(--q-color-grey-8);
  margin-bottom: 0.5rem;
}

.error-message {
  margin: 1rem 0;
}

.error-message p {
  margin: 0;
  line-height: 1.6;
}

.error-details {
  text-align: left;
}

.error-stack {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  color: var(--q-color-grey-8);
}

.error-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.custom-icon {
  margin-bottom: 1rem;
}

/* Dark mode support */
.body--dark .error-component.fullscreen {
  background: rgba(0, 0, 0, 0.95);
}

.body--dark .error-title h5 {
  color: var(--q-color-grey-3);
}

.body--dark .error-stack {
  color: var(--q-color-grey-4);
  background: var(--q-color-grey-9);
}

/* Animation */
.error-component {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive design */
@media (max-width: 600px) {
  .error-component {
    padding: 1rem;
    min-height: 150px;
  }

  .error-content {
    max-width: 300px;
  }

  .error-actions {
    flex-direction: column;
    align-items: center;
  }

  .error-actions .q-btn {
    width: 100%;
    max-width: 200px;
  }
}
</style>
