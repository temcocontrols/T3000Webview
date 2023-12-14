<script>
export default {
  props: {
    app: {
      type: Object,
      required: true,
    },
  },
  setup() {
    const fileServerUrl = process.env.API_URL + "/file/";
    return { fileServerUrl };
  },
};
</script>

<template>
  <q-card class="app-card">
    <div class="relative" style="height: 205px; width: 100%">
      <img
        class="app-image"
        v-if="app.image"
        :src="fileServerUrl + app.image.path + '?w=208&h=205'"
      />
      <img v-else src="../assets/placeholder.png" />
    </div>
    <q-card-section>
      <div class="text-h6">{{ app.name }}</div>
      <div class="text-subtitle2">by {{ app.user.name }}</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      {{ app.description }}
    </q-card-section>
  </q-card>
</template>

<style scoped>
.app-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
