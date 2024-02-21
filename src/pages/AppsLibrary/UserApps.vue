<template>
  <q-page class="flex justify-center p-4">
    <div class="flex flex-col w-full max-w-7xl">
      <div class="grid grid-cols-4 gap-4">
        <app-card
          v-for="app in libData"
          :key="app.id"
          :app="app"
          :show-actions="true"
          :show-private-status="true"
          @deleted="loadApps"
          @updated="loadApps"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { liveApi } from "../../lib/api";
import AppCard from "src/components/AppCard.vue";

const libData = ref([]);

function loadApps() {
  liveApi
    .get("user/t3Apps")
    .then(async (res) => {
      libData.value = await res.json();
    })
    .catch((err) => {});
}

onMounted(async () => {
  loadApps();
});
</script>
<style></style>
