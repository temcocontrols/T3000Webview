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
  <div class="dvcontainer">
    <div class="q-pa-sm row" v-if="glMsg.isShow">
      <q-banner inline-actions class="text-white bg-purple" style="width: 100%;">
        {{ glMsg.message }}
        <template v-slot:action>
          <q-btn flat caption color="white" label="Reload data" @click="reloadPanelsData" />
        </template>
      </q-banner>
    </div>
    <div class="q-pa-sm row ">
      <q-list bordered class="rounded-borders col-12" style="height: 50px;">
        <q-item>
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
            <q-link class="text-primary" style="font-size: 12px;margin-top: 2px;cursor: pointer;"
              @click="saveCurrentSelection">Confirm
              <q-tooltip anchor="top middle" self="center left">
                Confirm the current selection
              </q-tooltip>
            </q-link>
          </q-item-section>
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
          v-model:ticked="ticked" v-model:expanded="expanded" :filter="filter" :filter-method="myFilterMethod" :accordion=true
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

<script setup lang="ts">
import { ref, onMounted, watch, defineProps, defineEmits } from "vue";
import { useQuasar } from "quasar";
import { T3Data, globalMsg } from "src/lib/T3000/Hvac/Data/T3Data";
import MockData from "src/lib/T3000/Hvac/Data/MockData";
import Hvac from "src/lib/T3000/Hvac/Hvac";
import MessageType from "src/lib/T3000/Hvac/Opt/Socket/MessageType";
import GlobalMsgModel from "src/lib/T3000/Hvac/Model/GlobalMsgModel";
import AntdUtil from "src/lib/T3000/Hvac/Opt/UI/AntdUtil";
import LogUtil from "src/lib/T3000/Hvac/Util/LogUtil";

interface TreeNode {
  id: number;
  name: string;
  children?: TreeNode[];
}

interface ListItem {
  id: number;
  name: string;
}

interface DeviceModel {
  device: string;
  deviceId: number;
  serialNumber: number;
  graphic: number;
  graphicFull: {
    id: number;
    fullLabel: string;
    label: string;
    elementCount: string;
  };
}

const props = defineProps({
  deviceModel: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['updateDeviceModel', 'testSendMsg']);

const $q = useQuasar();

// Tree and list data
const treeData = ref<TreeNode[]>([
  { id: 1, name: 'Node 1', children: [{ id: 2, name: 'Child 1' }, { id: 3, name: 'Child 2' }] },
  { id: 4, name: 'Node 2', children: [{ id: 5, name: 'Child 3' }] }
]);

const listData = ref<ListItem[]>([
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
  { id: 3, name: 'Item 3' }
]);

const filter = ref('');
const filterRef = ref<HTMLElement | null>(null);
const selected = ref('');
const ticked = ref<string[]>(['']);
const expanded = ref<string[]>(["All Devices"]);

const noNodesLabel = "No devices available";
const dvList = T3Data.deviceList;
const graphicList = T3Data.graphicList;
const currentDevice = ref<DeviceModel>({
  device: "",
  deviceId: -1,
  serialNumber: -1,
  graphic: -1,
  graphicFull: {
    id: -1,
    fullLabel: '',
    label: '',
    elementCount: ''
  }
});

const myFilterMethod = (node: any, filter: string) => {
  if (!filter) return true;
  const filt = filter.toLowerCase();
  const nodeLabel = node.label;
  if (!nodeLabel || typeof nodeLabel !== 'string') return false;
  return nodeLabel.toLowerCase().indexOf(filt) > -1;
}

const resetFilter = () => {
  filter.value = ''
  filterRef.value?.focus()
}

const clearGraphicSelection = () => {
  currentDevice.value.graphic = -1;
  currentDevice.value.graphicFull = { id: -1, fullLabel: '', label: '', elementCount: '' };
  LogUtil.Debug('= Dvi graphic-clear 1 currentDevice:', [currentDevice.value.device, currentDevice.value.graphic]);
}

// graphic panel change event
const updateGraphicSelection = (val: number | null) => {
  const graphicId = val != null ? Number(val) : -1;
  currentDevice.value.graphic = graphicId;

  const found = graphicList.value.find(element => element.id === val);
  if (found) {
    currentDevice.value.graphicFull.id = found.id;
    currentDevice.value.graphicFull.fullLabel = found.fullLabel;
    currentDevice.value.graphicFull.label = found.label;
    currentDevice.value.graphicFull.elementCount = found.elementCount;
  }

  LogUtil.Debug('= Dvi graphic-selected 1 val:', val);
  LogUtil.Debug('= Dvi graphic-selected 2 currentDevice:', [currentDevice.value.device, currentDevice.value.graphic]);

  const deviceId = currentDevice.value.deviceId;

  // load user drawing data from T3, only when user selects a device
  if (deviceId === -1) return;
  // Hvac.WsClient.GetInitialData(deviceId, graphicId, false);
}

// device tree selection event
const treeSelected = (target: string | null) => {
  LogUtil.Debug('= Dvi tree-selected 1 target:', target)

  // Clear the icon for all nodes
  const clearIcons = (nodes: any[]) => {
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

  const findAllNodes = (nodes: any[], target: string): any => {
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

  if (target !== null) {
    const selectedNode = findAllNodes(dvList.value, target);
    if (selectedNode) {
      selectedNode.icon = 'check';
      currentDevice.value.device = selectedNode.label;

      const dviPl = getPlFromDvList(selectedNode.label);
      currentDevice.value.deviceId = dviPl?.panel_number ?? -1;
      currentDevice.value.serialNumber = dviPl?.serial_number ?? -1;
    }
  } else {
    currentDevice.value.device = '';
    currentDevice.value.deviceId = -1;
    currentDevice.value.serialNumber = -1;
  }

  clearGraphicSelection();

  LogUtil.Debug('= Dvi graphic-selected 2 currentDevice:', [currentDevice.value.device, currentDevice.value.graphic]);

  // load real data from T3000
  if (currentDevice.value.device !== '') {
    const deviceId = currentDevice.value.deviceId;
    const graphicId = currentDevice.value.graphic;

    Hvac.WsClient.GetPanelData(deviceId);

    // load user drawing data from T3, only when user selects a graphic
    if (graphicId <= 0) return;
    Hvac.WsClient.GetInitialData(deviceId, graphicId, false);
  }
}

const getPlFromDvList = (label: string) => {
  const findNode = (nodes: any[], label: string): any => {
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
  LogUtil.Debug('= Dvi saveCurrentSelection 1 currentDevice:', [currentDevice.value.device, currentDevice.value.graphic]);

  if (currentDevice.value.device === '' || currentDevice.value.graphic === -1) {
    $q.notify({
      type: "negative",
      message: "Please select a device and a graphic",
    });
    return;
  }
  else {
    try {
      // clear the reload initial data flag when user selects a new graphic
      Hvac.WsClient.clearInitialDataInterval();

      Hvac.DeviceOpt.saveCurrentDevice(currentDevice.value);
      Hvac.DeviceOpt.addPresetsData();
      Hvac.WsClient.GetInitialData(currentDevice.value.deviceId, currentDevice.value.graphic, true);

      emit('updateDeviceModel', false, currentDevice.value);
    }
    catch (error) {
      $q.notify({
        type: "negative",
        message: "= Dev test " + error,
      });
      return;
    }
  }
}

const testSendMsg = (action: any) => {
  emit('testSendMsg', action);
}

const reloadPanelsData = () => {
  Hvac.WsClient.GetPanelsList();
}

const glMsg = ref<GlobalMsgModel>(globalMsg?.value?.find(msg => msg.msgType === "get_panel_list_data") ?? {} as GlobalMsgModel);

onMounted(() => {
  //load the saved current device from local storage
  const savedDevice = Hvac.DeviceOpt.getCurrentDevice();
  if (savedDevice !== null) {
    currentDevice.value = savedDevice;
    Hvac.DeviceOpt.setDeviceAndGraphicDefaultData(savedDevice);
    selected.value = savedDevice.device;
  }

  const hasNoData = dvList.value.length === 0 || graphicList.value.length === 0;
  if (hasNoData) {
    const errorMsg = 'Can not load the device data. Please check whether the T3000 is running or not.';
    Hvac.QuasarUtil.setGlobalMsg('error', errorMsg, true, "get_panel_list_data", null);
    LogUtil.Debug('= Dvi onMounted 3 dvList:', dvList);
  }
  else {
    Hvac.QuasarUtil.clearGlobalMsg("get_panel_list_data");
  }
});

watch(globalMsg, (newVal) => {
  glMsg.value = newVal?.find(msg => msg.msgType === "get_panel_list_data") ?? {} as GlobalMsgModel;
}, { deep: true });

watch([dvList, graphicList], ([newDvList, newGraphicList]) => {
  if (newDvList.length > 0 && newGraphicList.length > 0) {
    Hvac.QuasarUtil.clearGlobalMsg("get_panel_list_data");
  }
}, { deep: true });
</script>
