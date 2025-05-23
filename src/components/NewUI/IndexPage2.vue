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
          :object="appStateV2.items[appStateV2.activeItemIndex]" :selected-count="appStateV2.selectedTargets?.length"
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
      <DeviceInfo2 :deviceModel="deviceModel" @updateDeviceModel="updateDeviceModel" @testSendMsg="testSendMsg">
      </DeviceInfo2>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, onUnmounted, toRaw, triggerRef, ComputedRef } from "vue";
import { useQuasar, useMeta, QVueGlobals } from "quasar";
import { VueMoveable, getElementInfo } from "vue3-moveable";
import KeyController from "keycon";
import { cloneDeep } from "lodash";
import ObjectType from "../../components/ObjectType.vue";
import GaugeSettingsDialog from "../../components/GaugeSettingsDialog.vue";
import FileUpload from "../../components/FileUpload.vue";
import TopToolbar from "../../components/TopToolbar.vue";
import ToolsSidebar2 from "./ToolsSidebar2.vue";
import ObjectConfig from "../../components/ObjectConfig.vue";
import ObjectConfig2 from "../../components/NewUI/ObjectConfig2.vue";
import { tools, demoDeviceData } from "../../lib/common";
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
import DeviceInfo2 from "src/components/NewUI/DeviceInfo2.vue";
import NewTopToolBar2 from "src/components/NewUI/NewTopToolBar2.vue";

// New import for Data
import Data from "src/lib/T3000/Hvac/Data/Data";
import { insertT3EntryDialog } from "src/lib/T3000/Hvac/Data/Data";
import Hvac from "src/lib/T3000/Hvac/Hvac";
import IdxUtils from "src/lib/T3000/Hvac/Opt/Common/IdxUtils";

import { contextMenuShow, objectConfigShow, globalMsgShow } from "src/lib/T3000/Hvac/Data/Constant/RefConstant";
import ObjectConfigNew from "src/components/NewUI/ObjectConfigNew.vue";

import {
  emptyProject, appState, deviceAppState, deviceModel, rulersGridVisible, user, library, emptyLib, isBuiltInEdge,
  documentAreaPosition, viewportMargins, viewport, locked, T3_Types, T3000_Data, grpNav, selectPanelOptions, linkT3EntryDialogV2,
  savedNotify, undoHistory, redoHistory, moveable, appStateV2
} from '../../lib/T3000/Hvac/Data/T3Data';
import IdxPage from "src/lib/T3000/Hvac/Opt/Common/IdxPage";
import T3Util from "src/lib/T3000/Hvac/Util/T3Util";
import QuasarUtil from "src/lib/T3000/Hvac/Opt/Quasar/QuasarUtil";

import { Alert as AAlert } from 'ant-design-vue';
import T3Message from "src/components/NewUI/T3Message.vue";
import AntdTest from "src/components/NewUI/AntdTest.vue";

import {
  topContextToggleVisible, showSettingMenu, toggleModeValue, toggleValueValue, toggleValueDisable, toggleValueShow, toggleNumberDisable, toggleNumberShow, toggleNumberValue,
  gaugeSettingsDialog, insertCount, selectedTool, isDrawing, snappable, keepRatio, selecto, importJsonDialog, clipboardFull
} from "src/lib/T3000/Hvac/Data/Constant/RefConstant";
import LogUtil from "src/lib/T3000/Hvac/Util/LogUtil";

// Meta information for the application
const metaData = { title: "HVAC Drawer" };
useMeta(metaData);

const keycon = new KeyController(); // Initialize key controller for handling keyboard events
const $q: QVueGlobals = useQuasar(); // Access Quasar framework instance

// Computed property for loading panels progress
const loadingPanelsProgress: ComputedRef<number> = computed(() => {
  if (T3000_Data.value.loadingPanel === null) return 100;
  return Math.round(((T3000_Data.value.loadingPanel + 1) / T3000_Data.value.panelsList.length) * 100);
});

const zoom = Hvac.IdxPage.zoom;

// Dev mode only
if (process.env.DEV) {
  console.log("process.env.dev",T3000_Data)
  demoDeviceData().then((data) => {
    T3000_Data.value.panelsData = data.data;
    T3000_Data.value.panelsRanges = data.ranges;
    selectPanelOptions.value = T3000_Data.value.panelsData;
  });
}

// Lifecycle hook for component mount
onMounted(() => {
  Hvac.UI.Initialize($q); // Initialize the HVAC UI
  Hvac.IdxPage2.initQuasar($q);
  Hvac.IdxPage2.initPage();
});

function updateDeviceModel(isActive: boolean, data: any): void {
  Hvac.IdxPage2.updateDeviceModel(isActive, data);
}

function showMoreDevices(): void {
  Hvac.IdxPage2.showMoreDevices();
}

onBeforeUnmount(() => { })

// Lifecycle hook for component unmount
onUnmounted(() => {
  Hvac.IdxPage.clearAutoSaveInterval();
  Hvac.WsClient.clearInitialDataInterval();
  Hvac.IdxPage.clearIdx();
});

function viewportMouseMoved(e: MouseEvent): void {
  Hvac.IdxPage2.viewportMouseMoved(e);
}

// Refreshes objects by calling their refresh method, if available
function refreshObjects(): void {
  Hvac.IdxPage2.refreshObjects();
}

// Adds an action to the history for undo/redo functionality
function addActionToHistory(title: string): void {
  Hvac.IdxPage2.addActionToHistory(title);
}

// Handles click events on group elements
function onClickGroup(e: any): void {
  selecto.value.clickTarget(e.inputEvent, e.inputTarget);
}

// Starts dragging an element
function onDragStart(e: any): void {
  addActionToHistory("Move Object");
}

// Handles dragging of an element
function onDrag(e: any): void {
  Hvac.IdxPage2.onDrag(e);
}

// Ends the dragging of an element
function onDragEnd(e: any): void {
  Hvac.IdxPage2.onDragEnd(e);
}

// Starts dragging a group of elements
function onDragGroupStart(e: any): void {
  Hvac.IdxPage2.onDragGroupStart(e);
}

// Handles dragging of a group of elements
function onDragGroup(e: any): void {
  Hvac.IdxPage2.onDragGroup(e);
}

// Ends the dragging of a group of elements
function onDragGroupEnd(e: any): void {
  Hvac.IdxPage2.onDragGroupEnd(e);
}

// Handles the start of a selecto drag event
function onSelectoDragStart(e: any): void {
  Hvac.IdxPage2.onSelectoDragStart(e);
}

// Handles the end of a selecto select event
function onSelectoSelectEnd(e: any): void {
  Hvac.IdxPage2.onSelectoSelectEnd(e);
}

// Selects a group of elements by their group ID
function selectGroup(id: string): void {
  Hvac.IdxPage2.selectGroup(id);
}

// Starts resizing an element
function onResizeStart(e: any): void {
  Hvac.IdxPage2.onResizeStart(e);
}

// Handles resizing of an element
function onResize(e: any): void {
  Hvac.IdxPage2.onResize(e);
}

// Ends the resizing of an element
function onResizeEnd(e: any): void {
  Hvac.IdxPage2.onResizeEnd(e);
}

// Starts rotating an element
function onRotateStart(e: any): void {
  addActionToHistory("Rotate object");
}

// Handles rotating of an element
function onRotate(e: any): void {
  Hvac.IdxPage2.onRotate(e);
}

// Refreshes objects on rotate end
function onRotateEnd(e: any): void {
  refreshObjects();
}

// refreshes objects on rotate group end
function onRotateGroupEnd(e: any): void {
  refreshObjects();
}

// Maintaining aspect ratio on resize group start
function onResizeGroupStart(e: any): void {
  keepRatio.value = true;
}

// Handles resizing of a group of elements
function onResizeGroup(e: any): void {
  Hvac.IdxPage2.onResizeGroup(e);
}

// Ends the resizing of a group of elements and updates the app state
function onResizeGroupEnd(e: any): void {
  Hvac.IdxPage2.onResizeGroupEnd(e);
}

// Starts rotating a group of elements and adds the action to the history
function onRotateGroupStart(e: any): void {
  Hvac.IdxPage2.onRotateGroupStart(e);
}

// Handles rotating of a group of elements and updates their state
function onRotateGroup(e: any): void {
  Hvac.IdxPage2.onRotateGroup(e);
}

// Adds a library item to the app state and updates selection
function addLibItem(items: any[], size: any, pos: any): void {
  Hvac.IdxPage2.addLibItem(items, size, pos);
}

// Select a tool and set its type
function selectTool(tool: any, type: string = "default"): void {
  Hvac.IdxPage2.selectTool(tool, type);
}

// Rotate an item by 90 degrees, optionally in the negative direction
function rotate90(item: any, minues: boolean = false): void {
  Hvac.IdxPage2.rotate90(item, minues);
}

// Flip an item horizontally
function flipH(item: any): void {
  Hvac.IdxPage2.flipH(item);
}

// Flip an item vertically
function flipV(item: any): void {
  Hvac.IdxPage2.flipV(item);
}

// Bring an item to the front by increasing its z-index
function bringToFront(item: any): void {
  Hvac.IdxPage2.bringToFront(item);
}

// Send an item to the back by decreasing its z-index
function sendToBack(item: any): void {
  Hvac.IdxPage2.sendToBack(item);
}

// Remove an item from the app state
function removeObject(item: any): void {
  Hvac.IdxPage2.removeObject(item);
}

// Duplicate an item and select the new copy
function duplicateObject(i: any): void {
  Hvac.IdxPage2.duplicateObject(i);
}

// Clone an object and adjust its position slightly
function cloneObject(i: any, group: any = undefined): void {
  Hvac.IdxPage2.cloneObject(i, group);
}

// Select an object and update the app state
function selectObject(item: any): void {
  Hvac.IdxPage2.selectObject(item);
}

// Handle right-click selection
function selectByRightClick(e: MouseEvent): void {
  // selecto.value.clickTarget(e);
}

// Update a T3 entry field for an object
function T3UpdateEntryField(key: string, obj: any): void {
  Hvac.IdxPage2.T3UpdateEntryField(key, obj);
}

// Trigger the save event when user changed the "Display Field" value
function DisplayFieldValueChanged(value: any): void {
  LogUtil.Debug("= IdxPage DX DisplayFieldValueChanged", value);
  save(false, true);
}

// Define a condition for drag events in Selecto
function selectoDragCondition(e: any): boolean {
  return !e.inputEvent.altKey;
}

// Save the linked T3 entry for an object and update its icon if necessary
function linkT3EntrySaveV2(): void {
  QuasarUtil.LinkT3EntrySaveV2();
}

// Filter function for selecting panels in the UI
function selectPanelFilterFn(val: string, update: Function): void {
  LogUtil.Debug("selectPanelFilterFn")
  Hvac.IdxPage2.selectPanelFilterFn(val, update);
}

// Insert Key Function
function insertT3EntrySelect(value: any): void {
  Hvac.IdxPage2.insertT3EntrySelect(value);
}

function insertT3EntryOnSave(): void {
  Hvac.IdxPage2.insertT3EntryOnSave();
}

function insertT3DefaultLoadData(): void {
}

// Save the current app state, optionally displaying a notification
function save(notify: boolean = false, saveToT3: boolean = false): void {
  LogUtil.Debug("= IdxPage save", notify, saveToT3);
  Hvac.IdxPage2.save(notify, saveToT3);
}

function refreshMoveable(): void {
  Hvac.IdxPage.refreshMoveable();
}

// Create a new project, optionally confirming with the user if there's existing data
function newProject(): void {
  Hvac.IdxPage2.newProject();
}

// Handle keyup event for keyboard control
keycon.keyup((e: any) => {
  // Enable snapping when the "ctrl" key is released
  if (e.key === "ctrl") {
    snappable.value = true;
  }
});

// Handle keydown event for keyboard control
keycon.keydown((e: any) => {
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
  if (appStateV2.value.selectedTargets.length < 1) return;

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

// Other keyboard handlers
keycon.keydown(["ctrl", "s"], (e: any) => {
  e.inputEvent.preventDefault();
  save(true, true);
});

keycon.keydown(["ctrl", "z"], (e: any) => {
  e.inputEvent.preventDefault();
  if (locked.value) return;
  undoAction();
});

keycon.keydown(["ctrl", "y"], (e: any) => {
  e.inputEvent.preventDefault();
  if (locked.value) return;
  redoAction();
});

keycon.keydown(["ctrl", "r"], (e: any) => {
  e.inputEvent.preventDefault();
  newProject();
});

keycon.keydown(["ctrl", "d"], (e: any) => {
  e.inputEvent.preventDefault();
  duplicateSelected();
});

keycon.keydown(["ctrl", "g"], (e: any) => {
  e.inputEvent.preventDefault();
  groupSelected();
});

keycon.keydown(["ctrl", "shift", "g"], (e: any) => {
  e.inputEvent.preventDefault();
  ungroupSelected();
});

keycon.keydown(["ctrl", "c"], (e: any) => {
  if (!document.activeElement?.matches(".viewport")) return;
  e.inputEvent.preventDefault();
  saveSelectedToClipboard();
});

keycon.keydown(["ctrl", "v"], (e: any) => {
  if (!document.activeElement?.matches(".viewport")) return;
  e.inputEvent.preventDefault();
  pasteFromClipboard();
});

keycon.keydown(["ctrl", "b"], (e: any) => {
  e.inputEvent.preventDefault();
  weldSelected();
});

keycon.keydown(["insert"], (e: any) => {
  T3000.Hvac.KiOpt.InsertT3EntryDialog();
});

// Open the dialog to link a T3 entry
function linkT3EntryDialogActionV2(): void {
  QuasarUtil.LinkT3EntryDialogActionV2();
}

// Delete selected objects from the app state
function deleteSelected(): void {
  Hvac.IdxPage2.deleteSelected();
}

function drawWeldObject(selectedItems: any[]): void {
  Hvac.IdxPage2.drawWeldObject(selectedItems);
}

// Draw weld objects with canvas
function drawWeldObjectCanvas(selectedItems: any[]): void {
  Hvac.IdxPage2.drawWeldObjectCanvas(selectedItems);
}

function getDuctPoints(info: any): void {
  Hvac.IdxPage2.getDuctPoints(info);
}

function isDuctOverlap(partEl: any): void {
  Hvac.IdxPage2.isDuctOverlap(partEl);
}

function checkIsOverlap(selectedItems: any[]): void {
  Hvac.IdxPage2.checkIsOverlap(selectedItems);
}

// Weld selected objects into one shape
function weldSelected(): void {
  Hvac.IdxPage2.weldSelected();
}

// Undo the last action
function undoAction(): void {
  Hvac.IdxPage2.undoAction();
}

// Redo the last undone action
function redoAction(): void {
  Hvac.IdxPage2.redoAction();
}

// Handle file upload (empty function, add implementation as needed)
function handleFileUploaded(data: any): void { }

// Read a file and return its data as a promise
async function readFile(file: File): Promise<string> {
  return Hvac.IdxPage2.readFile(file) as Promise<string>;
}

// Save an image to the library or online storage
async function saveLibImage(file: File): Promise<void> {
  Hvac.IdxPage2.saveLibImage(file);
}

// Open the gauge settings dialog with the provided item data
function gaugeSettingsDialogAction(item: any): void {
  Hvac.IdxPage2.gaugeSettingsDialogAction(item);
}

// Save the gauge settings and update the app state
function gaugeSettingsSave(item: any): void {
  Hvac.IdxPage2.gaugeSettingsSave(item);
}

// Open the import JSON dialog
function importJsonAction(): void {
  importJsonDialog.value.active = true;
}

// Export the current app state to a JSON file
function exportToJsonAction(): void {
  Hvac.IdxPage2.exportToJsonAction();
}

// Handle the addition of an imported JSON file
async function importJsonFileAdded(file: any): Promise<void> {
  const blob = await file.data.text();
  importJsonDialog.value.data = blob;
  executeImportFromJson();
}

// Execute the import of the JSON data into the app state
function executeImportFromJson(): void {
  Hvac.IdxPage2.executeImportFromJson();
}

// Duplicate the selected items in the app state
function duplicateSelected(): void {
  Hvac.IdxPage2.duplicateSelected();
}

// Group the selected items together
function groupSelected(): void {
  Hvac.IdxPage2.groupSelected();
}

// Ungroup the selected items
function ungroupSelected(): void {
  Hvac.IdxPage2.ungroupSelected();
}

// Handle the menu action for the top toolbar
function handleMenuAction(action: string, val?: any): void {
  const item = appStateV2.value.items[appStateV2.value.activeItemIndex];
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
function reloadPanelsData(): void {
  Hvac.IdxPage2.reloadPanelsData();
}

// Create a label for an entry with optional prefix
function entryLabel(option: any): string {
  return Hvac.IdxPage2.entryLabel(option) || '';
}

// Toggle the lock state of the application
function lockToggle(): void {
  Hvac.IdxPage2.lockToggle();
}

// Handle object click events based on t3Entry type
function objectClicked(item: any): void {
  Hvac.IdxPage2.objectClicked(item);
}

// Updates an entry value
function changeEntryValue(refItem: any, newVal: any, control: any): void {
  Hvac.IdxPage2.changeEntryValue(refItem, newVal, control);
}

// Toggles the auto/manual mode of an item
function autoManualToggle(item: any): void {
  Hvac.IdxPage2.autoManualToggle(item);
}

function ObjectRightClicked(item: any, ev: MouseEvent): void {
  Hvac.IdxPage2.ObjectRightClicked(item, ev);
}

function toggleClicked(item: any, type: string, ev: MouseEvent): void {
  Hvac.IdxPage2.toggleClicked(item, type, ev);
}

function setTheSettingContextMenuVisible(): void {
  Hvac.IdxPage2.setTheSettingContextMenuVisible();
}

// Navigate back in the group navigation history
function navGoBack(): void {
  Hvac.IdxPage2.navGoBack();
}

// Remove the latest undo history entry
function objectSettingsUnchanged(): void {
  Hvac.IdxPage2.objectSettingsUnchanged();
}

// Add selected items to the library
async function addToLibrary(): Promise<void> {
  Hvac.IdxPage2.addToLibrary();
}

// add new library to t3
async function addToNewLibrary(): Promise<void> {
  Hvac.IdxPage2.addToNewLibrary();
}

// Bring selected objects to the front by increasing their z-index
function bringSelectedToFront(): void {
  Hvac.IdxPage2.bringSelectedToFront();
}

// Send selected objects to the back by decreasing their z-index
function sendSelectedToBack(): void {
  Hvac.IdxPage2.sendSelectedToBack();
}

// Rotate selected objects by 90 degrees
function rotate90Selected(minues: boolean = false): void {
  Hvac.IdxPage2.rotate90Selected(minues);
}

// Save selected items to the clipboard
function saveSelectedToClipboard(): void {
  Hvac.IdxPage2.saveSelectedToClipboard();
}

// Paste items from the clipboard into the application state
function pasteFromClipboard(): void {
  Hvac.IdxPage2.pasteFromClipboard();
}

// Deletes a library item
function deleteLibItem(item: any): void {
  Hvac.IdxPage2.deleteLibItem(item);
}

// Renames a library item
function renameLibItem(item: any, name: string): void {
  Hvac.IdxPage2.renameLibItem(item, name);
}

// Deletes a library image
function deleteLibImage(item: any): void {
  Hvac.IdxPage2.deleteLibImage(item);
}

// Converts an object to a different type
function convertObjectType(item: any, type: string): void {
  Hvac.IdxPage2.convertObjectType(item, type);
}

function toggleRulersGrid(val: any): void {
  Hvac.IdxPage2.toggleRulersGrid(val);
}

// Handles a tool being dropped
function toolDropped(ev: DragEvent, tool: any): void {
  Hvac.IdxPage2.toolDropped(ev, tool);
}

const updateWeldModel = (weldModel: any, itemList: any[]): void => {
  Hvac.IdxPage2.updateWeldModel(weldModel, itemList);
};

const updateWeldModelCanvas = (weldModel: any, pathItemList: any[]): void => {
  Hvac.IdxPage2.updateWeldModelCanvas(weldModel, pathItemList);
};

function viewportLeftClick(ev: MouseEvent): void {
  Hvac.IdxPage2.viewportLeftClick(ev);
}

// Handles a right-click event on the viewport
function viewportRightClick(ev: MouseEvent): void {
  Hvac.IdxPage2.viewportRightClick(ev);
}

// Adds the online images to the library
function addOnlineLibImage(oItem: any): void {
  Hvac.IdxPage2.addOnlineLibImage(oItem);
}
</script>

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

<style scoped>
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
