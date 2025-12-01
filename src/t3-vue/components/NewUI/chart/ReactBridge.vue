<template>
  <div ref="containerRef" style="width: 100%; height: 100%"></div>
</template>

<script setup lang="ts">
import React from 'react';
import ReactDOM from 'react-dom/client';
import { onMounted, onUnmounted, ref, watch } from 'vue';

/**
 * Vue component that renders React components
 * This bridges Vue and React for Grafana component integration
 */
interface Props {
  component: any;
  props?: Record<string, any>;
}

const props = withDefaults(defineProps<Props>(), {
  props: () => ({})
});

const containerRef = ref<HTMLDivElement>();
let reactRoot: any = null;

const renderReactComponent = () => {
  if (containerRef.value && props.component) {
    // Clean up previous render
    if (reactRoot) {
      reactRoot.unmount();
    }

    // Create new React root and render
    reactRoot = ReactDOM.createRoot(containerRef.value);
    reactRoot.render(React.createElement(props.component, props.props));
  }
};

onMounted(() => {
  renderReactComponent();
});

onUnmounted(() => {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
});

// Watch for prop changes and re-render
watch(
  () => [props.component, props.props],
  () => {
    renderReactComponent();
  },
  { deep: true }
);

defineExpose({
  forceUpdate: renderReactComponent
});
</script>
