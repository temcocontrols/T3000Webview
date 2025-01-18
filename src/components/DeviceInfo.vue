<style scoped>
.dvcontainer {
  max-width: 99%;
}

.graphic-label {
  margin-top: 11px;
}

:deep(.q-input .q-field__control) {
  border-radius: 0;
  /* background-color: #cef; */
  height: 35px;
}

:deep(.q-input .q-field__marginal) {
  border-radius: 0;
  /* background-color: #cef; */
  height: 35px;
}

.select-title {
  font-size: 10px;
}

.select-text {
  font-size: 12px;
}

.header-title {
  color: #a6a0a0;
}
</style>

<template>

  <div class=".dvcontainer">
    <div class="q-pa-sm row ">

      <q-list bordered class="rounded-borders col-12" style="height: 50px;">
        <!-- <q-item-label header>Current selection</q-item-label> -->

        <q-item>
          <!-- <q-item-section avatar top>
            <q-icon name="check" color="black" size="34px" />
          </q-item-section> -->

          <q-item-section top class="col-1">
            <q-item-label class="q-mt-sm text-weight-medium" style="font-size: 13px;">Current:</q-item-label>
          </q-item-section>

          <q-item-section top class="col-3">
            <q-item-label class="q-mt-sm">{{ currentDevice.device }}</q-item-label>
          </q-item-section>

          <q-item-section top class="col-1">
            <q-item-label caption class="select-title">
              Graphic
            </q-item-label>
            <q-item-label>
              <span class="text-weight-medium select-text">{{
                currentDevice.graphicFull.id === -1 ? "" : currentDevice.graphicFull.id }}</span>
            </q-item-label>
          </q-item-section>

          <q-item-section top class="col-3">
            <q-item-label caption class="select-title">
              Full label
            </q-item-label>
            <q-item-label>
              <span class="text-weight-medium select-text">{{ currentDevice.graphicFull.fullLabel }}</span>
            </q-item-label>
          </q-item-section>

          <q-item-section top>
            <q-item-label caption class="select-title">
              Label
            </q-item-label>
            <q-item-label>
              <span class="text-weight-medium select-text">{{ currentDevice.graphicFull.label }}</span>
            </q-item-label>
          </q-item-section>

          <q-item-section top>
            <q-item-label caption class="select-title">
              Element Count
            </q-item-label>
            <q-item-label>
              <span class="text-weight-medium select-text">{{ currentDevice.graphicFull.elementCount }}</span>
            </q-item-label>
          </q-item-section>

          <q-item-section avatar top>
            <q-item-label caption class="select-title">
              Action
            </q-item-label>
            <!-- <q-icon name="check" color="black" /> -->
            <!-- <q-btn color="secondary" outline icon-right="check" label="Save" size="xs" /> -->
            <q-link class="text-primary" style="font-size: 12px;margin-top: 2px;cursor: pointer;"
              @click="saveCurrentSelection">Save
              <q-tooltip anchor="top middle" self="center left">
                Save the current selection
              </q-tooltip>
            </q-link>
          </q-item-section>

          <!-- <q-item-section top side>
            <div class="text-grey-8 q-gutter-xs">
              <q-btn class="gt-xs" size="12px" flat dense round icon="delete" />
              <q-btn class="gt-xs" size="12px" flat dense round icon="done" />
              <q-btn size="12px" flat dense round icon="more_vert" />
            </div>
          </q-item-section> -->
        </q-item>
      </q-list>
    </div>

    <div class="q-pa-sm row" style="margin-top: -8px;">

      <div class="col-12 col-sm-4">
        <q-input ref="filterRef" filled v-model="filter" placeholder="Search here">
          <template v-slot:append>
            <q-icon v-if="filter !== ''" name="clear" class="cursor-pointer" @click="resetFilter" />
            <q-icon v-if="filter === ''" name="search" />
          </template>
        </q-input>

        <q-separator color="grey" style="margin-top: 2px;margin-bottom: 2px;" />

        <q-tree :nodes="dvList" :noNodesLabel="noNodesLabel" node-key="label" v-model:selected="selected"
          v-model:ticked="ticked" v-model:expanded="expanded" :filter="filter" :accordion=true
          style="max-height: 326px;overflow-y: auto;" selected-color="primary" @update:selected="treeSelected" />

      </div>

      <div class="col-12 col-sm-8" style="padding-left: 5px;">
        <q-list style="background: #f0f0f0;font-weight: 600;font-size: 13px;">
          <q-item style="padding: 0; min-height: 35px;">
            <q-item-section top class="col-1">
              <q-item-label style="margin-left: 5px;margin-top: 2px;">
                <q-btn class="gt-xs" size="12px" flat dense round icon="remove" @click="clearGraphicSelection">
                  <q-tooltip anchor="top middle" self="center right">
                    Clear selection
                  </q-tooltip>
                </q-btn>
              </q-item-label>
            </q-item-section>
            <q-item-section top class="col-1">
              <q-item-label class="q-mt-sm header-title">Graphic</q-item-label>
            </q-item-section>
            <q-item-section top class="col-4">
              <q-item-label class="q-mt-sm header-title">Full Label</q-item-label>
            </q-item-section>
            <q-item-section top class="col-3">
              <q-item-label class="q-mt-sm header-title">Label</q-item-label>
            </q-item-section>
            <q-item-section top class="col-2">
              <q-item-label class="q-mt-sm header-title">Element Count</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <q-separator color="grey" style="margin-top: 2px;margin-bottom: 2px;" />

        <q-list v-for="graphic in graphicList" :key="graphic.id">
          <q-item tag="label" style="padding:0px;min-height: 35px;border-bottom: 1px solid #f0f0f0;font-size: 13px;">
            <q-item-section top class="col-1">
              <q-radio v-model="currentDevice.graphic" :val=graphic.id color="blue" checked-icon="task_alt"
                unchecked-icon="panorama_fish_eye" @update:model-value="updateGraphicSelection" />
            </q-item-section>
            <q-item-section top class="col-1">
              <q-item-label class="graphic-label">{{ graphic.id }}</q-item-label>
            </q-item-section>
            <q-item-section top class="col-4">
              <q-item-label class="graphic-label">{{ graphic.fullLabel }}</q-item-label>
            </q-item-section>
            <q-item-section top class="col-3">
              <q-item-label class="graphic-label">{{ graphic.label }}</q-item-label>
            </q-item-section>
            <q-item-section top class="col-2">
              <q-item-label class="graphic-label">{{ graphic.elementCount }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import { defineComponent, ref, onMounted, watch, reactive, toRefs } from 'vue'
import MockData from 'src/lib/T3000/Hvac/Data/MockData'
import Hvac from 'src/lib/T3000/Hvac/Hvac'
import { useQuasar, useMeta } from "quasar"
import T3Data from '../lib/T3000/Hvac/Data/T3Data'

export default defineComponent({
  name: 'NewTopBar',

  props: {
    // locked: {
    //   type: Boolean,
    //   default: false
    // },
    // grpNav: {
    //   type: Array,
    //   default: () => []
    // }
    deviceModel: {
      type: Object,
    }
  },

  emits: ['updateDeviceModel', 'testSendMsg'],

  data() {
    return {
      treeData: [
        { id: 1, name: 'Node 1', children: [{ id: 2, name: 'Child 1' }, { id: 3, name: 'Child 2' }] },
        { id: 4, name: 'Node 2', children: [{ id: 5, name: 'Child 3' }] }
      ],
      listData: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ]
    };
  },

  setup(props, { emit }) {
    const $q = useQuasar();
    const filter = ref('');
    const filterRef = ref(null);
    const selected = ref('');
    const ticked = ref(['']);
    const expanded = ref(["All Devices"]);

    const noNodesLabel = "No nodes available";

    // const x1 = ref();
    // console.log('= Dvi x1', x1);

    // watch(() => Hvac.DeviceOpt.x1, (newVal, oldVal) => {
    //   console.log('= Dvi x1 changed:', newVal);
    //   x1.value = newVal;
    // }, { deep: true });

    // const simple = MockData.DeviceList;
    const dvList = T3Data.deviceList;// Hvac.DeviceOpt.deviceList;
    // console.log('= Dvi real device data', dvList);

    // watch(() => Hvac.DeviceOpt.deviceList, (newVal) => {
    //   console.log('= Dvi device list changed:', newVal);
    //   dvList.value = newVal;
    // }, { deep: true });

    // const graphicList = MockData.GraphicList;
    const graphicList = T3Data.graphicList;
    // console.log('= Dvi real graphic data', graphicList);

    const currentDevice = ref({ device: "", deviceId: -1, serialNumber: -1, graphic: -1, graphicFull: { id: -1, fullLabel: '', label: '', elementCount: '' } });

    const myFilterMethod = (node, filter) => {
      const filt = filter.toLowerCase()
      return node.label && node.label.toLowerCase().indexOf(filt) > -1 && node.label.toLowerCase().indexOf('(*)') > -1
    }

    const resetFilter = () => {
      filter.value = ''
      filterRef.value.focus()
    }

    const clearGraphicSelection = () => {
      currentDevice.value.graphic = -1;
      currentDevice.value.graphicFull = { id: -1, fullLabel: '', label: '', elementCount: '' };
      console.log('= Dvi graphic-clear 1 currentDevice:', [currentDevice.value.device, currentDevice.value.graphic]);
    }

    // graphic panel change event
    const updateGraphicSelection = (val) => {
      const graphicId = val != null ? Number(val) : -1;
      currentDevice.value.graphic = graphicId;

      const found = graphicList.value.find(element => element.id === val);
      if (found) {
        currentDevice.value.graphicFull.id = found.id;
        currentDevice.value.graphicFull.fullLabel = found.fullLabel;
        currentDevice.value.graphicFull.label = found.label;
        currentDevice.value.graphicFull.elementCount = found.elementCount;
      }

      console.log('= Dvi graphic-selected 1 val:', val);
      console.log('= Dvi graphic-selected 2 currentDevice:', [currentDevice.value.device, currentDevice.value.graphic]);

      const deviceId = currentDevice.value.deviceId;
      Hvac.WsClient.GetInitialData(deviceId, graphicId, false);
    }

    // device tree selection event
    const treeSelected = (target) => {
      console.log('= Dvi tree-selected 1 target:', target)

      // Clear the icon for all nodes
      const clearIcons = (nodes) => {
        nodes.forEach(node => {
          if (node.label === 'All Devices') {
            node.icon = 'devices';
          } else {
            if (node.icon === undefined || node.icon === null) {
            } else {
              node.icon = 'horizontal_rule';
            }
          }
          if (node.children) {
            clearIcons(node.children);
          }
        });
      };

      const findAllNodes = (nodes, target) => {
        for (const node of nodes) {
          if (node.label === target) {
            return node;
          }
          if (node.children) {
            const found = findAllNodes(node.children, target);
            if (found) {
              return found;
            }
          }
        }
        return null;
      };

      clearIcons(dvList.value);

      const selectedNode = findAllNodes(dvList.value, target);
      if (selectedNode) {
        selectedNode.icon = 'check';
        currentDevice.value.device = selectedNode.label;

        const dviPl = getPlFromDvList(selectedNode.label);
        currentDevice.value.deviceId = dviPl?.panel_number ?? -1;
        currentDevice.value.serialNumber = dviPl?.serial_number ?? -1;
      }
      else {
        if (target === null) {
          currentDevice.value.device = '';
          currentDevice.value.deviceId = -1;
          currentDevice.value.serialNumber = -1;
        }
      }

      clearGraphicSelection();

      console.log('= Dvi graphic-selected 2 currentDevice:', [currentDevice.value.device, currentDevice.value.graphic]);

      // load hardware data from T3000
      // Hvac.DeviceOpt.loadGraphicPanelData(currentDevice.value);

      // update the graphic panel's elements count
      // Hvac.DeviceOpt.refreshGraphicPanelElementCount(currentDevice.value);

      // load real data from T3000
      if (currentDevice.value.device !== '') {
        const deviceId = currentDevice.value.deviceId;
        const graphicId = currentDevice.value.graphic;

        Hvac.WsClient.GetPanelData(deviceId);

        // user drawing data
        Hvac.WsClient.GetInitialData(deviceId, graphicId, false);
      }
    }

    const getPlFromDvList = (label) => {
      const findNode = (nodes, label) => {
        for (const node of nodes) {
          if (node.label === label) {
            return node?.pl;
          }
          if (node.children) {
            const found = findNode(node.children, label);
            if (found) {
              return found;
            }
          }
        }
        return null;
      };

      return findNode(dvList.value, label);
    };

    const saveCurrentSelection = () => {
      console.log('= Dvi saveCurrentSelection 1 currentDevice:', [currentDevice.value.device, currentDevice.value.graphic]);

      if (currentDevice.value.device === '' || currentDevice.value.graphic === -1) {
        $q.notify({
          type: "negative",
          message: "Please select a device and a graphic",
        });
        return;
      }
      else {
        Hvac.DeviceOpt.saveCurrentDevice(currentDevice.value);

        Hvac.WsClient.GetInitialData(currentDevice.value.deviceId, currentDevice.value.graphic, true);

        // sync t3 appState data to ls [deviceAppState]
        // Hvac.DeviceOpt.syncTempAppStateToDeviceAppState();

        emit('updateDeviceModel', false, currentDevice.value);
      }
    }

    const testSendMsg = (action) => {
      emit('testSendMsg', action);
    }

    onMounted(() => {
      console.log('= Dvi onMounted 1 deviceModel,selected', props.deviceModel);

      //load the saved current device from local storage
      const savedDevice = Hvac.DeviceOpt.getCurrentDevice();
      if (savedDevice !== null) {
        currentDevice.value = savedDevice;
        Hvac.DeviceOpt.setDeviceAndGraphicDefaultData(savedDevice);
        selected.value = savedDevice.device;

        // console.log('= Dvi onMounted 1 mockData:', MockData.DeviceList);
        console.log('= Dvi onMounted 2 dvList:', dvList);
      }
    });

    return {
      filter,
      filterRef,
      selected,
      ticked,
      expanded,
      dvList,
      myFilterMethod,
      resetFilter,
      graphicList,
      currentDevice,
      clearGraphicSelection,
      treeSelected,
      updateGraphicSelection,
      saveCurrentSelection,
      testSendMsg,
      noNodesLabel
    }
  }
});

</script>
