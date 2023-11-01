<template>
  <q-page class="flex items-center justify-center">
    <q-inner-loading
      v-if="!loggedIn"
      :showing="true"
      label="Waiting for the login in the auth window..."
      label-class="text-teal"
      label-style="font-size: 1.1em"
    />
    <div v-else>Logged in as {{ user.name }}</div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from "vue";

const cid = ref(null);
const loginWindow = ref(null);
const loggedIn = ref(false);
const user = ref(null);
onMounted(() => {
  // Connect to the WebSocket server
  const socket = new WebSocket(process.env.API_WS_URL);
  socket.onmessage = ({ data }) => {
    data = JSON.parse(data);
    console.log(data, "ws data");
    if (data.type === "hello") {
      cid.value = data.cid;
      const loginUrl = process.env.API_URL + "/login?cid=" + cid.value;
      // if (!window.chrome?.webview?.postMessage) {
      console.log("open login url", loginUrl);
      loginWindow.value = window.open(loginUrl, "_blank");
      return;
      // }
      // window.chrome.webview.postMessage({
      //   action: 13, // OPEN_URL_ON_BROWSER
      //   url: loginUrl,
      // });
    } else if (data.type === "token") {
      loginWindow.value?.close();
      loginWindow.value = null;
      window.chrome.webview.postMessage({
        action: 12, // SAVE_USER_LOGIN
        data: { user: data.user, token: data.token },
      });
      loggedIn.value = true;
      user.value = data.user;
    }
  };
});
</script>
