<template>
  <!--
    NOTE: This component has been moved to Dashboard.vue.
    This is a temporary version for testing purposes only.
    TODO: Remove this component after testing is complete.
  -->
  <div class="hero">
    <div class="hero-content">
      <h1>T3000 Building Automation System</h1>
      <p>Build, deploy, and share AI models in one click</p>
      <a-button type="primary" size="large">Get Started</a-button>
    </div>
    <div class="hero-image">
      <img src="../../assets/logo.png" alt="Hero Image" />
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

/**
 * @deprecated This component has been moved to Dashboard.vue
 * TODO: Remove this component after testing is complete
 */
export default {
  name:'HeroView',
}
</script>

<style scoped>
/*
  Styles for Hero component
  Note: This component will be removed after testing
*/
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 100px 50px 50px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4ecfb 100%);
  min-height: 500px;
}

.hero-content {
  max-width: 500px;
}

.hero-content h1 {
  font-size: 48px;
  font-weight: 700;
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

.hero-image img {
  max-width: 100%;
  max-height: 400px;
}
</style>
