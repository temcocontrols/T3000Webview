<template>
  <q-page>
    <div class="flex flex-row justify-center gap-4 pt-4 px-8">
      <div v-for="item in appState.items"
        class="item flex flex-col flex-nowrap items-center bg-slate-100 cursor-pointer" :key="item.id"
        :class="{ gauge: item.type === 'gauge', dial: item.type === 'dial' }">
        <div class="w-full p-2 bg-gray-200 text-center">{{ item.t3Entry.description }}</div>
        <gauge-chart v-if="item.type === 'gauge'" class="customizable-gauge mt-4" :title="item.label" :unit="item.unit"
          :min="item.min" :max="item.max" :colors="item.colors" :value="item.t3Entry.value / 1000">

        </gauge-chart>
        <div v-else-if="item.type === 'dial'" class="grow mt-2">
          <dial-chart svgStyle="overflow: visible;" :serial="'dial' + item.id" :id="'dial' + item.id" type="gauge"
            variation="linear" :value="(item.t3Entry.value / 1000)" :units="item.unit" :min="item.min" :max="item.max"
            precision="2" animation="500" svgwidth="250" svgheight="200" textColor="#333" valueColor="#777"
            valueBg="transparent" valueBorder="0px solid #fac83c" controlColor="#888" controlBg="none"
            orientation="vertical" size="md" scale="1" smallscale="1" ticks="5" needle="0" bar-color="#111"
            progressColor="#4ea5f1" scaleColor="#aaa" scaleTextColor="#333" needleColor="#ff8800" needleStroke="#000"
            :zones="item.colors"></dial-chart>
        </div>
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
        <q-select option-label="description" option-value="id" filled use-input hide-selected fill-input
          input-debounce="0" v-model="addItemDialog.data" :options="selectPanelOptions" @filter="selectPanelFilterFn"
          label="Select Entry" class="mb-6" />
        <q-select emit-value filled map-options v-model="addItemDialog.type" :options="itemTypes" label="Chart Type"
          class="mb-6" />
        <q-select filled v-model="addItemDialog.unit" :options="itemUnits" label="Unit" class="mb-6" />
        <div class="flex no-wrap gap-3 mb-6">
          <q-input label="Min" v-model.number="addItemDialog.min" filled type="number" class="grow" />
          <q-input label="Max" v-model.number="addItemDialog.max" filled type="number" class="grow" />
        </div>
        <div class="flex flex-col no-wrap">
          <div class="flex no-wrap mb-2">
            <h2 class="leading-5 font-bold grow">Colors: </h2>
            <q-btn size="sm" round color="grey-4" text-color="grey-9" icon="add"
              @click="() => addItemDialog.colors.push({ offset: 1, color: '#000000' })" />
          </div>

          <div class="flex flex-col no-wrap gap-1">
            <div class="flex items-center no-wrap mb-2" v-for="(cItem, index) in addItemDialog.colors"
              :key="cItem.color">
              <q-input label="Offset" v-model.number="cItem.offset" filled type="number" step="0.1" min="0" max="1"
                class="mr-2 w-24" />
              <q-input filled v-model="cItem.color" label="Color" class="grow">
                <template v-slot:append>
                  <q-icon name="colorize" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-color v-model="
                        cItem.color
                      " />
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
              <div class="px-8"><q-btn size="xs" round color="red-10" icon="remove"
                  @click="() => addItemDialog.colors.splice(index, 1)" /></div>

            </div>
          </div>
        </div>
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
import GaugeChart from '../components/EchartsGauge.vue'
import DialChart from '../components/Dial.vue'
import { ranges } from "../lib/common";

// Remove when deploy
const demoDeviceData = () => {
  if (process.env.DEV) {
    return import("../lib/demo-data").then(exps => {
      return exps.default
    })
  }
  return undefined
};


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
    const emptyItemDialog = {
      active: false, type: "gauge", unit: "%", min: 0, max: 100,
      colors: [
        { offset: 0.3, color: '#14BE64' },
        { offset: 0.7, color: '#FFB100' },
        { offset: 1, color: '#fd666d' },
      ]
    }
    const addItemDialog = ref(emptyItemDialog);
    const T3000_Data = ref({ panelsData: [], panelsList: [], });
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
      "%RH",
      "Volts",
      "KV",
      "Amps",
      "ma",
      "Watts",
      "KWatts",
      "KWH",
      "°C",
      "°F",
      "FPM",
      "Pascals",
      "KPascals",
      "lbs/sqr.inch",
      "Inches ofWC",
      "CFM",
      "Seconds",
      "Minutes",
      "Hours",
      "Days",
      "Time",
      "p/min",
      "Ohms",
      "Counts",
      "%Open",
      "Kg",
      "L/Hour",
      "GPH",
      "GAL",
      "CF",
      "BTU",
      "CMH",
    ];

    const emptyProject = {
      items: [],
      itemsCount: 0,
    };
    const appState = ref(cloneDeep(emptyProject));

    onMounted(() => {
      window.chrome?.webview?.postMessage({
        action: 6, // GET_DASHBOARD_INITIAL_DATA
      });
      /*  window.chrome?.webview?.postMessage({
         action: 4, // GET_PANELS_LIST
       }); */
      if (window.chrome?.webview?.postMessage) {
        setInterval(window.chrome.webview.postMessage, 5000, {
          action: 4, // GET_PANELS_LIST
        });
      }

    });

    window.chrome?.webview?.addEventListener("message", (arg) => {
      console.log("Recieved webview message", arg.data);
      if ("action" in arg.data) {
        if (arg.data.action === "GET_PANELS_LIST_RES") {
          if (arg.data.data) {
            T3000_Data.value.panelsList = arg.data.data
            T3000_Data.value.panelsList.forEach(panel => {
              window.chrome?.webview?.postMessage({
                action: 0, // GET_PANEL_DATA
                panelId: panel.pid,
              });
            });
          }

        }
        else if (arg.data.action === "UPDATE_ENTRY_RES") {
        } else if (arg.data.action === "GET_DASHBOARD_INITIAL_DATA_RES") {
          if (arg.data.data) {
            arg.data.data = JSON.parse(arg.data.data);
          }
          appState.value = arg.data.data;
        } else if (arg.data.action === "GET_PANEL_DATA_RES") {
          T3000_Data.value.panelsData = arg.data.data.filter(item => ["VARIABLE", "INPUT", "OUTPUT"].includes(item.type));
          selectPanelOptions.value = T3000_Data.value.panelsData;
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

    const selectPanelOptions = ref(T3000_Data.value.panelsData);

    // Remove when deploy
    if (process.env.DEV) {
      demoDeviceData().then(data => { T3000_Data.value.panelsData = data.filter(item => ["VARIABLE", "INPUT", "OUTPUT"].includes(item.type)) });
      selectPanelOptions.value = T3000_Data.value.panelsData;
    }

    function selectPanelFilterFn(val, update) {
      if (val === "") {
        update(() => {
          selectPanelOptions.value = T3000_Data.value.panelsData;

          // here you have access to "ref" which
          // is the Vue reference of the QSelect
        });
        return;
      }

      update(() => {
        const keyword = val.toUpperCase();
        selectPanelOptions.value = T3000_Data.value.panelsData.filter(
          (item) =>
            item.command.toUpperCase().indexOf(keyword) > -1 ||
            item.description.toUpperCase().indexOf(keyword) > -1 ||
            item.label.toUpperCase().indexOf(keyword) > -1
        );
      });
    }

    function addItemSave() {
      const addItemData = cloneDeep(addItemDialog.value)
      const colors = addItemData.type === "gauge" ?
        addItemData.colors.map(item => [item.offset, item.color]) :
        addItemData.colors.map(item => item.color).reverse().toString()
      appState.value.items.push({
        id: appState.value.itemsCount,
        type: addItemData.type,
        unit: addItemData.unit,
        min: addItemData.min,
        max: addItemData.max,
        colors,
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
      getRangeById
    };
  },
});
</script>

<style scoped>
.item {
  min-height: 340px;
}

.item.gauge {
  width: 300px;
  height: 340px;
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
  height: 340px;
}
</style>
