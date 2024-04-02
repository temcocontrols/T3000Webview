<template>
  <q-page class="flex items-center justify-center">
    <q-inner-loading
      v-if="!loggedIn"
      :showing="true"
      label="Waiting for the login in the browser window..."
      label-class="text-teal"
      label-style="font-size: 1.1em"
    />
    <div v-else>Logged in as {{ user.name }}</div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuasar } from "quasar";

import { user, globalNav, getModbusRegisterSettings } from "../lib/common";
import { localApi } from "../lib/api";

const router = useRouter();
const $q = useQuasar();
const cid = ref(null);
const loggedIn = ref(false);
onMounted(() => {
  // Connect to the WebSocket server
  const socket = new WebSocket(process.env.API_WS_URL);
  socket.onmessage = ({ data }) => {
    data = JSON.parse(data);
    if (data.type === "hello") {
      cid.value = data.cid;
      const loginUrl = process.env.API_URL + "/login?cid=" + cid.value;
      localApi.post("login", {
        json: {
          url: loginUrl,
        },
      });
    } else if (data.type === "token") {
      loggedIn.value = true;
      user.value = data.user;
      localStorage.setItem("user", JSON.stringify(user.value));
      localApi.post("user", {
        json: {
          token: data.token,
          id: data.user.id,
          name: data.user.name,
        },
      });
      $q.cookies.set("token", data.token, {
        expires: 360, // in 360 days
        sameSite: "Strict",
        secure: true,
      });

      if (getModbusRegisterSettings()?.syncData === "OFFLINE") {
        $q.notify({
          message:
            "Offline mode enabled, data will not be synced, you can change that from settings.",
          color: "warning",
          timeout: 0,
          actions: [{ label: "Dismiss", color: "white", handler: () => {} }],
        });
      }

      router.replace({ path: globalNav.value.home });
    }
  };
});
</script>
