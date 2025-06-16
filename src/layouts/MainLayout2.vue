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
</script>

<style>
.app-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.layout {
  background-color: transparent !important;
}

.ant-layout {
  background-color: transparent !important;
}

/* If transparent doesn't work as expected, try using a white background */
/*
.layout, .ant-layout {
  background-color: white !important;
}
*/
</style>
