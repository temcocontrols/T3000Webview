<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { onMounted } from "vue";
import { globalNav } from "../lib/common";
import { useMeta } from "quasar";

useMeta({ title: "Trend Log" });
onMounted(() => {
  globalNav.value.title = "Trend Log";
  globalNav.value.back = null;
  globalNav.value.home = "/trendlog";
});
</script>
