<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <MyHeader />
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import MyHeader from '../components/NewUI/Header.vue'
</script>

<style scoped>
/* Quasar layout styles */
.q-layout {
  background-color: #f5f5f5;
}

.q-header {
  background: #fff;
  color: #000;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
}

.q-page-container {
  padding: 0;
  background-color: #f5f5f5;
}

/* If transparent doesn't work as expected, try using a white background */
/*
.layout, .ant-layout {
  background-color: white !important;
}
*/
</style>
