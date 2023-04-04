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
        :active="selectedTool.name.startsWith('Custom-')"
      >
        <q-tooltip anchor="center right" self="center left">
          User objects library
        </q-tooltip>
        <q-menu anchor="bottom right" self="bottom left" max-height="650px">
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
              <q-tab
                v-if="false"
                name="lib"
                icon="library_books"
                label="Library"
              />
              <q-tab name="svgs" icon="collections" label="Custom SVGs" />
            </q-tabs>

            <q-separator />

            <q-tab-panels v-model="libTab" animated dark>
              <q-tab-panel name="lib" v-if="false">
                <div class="flex p-4 items-center justify-center">
                  The library is empty.
                </div>
              </q-tab-panel>

              <q-tab-panel name="svgs">
                <q-btn
                  dense
                  @click="addCustomTool"
                  icon="library_add"
                  color="white"
                  text-color="black"
                  label="Add custom SVG"
                />
                <div
                  v-if="customTools?.length"
                  class="grid gap-4 grid-cols-4 grid-flow-row auto-rows-max p-4"
                >
                  <div
                    v-for="tool in customTools"
                    :key="tool.name"
                    v-close-popup
                    @click="selectTool(tool.name, 'custom', tool.svg)"
                  >
                    <div
                      class="w-24 h-24 bg-slate-200 hover:bg-slate-500 p-2 rounded-lg cursor-pointer"
                    >
                      <div
                        class="flex flex-col items-center justify-center h-full"
                      >
                        <img :src="getSvgImageUrl(tool.svg)" alt="Custom Svg" />
                      </div>
                    </div>
                  </div>
                </div>
                <div class="flex p-4 items-center justify-center" v-else>
                  No custom SVGs yet.
                </div>
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
import { tools } from "../lib/common";
export default defineComponent({
  name: "ToolsSidebar",
  props: {
    selectedTool: {
      type: Object,
      required: true,
    },
    customTools: {
      type: Array,
      required: false,
    },
  },
  emits: ["selectTool", "addCustomTool"],
  setup(_props, { emit }) {
    const libTab = ref("svgs");
    function selectTool(name, type = "default", svg = null) {
      emit("selectTool", { name, type, svg });
    }

    function addCustomTool() {
      emit("addCustomTool");
    }

    function getSvgImageUrl(svg) {
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      return url;
    }
    return {
      tools,
      selectTool,
      addCustomTool,
      libTab,
      getSvgImageUrl,
    };
  },
});
</script>

<style scoped>
.tools {
  background-color: #2a2a2a;
  padding: 10px 0;
  align-self: stretch;
  overflow-y: hidden;
  max-height: 100vh;
}

.tools {
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
</style>