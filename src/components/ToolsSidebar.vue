<template>
  <div class="tools flex column">
    <q-list class="rounded-borders text-primary">
      <q-item
        v-for="tool in tools"
        :key="tool.name"
        @click="selectTool(tool.name)"
        clickable
        v-ripple
        :active="selectedTool.name === tool.name"
        active-class="active-tool"
      >
        <q-tooltip anchor="center right" self="center left">
          {{ tool.label }}
        </q-tooltip>
        <q-item-section>
          <q-icon :name="tool.icon" size="sm" />
        </q-item-section>
      </q-item>
      <q-item
        clickable
        v-ripple
        active-class="active-tool"
        :active="selectedTool.type !== 'default'"
      >
        <q-tooltip anchor="center right" self="center left">
          User objects library
        </q-tooltip>
        <q-menu
          separate-close-popup
          anchor="bottom right"
          self="bottom left"
          max-height="650px"
          @hide="imgTab = 'list'"
        >
          <q-card dark style="min-width: 500px; height: 400px">
            <q-tabs
              v-model="libTab"
              inline-label
              class="text-grey"
              active-color="primary"
              indicator-color="primary"
              align="justify"
              narrow-indicator
            >
              <q-tab name="lib" icon="library_books" label="Library" />
              <q-tab name="imgs" icon="collections" label="Images" />
            </q-tabs>

            <q-separator />

            <q-tab-panels v-model="libTab" animated dark>
              <q-tab-panel name="lib">
                <div
                  v-if="objectLib?.length > 0"
                  class="grid gap-4 grid-cols-4 grid-flow-row auto-rows-max p-4"
                >
                  <div
                    v-for="item in objectLib"
                    :key="item.name"
                    class="relative"
                  >
                    <div class="tool-wrapper">
                      <q-btn
                        round
                        dense
                        color="grey-7"
                        icon="more_vert"
                        size="sm"
                      >
                        <q-menu separate-close-popup>
                          <q-list style="min-width: 100px">
                            <q-item
                              clickable
                              v-close-popup
                              @click="renameLibItem(item)"
                            >
                              <q-item-section>Rename</q-item-section>
                            </q-item>
                            <q-item
                              clickable
                              v-close-popup
                              @click="deleteLibItem(item)"
                            >
                              <q-item-section>Delete</q-item-section>
                            </q-item>
                          </q-list>
                        </q-menu>
                      </q-btn>
                      <div
                        class="w-24 h-24 bg-slate-200 hover:bg-slate-500 p-2 rounded-lg cursor-pointer"
                        v-close-popup
                        @click="selectTool(item.name, 'libItem', item.items)"
                      >
                        <div
                          class="flex flex-col flex-nowrap items-center justify-center h-full"
                        >
                          <div>
                            <q-icon
                              color="blue-10"
                              name="library_books"
                              size="xl"
                            />
                          </div>
                          <div
                            class="grow leading-4 text-black text-center text-ellipsis overflow-hidden flex items-center"
                          >
                            {{ item.label }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="flex p-4 items-center justify-center" v-else>
                  The library is empty.
                </div>
              </q-tab-panel>

              <q-tab-panel name="imgs" class="py-1">
                <q-tab-panels v-model="imgTab" animated dark>
                  <q-tab-panel name="list" class="p-0">
                    <q-btn
                      dense
                      @click="imgTab = 'upload'"
                      icon="library_add"
                      color="white"
                      text-color="black"
                      label="Add Image"
                    />
                    <div
                      v-if="images?.length > 0"
                      class="grid gap-4 grid-cols-4 grid-flow-row auto-rows-max p-4"
                    >
                      <div
                        v-for="image in images"
                        :key="image.name"
                        class="relative"
                      >
                        <div class="tool-wrapper">
                          <q-btn
                            round
                            dense
                            color="grey-7"
                            icon="more_vert"
                            size="sm"
                          >
                            <q-menu>
                              <q-list style="min-width: 100px">
                                <q-item
                                  clickable
                                  v-close-popup
                                  @click="deleteLibImage(image)"
                                >
                                  <q-item-section>Delete</q-item-section>
                                </q-item>
                              </q-list>
                            </q-menu>
                          </q-btn>
                          <div
                            class="w-24 h-24 bg-slate-200 hover:bg-slate-500 p-2 rounded-lg cursor-pointer"
                            v-close-popup
                            @click="selectTool(image.id, 'Image', image)"
                          >
                            <div
                              class="flex flex-col items-center justify-center h-full"
                            >
                              <img :src="image.path" />
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
                        <file-upload
                          :types="['image/*']"
                          :height="240"
                          @file-added="imageFileAdded"
                          @file-removed="
                            imgTabUploader.uploadBtnDisabled = true
                          "
                        />
                      </q-card-section>

                      <q-card-actions align="right" class="text-primary pb-0">
                        <q-btn flat label="Cancel" @click="imgTab = 'list'" />
                        <q-btn
                          :disabled="imgTabUploader.uploadBtnDisabled"
                          :loading="imgTabUploader.uploadBtnLoading"
                          flat
                          label="Save"
                          @click="saveLibImage()"
                        />
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
  </div>
</template>

<script>
import { defineComponent, ref } from "vue";
import { useQuasar } from "quasar";
import FileUpload from "./FileUpload.vue";
import { tools } from "../lib/common";
export default defineComponent({
  name: "ToolsSidebar",
  components: {
    FileUpload,
  },
  props: {
    selectedTool: {
      type: Object,
      required: true,
    },
    images: {
      type: Array,
      required: false,
      default() {
        return [];
      },
    },
    objectLib: {
      type: Array,
      required: false,
      default() {
        return [];
      },
    },
  },
  emits: [
    "selectTool",
    "saveLibImage",
    "deleteLibItem",
    "renameLibItem",
    "deleteLibImage",
  ],
  setup(_props, { emit }) {
    const $q = useQuasar();
    const libTab = ref("lib");
    function selectTool(name, type = "default", data = null) {
      emit("selectTool", name, type, data);
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
        .onCancel(() => {})
        .onDismiss(() => {});
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
        .onCancel(() => {})
        .onDismiss(() => {});
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
      imgTabUploader.value.uploadBtnDisabled = false;
      imgTabUploader.value.file = file;
    }

    function saveLibImage() {
      emit("saveLibImage", imgTabUploader.value.file);
      imgTab.value = "list";
      imgTabUploader.value.file = null;
    }

    return {
      tools,
      selectTool,
      libTab,
      deleteLibItem,
      renameLibItem,
      deleteLibImage,
      imgTab,
      imgTabUploader,
      saveLibImage,
      imageFileAdded,
    };
  },
});
</script>

<style scoped>
.tools {
  background-color: #2a2a2a;
  padding: 10px 0;
  align-self: stretch;
  margin-top: 34px;
  position: absolute;
  height: 100%;
  overflow-y: auto;
  max-height: calc(100vh - 34px);
  scrollbar-width: thin;
  z-index: 1;
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
