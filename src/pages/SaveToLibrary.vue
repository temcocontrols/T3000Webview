<template>
  <q-page class="flex flex-col">
    <div class="image-container relative">
      <file-upload
        ref="fileUploaderRef"
        path="app-images"
        :types="['image/*']"
        :height="240"
        @file-added="imageFileAdded"
        @file-removed="imgUploader.uploadBtnDisabled = true"
        @uploaded="handleUploaded"
      />
    </div>
    <q-input class="grow py-4" v-model="appData.name" label="Name" />

    <q-input
      class="py-2"
      v-model="appData.description"
      label="Description"
      type="textarea"
      autogrow
    />
    <q-btn icon="save" @click="SaveApp" />
  </q-page>
</template>

<script setup>
import { onMounted, ref, toRaw } from "vue";
import { useQuasar } from "quasar";
import FileUpload from "../components/FileUploadS3.vue";
import { user, demoDeviceData } from "../lib/common";
import prisma from "../lib/bridg";
import api from "../lib/api";

const $q = useQuasar();

const appData = ref({});

const fileUploaderRef = ref(null);

const imgUploader = ref({
  uploadBtnDisabled: true,
  uploadBtnLoading: false,
  file: null,
});

onMounted(() => {
  api
    .get("me")
    .then(async (res) => {
      user.value = await res.json();
    })
    .catch((err) => {
      // Not logged in
    });
  window.chrome?.webview?.postMessage({
    action: 1, // GET_INITIAL_DATA
  });
  if (process.env.DEV) {
    demoDeviceData().then((data) => {
      appData.value = formatDeviceData(data);
    });
  }
});

window.chrome?.webview?.addEventListener("message", (arg) => {
  if ("action" in arg.data) {
    if (arg.data.action === "GET_INITIAL_DATA_RES") {
      if (arg.data.data) {
        arg.data.data = JSON.parse(arg.data.data);
      }
      window.chrome?.webview?.postMessage({
        action: 0, // GET_PANEL_DATA
        panelId: arg.data.entry.pid,
      });
    } else if (arg.data.action === "GET_PANEL_DATA_RES") {
      if (arg.data?.panel_id) {
        appData.value = formatDeviceData(arg.data);
      }
    }
  }
});

function entryRemoveExtraData(entry) {
  delete entry.type;
  delete entry.id;
  delete entry.pid;
  delete entry.command;
  delete entry.decom;
  return entry;
}

function formatDeviceData(data) {
  const deviceData = {};
  deviceData.panelId = data.panel_id;
  deviceData.inputs = data.data
    .filter((i) => i.type === "INPUT" && i.range !== 0)
    .map(entryRemoveExtraData);

  deviceData.ranges = data.ranges;
  console.log(deviceData);
  return deviceData;
}

function handleUploaded(event) {
  const file = event.body;
  appData.value.imageId = file.id;
  SaveApp();
}
async function SaveApp() {
  if (!user.value) {
    return;
  }
  console.log("fileUploaderRef.value", fileUploaderRef.value);
  if (fileUploaderRef.value?.uppy.getFiles()?.length > 0) {
    console.log(fileUploaderRef.value?.uppy.getFiles());
    fileUploaderRef.value.upload();
    return;
  }
  await prisma.t3App.create({ data: appData.value });
}
</script>
