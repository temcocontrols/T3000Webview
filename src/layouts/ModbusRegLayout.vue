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

useMeta({ title: "Modbus Register" });
onMounted(() => {
  globalNav.value.title = "Modbus Register";
  globalNav.value.back = null;
  globalNav.value.home = "/modbus-register";
});
</script>
