<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <user-top-bar></user-top-bar>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { onMounted } from "vue";
import { globalNav } from "../lib/common";
import UserTopBar from "../components/UserTopBar.vue";

onMounted(() => {
  globalNav.value.title = "Modbus Register";
  globalNav.value.back = null;
  globalNav.value.home = "/modbus-register";
});
</script>
