<script>
import { ref, onMounted } from "vue";
import AppTabs from "./AppTabs.vue";
import GridEditor from "./GridEditor.vue";
import gridColumns from "src/lib/gridColumns";
export default {
  components: {
    AppTabs,
    GridEditor,
  },
  props: {
    type: {
      type: String,
      default: "App",
    },
    appData: {
      type: Object,
      required: true,
    },
  },
  emits: ["cellChanged", "rowsRemoved", "rowAdded", "gridCustomEvent"],
  setup() {
    const appTab = ref("inputs");

    const typesNewRow = {
      inputs: {
        // __typename: "Input",
        panel: 1,
        desciption: "IN",
        auto_manual: 0,
        value: 0,
        control: 0,
        range: 0,
        unit: 0,
        filter: 0,
        calibration_sign: 0,
        calibration_h: 0,
        calibration_l: 0,
        digital_analog: 0,
      },
    };

    onMounted(() => {});

    return {
      appTab,
      imageServerUrl: process.env.API_URL + "file/",
      initialPagination: {
        sortBy: "desc",
        descending: false,
        page: 1,
        rowsPerPage: 15,
      },
      typesNewRow,
    };
  },
};
</script>

<template>
  <div class="grow min-w-0 max-w-full">
    <app-tabs v-model="appTab" />
    <q-tab-panels
      v-model="appTab"
      animated
      keep-alive
      class="shadow-2 rounded-borders"
    >
      <q-tab-panel name="inputs">
        <grid-editor
          v-if="appData?.inputs"
          :appData="appData"
          field="inputs"
          :newRow="typesNewRow.inputs"
          :columns="gridColumns.inputs"
          @grid-custom-event="$emit('gridCustomEvent', $event)"
          @cell-changed="
            $emit('cellChanged', { event: $event, field: 'inputs' })
          "
          @rows-removed="
            $emit('rowsRemoved', { event: $event, field: 'inputs' })
          "
          @row-added="$emit('rowAdded', { event: $event, field: 'inputs' })"
        />
      </q-tab-panel>
    </q-tab-panels>
  </div>
</template>

<style scoped></style>
