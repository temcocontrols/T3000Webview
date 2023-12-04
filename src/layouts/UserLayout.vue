<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <user-top-bar></user-top-bar>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent } from "vue";
import UserTopBar from "../components/UserTopBar.vue";

export default defineComponent({
  name: "MainLayout",
  components: {
    UserTopBar,
  },

  setup() {
    return {};
  },
});
</script>
