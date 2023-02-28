<template>
  <q-page>
    <div class="flex flex-row justify-center gap-4 pt-4 px-8">
      <div v-for="item in appState.items" class="item flex flex-col flex-nowrap items-center bg-slate-100 cursor-pointer"
        :key="item.id" :class="{ gauge: item.type === 'Gauge', dial: item.type === 'Dial' }">
        <div class="relative w-full p-2 bg-gray-200 text-center"><span>{{ item.t3Entry.description }}</span>
          <q-btn color="primary" flat round icon="more_vert" size="sm" class="absolute right-1 top-1">
            <q-menu>
              <q-list>
                <q-item clickable v-close-popup @click="editItemAction(item)">
                  <q-item-section>
                    <q-item-label>Edit</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item clickable v-close-popup @click="deleteItemAction(item)">
                  <q-item-section>
                    <q-item-label class="text-red">Delete</q-item-label>
                  </q-item-section>
                </q-item>

              </q-list>
            </q-menu>
          </q-btn>
        </div>
        <gauge-chart v-if="item.type === 'Gauge'" class="customizable-gauge mt-4" :title="item.label" :unit="item.unit"
          :min="item.min" :max="item.max" :colors="item.processedColors" :value="item.t3Entry.value / 1000">

        </gauge-chart>
        <div v-else-if="item.type === 'Dial'" class="grow mt-2">
          <dial-chart svgStyle="overflow: visible;" :serial="'dial' + item.id" :id="'dial' + item.id" type="gauge"
            variation="linear" :value="(item.t3Entry.value / 1000)" :units="item.unit" :min="item.min" :max="item.max"
            precision="2" animation="500" svgwidth="250" svgheight="200" textColor="#333" valueColor="#777"
            valueBg="transparent" valueBorder="0px solid #fac83c" controlColor="#888" controlBg="none"
            orientation="vertical" size="md" scale="1" smallscale="1" ticks="5" needle="0" bar-color="#111"
            progressColor="#4ea5f1" scaleColor="#aaa" scaleTextColor="#333" needleColor="#ff8800" needleStroke="#000"
            :zones="item.processedColors"></dial-chart>
        </div>
      </div>
      <div class="add-new-item flex items-center justify-center bg-slate-100 cursor-pointer" @click="addItemAction">
        <q-icon name="add" class="text-4xl" />
      </div>
    </div>
  </q-page>
  <!-- Add item dialog -->
  <AddEditDashboardItem action="Add" v-model:active="addItemDialog" :panels-data="T3000_Data.panelsData"
    @item-saved="addItemSave" />
  <!-- Edit item dialog -->
  <AddEditDashboardItem action="Edit" v-model:active="editItemDialog.active" :item="editItemDialog.data"
    :panels-data="T3000_Data.panelsData" @item-saved="editItemSave" />
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { useQuasar, useMeta } from "quasar";
import { cloneDeep } from "lodash";
import GaugeChart from '../components/EchartsGauge.vue'
import DialChart from '../components/Dial.vue'
import AddEditDashboardItem from '../components/AddEditGaugeDialog.vue'
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
    DialChart,
    AddEditDashboardItem
  },
  setup() {
    const metaData = {
      title: "T3000 Dashbaord",
    };
    useMeta(metaData);
    const $q = useQuasar();
    const addItemDialog = ref(false)
    const editItemDialog = ref({ active: false, data: {} })
    const T3000_Data = ref({ panelsData: [], panelsList: [], });

    const emptyProject = {
      items: [],
      itemsCount: 0,
    };
    const appState = ref(cloneDeep(emptyProject));

    onMounted(() => {
      window.chrome?.webview?.postMessage({
        action: 6, // GET_DASHBOARD_INITIAL_DATA
      });
      window.chrome?.webview?.postMessage({
        action: 4, // GET_PANELS_LIST
      });
      if (window.chrome?.webview?.postMessage) {
        setInterval(window.chrome.webview.postMessage, 10000, {
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
          T3000_Data.value.panelsData = T3000_Data.value.panelsData.filter(item => item.pid !== arg.data.panel_id)
          T3000_Data.value.panelsData = T3000_Data.value.panelsData.concat(arg.data.data.filter(item => ["VARIABLE", "INPUT", "OUTPUT"].includes(item.type)));
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


    // Remove when deploy
    if (process.env.DEV) {
      demoDeviceData().then(data => { T3000_Data.value.panelsData = data.filter(item => ["VARIABLE", "INPUT", "OUTPUT"].includes(item.type)) });
    }

    function addItemAction() {
      if (T3000_Data.value.panelsData.length) {
        addItemDialog.value = true;
      } else {
        $q.dialog({
          title: 'Warning',
          message: 'At the moment, no panel data has been loaded. This could be due to either a lack of available online panels or the data is currently being loaded, in which case you may need to wait a little longer.'
        }).onOk(() => {
          // console.log('OK')
        }).onCancel(() => {
          // console.log('Cancel')
        }).onDismiss(() => {
          // console.log('I am triggered on both OK and Cancel')
        })
      }

    }

    function editItemAction(item) {
      editItemDialog.value.active = true
      editItemDialog.value.data = item
    }

    function deleteItemAction(item) {
      $q.dialog({
        title: 'Delete Item Warning',
        cancel: true,
        persistent: true,
        ok: {
          label: "Delete",
          textColor: "red",
          flat: true
        },
        message: 'Are you sure you want to delete this item?'
      }).onOk(() => {
        const itemIndex = appState.value.items.findIndex(i => i.id === item.id)
        appState.value.items.splice(itemIndex, 1);
      }).onCancel(() => {
        // console.log('Cancel')
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    }

    function addItemSave(item) {
      item.id = appState.value.itemsCount;
      appState.value.items.push(item);
      addItemDialog.value = false;
      appState.value.itemsCount++;
    }

    function editItemSave(item) {
      const itemIndex = appState.value.items.findIndex(i => i.id === item.id)
      appState.value.items[itemIndex] = item;
      editItemDialog.value.active = false;
      editItemDialog.value.data = {}
    }

    function getRangeById(id) {
      return ranges.find((i) => i.id === id);
    }

    return {
      appState,
      T3000_Data,
      addItemDialog,
      editItemDialog,
      addItemAction,
      editItemAction,
      deleteItemAction,
      addItemSave,
      editItemSave,
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
