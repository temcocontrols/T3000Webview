<style scoped>
.full-area {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.main-area {
  display: flex;
  flex: 1;
}

.side-bar {
  /* background-color: #f4f4f4; */
  width: 106px;
}

.work-area {
  top: 0px;
  bottom: 0px;
  left: 0px;
  right: 0px;
  width: auto;
  flex: 1;
  margin-top: 1px;
  position: relative;
}

.document-area {
  position: relative;
  /* background-color: #ebeced; */
  height: 100%;
  width: calc(100vw - v-bind("documentAreaPosition.widthOffset"));
  height: calc(100vh - v-bind("documentAreaPosition.heightOffset"));
}

.c-ruler {
  width: 20px;
  height: 20px;
  /* background-color: #ebeced; */
  position: absolute;
  overflow: hidden;
  left: 1px;
  top: 1px;
}

.h-ruler {
  position: absolute;
  overflow: hidden;
  /* background-color: #ebeced; */
  top: 1px;
  left: 22px;
  height: 20px;
  width: calc(100vw - v-bind("documentAreaPosition.widthOffset"));
}

.v-ruler {
  position: absolute;
  overflow: hidden;
  /* background-color: #ebeced; */
  width: 20px;
  left: 1px;
  top: 22px;
  height: calc(100vh - v-bind("documentAreaPosition.heightOffset"));
}

.hv-grid {
  position: absolute;
  /* background-color: #ebeced; */
  inset: 22px 0px 0px 22px;
  width: calc(100vw - v-bind("documentAreaPosition.widthOffset"));
  height: calc(100vh - v-bind("documentAreaPosition.heightOffset"));
  overflow: hidden;
}

.viewport-wrapper {
  position: relative;
  background-color: transparent;
  scrollbar-width: thin;
  inset: 22px 0px 0px 22px;
  width: calc(100vw - v-bind("documentAreaPosition.widthOffset"));
  height: calc(100vh - v-bind("documentAreaPosition.heightOffset"));
  overflow: hidden;
}

.viewport {
  width: calc(100vw - v-bind("documentAreaPosition.widthOffset"));
  height: calc(100vh - v-bind("documentAreaPosition.heightOffset"));
}

.default-svg {
  width: 100%;
  height: 100%;
}

.main-panel {
  margin-left: 0px;
  position: absolute;
  width: 100%;
}

#main-toolbar {
  position: fixed;
  left: 0;
  padding-top: 0;
  padding-left: 0px;
  z-index: 1;
  width: 100%;
  max-height: none;
  height: 93px;
}

.left-panel {
  position: fixed;
  top: 90px;
  z-index: 1;
  bottom: 0;
  left: 0px;
  right: 0;
  overflow: hidden;
  width: 105px;
  /* border-right: 1px solid #ddd; */
  z-index: 4;
}

.main-panel {
  margin-left: 0px;
}

#work-area {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: none;
  padding-left: 105px;
  margin-top: 93px;
  width: auto;
}

#document-area {
  position: relative;
  height: 100%;
}

.document-ruler-corner {
  width: 20px;
  height: 20px;
  user-select: none;
  left: 99px;
  top: 0px;
  overflow: hidden;
  position: absolute;
}

.document-ruler-top {
  overflow: hidden;
  position: absolute;
  user-select: none;
  left: 119px;
  top: 0px;
  width: 100%;
  height: 20px;
}

.document-ruler-left {
  overflow: hidden;
  position: absolute;
  user-select: none;
  left: 99px;
  top: 20px;
  width: 20px;
  height: auto;
}

#svg-area {
  /* scrollbar-width: thin; */
  position: absolute;
  left: 119px;
  top: 20px;
  width: 100%;
  height: auto;
  overflow: hidden scroll;
  user-select: none;
  background-color: #ffffff;
}

.doc-toolbar {
  background-color: transparent;
  bottom: 10px;
  right: 10px;
  padding-left: 187px;
  padding-right: 10px;
  border: none;
  display: flex;
  align-items: flex-end;
  height: auto;
  width: auto;
  position: absolute;
  left: 0;
}
</style>

<template>
  <q-page>

    <div id="_crossTabClipboardDiv"
      style="position: absolute; z-index: 10000; left: 0px; top: 0px; width: 0px; height: 0px; overflow: hidden;">
      <div id="_IEclipboardDiv" contenteditable="true"></div>
      <input id="_clipboardInput" type="text" value=" ">
    </div>


    <div id="main-app">
      <div id="main-panel" class="main-panel">
        <NewTopToolBar2 :locked="locked" @lockToggle="lockToggle" @navGoBack="navGoBack" @menu-action="handleMenuAction"
          :object="appState.items[appState.activeItemIndex]" :selected-count="appState.selectedTargets?.length"
          :disable-undo="locked || undoHistory.length < 1" :disable-redo="locked || redoHistory.length < 1"
          :disable-paste="locked || !clipboardFull" :zoom="zoom" :rulersGridVisible="rulersGridVisible"
          :deviceModel="deviceModel" @showMoreDevices="showMoreDevices" v-if="!isBuiltInEdge && !locked">
        </NewTopToolBar2>
        <div class="main-area">
          <div id="left-panel" class="left-panel">
            <ToolsSidebar2 v-if="!locked" :selected-tool="selectedTool" :images="library.images"
              :object-lib="library.objLib" @select-tool="selectTool" @delete-lib-item="deleteLibItem"
              @rename-lib-item="renameLibItem" @delete-lib-image="deleteLibImage" @save-lib-image="saveLibImage"
              @tool-dropped="toolDropped" />
          </div>

          <div id="work-area" class="main-panel">
            <div style="padding-bottom: 5px;margin-left: 5px;margin-right: 5px;">
              <T3Message></T3Message>
            </div>
            <div id="document-area">
              <div id="c-ruler" class="document-ruler-corner">
              </div>
              <div id="h-ruler" class="document-ruler-top">
              </div>
              <div id="v-ruler" class="document-ruler-left">
              </div>
              <div id="svg-area" class="svg-area">
              </div>
            </div>
            <div id="doc-toolbar" class="doc-toolbar">
            </div>
          </div>
        </div>
      </div>
    </div>


    <q-menu v-if="contextMenuShow" touch-position target="#svg-area" context-menu>
      <q-list>
        <!-- Copy Option -->
        <q-item dense clickable v-close-popup @click="saveSelectedToClipboard">
          <q-item-section avatar>
            <q-avatar size="sm" icon="content_copy" color="grey-7" text-color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Copy</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip>Ctrl + C</q-chip>
          </q-item-section>
        </q-item>
        <q-separator />
        <!-- Duplicate Option -->
        <q-item dense clickable v-close-popup @click="duplicateSelected">
          <q-item-section avatar>
            <q-avatar size="sm" icon="content_copy" color="grey-7" text-color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Duplicate</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip>Ctrl + D</q-chip>
          </q-item-section>
        </q-item>
        <q-separator />
        <!-- Group Option -->
        <q-item dense clickable v-close-popup @click="groupSelected">
          <q-item-section avatar>
            <q-avatar size="sm" icon="join_full" color="grey-7" text-color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Group</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip>Ctrl + G</q-chip>
          </q-item-section>
        </q-item>
        <q-item dense clickable v-close-popup @click="ungroupSelected">
          <q-item-section avatar>
            <q-avatar size="sm" icon="join_inner" color="grey-7" text-color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Ungroup</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip>Ctrl + Shift + G</q-chip>
          </q-item-section>
        </q-item>
        <q-separator />
        <!-- Add to Library Option -->
        <q-item dense clickable v-close-popup @click="addToLibrary">
          <q-item-section avatar>
            <q-avatar size="sm" icon="library_books" color="grey-7" text-color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Add to Library</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip>Ctrl + L</q-chip>
          </q-item-section>
        </q-item>
        <q-separator />
        <!-- Bring to Front Option -->
        <q-item dense clickable v-close-popup @click="bringSelectedToFront()">
          <q-item-section avatar>
            <q-avatar size="sm" icon="flip_to_front" color="grey-7" text-color="white" />
          </q-item-section>
          <q-item-section class="py-2">Bring to front</q-item-section>
        </q-item>
        <!-- Send to Back Option -->
        <q-item dense clickable v-close-popup @click="sendSelectedToBack()">
          <q-item-section avatar>
            <q-avatar size="sm" icon="flip_to_back" color="grey-7" text-color="white" />
          </q-item-section>
          <q-item-section class="py-2">Send to Back</q-item-section>
        </q-item>
        <q-separator />
        <!-- Rotate 90 Degrees Option -->
        <q-item dense clickable v-close-popup @click="rotate90Selected()">
          <q-item-section avatar>
            <q-avatar size="sm" icon="autorenew" color="grey-7" text-color="white" />
          </q-item-section>
          <q-item-section>Rotate 90°</q-item-section>
        </q-item>
        <!-- Rotate -90 Degrees Option -->
        <q-item dense clickable v-close-popup @click="rotate90Selected(true)">
          <q-item-section avatar>
            <q-avatar size="sm" icon="sync" color="grey-7" text-color="white" />
          </q-item-section>
          <q-item-section>Rotate -90°</q-item-section>
        </q-item>
        <q-separator />
        <!-- Delete Option -->
        <q-item dense clickable v-close-popup @click="deleteSelected">
          <q-item-section avatar>
            <q-avatar size="sm" icon="delete" color="grey-7" text-color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Delete</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip>Delete</q-chip>
          </q-item-section>
        </q-item>
        <!-- Weld Option -->
        <q-item dense clickable v-close-popup @click="weldSelected">
          <q-item-section avatar>
            <q-avatar size="sm" icon="splitscreen" color="grey-7" text-color="white" />
          </q-item-section>
          <q-item-section>Weld Selected</q-item-section>
          <q-item-section side>
            <q-chip>Ctrl + B</q-chip>
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>


    <ObjectConfigNew v-if="objectConfigShow" :current="appStateV2.items[appStateV2.activeItemIndex]"
      @linkT3Entry="linkT3EntryDialogActionV2" @DisplayFieldValueChanged="DisplayFieldValueChanged">
    </ObjectConfigNew>

  </q-page>

  <q-dialog v-model="linkT3EntryDialogV2.active">
    <q-card style="min-width: 650px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Link Entry</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section style="height: 70vh" class="scroll">
        <div class="flex">
          <q-btn icon="refresh" flat @click="reloadPanelsData">
            <q-tooltip anchor="top middle" self="bottom middle">
              <strong>Reload panels data</strong>
            </q-tooltip>
          </q-btn>
          <q-select :option-label="entryLabel" option-value="id" filled use-input hide-selected fill-input
            input-debounce="0" v-model="linkT3EntryDialogV2.data" :options="selectPanelOptions"
            @filter="selectPanelFilterFn" label="Select Entry" class="grow">
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section class="grow">
                  <q-item-label>{{ entryLabel(scope.opt) }}</q-item-label>
                </q-item-section>
                <q-item-section avatar class="pl-1 min-w-0">
                  <q-chip size="sm" icon="label_important">Panel: {{ scope.opt.pid }}</q-chip>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
        <div class="flex flex-col items-center mt-4">
          <q-circular-progress v-if="T3000_Data.loadingPanel !== null" indeterminate show-value
            :value="loadingPanelsProgress" size="270px" :thickness="0.22" color="light-blue" track-color="grey-3"
            class="q-ma-md overflow-hidden">
            <div class="text-xl text-center">
              <div>{{ loadingPanelsProgress }}%</div>
              <div>
                Loading Panel #{{
                  T3000_Data.panelsList[T3000_Data.loadingPanel].panel_number
                }}
              </div>
            </div>
          </q-circular-progress>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn flat label="Save" :disable="!linkT3EntryDialogV2.data" color="primary" @click="linkT3EntrySaveV2" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="insertT3EntryDialog.active">
    <!-- <a>This is a test q-dialog></a> -->
    <q-card style="min-width: 650px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Insert Entry</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section style="height: 70vh" class="scroll">
        <div class="flex">
          <q-btn icon="refresh" flat @click="reloadPanelsData">
            <q-tooltip anchor="top middle" self="bottom middle">
              <strong>Reload panels data</strong>
            </q-tooltip>
          </q-btn>
          <q-select :option-label="entryLabel" label="Type or select Entry" option-value="id" filled use-input
            hide-selected fill-input input-debounce="0" v-model="insertT3EntryDialog.data" :options="selectPanelOptions"
            @filter="selectPanelFilterFn" class="grow" @update:model-value="insertT3EntrySelect(value)" autofocus
            @focus="insertT3DefaultLoadData">
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section class="grow">
                  <q-item-label>{{ entryLabel(scope.opt) }}</q-item-label>
                </q-item-section>
                <q-item-section avatar class="pl-1 min-w-0">
                  <q-chip size="sm" icon="label_important">Panel: {{ scope.opt.pid }}</q-chip>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
        <div class="flex flex-col items-center mt-4">
          <q-circular-progress v-if="T3000_Data.loadingPanel !== null" indeterminate show-value
            :value="loadingPanelsProgress" size="270px" :thickness="0.22" color="light-blue" track-color="grey-3"
            class="q-ma-md overflow-hidden">
            <div class="text-xl text-center">
              <div>{{ loadingPanelsProgress }}%</div>
              <div>
                Loading Panel #{{
                  T3000_Data.panelsList[T3000_Data.loadingPanel].panel_number
                }}
              </div>
            </div>
          </q-circular-progress>
        </div>
      </q-card-section>

    </q-card>
  </q-dialog>

  <!-- Edit Gauge/Dial dialog -->
  <GaugeSettingsDialog v-model:active="gaugeSettingsDialog.active" :data="gaugeSettingsDialog.data"
    @saved="gaugeSettingsSave" />

  <!-- Import from JSON -->
  <q-dialog v-model="importJsonDialog.active">
    <q-card style="min-width: 450px">
      <q-card-section>
        <div class="text-h6">Import from a JSON file</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <file-upload :types="['application/json']" @uploaded="handleFileUploaded" @file-added="importJsonFileAdded" />
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Cancel" @click="importJsonDialog.active = false" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="deviceModel.active">
    <q-card style="min-width: 900px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Devices List</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <q-separator />
      <DeviceInfo :deviceModel="deviceModel" @updateDeviceModel="updateDeviceModel" @testSendMsg="testSendMsg">
      </DeviceInfo>
    </q-card>
  </q-dialog>
</template>

<script setup>

import { ref, computed, onMounted, onBeforeUnmount, onUnmounted, toRaw, triggerRef } from "vue";
import { useQuasar, useMeta } from "quasar";
import { VueMoveable, getElementInfo } from "vue3-moveable";
import KeyController /* , { getCombi, getKey } */ from "keycon";
import { cloneDeep } from "lodash";
import ObjectType from "../../components/ObjectType.vue";
import GaugeSettingsDialog from "../../components/GaugeSettingsDialog.vue";
import FileUpload from "../../components/FileUpload.vue";
import TopToolbar from "../../components/TopToolbar.vue";
import ToolsSidebar2 from "./ToolsSidebar2.vue";
import ObjectConfig from "../../components/ObjectConfig.vue";
import ObjectConfig2 from "../../components/NewUI/ObjectConfig2.vue";
import { tools, /*T3_Types,*/ /*getObjectActiveValue,*/ /*T3000_Data,*/ /*user, globalNav,*/ demoDeviceData } from "../../lib/common";
import { liveApi } from "../../lib/api";
import CanvasType from "src/components/CanvasType.vue";
import CanvasShape from "src/components/CanvasShape.vue";
import { getOverlapSize } from "overlap-area";
import { startsWith } from "lodash";
import HRuler from "src/components/HRuler.vue";
import VRuler from "src/components/VRuler.vue";
import HVGrid from "src/components/HVGrid.vue";
import { use } from "echarts";
import WallExterior from "src/components/ObjectTypes/WallExterior.vue";
import NewTopBar from "src/components/NewTopBar.vue";
import T3000 from "src/lib/T3000/T3000";
import DeviceInfo from "src/components/DeviceInfo.vue";
import NewTopToolBar2 from "src/components/NewUI/NewTopToolBar2.vue";

// New import for Data
import Data from "src/lib/T3000/Hvac/Data/Data";
import { insertT3EntryDialog } from "src/lib/T3000/Hvac/Data/Data";
import Hvac from "src/lib/T3000/Hvac/Hvac"
import IdxUtils from "src/lib/T3000/Hvac/Opt/Common/IdxUtils"

import { contextMenuShow, objectConfigShow, globalMsgShow } from "src/lib/T3000/Hvac/Data/Constant/RefConstant"
import ObjectConfigNew from "src/components/NewUI/ObjectConfigNew.vue";

import {
  emptyProject, appState, deviceAppState, deviceModel, rulersGridVisible, user, library, emptyLib, isBuiltInEdge,
  documentAreaPosition, viewportMargins, viewport, locked, T3_Types, T3000_Data, grpNav, selectPanelOptions, linkT3EntryDialogV2,
  savedNotify, undoHistory, redoHistory, moveable,
  appStateV2
} from '../../lib/T3000/Hvac/Data/T3Data'
import IdxPage from "src/lib/T3000/Hvac/Opt/Common/IdxPage"
import T3Util from "src/lib/T3000/Hvac/Util/T3Util";
import QuasarUtil from "src/lib/T3000/Hvac/Opt/Quasar/QuasarUtil";

import { Alert as AAlert } from 'ant-design-vue';
import T3Message from "src/components/NewUI/T3Message.vue";
import AntdTest from "src/components/NewUI/AntdTest.vue";

import {
  topContextToggleVisible, showSettingMenu, toggleModeValue, toggleValueValue, toggleValueDisable, toggleValueShow, toggleNumberDisable, toggleNumberShow, toggleNumberValue,
  gaugeSettingsDialog
} from
  "src/lib/T3000/Hvac/Data/Constant/RefConstant";

// const isBuiltInEdge = ref(false);

// Meta information for the application
// Set the meta information
const metaData = { title: "HVAC Drawer" };
useMeta(metaData);

const keycon = new KeyController(); // Initialize key controller for handling keyboard events
const $q = useQuasar(); // Access Quasar framework instance
const selecto = ref(null); // Reference to the selecto component instance
const targets = ref([]); // Array of selected targets
const selectedTool = ref({ ...tools[0], type: "default" }); // Default selected tool

// State variables for drawing and transformations
const isDrawing = ref(false);
const startTransform = ref([0, 0]);
const snappable = ref(true); // Enable snapping for moveable components
const keepRatio = ref(false); // Maintain aspect ratio for resizing

// List of continuous object types
const continuesObjectTypes = ["Duct", "Wall", "Int_Ext_Wall"];

// State of the import JSON dialog
const importJsonDialog = ref({ addedCount: 0, active: false, uploadBtnLoading: false, data: null });

// Computed property for loading panels progress
const loadingPanelsProgress = computed(() => {
  if (T3000_Data.value.loadingPanel === null) return 100;
  return parseInt(
    (T3000_Data.value.loadingPanel + 1 / T3000_Data.value.panelsList.length) *
    100
  );
});

const clipboardFull = ref(false); // State of the clipboard


const zoom = Hvac.IdxPage.zoom;

// Dev mode only

if (process.env.DEV) {
  demoDeviceData().then((data) => {
    T3000_Data.value.panelsData = data.data;
    T3000_Data.value.panelsRanges = data.ranges;
    selectPanelOptions.value = T3000_Data.value.panelsData;
  });
}

let lastAction = null; // Store the last action performed
const cursorIconPos = ref({ x: 0, y: 0 }); // Position of the cursor icon
const objectsRef = ref(null); // Reference to objects


// Lifecycle hook for component mount
onMounted(() => {

  Hvac.UI.Initialize($q); // Initialize the HVAC UI

  Hvac.IdxPage2.initQuasar($q);

  Hvac.IdxPage2.initPage();
});


function updateDeviceModel(isActive, data) {
  T3Util.Log('= Idx updateDeviceModel ===', isActive, data)
  deviceModel.value.active = isActive;
  deviceModel.value.data = data;

}

function showMoreDevices() {

  // clear the dirty selection data
  Hvac.DeviceOpt.clearDirtyCurrentDevice();

  deviceModel.value.active = true;

  // clear the shape selection
  appState.value.selectedTarget = [];
  appState.value.selectedTargets = [];
  appState.value.activeItemIndex = null;

  // refresh the graphic panel data
  Hvac.DeviceOpt.refreshGraphicPanelElementCount(deviceModel.value.data);
}


onBeforeUnmount(() => {

})

// Lifecycle hook for component unmount
onUnmounted(() => {

  Hvac.IdxPage.clearAutoSaveInterval();
  Hvac.WsClient.clearInitialDataInterval();
  Hvac.IdxPage.clearIdx();
});


function viewportMouseMoved(e) {
  // Move object icon with mouse
  cursorIconPos.value.x = e.clientX - viewportMargins.left;
  cursorIconPos.value.y = e.clientY - viewportMargins.top;

  // T3Util.Log('Viewport mouse moved cursorIconPos:', "mouse",

  const scalPercentage = 1 / appState.value.viewportTransform.scale;

  // process drawing ducts
  if (
    isDrawing.value &&
    continuesObjectTypes.includes(selectedTool.value.name) &&
    appState.value.activeItemIndex !== null
  ) {
    // Check if the Ctrl key is pressed
    const isCtrlPressed = e.ctrlKey;
    // Calculate the distance and angle between the initial point and mouse cursor
    const mouseX = (e.clientX - viewportMargins.left - appState.value.viewportTransform.x) * scalPercentage;
    const mouseY = (e.clientY - viewportMargins.top - appState.value.viewportTransform.y) * scalPercentage;
    const dx = mouseX - startTransform.value[0];
    const dy = mouseY - startTransform.value[1];
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Rotate in 5-degree increments when Ctrl is held
    if (isCtrlPressed) {
      angle = Math.round(angle / 5) * 5;
    }

    // const distance = Math.sqrt(dx * dx + dy * dy) + selectedTool.value.height;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // T3Util.Log('Viewport mouse moved:', e, 'angle:', angle, 'distance:', distance);

    // Set the scale and rotation of the drawing line
    appState.value.items[appState.value.activeItemIndex].rotate = angle;
    appState.value.items[appState.value.activeItemIndex].width = distance;
    refreshObjects();
  }
}


// Refreshes objects by calling their refresh method, if available
function refreshObjects() {
  if (!objectsRef.value) return;
  for (const obj of objectsRef.value) {
    if (!obj.refresh) continue;
    obj.refresh();
  }
}

// Adds an action to the history for undo/redo functionality
function addActionToHistory(title) {
  if (process.env.DEV) {
    // T3Util.Log(title); // Log the action title in development mode
  }
  if (title !== "Move Object") {
    setTimeout(() => {
      T3Util.Log("= IdxPage addActionToHistory", title);
      save(false, false); // Save the current state
      refreshObjects(); // Refresh objects
    }, 200);
  }

  redoHistory.value = []; // Clear redo history
  undoHistory.value.unshift({
    title,
    state: cloneDeep(appState.value),
  });

  // Maintain a maximum of 20 actions in the undo history
  if (undoHistory.value.length > 20) {
    undoHistory.value.pop();
  }
}

// Handles click events on group elements
function onClickGroup(e) {
  selecto.value.clickTarget(e.inputEvent, e.inputTarget);
}

// Starts dragging an element
function onDragStart(e) {
  addActionToHistory("Move Object");
}

// Handles dragging of an element
function onDrag(e) {
  const item = appState.value.items.find(
    (item) => `moveable-item-${item.id}` === e.target.id
  );
  // item.translate = e.beforeTranslate;
  e.target.style.transform = e.transform;
}

// Ends the dragging of an element
function onDragEnd(e) {
  if (!e.lastEvent) {
    undoHistory.value.shift(); // Remove the last action if dragging was not completed
  } else {
    const item = appState.value.items.find(
      (item) => `moveable-item-${item.id}` === e.target.id
    );
    item.translate = e.lastEvent.beforeTranslate;

    T3Util.Log('= IdxPage onDragEnd:', e, item.translate);
    save(false, false); // Save the state after drag end
    refreshObjects(); // Refresh objects
  }
}

// Starts dragging a group of elements
function onDragGroupStart(e) {
  addActionToHistory("Move Group");
  e.events.forEach((ev, i) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `moveable-item-${item.id}` === ev.target.id
    );
    ev.set(appState.value.items[itemIndex].translate);
  });
}

// Handles dragging of a group of elements
function onDragGroup(e) {
  e.events.forEach((ev, i) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `moveable-item-${item.id}` === ev.target.id
    );
    appState.value.items[itemIndex].translate = ev.beforeTranslate;
  });
}

// Ends the dragging of a group of elements
function onDragGroupEnd(e) {
  if (!e.lastEvent) {
    undoHistory.value.shift(); // Remove the last action if dragging was not completed
  } else {
    refreshObjects(); // Refresh objects
  }
}

// Handles the start of a selecto drag event
function onSelectoDragStart(e) {
  // T3000Util.HvacLog('1 onSelectoDragStart', "e=", e, "target=", e.inputEvent.target);
  const target = e.inputEvent.target;
  if (
    moveable.value.isMoveableElement(target) ||
    appState.value.selectedTargets.some(
      (t) => t === target || t.contains(target)
    )
  ) {
    e.stop();
  }
}

// Handles the end of a selecto select event
function onSelectoSelectEnd(e) {
  // T3000Util.HvacLog('3 onSelectoSelectEnd 1', e, e.isDragStart);
  appState.value.selectedTargets = e.selected;
  if (e?.selected && !e?.inputEvent?.ctrlKey) {
    const selectedItems = appState.value.items.filter((i) =>
      e.selected.some((ii) => ii.id === `moveable-item-${i.id}`)
    );
    const selectedGroups = [
      ...new Set(
        selectedItems.filter((iii) => iii.group).map((iiii) => iiii.group)
      ),
    ];
    selectedGroups.forEach((gId) => {
      selectGroup(gId);
    });
  }

  if (appState.value.selectedTargets.length === 1) {
    appState.value.activeItemIndex = appState.value.items.findIndex(
      (item) =>
        `moveable-item-${item.id}` === appState.value.selectedTargets[0].id
    );
  } else {
    appState.value.activeItemIndex = null;
  }

  if (e.isDragStart) {
    e.inputEvent.preventDefault();

    setTimeout(() => {
      moveable.value.dragStart(e.inputEvent);
    });
  }

  if (appState.value.selectedTargets.length > 1 && !locked.value) {
    setTimeout(() => {
      contextMenuShow.value = true;
    }, 100);
  } else {
    contextMenuShow.value = false;
  }

  IdxUtils.refreshMoveableGuides(); // Refresh the moveable guidelines after selection

  setTimeout(() => {
    T3000.Hvac.PageMain.SetWallDimensionsVisible("select", isDrawing.value, appState, null);
  }, 100);
}

// Selects a group of elements by their group ID
function selectGroup(id) {
  const targets = [];
  appState.value.items
    .filter(
      (i) =>
        i.group === id &&
        !appState.value.selectedTargets.some(
          (ii) => ii.id === `moveable-item-${i.id}`
        )
    )
    .forEach((iii) => {
      const target = document.querySelector(`#moveable-item-${iii.id}`);
      targets.push(target);
    });

  appState.value.selectedTargets =
    appState.value.selectedTargets.concat(targets);
  selecto.value.setSelectedTargets(appState.value.selectedTargets);
}

// Starts resizing an element
function onResizeStart(e) {
  addActionToHistory("Resize object");
  const itemIndex = appState.value.items.findIndex(
    (item) => `moveable-item-${item.id}` === e.target.id
  );
  e.setOrigin(["%", "%"]);
  e.dragStart && e.dragStart.set(appState.value.items[itemIndex].translate);
}

// Handles resizing of an element
function onResize(e) {
  const item = appState.value.items.find(
    (item) => `moveable-item-${item.id}` === e.target.id
  );
  e.target.style.width = `${e.width}px`;
  e.target.style.height = `${e.height}px`;
  e.target.style.transform = `translate(${e.drag.beforeTranslate[0]}px, ${e.drag.beforeTranslate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY})`;
}

// Ends the resizing of an element
function onResizeEnd(e) {

  // Fix bug for when double clicking on the selected object, also clicked the resize button accidentally
  if (e.lastEvent === null || e.lastEvent === undefined) {
    return;
  }

  const itemIndex = appState.value.items.findIndex((item) => `moveable-item-${item.id}` === e?.lastEvent?.target?.id);

  appState.value.items[itemIndex].width = e.lastEvent.width;
  appState.value.items[itemIndex].height = e.lastEvent.height;
  appState.value.items[itemIndex].translate = e.lastEvent.drag.beforeTranslate;

  // T3000.Utils.Log('onResizeEnd', `current item:`, appState.value.items[itemIndex], `itemIndex:${itemIndex}`, `width:${e.lastEvent.width}`, `height:${e.lastEvent.height}`, `translate:${e.lastEvent.drag.beforeTranslate}`);
  T3000.Hvac.PageMain.UpdateExteriorWallStroke(appState, itemIndex, e.lastEvent.height);

  // Refresh objects after resizing
  refreshObjects();
}

// Starts rotating an element
function onRotateStart(e) {
  addActionToHistory("Rotate object");
}

// Handles rotating of an element
function onRotate(e) {
  // e.target.style.transform = e.drag.transform;
  const item = appState.value.items.find(
    (item) => `moveable-item-${item.id}` === e.target.id
  );
  item.rotate = e.rotate;
}

// Refreshes objects on rotate end
function onRotateEnd(e) {
  refreshObjects();
}

// refreshes objects on rotate group end
function onRotateGroupEnd(e) {
  refreshObjects();
}

// Maintaining aspect ratio on resize group start
function onResizeGroupStart(e) {
  keepRatio.value = true;
}

// Handles resizing of a group of elements
function onResizeGroup(e) {
  e.events.forEach((ev, i) => {
    ev.target.style.width = `${ev.width}px`;
    ev.target.style.height = `${ev.height}px`;
    ev.target.style.transform = ev.drag.transform;
  });
}

// Ends the resizing of a group of elements and updates the app state
function onResizeGroupEnd(e) {
  e.events.forEach((ev) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `moveable-item-${item.id}` === ev.lastEvent.target.id
    );
    appState.value.items[itemIndex].width = ev.lastEvent.width;
    appState.value.items[itemIndex].height = ev.lastEvent.height;
    appState.value.items[itemIndex].translate =
      ev.lastEvent.drag.beforeTranslate;
  });
  refreshObjects();
  keepRatio.value = false;
}

// Starts rotating a group of elements and adds the action to the history
function onRotateGroupStart(e) {
  addActionToHistory("Rotate Group");
  e.events.forEach((ev) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `moveable-item-${item.id}` === ev.target.id
    );
    ev.set(appState.value.items[itemIndex].rotate);
    ev.dragStart && ev.dragStart.set(appState.value.items[itemIndex].translate);
  });
}

// Handles rotating of a group of elements and updates their state
function onRotateGroup(e) {
  e.events.forEach((ev, i) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `moveable-item-${item.id}` === ev.target.id
    );
    appState.value.items[itemIndex].translate = ev.drag.beforeTranslate;
    appState.value.items[itemIndex].rotate = ev.rotate;
  });
}


// Adds a library item to the app state and updates selection
function addLibItem(items, size, pos) {
  const elements = [];
  const addedItems = [];
  appState.value.groupCount++;
  items.forEach((item) => {
    addedItems.push(cloneObject(item, appState.value.groupCount));
  });
  setTimeout(() => {
    addedItems.forEach((addedItem) => {
      const el = document.querySelector(`#moveable-item-${addedItem.id}`);
      elements.push(el);
    });
    appState.value.selectedTargets = elements;
    selecto.value.setSelectedTargets(elements);
    appState.value.activeItemIndex = null;
    const scalPercentage = 1 / appState.value.viewportTransform.scale;
    setTimeout(() => {
      moveable.value.request(
        "draggable",
        {
          x:
            (pos.clientX -
              viewportMargins.left -
              appState.value.viewportTransform.x) *
            scalPercentage -
            size.width * scalPercentage,
          y:
            (pos.clientY -
              viewportMargins.top -
              appState.value.viewportTransform.y) *
            scalPercentage -
            size.height * scalPercentage,
        },
        true
      );
      setTimeout(() => {
        Hvac.IdxPage.refreshMoveable();
      }, 1);
    }, 10);
  }, 10);
}


// Select a tool and set its type
function selectTool(tool, type = "default") {
  T3Util.Log("= IdxPage selectTool", tool, type);
  selectedTool.value = tool;
  if (typeof tool === "string") {
    selectedTool.value = tools.find((item) => item.name === tool);
  }
  selectedTool.value.type = type;

  T3000.Hvac.UI.evtOpt.HandleSidebarToolEvent(selectedTool);
}

// Rotate an item by 90 degrees, optionally in the negative direction
function rotate90(item, minues = false) {
  if (!item) return;
  addActionToHistory("Rotate object");
  if (!minues) {
    item.rotate = item.rotate + 90;
  } else {
    item.rotate = item.rotate - 90;
  }
  Hvac.IdxPage.refreshMoveable();
}

// Flip an item horizontally
function flipH(item) {
  addActionToHistory("Flip object H");
  if (item.scaleX === 1) {
    item.scaleX = -1;
  } else {
    item.scaleX = 1;
  }
  Hvac.IdxPage.refreshMoveable();
}

// Flip an item vertically
function flipV(item) {
  addActionToHistory("Flip object V");
  if (item.scaleY === 1) {
    item.scaleY = -1;
  } else {
    item.scaleY = 1;
  }
  Hvac.IdxPage.refreshMoveable();
}

// Bring an item to the front by increasing its z-index
function bringToFront(item) {
  addActionToHistory("Bring object to front");
  item.zindex = item.zindex + 1;
}

// Send an item to the back by decreasing its z-index
function sendToBack(item) {
  addActionToHistory("Send object to back");
  item.zindex = item.zindex - 1;
}

// Remove an item from the app state
function removeObject(item) {
  addActionToHistory("Remove object");
  const index = appState.value.items.findIndex((i) => i.id === item.id);
  appState.value.activeItemIndex = null;
  appState.value.items.splice(index, 1);

  appState.value.selectedTargets = [];
}

// Duplicate an item and select the new copy
function duplicateObject(i) {
  addActionToHistory(`Duplicate ${i.type}`);
  appState.value.activeItemIndex = null;
  const item = cloneObject(i);
  appState.value.selectedTargets = [];
  setTimeout(() => {
    selectObject(item);
  }, 10);
}

// Clone an object and adjust its position slightly
function cloneObject(i, group = undefined) {
  const dubItem = cloneDeep(i);
  dubItem.translate[0] = dubItem.translate[0] + 5;
  dubItem.translate[1] = dubItem.translate[1] + 5;
  const item = addObject(dubItem, group, false);
  return item;
}

// Select an object and update the app state
function selectObject(item) {
  const target = document.querySelector(`#moveable-item-${item.id}`);
  appState.value.selectedTargets = [target];
  appState.value.activeItemIndex = appState.value.items.findIndex(
    (ii) => ii.id === item.id
  );
}

// Handle right-click selection
function selectByRightClick(e) {
  // selecto.value.clickTarget(e);
}

// Update a T3 entry field for an object
function T3UpdateEntryField(key, obj) {
  Hvac.IdxPage2.T3UpdateEntryField(key, obj);
}

// Trigger the save event when user changed the "Display Field" value
function DisplayFieldValueChanged(value) {
  T3Util.Log("= IdxPage DX DisplayFieldValueChanged", value);
  save(false, true);
}

// Define a condition for drag events in Selecto
function selectoDragCondition(e) {
  return !e.inputEvent.altKey;
}

// Save the linked T3 entry for an object and update its icon if necessary
function linkT3EntrySaveV2() {
  QuasarUtil.LinkT3EntrySaveV2();
}

// Filter function for selecting panels in the UI
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
        item.description?.toUpperCase().indexOf(keyword) > -1 ||
        item.label?.toUpperCase().indexOf(keyword) > -1
    );
  });
}

const insertCount = ref(0);

// Insert Key Function
function insertT3EntrySelect(value) {
  addActionToHistory("Insert object to T3000 entry");

  const posIncrease = insertCount.value * 80;

  // Add a shape to graphic area
  const size = { width: 60, height: 60 };
  const pos = { clientX: 300, clientY: 100, top: 100, left: 200 + posIncrease };
  const tempTool = tools.find((item) => item.name === 'Pump');
  const item = drawObject(size, pos, tempTool);

  // Set the added shape to active
  const itemIndex = appState.value.items.findIndex((i) => i.id === item.id);
  appState.value.activeItemIndex = itemIndex;

  // Link to T3 entry
  insertT3EntryOnSave();

  insertCount.value++;

  // T3Util.Log('insertT3EntrySelect item:', appState.value.items[appState.value.activeItemIndex]);
}

function insertT3EntryOnSave() {
  addActionToHistory("Link object to T3000 entry");
  if (!appState.value.items[appState.value.activeItemIndex].settings.t3EntryDisplayField) {
    if (appState.value.items[appState.value.activeItemIndex].label === undefined) {
      appState.value.items[appState.value.activeItemIndex].settings.t3EntryDisplayField = "description";
    } else {
      appState.value.items[appState.value.activeItemIndex].settings.t3EntryDisplayField = "label";
    }
  }

  appState.value.items[appState.value.activeItemIndex].t3Entry = cloneDeep(
    toRaw(insertT3EntryDialog.value.data)
  )

  // Change the icon based on the linked entry type
  if (appState.value.items[appState.value.activeItemIndex].type === "Icon") {
    let icon = "fa-solid fa-camera-retro";
    if (insertT3EntryDialog.value.data.type === "GRP") {
      icon = "fa-solid fa-camera-retro";
    } else if (insertT3EntryDialog.value.data.type === "SCHEDULE") {
      icon = "schedule";
    } else if (insertT3EntryDialog.value.data.type === "PROGRAM") {
      icon = "fa-solid fa-laptop-code";
    } else if (insertT3EntryDialog.value.data.type === "HOLIDAY") {
      icon = "calendar_month";
    }
    appState.value.items[appState.value.activeItemIndex].settings.icon = icon;
  }
  IdxUtils.refreshObjectStatus(appState.value.items[appState.value.activeItemIndex]);
  insertT3EntryDialog.value.data = null;
  insertT3EntryDialog.value.active = false;
}

function insertT3DefaultLoadData() {
}

// Save the current app state, optionally displaying a notification
function save(notify = false, saveToT3 = false) {
  T3Util.Log("= IdxPage save", notify, saveToT3);
  Hvac.IdxPage2.save(notify, saveToT3);
}

function refreshMoveable() {
  Hvac.IdxPage.refreshMoveable();
}

// Create a new project, optionally confirming with the user if there's existing data
function newProject() {
  if (appState.value.items?.length > 0) {
    $q.dialog({
      dark: true,
      title: "Do you want to clear the drawing and start over?",
      message: "This will also erase your undo history",
      cancel: true,
      persistent: true,
    })
      .onOk(() => {
        Hvac.IdxPage.newProject();
      })
      .onCancel(() => { });
    return;
  }

  Hvac.IdxPage.newProject();
}

// Handle keyup event for keyboard control
keycon.keyup((e) => {
  // Enable snapping when the "ctrl" key is released
  if (e.key === "ctrl") {
    snappable.value = true;
  }
});

// Handle keydown event for keyboard control
keycon.keydown((e) => {
  if (e.key === "esc") {
    // Select the default tool and navigate back if applicable
    selectTool(tools[0]);
    if (grpNav.value.length > 1) {
      navGoBack();
    }
    // Stop drawing and undo the last action if currently drawing
    if (isDrawing.value) {
      isDrawing.value = false;
      undoAction();
    }
  }
  // Disable snapping when the "ctrl" key is pressed
  if (e.key === "ctrl") {
    snappable.value = false;
  }

  // If no targets are selected, exit the function
  if (appState.value.selectedTargets.length < 1) return;

  // Check for arrow keys to move objects
  if (["up", "down", "left", "right"].includes(e.key)) {
    addActionToHistory("Move object");
  }
  if (e.key === "up") {
    moveable.value.request("draggable", { deltaX: 0, deltaY: -5 }, true);
  } else if (e.key === "down") {
    moveable.value.request("draggable", { deltaX: 0, deltaY: 5 }, true);
  } else if (e.key === "left") {
    moveable.value.request("draggable", { deltaX: -5, deltaY: 0 }, true);
  } else if (e.key === "right") {
    moveable.value.request("draggable", { deltaX: 5, deltaY: 0 }, true);
  } else if (e.key === "delete") {
    deleteSelected();
  }
  // Refresh the moveable object after movement
  if (["up", "down", "left", "right"].includes(e.key)) {
    Hvac.IdxPage.refreshMoveable();
  }
});

// Save the current state when "Ctrl + S" is pressed
keycon.keydown(["ctrl", "s"], (e) => {
  e.inputEvent.preventDefault();
  save(true, true);
});

// Undo the last action when "Ctrl + Z" is pressed
keycon.keydown(["ctrl", "z"], (e) => {
  e.inputEvent.preventDefault();
  if (locked.value) return;
  undoAction();
});

// Redo the last undone action when "Ctrl + Y" is pressed
keycon.keydown(["ctrl", "y"], (e) => {
  e.inputEvent.preventDefault();
  if (locked.value) return;
  redoAction();
});

// Create a new project when "Ctrl + R" is pressed
keycon.keydown(["ctrl", "r"], (e) => {
  e.inputEvent.preventDefault();
  newProject();
});

// Duplicate the selected object when "Ctrl + D" is pressed
keycon.keydown(["ctrl", "d"], (e) => {
  e.inputEvent.preventDefault();
  duplicateSelected();
});

// Group selected objects when "Ctrl + G" is pressed
keycon.keydown(["ctrl", "g"], (e) => {
  e.inputEvent.preventDefault();
  groupSelected();
});

// Ungroup selected objects when "Ctrl + Shift + G" is pressed
keycon.keydown(["ctrl", "shift", "g"], (e) => {
  e.inputEvent.preventDefault();
  ungroupSelected();
});

// Copy selected objects to clipboard when "Ctrl + C" is pressed
keycon.keydown(["ctrl", "c"], (e) => {
  if (!document.activeElement.matches(".viewport")) return;
  e.inputEvent.preventDefault();
  saveSelectedToClipboard();
});

// Paste objects from clipboard when "Ctrl + V" is pressed
keycon.keydown(["ctrl", "v"], (e) => {
  if (!document.activeElement.matches(".viewport")) return;
  e.inputEvent.preventDefault();
  pasteFromClipboard();
});

// Weld selected objects when "Ctrl + W" is pressed
keycon.keydown(["ctrl", "b"], (e) => {
  e.inputEvent.preventDefault();
  weldSelected();
});

// Insert function
keycon.keydown(["insert"], (e) => {
  // T3000.Hvac.KiOpt.InitKeyInsertOpt(insertT3EntryDialog.value);
  T3000.Hvac.KiOpt.InsertT3EntryDialog();
  // T3Util.Log('IndexPage keycon ', Data.insertT3EntryDialog.value)
});

// Open the dialog to link a T3 entry
function linkT3EntryDialogActionV2() {
  QuasarUtil.LinkT3EntryDialogActionV2();
}

// Delete selected objects from the app state
function deleteSelected() {
  addActionToHistory("Remove selected objects");
  if (appState.value.selectedTargets.length > 0) {
    appState.value.selectedTargets.forEach((el) => {
      const iIndex = appState.value.items.findIndex(
        (item) => `moveable-item-${item.id}` === el.id
      );
      if (iIndex !== -1) {
        appState.value.items.splice(iIndex, 1);
      }
    });
    appState.value.selectedTargets = [];
    appState.value.activeItemIndex = null;
  }
}

function drawWeldObject(selectedItems) {
  const scalPercentage = 1 / appState.value.viewportTransform.scale;

  // Calculate the bounding box for the selected items
  const firstX = selectedItems[0].translate[0];
  const firstY = selectedItems[0].translate[1];
  const minX = Math.min(...selectedItems.map((item) => item.translate[0]));
  const minY = Math.min(...selectedItems.map((item) => item.translate[1]));
  const maxX = Math.max(
    ...selectedItems.map((item) => item.translate[0] + item.width)
  );
  const maxY = Math.max(
    ...selectedItems.map((item) => item.translate[1] + item.height)
  );

  const transX = firstX < minX ? firstX : minX;

  const title = selectedItems.map((item) => item?.type ?? "").join("-");

  let previous = selectedItems[0].zindex;
  selectedItems.forEach((item) => {
    item.zindex = previous - 1;
    previous = item.zindex;
  });

  const tempItem = {
    title: `Weld-${title}`,
    active: false,
    type: "Weld",
    translate: [transX, minY],
    width: (maxX - minX) * scalPercentage,
    height: (maxY - minY) * scalPercentage,
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
    settings: {
      active: false,
      fillColor: "#659dc5",
      fontSize: 16,
      inAlarm: false,
      textColor: "inherit",
      titleColor: "inherit",
      weldItems: cloneDeep(selectedItems),
    },
    zindex: 1,
    t3Entry: null,
    id: appState.value.itemsCount + 1,
  };

  addObject(tempItem);
}

// Draw weld objects with canvas
function drawWeldObjectCanvas(selectedItems) {
  const scalPercentage = 1 / appState.value.viewportTransform.scale;

  // Calculate the bounding box for the selected items
  const firstX = selectedItems[0].translate[0];
  const firstY = selectedItems[0].translate[1];
  const minX = Math.min(...selectedItems.map((item) => item.translate[0]));
  let minY = Math.min(...selectedItems.map((item) => item.translate[1]));
  const maxX = Math.max(
    ...selectedItems.map((item) => item.translate[0] + item.width)
  );
  const maxY = Math.max(
    ...selectedItems.map((item) => item.translate[1] + item.height)
  );
  let newMinX = firstX < minX ? firstX : minX;

  const boundingBox = selectedItems.reduce(
    (acc, item) => {
      const rad = (item.rotate * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const corners = [
        { x: item.translate[0], y: item.translate[1] },
        {
          x: item.translate[0] + item.width * cos,
          y: item.translate[1] + item.width * sin,
        },
        {
          x: item.translate[0] - item.height * sin,
          y: item.translate[1] + item.height * cos,
        },
        {
          x: item.translate[0] + item.width * cos - item.height * sin,
          y: item.translate[1] + item.width * sin + item.height * cos,
        },
      ];

      corners.forEach((corner) => {
        acc.minX = Math.min(acc.minX, corner.x);
        acc.minY = Math.min(acc.minY, corner.y);
        acc.maxX = Math.max(acc.maxX, corner.x);
        acc.maxY = Math.max(acc.maxY, corner.y);
      });

      return acc;
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );

  const transX = boundingBox.minX;
  const transY = boundingBox.minY;
  const width = boundingBox.maxX - boundingBox.minX;
  const height = boundingBox.maxY - boundingBox.minY;

  const title = selectedItems.map((item) => item?.type ?? "").join("-");
  let previous = selectedItems[0].zindex;

  selectedItems.forEach((item) => {
    item.zindex = previous - 1;
    previous = item.zindex;
  });

  const isAllDuct = selectedItems.every((item) => item.type === "Duct");

  if (isAllDuct) {
    // Get the new pos for all ducts
    const overlapList = checkIsOverlap(selectedItems);

    selectedItems.forEach((item) => {
      const overlapItem = overlapList.find((pos) => pos.id === item.id);
      if (overlapItem) {
        item.overlap = {
          isStartOverlap: overlapItem.isStartOverlap,
          isEndOverlap: overlapItem.isEndOverlap,
        };
      }
    });
  }

  const newWidth = (maxX - minX) * scalPercentage + 8;
  const newHeight = (maxY - minY) * scalPercentage + 8;

  const tempItem = {
    title: `Weld-${title}`,
    active: false,
    cat: "General",
    type: isAllDuct ? "Weld_Duct" : "Weld_General",
    translate: [newMinX, minY],
    width: newWidth,
    height: newHeight,
    // translate: [transX, minY],
    // width: width * scalPercentage,
    // height: height * scalPercentage,
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
    settings: {
      active: false,
      fillColor: "#659dc5",
      fontSize: 16,
      inAlarm: false,
      textColor: "inherit",
      titleColor: "inherit",
    },
    weldItems: cloneDeep(selectedItems),
    zindex: 1,
    t3Entry: null,
    id: appState.value.itemsCount + 1,
  };

  addObject(tempItem);
}

function getDuctPoints(info) {
  const { left, top, pos1, pos2, pos3, pos4 } = info;
  return [pos1, pos2, pos4, pos3].map((pos) => [left + pos[0], top + pos[1]]);
}

function isDuctOverlap(partEl) {
  const parentDuct = partEl.closest(".moveable-item.Duct");
  const element1Rect = getElementInfo(partEl);
  const elements = document.querySelectorAll(".moveable-item.Duct");
  for (const el of Array.from(elements)) {
    if (parentDuct.isSameNode(el)) continue;
    const element2Rect = getElementInfo(el);

    const points1 = getDuctPoints(element1Rect);
    const points2 = getDuctPoints(element2Rect);
    const overlapSize = getOverlapSize(points1, points2);
    if (overlapSize > 0) return true;
  }
  return false;
}

function checkIsOverlap(selectedItems) {
  const itemList = [];

  selectedItems.map((item) => {
    const { width, height, translate, rotate } = item;

    // const element = document.querySelector(`#moveable-item-${item.id}`);
    // const elRect = element.getBoundingClientRect();
    // const elInfo = getElementInfo(element);

    const startEl = document.querySelector(
      `#moveable-item-${item.id} .duct-start`
    );
    const endEl = document.querySelector(`#moveable-item-${item.id} .duct-end`);

    const isStartOverlap = isDuctOverlap(startEl);
    const isEndOverlap = isDuctOverlap(endEl);

    itemList.push({
      id: item.id,
      isStartOverlap: isStartOverlap,
      isEndOverlap: isEndOverlap,
    });
  });

  return itemList;
}

// Weld selected objects into one shape
function weldSelected() {
  Hvac.IdxPage2.weldSelected();
}

// Undo the last action
function undoAction() {
  Hvac.IdxPage2.undoAction();
}

// Redo the last undone action
function redoAction() {
  Hvac.IdxPage2.redoAction();
}

// Handle file upload (empty function, add implementation as needed)
function handleFileUploaded(data) { }

// Read a file and return its data as a promise
async function readFile(file) {
  return Hvac.IdxPage2.readFile(file);
}

// Save an image to the library or online storage
async function saveLibImage(file) {
  Hvac.IdxPage2.saveLibImage(file);
}

// Open the gauge settings dialog with the provided item data
function gaugeSettingsDialogAction(item) {
  Hvac.IdxPage2.gaugeSettingsDialogAction(item);
}

// Save the gauge settings and update the app state
function gaugeSettingsSave(item) {
  Hvac.IdxPage2.gaugeSettingsSave(item);
}

// Open the import JSON dialog
function importJsonAction() {
  importJsonDialog.value.active = true;
}

// Export the current app state to a JSON file
function exportToJsonAction() {
  Hvac.IdxPage2.exportToJsonAction();
}

// Handle the addition of an imported JSON file
async function importJsonFileAdded(file) {
  const blob = await file.data.text();
  importJsonDialog.value.data = blob;
  executeImportFromJson();
}

// Execute the import of the JSON data into the app state
function executeImportFromJson() {
  Hvac.IdxPage2.executeImportFromJson();
}

// Duplicate the selected items in the app state
function duplicateSelected() {
  Hvac.IdxPage2.duplicateSelected();
}

// Group the selected items together
function groupSelected() {
  Hvac.IdxPage2.groupSelected();
}

// Ungroup the selected items
function ungroupSelected() {
  Hvac.IdxPage2.ungroupSelected();
}

// Handle the menu action for the top toolbar
function handleMenuAction(action, val) {
  const item = appState.value.items[appState.value.activeItemIndex];
  switch (action) {
    case "newProject":
      newProject();
      break;
    case "importJsonAction":
      importJsonAction();
      break;
    case "exportToJsonAction":
      exportToJsonAction();
      break;
    case "save":
      save(true, true);
      break;
    case "undoAction":
      undoAction();
      break;
    case "redoAction":
      redoAction();
      break;
    case "duplicateSelected":
      duplicateSelected();
      break;
    case "groupSelected":
      groupSelected();
      break;
    case "ungroupSelected":
      ungroupSelected();
      break;
    case "addToLibrary":
      addToLibrary();
      break;
    case "deleteSelected":
      deleteSelected();
      break;
    case "weldSelected":
      weldSelected();
      break;
    case "duplicateObject":
      duplicateObject(item);
      break;
    case "rotate90":
      rotate90(item);
      break;
    case "rotate-90":
      rotate90(item, true);
      break;
    case "flipH":
      flipH(item);
      break;
    case "flipV":
      flipV(item);
      break;
    case "bringToFront":
      bringToFront(item);
      break;
    case "sendToBack":
      sendToBack(item);
      break;
    case "removeObject":
      removeObject(item);
      break;
    case "zoomOut":
      Hvac.IdxPage.zoomAction("out");
      break;
    case "zoomIn":
      Hvac.IdxPage.zoomAction();
      break;
    case "zoomSet":
      Hvac.IdxPage.zoomAction("set", val);
      break;
    case "copy":
      saveSelectedToClipboard();
      break;
    case "paste":
      pasteFromClipboard();
      break;
    case "link":
      linkT3EntryDialogActionV2();
      break;
    case "convertObjectType":
      convertObjectType(item, val);
      break;
    case "toggleRulersGrid":
      toggleRulersGrid(val);
      break;
    default:
      break;
  }
}

// Reload panel data by requesting the panels list
function reloadPanelsData() {
  Hvac.IdxPage2.reloadPanelsData();
}

// Create a label for an entry with optional prefix
function entryLabel(option) {
  Hvac.IdxPage2.entryLabel(option);
}

// Toggle the lock state of the application
function lockToggle() {
  Hvac.IdxPage2.lockToggle();
}

// Handle object click events based on t3Entry type
function objectClicked(item) {
  Hvac.IdxPage2.objectClicked(item);
}

// Updates an entry value
function changeEntryValue(refItem, newVal, control) {
  Hvac.IdxPage2.changeEntryValue(refItem, newVal, control);
}

// Toggles the auto/manual mode of an item
function autoManualToggle(item) {
  Hvac.IdxPage2.autoManualToggle(item);
}

function ObjectRightClicked(item, ev) {
  Hvac.IdxPage2.ObjectRightClicked(item, ev);
}

function toggleClicked(item, type, ev) {
  Hvac.IdxPage2.toggleClicked(item, type, ev);
}

function setTheSettingContextMenuVisible() {
  Hvac.IdxPage2.setTheSettingContextMenuVisible();
}

// Navigate back in the group navigation history
function navGoBack() {
  Hvac.IdxPage2.navGoBack();
}

// Remove the latest undo history entry
function objectSettingsUnchanged() {
  Hvac.IdxPage2.objectSettingsUnchanged();
}

// Add selected items to the library
async function addToLibrary() {
  Hvac.IdxPage2.addToLibrary();
}

// add new library to t3
async function addToNewLibrary() {
  Hvac.IdxPage2.addToNewLibrary();
}

// Bring selected objects to the front by increasing their z-index
function bringSelectedToFront() {
  Hvac.IdxPage2.bringSelectedToFront();
}

// Send selected objects to the back by decreasing their z-index
function sendSelectedToBack() {
  Hvac.IdxPage2.sendSelectedToBack();
}

// Rotate selected objects by 90 degrees
function rotate90Selected(minues = false) {
  Hvac.IdxPage2.rotate90Selected(minues);
}

// Save selected items to the clipboard
function saveSelectedToClipboard() {
  Hvac.IdxPage2.saveSelectedToClipboard();
}

// Paste items from the clipboard into the application state
function pasteFromClipboard() {
  Hvac.IdxPage2.pasteFromClipboard();
}

// Deletes a library item
function deleteLibItem(item) {
  Hvac.IdxPage2.deleteLibItem(item);
}

// Renames a library item
function renameLibItem(item, name) {
  Hvac.IdxPage2.renameLibItem(item, name);
}

// Deletes a library image
function deleteLibImage(item) {
  Hvac.IdxPage2.deleteLibImage(item);
}

// Converts an object to a different type
function convertObjectType(item, type) {
  Hvac.IdxPage2.convertObjectType(item, type);
}

function toggleRulersGrid(val) {
  Hvac.IdxPage2.toggleRulersGrid(val);
}

// Handles a tool being dropped
function toolDropped(ev, tool) {
  Hvac.IdxPage2.toolDropped(ev, tool);
}

const updateWeldModel = (weldModel, itemList) => {
  Hvac.IdxPage2.updateWeldModel(weldModel, itemList);
};

const updateWeldModelCanvas = (weldModel, pathItemList) => {
  Hvac.IdxPage2.updateWeldModelCanvas(weldModel, pathItemList);
};

function viewportLeftClick(ev) {
  Hvac.IdxPage2.viewportLeftClick(ev);
}

// Handles a right-click event on the viewport
function viewportRightClick(ev) {
  Hvac.IdxPage2.viewportRightClick(ev);
}

// Adds the online images to the library
function addOnlineLibImage(oItem) {
  Hvac.IdxPage2.addOnlineLibImage(oItem);
}
</script>

<style>
.viewport .selected {
  color: #fff;
  background: #333;
}

#moveable-item {
  position: relative;
  transition: transform 0.3s;
  transform-style: preserve-3d;
}

.moveable-item-wrapper:has(.Duct) {
  transform-origin: 20px center;
}

.moveable-item-wrapper:has(.Wall) {
  transform-origin: 10px center;
}

.moveable-item-wrapper:has(.Int_Ext_Wall) {
  transform-origin: 0 100%;
}

.menu-dropdown {
  max-width: 300px !important;
}

.moveable-item-wrapper {
  position: relative;
}

.nav-btns {
  left: 7rem;
}

.nav-btns.locked {
  left: 1rem;
}

.cursor-icon {
  position: absolute;
  z-index: 1;
  color: #adadad;
  display: none;
}

.viewport:hover .cursor-icon {
  display: block;
}
</style>
