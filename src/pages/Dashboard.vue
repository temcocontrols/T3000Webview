<template>
  <q-page>
    <div class="flex flex-row justify-center gap-4 mt-4">
      <div v-for="item in appState.items" class="item flex items-center justify-center bg-slate-100 cursor-pointer"
        :key="item.id" :class="{ gauge: item.type === 'gauge', dial: item.type === 'dial' }">
        <gauge-chart v-if="item.type === 'gauge'" class="customizable-gauge"
          :start-angle="gaugeDefault.startAngle || 110" :end-angle="gaugeDefault.endAngle || -110"
          :modelValue="(item.t3Entry.value / 1000)" :separator-step="gaugeDefault.separatorStep" :min="item.min"
          :max="item.max" :scale-interval="gaugeDefault.scale" :inner-radius="gaugeDefault.innerRadius"
          :separator-thickness="gaugeDefault.separatorThickness" :base-color="gaugeDefault.baseColor" :gauge-color="[
            { offset: 0, color: '#64bf8a' },
            { offset: 100, color: '#347AB0' },
          ]" :easing="gaugeDefault.easing">
          <div class="gauge-inner-text">
            <div>
              <div>{{ item.unit }}</div>
              <div>{{ item.t3Entry.value / 1000 }}</div>
            </div>
          </div>
        </gauge-chart>
        <dial-chart v-else-if="item.type === 'dial'" svgStyle="overflow: visible;" :serial="'dial' + item.id"
          :id="'dial' + item.id" type="gauge" variation="linear" :value="(item.t3Entry.value / 1000)" :units="item.unit"
          :min="item.min" :max="item.max" precision="2" animation="500" svgwidth="250" svgheight="200" textColor="#333"
          valueColor="#777" valueBg="transparent" valueBorder="0px solid #fac83c" controlColor="#888" controlBg="none"
          orientation="vertical" size="md" scale="1" smallscale="1" ticks="10" needle="0" bar-color="#111"
          progressColor="#4ea5f1" scaleColor="#aaa" scaleTextColor="#333" needleColor="#ff8800" needleStroke="#000"
          zones="#00ff00,#ff8800,#ff0000"></dial-chart>
      </div>
      <div class="add-new-item flex items-center justify-center bg-slate-100 cursor-pointer"
        @click="addItemDialogAction">
        <q-icon name="add" class="text-4xl" />
      </div>
    </div>
  </q-page>
  <!-- Add item dialog -->
  <q-dialog v-model="addItemDialog.active">
    <q-card style="min-width: 600px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Add Item</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section style="height: 50vh" class="scroll">
        <q-select emit-value filled map-options v-model="addItemDialog.type" :options="itemTypes" label="Chart Type"
          class="mb-6" />
        <q-select filled v-model="addItemDialog.unit" :options="itemUnits" label="Unit" class="mb-6" />
        <div class="flex no-wrap gap-3 mb-6">
          <q-input label="Min" v-model.number="addItemDialog.min" filled type="number" class="grow" />
          <q-input label="Max" v-model.number="addItemDialog.max" filled type="number" class="grow" />
        </div>
        <q-select option-label="description" option-value="id" filled use-input hide-selected fill-input
          input-debounce="0" v-model="addItemDialog.data" :options="selectPanelOptions" @filter="selectPanelFilterFn"
          label="Select Entry" />
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn flat label="Save" :disable="!addItemDialog.data" color="primary" @click="addItemSave" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { useQuasar, useMeta } from "quasar";
import { cloneDeep } from "lodash";
import GaugeChart from '../components/Gauge.vue'
import DialChart from '../components/Dial.vue'
import { ranges } from "../lib/common";

// Remove when deploy
import { deviceData } from "../lib/demo-data";

export default defineComponent({
  name: "DashboardPage",
  components: {
    GaugeChart,
    DialChart
  },
  setup() {
    const metaData = {
      title: "T3000 Dashbaord",
    };
    useMeta(metaData);
    const $q = useQuasar();
    const emptyItemDialog = { active: false, type: "gauge", unit: "%", min: 0, max: 100, data: null }
    const addItemDialog = ref(emptyItemDialog);
    const T3000_Data = ref({ currentPanelData: [] });
    const itemTypes = [
      {
        label: "Gauge",
        value: "gauge",
      },
      {
        label: "Dial",
        value: "dial",
      },
    ];
    const itemUnits = [
      "%",
      "Volts",
      "Amps",
      "RPM",
      "HP"
    ];
    const gaugeDefault = {
      startAngle: -110,
      endAngle: 110,
      separatorStep: 5,
      min: 0,
      max: 100,
      scale: 5,
      innerRadius: 60,
      separatorThickness: 1,
      baseColor: "#d0cdcd",
      easingFct: "Circular",
      easingType: "Out",
    };

    const emptyProject = {
      items: [],
      itemsCount: 0,
    };
    const appState = ref(cloneDeep(emptyProject));

    onMounted(() => {
      window.chrome?.webview?.postMessage({
        action: 1,
      });
      window.chrome?.webview?.postMessage({
        action: 0,
      });
    });

    window.chrome?.webview?.addEventListener("message", (arg) => {
      console.log("Recieved webview message", arg.data);
      if ("action" in arg.data) {
        if (arg.data.action === "UPDATE_ENTRY_RES") {
        } else if (arg.data.action === "GET_DASHBOARD_INITIAL_DATA_RES") {
          if (arg.data.data) {
            arg.data.data = JSON.parse(arg.data.data);
          }
          appState.value = arg.data.data;
        } else if (arg.data.action === "GET_PANEL_DATA_RES") {
          T3000_Data.value.currentPanelData = arg.data.data.filter(item => item.type === "VARIABLE");
          selectPanelOptions.value = T3000_Data.value.currentPanelData;
          appState.value.items
            .filter((i) => i.t3Entry?.type)
            .forEach((item) => {
              item.t3Entry = arg.data.data.find(
                (ii) =>
                  ii.index === item.t3Entry.index &&
                  ii.type === item.t3Entry.type
              );
            });
        } else if (arg.data.action === "SAVE_GRAPHIC_DATA_RES") {
          if (arg.data.data?.status === true) {
            $q.notify({
              message: "Saved successfully.",
              color: "primary",
              icon: "check_circle",
              actions: [
                {
                  label: "Dismiss",
                  color: "white",
                  handler: () => {
                    /* ... */
                  },
                },
              ],
            });
          } else {
            $q.notify({
              message: "Error, not saved!",
              color: "danger",
              icon: "error",
              actions: [
                {
                  label: "Dismiss",
                  color: "white",
                  handler: () => {
                    /* ... */
                  },
                },
              ],
            });
          }
        }
      }
    });

    const selectPanelOptions = ref(T3000_Data.value.currentPanelData);

    // Remove when deploy
    if (process.env.DEV) {
      T3000_Data.value.currentPanelData = deviceData.filter(item => item.type === "VARIABLE");
      selectPanelOptions.value = T3000_Data.value.currentPanelData;
    }

    function selectPanelFilterFn(val, update) {
      if (val === "") {
        update(() => {
          selectPanelOptions.value = T3000_Data.value.currentPanelData;

          // here you have access to "ref" which
          // is the Vue reference of the QSelect
        });
        return;
      }

      update(() => {
        const keyword = val.toUpperCase();
        selectPanelOptions.value = T3000_Data.value.currentPanelData.filter(
          (item) =>
            item.command.indexOf(keyword) > -1 ||
            item.description.indexOf(keyword) > -1 ||
            item.label.indexOf(keyword) > -1
        );
      });
    }

    function addItemSave() {
      const addItemData = cloneDeep(addItemDialog.value)
      appState.value.items.push({
        id: appState.value.itemsCount,
        type: addItemData.type,
        unit: addItemData.unit,
        min: addItemData.min,
        max: addItemData.max,
        t3Entry: addItemData.data,
      });
      addItemDialog.value = cloneDeep(emptyItemDialog);
      appState.value.itemsCount++;
    }

    function addItemDialogAction() {
      addItemDialog.value = cloneDeep(emptyItemDialog)
      addItemDialog.value.active = true
    }

    function getRangeById(id) {
      return ranges.find((i) => i.id === id);
    }

    return {
      appState,
      selectPanelOptions,
      addItemDialog,
      addItemDialogAction,
      selectPanelFilterFn,
      addItemSave,
      itemTypes,
      itemUnits,
      gaugeDefault,
      getRangeById
    };
  },
});
</script>

<style scoped>
.item {
  min-height: 300px;
  padding: 0 15px;
}

.item.gauge {
  width: 300px;
  height: 300px;
}

.item.dial {
  width: 140px;
}

.gauge-inner-text {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #2199de;
  font-weight: 700;
}

.gauge-inner-text>div {
  margin-top: 25px;
  line-height: 1em;
  text-align: center;
}

.add-new-item {
  width: 300px;
  height: 300px;
}
</style>
