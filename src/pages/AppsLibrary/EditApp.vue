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
            @file-removed="handleFileRemoved"
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
      <div class="flex grid-cols-4 gap-4">
        <q-btn
          label="Save"
          color="primary"
          icon="save"
          @click="SaveApp"
          :disable="saveBtnDisabled"
        />
        <q-btn label="Cancel" icon="cancel" to="/apps-library" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useQuasar } from "quasar";
import { useRouter, useRoute } from "vue-router";
import FileUpload from "../../components/FileUploadS3.vue";
import { user, globalNav, isAdmin } from "../../lib/common";
import { liveApi } from "../../lib/api";
import ky from "ky";

const $q = useQuasar();
const router = useRouter();
const route = useRoute();

const appData = ref({});
let imageExist = false;
const saveBtnDisabled = ref(true);

const fileUploaderRef = ref(null);

const fileServerUrl = process.env.API_URL + "/file/";

onMounted(() => {
  globalNav.value.title = "Edit Application";
  globalNav.value.back = "/apps-library";
  liveApi
    .get("t3Apps/" + route.params.id)
    .then(async (res) => {
      const data = await res.json();
      saveBtnDisabled.value = false;
      if (!isAdmin(user.value) && user.value.id !== data.userId) {
        router.push({ path: "/apps-library" });
        $q.notify({
          type: "negative",
          message: "Permission denied!",
        });
      }
      appData.value = {
        name: data.name,
        description: data.description,
      };
      if (data.image) {
        saveBtnDisabled.value = true;
        ky.get(fileServerUrl + data.image?.path)
          .then(async (res) => {
            const file = await res.blob();
            imageExist = true;
            fileUploaderRef.value?.uppy.addFile({
              id: data.image.id,
              name: data.image.name,
              type: file.type,
              data: file,
            });
          })
          .finally(() => {
            saveBtnDisabled.value = false;
          });
      }
    })
    .catch((err) => {
      $q.notify({
        type: "negative",
        message: err.message,
      });
      console.error(err);
    });
});

function handleUploaded(event) {
  const file = event.body;
  appData.value.imageId = file.id;
  saveToDB();
}
function handleFileRemoved() {
  appData.value.imageId = null;
  imageExist = false;
}
async function SaveApp() {
  if (!user.value) {
    return;
  }
  if (fileUploaderRef.value?.uppy.getFiles()?.length > 0 && !imageExist) {
    fileUploaderRef.value.upload();
    return;
  }
  saveToDB();
}

function saveToDB() {
  liveApi
    .patch("t3Apps/" + route.params.id, { json: appData.value })
    .then(async () => {
      router.push({ path: "/user/apps" });
      $q.notify({
        type: "positive",
        message: "Application updated",
      });
    })
    .catch((err) => {
      console.error(err);
      $q.notify({
        type: "negative",
        message: "Application not updated! " + err.message,
      });
    });
}
</script>
