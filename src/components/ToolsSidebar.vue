<!--
  The ToolsSidebar component is a sidebar that displays various HVAC tools for the user to draw on the viewport.
  It uses the `q-expansion-item` component to create expandable categories for the tools.
  Each category contains a list of tools that the user can select from.
  The `toolsCategories` data property is used to dynamically generate the categories and their corresponding tools.
  The `tools` data property contains the list of all available tools.
  The `tool` slot is used to display the tool's icon and name.
  When a tool is selected, the `selectTool` method is called with the selected tool's `id` as an argument.
  The `selectTool` method emits a `tool-selected` event with the selected tool's `id` as the payload.
  The `tool-selected` event can be listened to by the parent component to perform any necessary actions when a tool is selected.
  The `selectedTool` data property is used to keep track of the currently selected tool.
  When a tool is selected, its `id` is assigned to the `selectedTool` property.
  The `selectedTool` property is used to highlight the currently selected tool in the sidebar.
  The `selectedTool` property is also used to display the selected tool's name in the header of the sidebar.
  The `header` slot is used to display a custom header for the sidebar.
  The `header` slot is passed the `selectedTool` property as a prop, which can be used to display the selected tool's name.
  The `header` slot is also passed the `selectTool` method as a prop, which can be used to select a different tool.
-->
<template>
  <div class="tools flex column">
    <q-expansion-item v-for="cat in toolsCategories" :key="cat" class="mb-2 border border-solid border-gray-700" dark
      default-opened :label="cat" header-class="p-2 min-h-0" expand-icon-class="!pl-2">
      <q-list class="rounded-borders text-primary grid grid-cols-2 gap-1 p-1">
        <q-item v-for="tool in tools.filter((i) => i.cat.includes(cat))" :key="tool.name" @click="selectTool(tool)"
          @dragend="toolDropped($event, tool)" clickable v-ripple :active="selectedTool.name === tool.name"
          active-class="active-tool" draggable="true" class="p-2 min-h-0">
          <q-tooltip anchor="center right" self="center left">
            {{ tool.label }}
          </q-tooltip>
          <q-item-section>
            <q-icon :name="tool.icon" size="sm" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-expansion-item>
    <q-expansion-item class="mb-2 border border-solid border-gray-700" dark default-opened label="User"
      header-class="p-2 min-h-0" expand-icon-class="!pl-2">
      <q-list class="rounded-borders text-primary grid grid-cols-2 gap-1 p-1">
        <q-item clickable v-ripple active-class="active-tool" :active="selectedTool.type !== 'default'"
          class="p-2 min-h-0">
          <q-tooltip anchor="center right" self="center left">
            User objects library
          </q-tooltip>
          <q-menu separate-close-popup anchor="bottom right" self="bottom left" max-height="650px"
            @hide="imgTab = 'list'">
            <q-card dark style="min-width: 500px; height: 400px">
              <q-tabs v-model="libTab" inline-label class="text-grey" active-color="primary" indicator-color="primary"
                align="justify" narrow-indicator>
                <q-tab name="lib" icon="library_books" label="Library" />
                <q-tab name="imgs" icon="collections" label="Images" />
              </q-tabs>
              <q-separator />
              <q-tab-panels v-model="libTab" animated dark style="max-height: 350px" class="scroll">
                <q-tab-panel name="lib">
                  <div v-if="objectLib?.length > 0" class="grid gap-4 grid-cols-4 grid-flow-row auto-rows-max p-4">
                    <div v-for="item in objectLib" :key="item.id" class="relative">
                      <div class="tool-wrapper">
                        <q-btn round dense color="grey-7" icon="more_vert" size="sm">
                          <q-menu separate-close-popup>
                            <q-list style="min-width: 100px">
                              <q-item clickable v-close-popup @click="renameLibItem(item)">
                                <q-item-section>Rename</q-item-section>
                              </q-item>
                              <q-item clickable v-close-popup @click="deleteLibItem(item)">
                                <q-item-section>Delete</q-item-section>
                              </q-item>
                            </q-list>
                          </q-menu>
                        </q-btn>
                        <div class="w-24 h-24 bg-slate-200 hover:bg-slate-500 p-2 rounded-lg cursor-pointer"
                          v-close-popup @click="selectTool(item, 'libItem')">
                          <div class="flex flex-col flex-nowrap items-center justify-center h-full">
                            <div>
                              <q-icon color="blue-10" name="library_books" size="xl" />
                            </div>
                            <div
                              class="grow leading-4 text-black text-center text-ellipsis overflow-hidden flex items-center">
                              {{ item.label }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="flex p-4 items-center justify-center" v-else>
                    <p class="text-center">
                      The library is empty. <br /><br />
                      You can select some objects and save them<br />
                      to the library to easily reuse them.
                    </p>
                  </div>
                </q-tab-panel>

                <q-tab-panel name="imgs" class="py-1">
                  <q-tab-panels v-model="imgTab" animated dark>
                    <q-tab-panel name="list" class="p-0">
                      <q-btn dense @click="imgTab = 'upload'" icon="library_add" color="white" text-color="black"
                        label="Add Image" />
                      <div v-if="images?.length > 0" class="grid gap-4 grid-cols-4 grid-flow-row auto-rows-max p-4">
                        <div v-for="image in images" :key="image.id" class="relative">
                          <div class="tool-wrapper">
                            <q-btn round dense color="grey-7" icon="more_vert" size="sm">
                              <q-menu>
                                <q-list style="min-width: 100px">
                                  <q-item clickable v-close-popup @click="deleteLibImage(image)">
                                    <q-item-section>Delete</q-item-section>
                                  </q-item>
                                </q-list>
                              </q-menu>
                            </q-btn>
                            <div class="w-24 h-24 bg-slate-200 hover:bg-slate-500 p-2 rounded-lg cursor-pointer"
                              v-close-popup @click="selectTool(image, 'Image')">
                              <div class="flex flex-col items-center justify-center h-full">
                                <img :src="image.path + '?w=95&h=95'" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="flex p-4 items-center justify-center" v-else>
                        No images yet.
                      </div>
                    </q-tab-panel>

                    <q-tab-panel name="upload" class="p-0">
                      <q-card dark style="max-width: 468px">
                        <q-card-section class="py-1">
                          <div class="text-h6">Upload image</div>
                        </q-card-section>
                        <q-card-section class="q-pt-none">
                          <file-upload ref="fileUploaderRef" path="lib-images" :types="['image/*']" :height="240"
                            @file-added="imageFileAdded" @file-removed="
                              imgTabUploader.uploadBtnDisabled = true
                              " @uploaded="handleUploaded" />
                        </q-card-section>

                        <q-card-actions align="right" class="text-primary pb-0">
                          <q-btn flat label="Cancel" @click="imgTab = 'list'" />
                          <q-btn :disabled="imgTabUploader.uploadBtnDisabled" :loading="imgTabUploader.uploadBtnLoading"
                            flat label="Save" @click="saveLibImage()" />
                        </q-card-actions>
                      </q-card>
                    </q-tab-panel>
                  </q-tab-panels>
                </q-tab-panel>
              </q-tab-panels>
            </q-card>
          </q-menu>
          <q-item-section>
            <q-icon name="add_circle_outline" size="sm" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-expansion-item>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useQuasar } from "quasar";
import FileUpload from "./FileUploadS3.vue";
import { tools, toolsCategories, user } from "../lib/common";
const props = defineProps({
  selectedTool: {
    type: Object,
    required: true,
  },
  images: {
    type: Array,
    default: () => [],
  },
  objectLib: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits([
  "selectTool",
  "saveLibImage",
  "deleteLibItem",
  "renameLibItem",
  "deleteLibImage",
  "toolDropped",
]);
const $q = useQuasar();
const fileUploaderRef = ref(null);
const libTab = ref("lib");
function selectTool(tool, type = "default") {
  emit("selectTool", tool, type);
}

function deleteLibItem(item) {
  $q.dialog({
    title: "Confirm",
    message: "Are you sure you want to delete this library item?",
    cancel: true,
  })
    .onOk(() => {
      emit("deleteLibItem", item);
    })
    .onCancel(() => { })
    .onDismiss(() => { });
}

function deleteLibImage(item) {
  $q.dialog({
    title: "Confirm",
    message: "Are you sure you want to delete this image?",
    cancel: true,
  })
    .onOk(() => {
      emit("deleteLibImage", item);
    })
    .onCancel(() => { })
    .onDismiss(() => { });
}

function renameLibItem(item) {
  $q.dialog({
    title: "Rename",
    message: "Type the new name",
    prompt: {
      model: item.label,
      type: "text", // optional
    },
    cancel: true,
    persistent: true,
  })
    .onOk((data) => {
      if (!data) return;
      emit("renameLibItem", item, data);
    })
    .onCancel(() => {
      // console.log('>>>> Cancel')
    })
    .onDismiss(() => {
      // console.log('I am triggered on both OK and Cancel')
    });
}

const imgTab = ref("list");

const imgTabUploader = ref({
  uploadBtnDisabled: true,
  uploadBtnLoading: false,
  file: null,
});

function imageFileAdded(file) {
  console.log("file", file);
  imgTabUploader.value.uploadBtnDisabled = false;
  imgTabUploader.value.file = file;
}

function saveLibImage() {
  if (user.value) {
    fileUploaderRef.value.upload();
  } else {
    saveLibImageEmit(imgTabUploader.value.file);
  }
}

function handleUploaded(event) {
  saveLibImageEmit(event.body);
}

function saveLibImageEmit(data) {
  emit("saveLibImage", data);
  imgTab.value = "list";
  imgTabUploader.value.file = null;
}

function toolDropped(event, tool) {
  emit("toolDropped", event, tool);
}
</script>

<style scoped>
.tools {
  background-color: #2a2a2a;
  padding: 0 4px;
  align-self: stretch;
  margin-top: 1px;
  position: absolute;
  height: 100%;
  overflow-y: auto;
  max-height: calc(100vh - 37px);
  scrollbar-width: thin;
  z-index: 1;
  flex-wrap: nowrap;
}

.tools::-webkit-scrollbar {
  display: none;
}

.active-tool {
  color: white;
  background: #353c44;
}

.tool-wrapper {
  position: relative;
}

.tool-wrapper button {
  visibility: hidden;
  position: absolute;
  right: 5px;
  top: 2px;
  z-index: 1;
}

.tool-wrapper:hover button {
  visibility: visible;
}
</style>
