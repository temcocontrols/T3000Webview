<template>
  <div class="loading-component" :class="{ compact: compact, fullscreen: fullscreen }">
    <div class="loading-content">
      <div class="loading-spinner" v-if="!customSpinner">
        <q-spinner-cube
          :size="spinnerSize"
          :color="spinnerColor"
        />
      </div>
      <div class="custom-spinner" v-else>
        <slot name="spinner" />
      </div>

      <div class="loading-text" v-if="message || $slots.message">
        <slot name="message">
          <p class="text-body2">{{ message }}</p>
        </slot>
      </div>

      <div class="loading-progress" v-if="showProgress && progress !== null">
        <q-linear-progress
          :value="progress / 100"
          :color="progressColor"
          class="q-mt-md"
        />
        <p class="text-caption q-mt-xs text-center">{{ Math.round(progress) }}%</p>
      </div>

      <div class="loading-details" v-if="details && !compact">
        <p class="text-caption text-grey-6">{{ details }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  message: {
    type: String,
    default: 'Loading...'
  },
  details: {
    type: String,
    default: ''
  },
  progress: {
    type: Number,
    default: null
  },
  showProgress: {
    type: Boolean,
    default: false
  },
  compact: {
    type: Boolean,
    default: false
  },
  fullscreen: {
    type: Boolean,
    default: false
  },
  spinnerSize: {
    type: String,
    default: '2rem'
  },
  spinnerColor: {
    type: String,
    default: 'primary'
  },
  progressColor: {
    type: String,
    default: 'primary'
  },
  customSpinner: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['cancel']);

const handleCancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.loading-component {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 2rem;
}

.loading-component.compact {
  min-height: 100px;
  padding: 1rem;
}

.loading-component.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 9999;
  min-height: 100vh;
}

.loading-content {
  text-align: center;
  max-width: 300px;
}

.loading-spinner {
  margin-bottom: 1rem;
}

.loading-text p {
  margin: 0.5rem 0;
  color: var(--q-color-grey-8);
}

.loading-progress {
  margin-top: 1rem;
}

.loading-details {
  margin-top: 1rem;
  opacity: 0.7;
}

.custom-spinner {
  margin-bottom: 1rem;
}

/* Dark mode support */
.body--dark .loading-component.fullscreen {
  background: rgba(0, 0, 0, 0.9);
}

.body--dark .loading-text p {
  color: var(--q-color-grey-3);
}

/* Animation */
.loading-component {
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
  .loading-component {
    padding: 1rem;
    min-height: 150px;
  }

  .loading-content {
    max-width: 250px;
  }
}
</style>
