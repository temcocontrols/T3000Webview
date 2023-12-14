<template>
  <q-page class="flex justify-center p-4">
    <div class="flex flex-col w-full max-w-7xl">
      <div class="flex items-center">
        <div class="image-container relative w-52">
          <file-upload
            ref="fileUploaderRef"
            path="app-images"
            :types="['image/*']"
            :height="150"
            @uploaded="handleUploaded"
          />
        </div>
        <q-input class="grow px-4" v-model="appData.name" label="Name" />
      </div>
      <q-input
        class="py-2"
        v-model="appData.description"
        label="Description"
        type="textarea"
        autogrow
      />
      <div>
        <q-btn label="Save" color="primary" icon="save" @click="SaveApp" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useQuasar } from "quasar";
import { useRouter } from "vue-router";
import FileUpload from "../../components/FileUploadS3.vue";
import { user, demoDeviceData } from "../../lib/common";
import api from "../../lib/api";

const $q = useQuasar();
const router = useRouter();

const appData = ref({});

const fileUploaderRef = ref(null);

onMounted(() => {
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
  const createManyData = (entries, filterFn) => {
    const filteredData = entries.filter(filterFn);
    return filteredData.length
      ? filteredData.map(entryRemoveExtraData)
      : undefined;
  };

  const { panel_id, ranges, data: deviceData } = data;

  const inputs = createManyData(deviceData, (i) => i.type === "INPUT");
  const outputs = createManyData(deviceData, (o) => o.type === "OUTPUT");
  const variables = createManyData(deviceData, (v) => v.type === "VARIABLE");
  const graphics = createManyData(deviceData, (g) => g.type === "GRP");
  const pids = createManyData(deviceData, (p) => p.type === "PID");
  const schedules = createManyData(deviceData, (s) => s.type === "SCHEDULE");
  const programs = createManyData(deviceData, (p) => p.type === "PROGRAM");
  const holidays = createManyData(deviceData, (h) => h.type === "HOLIDAY");

  const createData = {
    panelId: panel_id || 0,
    inputs,
    outputs,
    variables,
    graphics,
    pids,
    schedules,
    programs,
    holidays,
    ranges,
  };

  console.log("create data", createData);

  return createData;
}

function handleUploaded(event) {
  const file = event.body;
  appData.value.imageId = file.id;
  saveToDB();
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
  saveToDB();
}

function saveToDB() {
  api
    .post("t3Apps", { json: appData.value })
    .then(async () => {
      router.push({ path: "/user/apps" });
      $q.notify({
        type: "positive",
        message: "Application saved",
      });
    })
    .catch((err) => {
      console.error(err);
    });
}
</script>
