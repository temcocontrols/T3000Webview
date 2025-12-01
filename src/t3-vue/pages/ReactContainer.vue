<template>
  <div id="t3000-react-root"></div>
</template>

<script setup>
import { onMounted } from 'vue';
import { initializeReactApp } from '@/boot/react';

/**
 * React Container Component
 * This Vue component provides the mount point for the React app
 * Used for /t3000/* routes to enable hybrid Vue+React architecture
 *
 * IMPORTANT: No scoped styles! They interfere with React's DOM management
 */

// Initialize React app after Vue has mounted this component
onMounted(() => {
  console.log('🎯 ReactContainer mounted, initializing React app...');
  // Small delay to ensure DOM is ready
  setTimeout(() => {
    initializeReactApp();
  }, 10);
});
</script>

<style>
/* NOT scoped - Vue scoped styles interfere with React children */
#t3000-react-root {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  position: relative;
}
</style>
