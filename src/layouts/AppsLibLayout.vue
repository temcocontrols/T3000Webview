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
import { useMeta } from "quasar";

useMeta({ title: "Application Library" });
onMounted(() => {
  globalNav.value.title = "Application Library";
  globalNav.value.back = null;
  globalNav.value.home = "/apps-library";
});
</script>
