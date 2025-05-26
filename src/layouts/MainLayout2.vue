<template>
  <div class="app-container">
   <a-layout class="layout">
    <MyHeader />
    <a-layout-content class="main-content">
      <slot>
        <router-view />
      </slot>
    </a-layout-content>
  </a-layout>
  </div>
</template>

<script setup lang="ts">
import MyHeader from '../components/NewUI/Header.vue'
// These imports are commented out in the original code
// import Hero from '../components/NewUI/Hero.vue'
// import CardGrid from '../components/NewUI/CardGrid.vue'
// import Features from '../components/NewUI/Features.vue'
// import MyFooter from '../components/NewUI/Footer.vue'
</script>

<style>
.app-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
