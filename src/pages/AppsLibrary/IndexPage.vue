<template>
  <q-page class="flex justify-center p-4">
    <div class="flex flex-col w-full max-w-7xl">
      <div class="grid grid-cols-4 gap-4">
        <q-card class="app-card" v-for="app in libData" :key="app.id">
          <div class="relative" style="height: 205px; width: 100%">
            <img
              class="app-image"
              v-if="app.image"
              :src="fileServerUrl + app.image.path + '?w=208&h=205'"
            />
            <img v-else src="../../assets/placeholder.png" />
          </div>
          <q-card-section>
            <div class="text-h6">{{ app.name }}</div>
            <div class="text-subtitle2">by {{ app.user.name }}</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            {{ app.description }}
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useQuasar } from "quasar";
import api from "../../lib/api";

const $q = useQuasar();

const libData = ref([]);

const fileServerUrl = process.env.API_URL + "/file/";

onMounted(async () => {
  api
    .get("t3Apps")
    .then(async (res) => {
      const data = await res.json();
      libData.value = data;
    })
    .catch((err) => {
      // Not logged in
    });
});
</script>
<style>
.app-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
