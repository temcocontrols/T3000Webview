<template>
  <main-layout>
    <div class="dashboard">
      <div class="hero">
        <div class="hero-content">
          <h1>T3000 Building Automation System</h1>
          <p>This is our T3000 Building Automation front end, a mature project for managing the air conditioning,
            lighting, access control and other automation functions of commercial buildings.</p>
          <a-button type="primary" size="large">Get Started</a-button>
        </div>
      </div>
    </div>
  </main-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MainLayout from '../../layouts/MainLayout2.vue'
import { Model, Studio } from '../../types'
// These imports are commented out in the original code
import Hero from '../../components/NewUI/Hero.vue'

// Define component name
defineOptions({
  name: 'Dashboard-Page'
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4ecfb 100%);
  min-height: 100vh;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 100px 50px 50px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4ecfb 100%);
  /* min-height: 100vh; */
}

.hero-content {
  max-width: 100vw;
}

.hero-content h1 {
  font-size: 48px;
  font-weight: 600;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-content p {
  font-size: 20px;
  color: #555;
  margin-bottom: 32px;
}
</style>
