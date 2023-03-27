

<template>
  <div class="tools flex column">
    <q-list class="rounded-borders text-primary">
      <q-item v-for="tool in tools" :key="tool.name" @click="selectTool(tool.name)" clickable v-ripple
        :active="selectedTool.name === tool.name" active-class="active-tool">
        <q-tooltip anchor="center right" self="center left">
          {{ tool.label }}
        </q-tooltip>
        <q-item-section>
          <q-icon :name="tool.icon" size="sm" />
        </q-item-section>
      </q-item>
      <q-item v-for="tool in customTools" :key="tool.name" @click="selectTool(tool.name, 'custom', tool.svg)" clickable
        v-ripple :active="selectedTool.name === tool.name" active-class="active-tool">
        <q-tooltip anchor="center right" self="center left">
          {{ tool.label }}
        </q-tooltip>
        <q-item-section>
          <q-icon name="dashboard_customize" size="sm" />
        </q-item-section>
      </q-item>
      <q-item @click="addCustomTool" clickable v-ripple>
        <q-tooltip anchor="center right" self="center left">
          Add custom SVG
        </q-tooltip>
        <q-item-section>
          <q-icon name="add_circle_outline" size="sm" />
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>
  
<script>
import { defineComponent } from 'vue'
import { tools } from "../lib/common";
export default defineComponent({
  name: 'ToolsSidebar',
  props: {
    selectedTool: {
      type: Object,
      required: true
    },
    customTools: {
      type: Array,
      required: false
    },
  },
  emits: ["selectTool", "addCustomTool"],
  setup(_props, { emit }) {
    function selectTool(name, type = "default", svg = null) {
      emit("selectTool", { name, type, svg });
    }

    function addCustomTool() {
      emit("addCustomTool");
    }
    return {
      tools,
      selectTool,
      addCustomTool
    }
  }
})
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
  