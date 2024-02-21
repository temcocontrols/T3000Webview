<template>
  <q-page class="flex justify-center p-4">
    <div class="flex flex-col w-full max-w-7xl">
      <div class="grid grid-cols-4 gap-4">
        <app-card v-for="app in libData" :key="app.id" :app="app" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { liveApi } from "../../lib/api";
import { globalNav } from "../../lib/common";
import AppCard from "src/components/AppCard.vue";

const libData = ref([]);

onMounted(async () => {
  globalNav.value.title = "Application Library";
  globalNav.value.back = null;
  liveApi
    .get("t3Apps?limit=12")
    .then(async (res) => {
      libData.value = await res.json();
    })
    .catch((err) => {});
});
</script>
<style></style>
