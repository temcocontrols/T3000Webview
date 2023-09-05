<template>
  <q-page>
    <div>
      <ToolsSidebar
        v-if="!locked"
        :selected-tool="selectedTool"
        :images="library.images"
        :object-lib="library.objLib"
        @select-tool="selectTool"
        @delete-lib-item="deleteLibItem"
        @rename-lib-item="renameLibItem"
        @delete-lib-image="deleteLibImage"
        @save-lib-image="saveLibImage"
      />
      <div class="viewport-wrapper">
        <top-toolbar
          @menu-action="handleMenuAction"
          :object="appState.items[appState.activeItemIndex]"
          :selected-count="appState.selectedTargets?.length"
          :disable-undo="locked || undoHistory.length < 1"
          :disable-redo="locked || redoHistory.length < 1"
          :disable-paste="locked || !clipboardFull"
          :zoom="zoom"
        />
        <div
          class="flex fixed top-10 z-50 nav-btns"
          :class="{ locked: locked }"
        >
          <q-btn
            v-if="grpNav?.length > 1"
            icon="arrow_back"
            class="back-btn mr-2"
            dense
            round
            size="lg"
            color="primary"
            @click="navGoBack"
          >
            <q-tooltip anchor="top middle" self="bottom middle">
              <strong>Go back</strong>
            </q-tooltip>
          </q-btn>
          <q-btn
            :icon="locked ? 'lock_outline' : 'lock_open'"
            class="lock-btn"
            flat
            round
            dense
            size="lg"
            :color="locked ? 'primary' : 'normal'"
            @click="lockToggle"
          >
            <q-tooltip anchor="top middle" self="bottom middle">
              <strong v-if="!locked">Lock</strong>
              <strong v-else>Unlock</strong>
            </q-tooltip>
          </q-btn>
        </div>
        <div class="viewport" tabindex="0">
          <vue-selecto
            ref="selecto"
            dragContainer=".viewport"
            :selectableTargets="!locked ? targets : []"
            :hitRate="100"
            :selectByClick="!locked"
            :selectFromInside="true"
            :toggleContinueSelect="['shift']"
            :ratio="0"
            :boundContainer="true"
            @dragStart="onSelectoDragStart"
            @selectEnd="onSelectoSelectEnd"
            @dragEnd="onSelectoDragEnd"
            :dragCondition="selectoDragCondition"
          >
          </vue-selecto>
          <div ref="viewport">
            <vue-moveable
              ref="moveable"
              :draggable="!locked"
              :resizable="!locked"
              :rotatable="!locked"
              :keepRatio="false"
              :target="appState.selectedTargets"
              :snappable="!locked"
              :snapThreshold="10"
              :isDisplaySnapDigit="true"
              :snapGap="true"
              :snapDirections="{
                top: true,
                right: true,
                bottom: true,
                left: true,
              }"
              :elementSnapDirections="{
                top: true,
                right: true,
                bottom: true,
                left: true,
              }"
              :snapDigit="0"
              :elementGuidelines="appState.elementGuidelines"
              :origin="true"
              :throttleResize="0"
              :throttleRotate="0"
              rotationPosition="top"
              :originDraggable="true"
              :originRelative="true"
              :defaultGroupRotate="0"
              defaultGroupOrigin="50% 50%"
              :padding="{ left: 0, top: 0, right: 0, bottom: 0 }"
              @clickGroup="onClickGroup"
              @drag-start="onDragStart"
              @drag="onDrag"
              @drag-end="onDragEnd"
              @dragGroupStart="onDragGroupStart"
              @dragGroup="onDragGroup"
              @dragGroupEnd="onDragGroupEnd"
              @resizeStart="onResizeStart"
              @resize="onResize"
              @resizeEnd="onResizeEnd"
              @rotateStart="onRotateStart"
              @rotate="onRotate"
              @resizeGroupStart="onResizeGroupStart"
              @resizeGroup="onResizeGroup"
              @resizeGroupEnd="onResizeGroupEnd"
              @rotateGroupStart="onRotateGroupStart"
              @rotateGroup="onRotateGroup"
            >
            </vue-moveable>

            <q-menu
              v-if="contextMenuShow"
              touch-position
              target=".moveable-area"
              context-menu
            >
              <q-list>
                <q-item
                  dense
                  clickable
                  v-close-popup
                  @click="saveSelectedToClipboard"
                >
                  <q-item-section avatar>
                    <q-avatar
                      size="sm"
                      icon="content_copy"
                      color="grey-7"
                      text-color="white"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Copy</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-chip>Ctrl + C</q-chip>
                  </q-item-section>
                </q-item>
                <q-separator />
                <q-item
                  dense
                  clickable
                  v-close-popup
                  @click="duplicateSelected"
                >
                  <q-item-section avatar>
                    <q-avatar
                      size="sm"
                      icon="content_copy"
                      color="grey-7"
                      text-color="white"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Duplicate</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-chip>Ctrl + D</q-chip>
                  </q-item-section>
                </q-item>
                <q-separator />
                <q-item dense clickable v-close-popup @click="groupSelected">
                  <q-item-section avatar>
                    <q-avatar
                      size="sm"
                      icon="join_full"
                      color="grey-7"
                      text-color="white"
                    />
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
                    <q-avatar
                      size="sm"
                      icon="join_inner"
                      color="grey-7"
                      text-color="white"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Ungroup</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-chip>Ctrl + Shift + G</q-chip>
                  </q-item-section>
                </q-item>
                <q-separator />
                <q-item dense clickable v-close-popup @click="addToLibrary">
                  <q-item-section avatar>
                    <q-avatar
                      size="sm"
                      icon="library_books"
                      color="grey-7"
                      text-color="white"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Add to Library</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-chip>Ctrl + L</q-chip>
                  </q-item-section>
                </q-item>
                <q-separator />
                <q-item
                  dense
                  clickable
                  v-close-popup
                  @click="bringSelectedToFront()"
                >
                  <q-item-section avatar>
                    <q-avatar
                      size="sm"
                      icon="flip_to_front"
                      color="grey-7"
                      text-color="white"
                    />
                  </q-item-section>
                  <q-item-section class="py-2">Bring to front</q-item-section>
                </q-item>
                <q-item
                  dense
                  clickable
                  v-close-popup
                  @click="sendSelectedToBack()"
                >
                  <q-item-section avatar>
                    <q-avatar
                      size="sm"
                      icon="flip_to_back"
                      color="grey-7"
                      text-color="white"
                    />
                  </q-item-section>
                  <q-item-section class="py-2">Send to Back</q-item-section>
                </q-item>
                <q-separator />
                <q-item
                  dense
                  clickable
                  v-close-popup
                  @click="rotate90Selected()"
                >
                  <q-item-section avatar>
                    <q-avatar
                      size="sm"
                      icon="autorenew"
                      color="grey-7"
                      text-color="white"
                    />
                  </q-item-section>
                  <q-item-section>Rotate 90°</q-item-section>
                </q-item>
                <q-item
                  dense
                  clickable
                  v-close-popup
                  @click="rotate90Selected(true)"
                >
                  <q-item-section avatar>
                    <q-avatar
                      size="sm"
                      icon="sync"
                      color="grey-7"
                      text-color="white"
                    />
                  </q-item-section>
                  <q-item-section>Rotate -90°</q-item-section>
                </q-item>
                <q-separator />
                <q-item dense clickable v-close-popup @click="deleteSelected">
                  <q-item-section avatar>
                    <q-avatar
                      size="sm"
                      icon="delete"
                      color="grey-7"
                      text-color="white"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Delete</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-chip>Delete</q-chip>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>

            <div
              v-for="item in appState.items"
              :key="item.id"
              ref="targets"
              :style="`position: absolute; transform: translate(${item.translate[0]}px, ${item.translate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY}); width: ${item.width}px; height: ${item.height}px; z-index: ${item.zindex};`"
              :id="`moveable-item-${item.id}`"
              @mousedown.right="selectByRightClick"
              class="moveable-item-wrapper"
            >
              <q-menu
                v-if="!locked && appState.selectedTargets?.length === 1"
                touch-position
                context-menu
              >
                <q-list>
                  <q-item
                    dense
                    clickable
                    v-close-popup
                    @click="linkT3EntryDialogAction"
                  >
                    <q-item-section avatar>
                      <q-avatar
                        size="sm"
                        icon="link"
                        color="grey-7"
                        text-color="white"
                      />
                    </q-item-section>
                    <q-item-section>Link</q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item
                    dense
                    clickable
                    v-close-popup
                    @click="saveSelectedToClipboard"
                  >
                    <q-item-section avatar>
                      <q-avatar
                        size="sm"
                        icon="content_copy"
                        color="grey-7"
                        text-color="white"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>Copy</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-chip>Ctrl + C</q-chip>
                    </q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item
                    dense
                    clickable
                    v-close-popup
                    @click="duplicateObject(item)"
                  >
                    <q-item-section avatar>
                      <q-avatar
                        size="sm"
                        icon="file_copy"
                        color="grey-7"
                        text-color="white"
                      />
                    </q-item-section>
                    <q-item-section>Duplicate</q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item dense clickable v-close-popup @click="rotate90(item)">
                    <q-item-section avatar>
                      <q-avatar
                        size="sm"
                        icon="autorenew"
                        color="grey-7"
                        text-color="white"
                      />
                    </q-item-section>
                    <q-item-section>Rotate 90°</q-item-section>
                  </q-item>
                  <q-item
                    dense
                    clickable
                    v-close-popup
                    @click="rotate90(item, true)"
                  >
                    <q-item-section avatar>
                      <q-avatar
                        size="sm"
                        icon="sync"
                        color="grey-7"
                        text-color="white"
                      />
                    </q-item-section>
                    <q-item-section>Rotate -90°</q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item dense clickable v-close-popup @click="flipH(item)">
                    <q-item-section avatar>
                      <q-avatar
                        size="sm"
                        icon="flip"
                        color="grey-7"
                        text-color="white"
                      />
                    </q-item-section>
                    <q-item-section>Flip horizontal</q-item-section>
                  </q-item>
                  <q-item dense clickable v-close-popup @click="flipV(item)">
                    <q-item-section avatar>
                      <q-avatar
                        size="sm"
                        icon="flip"
                        color="grey-7"
                        text-color="white"
                        style="transform: rotate(90deg)"
                      />
                    </q-item-section>
                    <q-item-section>Flip vertical</q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item
                    dense
                    clickable
                    v-close-popup
                    @click="bringToFront(item)"
                  >
                    <q-item-section avatar>
                      <q-avatar
                        size="sm"
                        icon="flip_to_front"
                        color="grey-7"
                        text-color="white"
                      />
                    </q-item-section>
                    <q-item-section>Bring to front</q-item-section>
                  </q-item>
                  <q-item
                    dense
                    clickable
                    v-close-popup
                    @click="sendToBack(item)"
                  >
                    <q-item-section avatar>
                      <q-avatar
                        size="sm"
                        icon="flip_to_back"
                        color="grey-7"
                        text-color="white"
                      />
                    </q-item-section>
                    <q-item-section>Send to Back</q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item dense clickable>
                    <q-item-section avatar>
                      <q-avatar
                        size="sm"
                        icon="transform"
                        color="grey-7"
                        text-color="white"
                      />
                    </q-item-section>
                    <q-item-section>Convert to</q-item-section>
                    <q-item-section side>
                      <q-icon name="keyboard_arrow_right" />
                    </q-item-section>
                    <q-menu anchor="top end" self="top start" auto-close>
                      <q-list>
                        <q-item
                          v-for="t in tools.filter(
                            (i) =>
                              i.name !== item.type &&
                              !['Duct', 'Pointer', 'Text'].includes(i.name)
                          )"
                          :key="t.name"
                          dense
                          clickable
                          v-close-popup
                          @click="convertObjectType(item, t.name)"
                        >
                          <q-item-section avatar>
                            <q-avatar
                              size="sm"
                              :icon="t.icon"
                              color="grey-7"
                              text-color="white"
                            />
                          </q-item-section>
                          <q-item-section>{{ t.name }}</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-item>
                  <q-separator />
                  <q-item
                    dense
                    clickable
                    v-close-popup
                    @click="removeObject(item)"
                  >
                    <q-item-section avatar>
                      <q-avatar
                        size="sm"
                        icon="remove"
                        color="grey-7"
                        text-color="white"
                      />
                    </q-item-section>
                    <q-item-section>Remove</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
              <object-type
                ref="objectsRef"
                :item="item"
                :key="item.id + item.type"
                :class="{
                  link: locked && item.t3Entry,
                }"
                :show-arrows="locked && !!item.t3Entry?.range"
                @object-clicked="objectClicked(item)"
                @auto-manual-toggle="autoManualToggle(item)"
                @change-value="changeEntryValue"
              />
            </div>
          </div>
        </div>
      </div>
      <ObjectConfig
        :object="appState.items[appState.activeItemIndex]"
        v-if="
          !locked &&
          appState.items[appState.activeItemIndex] &&
          (appState.activeItemIndex || appState.activeItemIndex === 0)
        "
        @refresh-moveable="refreshMoveable"
        @T3UpdateEntryField="T3UpdateEntryField"
        @linkT3Entry="linkT3EntryDialogAction"
        @gaugeSettings="gaugeSettingsDialogAction"
        @mounted="addActionToHistory('Object settings opened')"
        @no-change="objectSettingsUnchanged"
      />
    </div>
  </q-page>
  <!-- Link entry dialog -->
  <q-dialog v-model="linkT3EntryDialog.active">
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
          <q-select
            :option-label="entryLabel"
            option-value="id"
            filled
            use-input
            hide-selected
            fill-input
            input-debounce="0"
            v-model="linkT3EntryDialog.data"
            :options="selectPanelOptions"
            @filter="selectPanelFilterFn"
            label="Select Entry"
            class="grow"
          >
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section class="grow">
                  <q-item-label>{{ entryLabel(scope.opt) }}</q-item-label>
                </q-item-section>
                <q-item-section avatar class="pl-1 min-w-0">
                  <q-chip size="sm" icon="label_important"
                    >Panel: {{ scope.opt.pid }}</q-chip
                  >
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
        <div class="flex flex-col items-center mt-4">
          <q-circular-progress
            v-if="T3000_Data.loadingPanel !== null"
            indeterminate
            show-value
            :value="loadingPanelsProgress"
            size="270px"
            :thickness="0.22"
            color="light-blue"
            track-color="grey-3"
            class="q-ma-md overflow-hidden"
          >
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
        <q-btn
          flat
          label="Save"
          :disable="!linkT3EntryDialog.data"
          color="primary"
          @click="linkT3EntrySave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
  <!-- Edit Gauge/Dial dialog -->
  <GaugeSettingsDialog
    v-model:active="gaugeSettingsDialog.active"
    :data="gaugeSettingsDialog.data"
    @saved="gaugeSettingsSave"
  />

  <!-- Import from JSON -->
  <q-dialog v-model="importJsonDialog.active">
    <q-card style="min-width: 450px">
      <q-card-section>
        <div class="text-h6">Import from a JSON file</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <file-upload
          :types="['application/json']"
          @uploaded="handleFileUploaded"
          @file-added="importJsonFileAdded"
        />
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Cancel" @click="importJsonDialog.active = false" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, toRaw, triggerRef } from "vue";
import { useQuasar, useMeta } from "quasar";
import { VueMoveable } from "vue3-moveable";
import { VueSelecto } from "vue3-selecto";
import KeyController /* , { getCombi, getKey } */ from "keycon";
import { cloneDeep } from "lodash";
import panzoom from "panzoom";
import ObjectType from "../components/ObjectType.vue";
import GaugeSettingsDialog from "../components/GaugeSettingsDialog.vue";
import FileUpload from "../components/FileUpload.vue";
import TopToolbar from "../components/TopToolbar.vue";
import ToolsSidebar from "../components/ToolsSidebar.vue";
import ObjectConfig from "../components/ObjectConfig.vue";
import {
  tools,
  T3_Types,
  getObjectActiveValue,
  T3000_Data,
} from "../lib/common";

// Dev mode only
const demoDeviceData = () => {
  if (process.env.DEV) {
    return import("../lib/demo-data").then((exps) => {
      return exps.default;
    });
  }
  return undefined;
};

const metaData = {
  title: "HVAC Drawer",
};
useMeta(metaData);
const keycon = new KeyController();
const $q = useQuasar();
const moveable = ref(null);
const selecto = ref(null);
const viewport = ref(null);
const targets = ref([]);
const selectedTool = ref({ name: "Pointer", type: "default", data: null });
const linkT3EntryDialog = ref({ active: false, data: null });

const importJsonDialog = ref({
  addedCount: 0,
  active: false,
  uploadBtnLoading: false,
  data: null,
});
const savedNotify = ref(false);
const contextMenuShow = ref(false);

const selectPanelOptions = ref(T3000_Data.value.panelsData);
let getPanelsInterval = null;

const loadingPanelsProgress = computed(() => {
  if (T3000_Data.value.loadingPanel === null) return 100;
  return parseInt(
    (T3000_Data.value.loadingPanel + 1 / T3000_Data.value.panelsList.length) *
      100
  );
});

const clipboardFull = ref(false);

// Dev mode only
if (process.env.DEV) {
  demoDeviceData().then((data) => {
    T3000_Data.value.panelsData = data.data;
    T3000_Data.value.panelsRanges = data.ranges;
    selectPanelOptions.value = T3000_Data.value.panelsData;
  });
}

let panzoomInstance = null;
const emptyProject = {
  version: process.env.VERSION,
  items: [],
  selectedTargets: [],
  elementGuidelines: [],
  itemsCount: 0,
  groupCount: 0,
  activeItemIndex: null,
  viewportTransform: { x: 0, y: 0, scale: 1 },
};
const emptyLib = {
  version: process.env.VERSION,
  imagesCount: 0,
  objLibItemsCount: 0,
  images: [],
  objLib: [],
};

const library = ref(cloneDeep(emptyLib));
const appState = ref(cloneDeep(emptyProject));
const undoHistory = ref([]);
const redoHistory = ref([]);
const locked = ref(false);
const grpNav = ref([]);
let lastAction = null;
const objectsRef = ref(null);
onMounted(() => {
  if (!window.chrome?.webview?.postMessage) {
    const localState = localStorage.getItem("appState");
    if (localState) {
      appState.value = JSON.parse(localState);
    }
  }
  window.addEventListener("beforeunload", function (event) {
    // event.returnValue = "Not saved!";
    save();
  });
  panzoomInstance = panzoom(viewport.value, {
    maxZoom: 4,
    minZoom: 0.1,
    zoomDoubleClickSpeed: 1,
    filterKey: function (/* e, dx, dy, dz */) {
      // don't let panzoom handle this event:
      return true;
    },
    beforeMouseDown: function (e) {
      // allow mouse-down panning only if altKey is down. Otherwise - ignore
      var shouldIgnore = !e.altKey;
      return shouldIgnore;
    },
  });
  panzoomInstance.on("transform", function (e) {
    appState.value.viewportTransform = e.getTransform();
    triggerRef(appState);
  });

  window.chrome?.webview?.postMessage({
    action: 1, // GET_INITIAL_DATA
  });
  window.chrome?.webview?.postMessage({
    action: 4, // GET_PANELS_LIST
  });
  if (window.chrome?.webview?.postMessage) {
    getPanelsInterval = setInterval(window.chrome.webview.postMessage, 10000, {
      action: 4, // GET_PANELS_LIST
    });

    setInterval(function () {
      if (getLinkedEntries().length === 0) return;
      window.chrome?.webview?.postMessage({
        action: 6, // GET_ENTRIES
        data: getLinkedEntries().map((ii) => {
          return {
            panelId: ii.t3Entry.pid,
            index: ii.t3Entry.index,
            type: T3_Types[ii.t3Entry.type],
          };
        }),
      });
    }, 10000);
  }
  setTimeout(() => {
    refreshMoveableGuides();
  }, 100);
});
onUnmounted(() => {
  if (panzoomInstance?.dispose) return;
  panzoomInstance.dispose();
});

window.chrome?.webview?.addEventListener("message", (arg) => {
  console.log("Recieved a message from webview", arg.data);
  if ("action" in arg.data) {
    if (arg.data.action === "GET_PANELS_LIST_RES") {
      if (arg.data.data?.length) {
        T3000_Data.value.panelsList = arg.data.data;
        T3000_Data.value.loadingPanel = 0;
        window.chrome?.webview?.postMessage({
          action: 0, // GET_PANEL_DATA
          panelId: T3000_Data.value.panelsList[0].panel_number,
        });
      }
    } else if (arg.data.action === "UPDATE_ENTRY_RES") {
    } else if (arg.data.action === "GET_INITIAL_DATA_RES") {
      if (arg.data.data) {
        arg.data.data = JSON.parse(arg.data.data);
      }
      appState.value = arg.data.data;
      grpNav.value = [arg.data.entry];
      if (arg.data.library) {
        arg.data.library = JSON.parse(arg.data.library);
        library.value = arg.data.library;
      }
      setTimeout(() => {
        refreshMoveableGuides();
      }, 100);
    } else if (arg.data.action === "LOAD_GRAPHIC_ENTRY_RES") {
      if (arg.data.data) {
        arg.data.data = JSON.parse(arg.data.data);
      }
      appState.value = arg.data.data;
      if (grpNav.value.length > 1) {
        const navItem = grpNav.value[grpNav.value.length - 2];
        if (
          navItem.index !== arg.data.entry.index ||
          navItem.pid !== arg.data.entry.pid
        ) {
          grpNav.value.push(arg.data.entry);
        } else {
          grpNav.value.pop();
        }
      } else {
        grpNav.value.push(arg.data.entry);
      }

      setTimeout(() => {
        refreshMoveableGuides();
      }, 100);
    } else if (arg.data.action === "GET_PANEL_DATA_RES") {
      if (getPanelsInterval && arg.data?.panel_id) {
        clearInterval(getPanelsInterval);
      }
      if (arg.data?.panel_id) {
        if (
          T3000_Data.value.loadingPanel !== null &&
          T3000_Data.value.loadingPanel < T3000_Data.value.panelsList.length - 1
        ) {
          T3000_Data.value.loadingPanel++;
          const index = T3000_Data.value.loadingPanel;
          window.chrome?.webview?.postMessage({
            action: 0, // GET_PANEL_DATA
            panelId: T3000_Data.value.panelsList[index].panel_number,
          });
        }
        if (
          T3000_Data.value.loadingPanel !== null &&
          T3000_Data.value.loadingPanel ===
            T3000_Data.value.panelsList.length - 1
        ) {
          T3000_Data.value.loadingPanel = null;
        }

        T3000_Data.value.panelsData = T3000_Data.value.panelsData.filter(
          (item) => item.pid !== arg.data.panel_id
        );
        T3000_Data.value.panelsData = T3000_Data.value.panelsData.concat(
          arg.data.data
        );
        T3000_Data.value.panelsData.sort((a, b) => a.pid - b.pid);
        selectPanelOptions.value = T3000_Data.value.panelsData;
        T3000_Data.value.panelsRanges = T3000_Data.value.panelsRanges.filter(
          (item) => item.pid !== arg.data.panel_id
        );
        T3000_Data.value.panelsRanges = T3000_Data.value.panelsRanges.concat(
          arg.data.ranges
        );

        refreshLinkedEntries(arg.data.data);
      }
    } else if (arg.data.action === "GET_ENTRIES_RES") {
      arg.data.data.forEach((item) => {
        const itemIndex = T3000_Data.value.panelsData.findIndex(
          (ii) =>
            ii.index === item.index &&
            ii.type === item.type &&
            ii.pid === item.pid
        );
        if (itemIndex !== -1) {
          T3000_Data.value.panelsData[itemIndex] = item;
        }
      });

      selectPanelOptions.value = T3000_Data.value.panelsData;
      refreshLinkedEntries(arg.data.data);
    } else if (arg.data.action === "SAVE_GRAPHIC_DATA_RES") {
      if (arg.data.data?.status === true) {
        if (!savedNotify.value) return;
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
          color: "negative",
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
    } else if (arg.data.action === "SAVE_IMAGE_RES") {
      library.value.imagesCount++;
      library.value.images.push({
        id: "IMG-" + library.value.imagesCount,
        name: arg.data.data.name,
        path: arg.data.data.path,
      });
      saveLib();
    }
  }
});

function refreshMoveableGuides() {
  appState.value.elementGuidelines = [];
  const lines = document.querySelectorAll(".moveable-item");
  Array.from(lines).forEach(function (el) {
    appState.value.elementGuidelines.push(el);
  });
}

function refreshObjects() {
  if (!objectsRef.value) return;
  for (const obj of objectsRef.value) {
    if (!obj.refresh) continue;
    obj.refresh();
  }
}

function addActionToHistory(title) {
  if (process.env.DEV) {
    console.log(title);
  }
  if (title !== "Move Object") {
    setTimeout(() => {
      save();
      refreshObjects();
    }, 200);
  }

  redoHistory.value = [];
  undoHistory.value.unshift({
    title,
    state: cloneDeep(appState.value),
  });

  if (undoHistory.value.length > 20) {
    undoHistory.value.pop();
  }
}

function onClickGroup(e) {
  selecto.value.clickTarget(e.inputEvent, e.inputTarget);
}

function onDragStart(e) {
  addActionToHistory("Move Object");
}
function onDrag(e) {
  const item = appState.value.items.find(
    (item) => `moveable-item-${item.id}` === e.target.id
  );
  // item.translate = e.beforeTranslate;
  e.target.style.transform = e.transform;
}

function onDragEnd(e) {
  if (!e.lastEvent) {
    undoHistory.value.shift();
  } else {
    const item = appState.value.items.find(
      (item) => `moveable-item-${item.id}` === e.target.id
    );
    item.translate = e.lastEvent.beforeTranslate;
    save();
    refreshObjects();
  }
}

function onDragGroupStart(e) {
  addActionToHistory("Move Group");
  e.events.forEach((ev, i) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `moveable-item-${item.id}` === ev.target.id
    );
    ev.set(appState.value.items[itemIndex].translate);
  });
}
function onDragGroup(e) {
  e.events.forEach((ev, i) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `moveable-item-${item.id}` === ev.target.id
    );
    appState.value.items[itemIndex].translate = ev.beforeTranslate;
  });
}
function onDragGroupEnd(e) {
  if (!e.lastEvent) {
    undoHistory.value.shift();
  }
}
function onSelectoDragStart(e) {
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
function onSelectoSelectEnd(e) {
  appState.value.selectedTargets = e.selected;

  if (e.selected && !e.inputEvent.ctrlKey) {
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
}

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

function onResizeStart(e) {
  addActionToHistory("Resize object");
  const itemIndex = appState.value.items.findIndex(
    (item) => `moveable-item-${item.id}` === e.target.id
  );
  e.setOrigin(["%", "%"]);
  e.dragStart && e.dragStart.set(appState.value.items[itemIndex].translate);
}

function onResize(e) {
  // appState.value.items[itemIndex].width = e.width
  // appState.value.items[itemIndex].height = e.height
  // appState.value.items[itemIndex].translate = e.drag.beforeTranslate;
  const item = appState.value.items.find(
    (item) => `moveable-item-${item.id}` === e.target.id
  );
  e.target.style.width = `${e.width}px`;
  e.target.style.height = `${e.height}px`;
  e.target.style.transform = `translate(${e.drag.beforeTranslate[0]}px, ${e.drag.beforeTranslate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY})`;
}
function onResizeEnd(e) {
  const itemIndex = appState.value.items.findIndex(
    (item) => `moveable-item-${item.id}` === e.lastEvent.target.id
  );
  appState.value.items[itemIndex].width = e.lastEvent.width;
  appState.value.items[itemIndex].height = e.lastEvent.height;
  appState.value.items[itemIndex].translate = e.lastEvent.drag.beforeTranslate;
}
function onRotateStart(e) {
  addActionToHistory("Rotate object");
}
function onRotate(e) {
  // e.target.style.transform = e.drag.transform;
  const item = appState.value.items.find(
    (item) => `moveable-item-${item.id}` === e.target.id
  );
  item.rotate = e.rotate;
}

function onResizeGroupStart(e) {
  e.events.forEach((ev, i) => {
    ev.dragStart && ev.dragStart.set(appState.value.items[i].translate);
  });
}
function onResizeGroup(e) {
  e.events.forEach((ev, i) => {
    const item = appState.value.items.find(
      (item) => `moveable-item-${item.id}` === ev.target.id
    );
    ev.target.style.width = `${ev.width}px`;
    ev.target.style.height = `${ev.height}px`;
    ev.target.style.transform = `translate(${ev.drag.beforeTranslate[0]}px, ${ev.drag.beforeTranslate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY}) `;
  });
}
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
}

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
function onRotateGroup(e) {
  e.events.forEach((ev, i) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `moveable-item-${item.id}` === ev.target.id
    );
    appState.value.items[itemIndex].translate = ev.drag.beforeTranslate;
    appState.value.items[itemIndex].rotate = ev.rotate;
  });
}

function addObject(item, group = undefined, addToHistory = true) {
  if (addToHistory) {
    addActionToHistory(`Add ${item.type}`);
  }
  appState.value.itemsCount++;
  item.id = appState.value.itemsCount;
  item.group = group;
  if (!item.settings.titleColor) {
    item.settings.titleColor = "inherit";
  }
  if (!item.settings.bgColor) {
    item.settings.bgColor = "inherit";
  }
  if (!item.settings.textColor) {
    item.settings.textColor = "inherit";
  }
  if (!item.settings.fontSize) {
    item.settings.fontSize = 16;
  }
  appState.value.items.push(item);
  const lines = document.querySelectorAll(".moveable-item");
  appState.value.elementGuidelines = [];
  Array.from(lines).forEach(function (el) {
    appState.value.elementGuidelines.push(el);
  });
  return item;
}

const viewportMargins = {
  top: 36,
  left: 0,
};

function addLibItem(items, e) {
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
            (e.clientX -
              viewportMargins.left -
              appState.value.viewportTransform.x) *
              scalPercentage -
            e.rect.width * scalPercentage,
          y:
            (e.clientY -
              viewportMargins.top -
              appState.value.viewportTransform.y) *
              scalPercentage -
            e.rect.height * scalPercentage,
        },
        true
      );
      setTimeout(() => {
        refreshMoveable();
      }, 1);
    }, 10);
  }, 10);
  /* setTimeout(() => {
    moveable.value.request(
      "resizable",
      {
        offsetWidth: e.rect.width * scalPercentage,
        offsetHeight: e.rect.height * scalPercentage,
      },
      true
    );
    refreshMoveable();
  }, 60); */
}

function onSelectoDragEnd(e) {
  if (
    selectedTool.value.name === "Pointer" ||
    e.rect.width < 20 ||
    e.rect.height < 20
  )
    return;

  if (selectedTool.value.type === "libItem") {
    addLibItem(selectedTool.value.data, e);
    return;
  }
  const scalPercentage = 1 / appState.value.viewportTransform.scale;

  const toolSettings =
    cloneDeep(
      tools.find((tool) => tool.name === selectedTool.value.name)?.settings
    ) || {};
  const objectSettings = Object.keys(toolSettings).reduce((acc, key) => {
    acc[key] = toolSettings[key].value;
    return acc;
  }, {});

  const tempItem = {
    title: null,
    active: false,
    type: selectedTool.value.name,
    translate: [
      (e.rect.left -
        viewportMargins.left -
        appState.value.viewportTransform.x) *
        scalPercentage,
      (e.rect.top - viewportMargins.top - appState.value.viewportTransform.y) *
        scalPercentage,
    ],
    width: e.rect.width * scalPercentage,
    height: e.rect.height * scalPercentage,
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
    settings: objectSettings,
    zindex: 1,
    t3Entry: null,
  };
  if (selectedTool.value.type === "Image") {
    tempItem.image = selectedTool.value.data;
  }
  const item = addObject(tempItem);
  if (["Value", "Icon", "Switch"].includes(selectedTool.value.name)) {
    linkT3EntryDialog.value.active = true;
  }
  // selectedTool.value.name = "Pointer"
  setTimeout(() => {
    if (locked.value) return;
    appState.value.activeItemIndex = appState.value.items.findIndex(
      (i) => i.id === item.id
    );
  }, 10);
  setTimeout(() => {
    if (locked.value) return;
    const target = document.querySelector(`#moveable-item-${item.id}`);
    appState.value.selectedTargets = [target];
    selecto.value.setSelectedTargets([target]);
  }, 100);
}

function selectTool(name, type = "default", data = null) {
  selectedTool.value.name = name;
  selectedTool.value.type = type;
  selectedTool.value.data = data;
}

function refreshMoveable() {
  // const targetsCache = cloneDeep(appState.value.selectedTargets);
  // appState.value.selectedTargets = [];
  setTimeout(() => {
    console.log(moveable.value);
    moveable.value.updateRect();
  }, 1);
}

function rotate90(item, minues = false) {
  if (!item) return;
  addActionToHistory("Rotate object");
  if (!minues) {
    item.rotate = item.rotate + 90;
  } else {
    item.rotate = item.rotate - 90;
  }
  refreshMoveable();
}
function flipH(item) {
  addActionToHistory("Flip object H");
  if (item.scaleX === 1) {
    item.scaleX = -1;
  } else {
    item.scaleX = 1;
  }
  refreshMoveable();
}
function flipV(item) {
  addActionToHistory("Flip object V");
  if (item.scaleY === 1) {
    item.scaleY = -1;
  } else {
    item.scaleY = 1;
  }
  refreshMoveable();
}

function bringToFront(item) {
  addActionToHistory("Bring object to front");
  item.zindex = item.zindex + 1;
}
function sendToBack(item) {
  addActionToHistory("Send object to back");
  item.zindex = item.zindex - 1;
}

function removeObject(item) {
  addActionToHistory("Remove object");
  const index = appState.value.items.findIndex((i) => i.id === item.id);
  appState.value.activeItemIndex = null;
  appState.value.items.splice(index, 1);

  appState.value.selectedTargets = [];
}
function duplicateObject(i) {
  addActionToHistory(`Duplicate ${i.type}`);
  appState.value.activeItemIndex = null;
  const item = cloneObject(i);
  appState.value.selectedTargets = [];
  setTimeout(() => {
    selectObject(item);
  }, 10);
}

function cloneObject(i, group = undefined) {
  const dubItem = cloneDeep(i);
  dubItem.translate[0] = dubItem.translate[0] + 5;
  dubItem.translate[1] = dubItem.translate[1] + 5;
  const item = addObject(dubItem, group, false);
  return item;
}

function selectObject(item) {
  const target = document.querySelector(`#moveable-item-${item.id}`);
  appState.value.selectedTargets = [target];
  appState.value.activeItemIndex = appState.value.items.findIndex(
    (ii) => ii.id === item.id
  );
}

function selectByRightClick(e) {
  // selecto.value.clickTarget(e);
}

function T3UpdateEntryField(key, obj) {
  if (!obj.t3Entry) return;
  let fieldVal = obj.t3Entry[key];
  if (key === "value" || key === "control") {
    refreshObjectStatus(obj);
  }
  window.chrome?.webview?.postMessage({
    action: 3, // UPDATE_ENTRY
    field: key,
    value: fieldVal,
    panelId: obj.t3Entry.pid,
    entryIndex: obj.t3Entry.index,
    entryType: T3_Types[obj.t3Entry.type],
  });
}

function selectoDragCondition(e) {
  return !e.inputEvent.altKey;
}

function linkT3EntrySave() {
  addActionToHistory("Link object to T3000 entry");
  if (
    !appState.value.items[appState.value.activeItemIndex].settings
      .t3EntryDisplayField
  ) {
    if (
      appState.value.items[appState.value.activeItemIndex].label === undefined
    ) {
      appState.value.items[
        appState.value.activeItemIndex
      ].settings.t3EntryDisplayField = "id";
    } else {
      appState.value.items[
        appState.value.activeItemIndex
      ].settings.t3EntryDisplayField = "label";
    }
  }
  appState.value.items[appState.value.activeItemIndex].t3Entry = cloneDeep(
    toRaw(linkT3EntryDialog.value.data)
  );
  // Change the icon based on the linked entry type
  if (appState.value.items[appState.value.activeItemIndex].type === "Icon") {
    let icon = "fa-solid fa-camera-retro";
    if (linkT3EntryDialog.value.data.type === "GRP") {
      icon = "fa-solid fa-camera-retro";
    } else if (linkT3EntryDialog.value.data.type === "SCHEDULE") {
      icon = "schedule";
    } else if (linkT3EntryDialog.value.data.type === "PROGRAM") {
      icon = "fa-solid fa-laptop-code";
    } else if (linkT3EntryDialog.value.data.type === "HOLIDAY") {
      icon = "calendar_month";
    }
    appState.value.items[appState.value.activeItemIndex].settings.icon = icon;
  }
  refreshObjectStatus(appState.value.items[appState.value.activeItemIndex]);
  linkT3EntryDialog.value.data = null;
  linkT3EntryDialog.value.active = false;
}

function refreshObjectStatus(item) {
  if (item.t3Entry && item.settings?.active !== undefined) {
    item.settings.active = getObjectActiveValue(item);
  }

  if (
    item.t3Entry &&
    item.t3Entry.decom !== undefined &&
    item.settings?.inAlarm !== undefined
  ) {
    item.settings.inAlarm = !!item.t3Entry.decom;
  }
}

function save(notify = false) {
  savedNotify.value = notify;
  const data = cloneDeep(toRaw(appState.value));
  data.selectedTargets = [];
  data.elementGuidelines = [];
  window.chrome?.webview?.postMessage({
    action: 2, // SAVE_GRAPHIC
    data,
  });
  if (!window.chrome?.webview?.postMessage) {
    localStorage.setItem("appState", JSON.stringify(data));
  }
}

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
        appState.value = cloneDeep(emptyProject);
        undoHistory.value = [];
        redoHistory.value = [];
        refreshMoveable();
        if (!window.chrome?.webview?.postMessage) {
          localStorage.removeItem("appState");
        }
      })
      .onCancel(() => {});
    return;
  }
  appState.value = cloneDeep(emptyProject);
  undoHistory.value = [];
  redoHistory.value = [];
  refreshMoveable();
  if (!window.chrome?.webview?.postMessage) {
    localStorage.removeItem("appState");
  }
}

keycon.keydown((e) => {
  if (e.key === "esc" && grpNav.value.length > 1) {
    navGoBack();
  }
  if (appState.value.selectedTargets.length < 1) return;

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
  if (["up", "down", "left", "right"].includes(e.key)) {
    refreshMoveable();
  }
});

keycon.keydown(["ctrl", "s"], (e) => {
  e.inputEvent.preventDefault();
  save(true);
});

keycon.keydown(["ctrl", "z"], (e) => {
  e.inputEvent.preventDefault();
  if (locked.value) return;
  undoAction();
});
keycon.keydown(["ctrl", "y"], (e) => {
  e.inputEvent.preventDefault();
  if (locked.value) return;
  redoAction();
});

keycon.keydown(["ctrl", "r"], (e) => {
  e.inputEvent.preventDefault();
  newProject();
});
keycon.keydown(["ctrl", "d"], (e) => {
  e.inputEvent.preventDefault();
  duplicateSelected();
});
keycon.keydown(["ctrl", "g"], (e) => {
  e.inputEvent.preventDefault();
  groupSelected();
});
keycon.keydown(["ctrl", "shift", "g"], (e) => {
  e.inputEvent.preventDefault();
  ungroupSelected();
});

keycon.keydown(["ctrl", "c"], (e) => {
  if (!document.activeElement.matches(".viewport")) return;
  e.inputEvent.preventDefault();
  saveSelectedToClipboard();
});

keycon.keydown(["ctrl", "v"], (e) => {
  if (!document.activeElement.matches(".viewport")) return;
  e.inputEvent.preventDefault();
  pasteFromClipboard();
});

function linkT3EntryDialogAction() {
  linkT3EntryDialog.value.active = true;
  if (!appState.value.items[appState.value.activeItemIndex]?.t3Entry) return;
  linkT3EntryDialog.value.data = cloneDeep(
    appState.value.items[appState.value.activeItemIndex]?.t3Entry
  );
}

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
function undoAction() {
  if (undoHistory.value.length < 1) return;
  redoHistory.value.unshift({
    title: lastAction,
    state: cloneDeep(appState.value),
  });
  appState.value = cloneDeep(undoHistory.value[0].state);
  undoHistory.value.shift();
  refreshMoveable();
}

function redoAction() {
  if (redoHistory.value.length < 1) return;
  undoHistory.value.unshift({
    title: lastAction,
    state: cloneDeep(appState.value),
  });
  appState.value = cloneDeep(redoHistory.value[0].state);
  redoHistory.value.shift();
  refreshMoveable();
}

function handleFileUploaded(data) {
  console.log("handleFileUploaded", data);
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    var fr = new FileReader();
    fr.onload = () => {
      resolve(fr.result);
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

async function saveLibImage(file) {
  library.value.imagesCount++;

  window.chrome?.webview?.postMessage({
    action: 9, // SAVE_IMAGE
    filename: file.name,
    fileLength: file.size,
    fileData: await readFile(file.data),
  });
}

const gaugeSettingsDialog = ref({
  active: false,
  data: { settings: tools.find((tool) => tool.name === "Gauge")?.settings },
});

function gaugeSettingsDialogAction(item) {
  gaugeSettingsDialog.value.active = true;
  gaugeSettingsDialog.value.data = item;
}

function gaugeSettingsSave(item) {
  const itemIndex = appState.value.items.findIndex((i) => i.id === item.id);
  appState.value.items[itemIndex] = item;
  gaugeSettingsDialog.value.active = false;
  gaugeSettingsDialog.value.data = {};
}

function importJsonAction() {
  importJsonDialog.value.active = true;
}

function exportToJsonAction() {
  const content = cloneDeep(toRaw(appState.value));
  content.selectedTargets = [];
  content.elementGuidelines = [];

  const a = document.createElement("a");
  const file = new Blob([JSON.stringify(content)], {
    type: "application/json",
  });
  a.href = URL.createObjectURL(file);
  a.download = "HVAC_Drawer_Project.json";
  a.click();
}

function getLinkedEntries() {
  const items = appState.value.items;
  if (items.length === 0) return [];
  return toRaw(appState.value).items.filter((i) => i.t3Entry);
}

async function importJsonFileAdded(file) {
  const blob = await file.data.text();
  importJsonDialog.value.data = blob;
  executeImportFromJson();
}

function executeImportFromJson() {
  const importedState = JSON.parse(importJsonDialog.value.data);
  if (!importedState.items?.[0].type) {
    $q.notify({
      message: "Error, Invalid json file",
      color: "negative",
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
    return;
  }

  if (appState.value.items?.length > 0) {
    $q.dialog({
      dark: true,
      title: "You have unsaved drawing!",
      message: `Before proceeding with the import, please note that any unsaved drawing will be lost,
           and your undo history will also be erased. Are you sure you want to proceed?`,
      cancel: true,
      persistent: true,
    })
      .onOk(() => {
        undoHistory.value = [];
        redoHistory.value = [];
        importJsonDialog.value.active = false;
        appState.value = importedState;
        importJsonDialog.value.data = null;
        setTimeout(() => {
          refreshMoveableGuides();
        }, 100);
        refreshMoveable();
      })
      .onCancel(() => {
        importJsonDialog.value.active = false;
      });
    return;
  }
  undoHistory.value = [];
  redoHistory.value = [];
  importJsonDialog.value.active = false;
  appState.value = importedState;
  importJsonDialog.value.data = null;
  setTimeout(() => {
    refreshMoveableGuides();
  }, 100);
  refreshMoveable();
}

const zoom = computed({
  get() {
    return parseInt(appState.value.viewportTransform.scale * 100);
  },
  // setter
  set(newValue) {
    if (!newValue) return;
    appState.value.viewportTransform.scale = newValue / 100;
    panzoomInstance.smoothZoomAbs(
      appState.value.viewportTransform.x,
      appState.value.viewportTransform.y,
      newValue / 100
    );
  },
});

function duplicateSelected() {
  if (appState.value.selectedTargets.length < 1) return;
  addActionToHistory("Duplicate the selected objects");
  const elements = [];
  const dupGroups = {};
  appState.value.selectedTargets.forEach((el) => {
    const item = appState.value.items.find(
      (i) => `moveable-item-${i.id}` === el.id
    );
    if (item) {
      let group = undefined;
      if (item.group) {
        if (!dupGroups[`${item.group}`]) {
          appState.value.groupCount++;
          dupGroups[`${item.group}`] = appState.value.groupCount;
        }

        group = dupGroups[`${item.group}`];
      }
      const dupItem = cloneObject(item, group);
      setTimeout(() => {
        const dupElement = document.querySelector(
          `#moveable-item-${dupItem.id}`
        );
        elements.push(dupElement);
      }, 10);
    }
  });
  setTimeout(() => {
    appState.value.selectedTargets = elements;
    selecto.value.setSelectedTargets(elements);
    appState.value.activeItemIndex = null;
  }, 20);
}

function groupSelected() {
  if (appState.value.selectedTargets.length < 2) return;
  addActionToHistory("Group the selected objects");
  if (appState.value.selectedTargets.length > 0) {
    appState.value.groupCount++;
    appState.value.selectedTargets.forEach((el) => {
      const item = appState.value.items.find(
        (i) => `moveable-item-${i.id}` === el.id
      );
      if (item) {
        item.group = appState.value.groupCount;
      }
    });
  }
}

function ungroupSelected() {
  if (appState.value.selectedTargets.length < 2) return;
  addActionToHistory("Ungroup the selected objects");
  if (appState.value.selectedTargets.length > 0) {
    appState.value.selectedTargets.forEach((el) => {
      const item = appState.value.items.find(
        (i) => `moveable-item-${i.id}` === el.id
      );
      if (item) {
        item.group = undefined;
      }
    });
  }
}

function zoomAction(action = "in", val = null) {
  if (action === "out") {
    zoom.value -= 10;
  } else if (action === "set") {
    zoom.value = val;
  } else {
    zoom.value += 10;
  }
}

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
      save(true);
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
      zoomAction("out");
      break;
    case "zoomIn":
      zoomAction();
      break;
    case "zoomSet":
      zoomAction("set", val);
      break;
    case "copy":
      saveSelectedToClipboard();
      break;
    case "paste":
      pasteFromClipboard();
      break;
    case "link":
      linkT3EntryDialogAction();
      break;
    case "convertObjectType":
      convertObjectType(item, val);
      break;
    default:
      break;
  }
}

function reloadPanelsData() {
  T3000_Data.value.loadingPanel = null;
  window.chrome?.webview?.postMessage({
    action: 4, // GET_PANELS_LIST
  });
}

function refreshLinkedEntries(panelData) {
  appState.value.items
    .filter((i) => i.t3Entry?.type)
    .forEach((item) => {
      const linkedEntry = panelData.find(
        (ii) =>
          ii.index === item.t3Entry.index &&
          ii.type === item.t3Entry.type &&
          ii.pid === item.t3Entry.pid
      );
      if (linkedEntry && linkedEntry.id) {
        item.t3Entry = linkedEntry;
        refreshObjectStatus(item);
      }
    });
}
function entryLabel(option) {
  let prefix =
    (option.description && option.id !== option.description) ||
    (!option.description && option.id !== option.label)
      ? option.id + " - "
      : "";
  prefix = !option.description && !option.label ? option.id : prefix;
  return prefix + (option.description || option.label || "");
}

function lockToggle() {
  appState.value.activeItemIndex = null;
  appState.value.selectedTargets = [];
  locked.value = !locked.value;
  if (locked.value) {
    selectTool("Pointer");
  }
}

function objectClicked(item) {
  if (!locked.value) return;
  if (item.t3Entry?.type === "GRP") {
    window.chrome?.webview?.postMessage({
      action: 7, // LOAD_GRAPHIC_ENTRY
      panelId: item.t3Entry.pid,
      entryIndex: item.t3Entry.index,
    });
  } else if (["SCHEDULE", "PROGRAM", "HOLIDAY"].includes(item.t3Entry?.type)) {
    window.chrome?.webview?.postMessage({
      action: 8, // OPEN_ENTRY_EDIT_WINDOW
      panelId: item.t3Entry.pid,
      entryType: T3_Types[item.t3Entry.type],
      entryIndex: item.t3Entry.index,
    });
  } else if (
    item.t3Entry?.auto_manual === 1 &&
    item.t3Entry?.digital_analog === 0 &&
    item.t3Entry?.range
  ) {
    item.t3Entry.control = item.t3Entry.control === 1 ? 0 : 1;
    T3UpdateEntryField("control", item);
  }
}

function navGoBack() {
  if (grpNav.value.length > 1) {
    const item = grpNav.value[grpNav.value.length - 2];
    window.chrome?.webview?.postMessage({
      action: 7, // LOAD_GRAPHIC_ENTRY
      panelId: item.pid,
      entryIndex: item.index,
    });
  } else {
    window.chrome?.webview?.postMessage({
      action: 1, // GET_INITIAL_DATA
    });
  }
}

function objectSettingsUnchanged() {
  undoHistory.value.shift();
}

function addToLibrary() {
  if (appState.value.selectedTargets.length < 2 || locked.value) return;
  const selectedItems = appState.value.items.filter((i) =>
    appState.value.selectedTargets.some(
      (ii) => ii.id === `moveable-item-${i.id}`
    )
  );
  library.value.objLibItemsCount++;
  library.value.objLib.push({
    name: "libItem-" + library.value.objLibItemsCount,
    label: "Item " + library.value.objLibItemsCount,
    items: cloneDeep(selectedItems),
  });
  saveLib();
}

function bringSelectedToFront() {
  addActionToHistory("Bring selected objects to front");
  const selectedItems = appState.value.items.filter((i) =>
    appState.value.selectedTargets.some(
      (ii) => ii.id === `moveable-item-${i.id}`
    )
  );
  selectedItems.forEach((item) => {
    item.zindex = item.zindex + 1;
  });
}

function sendSelectedToBack() {
  addActionToHistory("Send selected objects to back");
  const selectedItems = appState.value.items.filter((i) =>
    appState.value.selectedTargets.some(
      (ii) => ii.id === `moveable-item-${i.id}`
    )
  );
  selectedItems.forEach((item) => {
    item.zindex = item.zindex - 1;
  });
}

function rotate90Selected(minues = false) {
  moveable.value.request(
    "rotatable",
    {
      deltaRotate: minues ? -90 : 90,
    },
    true
  );
  refreshMoveable();
}

function saveSelectedToClipboard() {
  if (locked.value) return;
  if (appState.value.selectedTargets.length === 0) return;
  const selectedItems = appState.value.items.filter((i) =>
    appState.value.selectedTargets.some(
      (ii) => ii.id === `moveable-item-${i.id}`
    )
  );

  localStorage.setItem("clipboard", JSON.stringify(selectedItems));
  clipboardFull.value = true;
}

function pasteFromClipboard() {
  if (locked.value) return;
  let items = [];
  const clipboard = localStorage.getItem("clipboard");
  if (clipboard) {
    items = JSON.parse(clipboard);
  }
  if (!items) return;
  addActionToHistory("Paste");
  const elements = [];
  const addedItems = [];
  items.forEach((item) => {
    addedItems.push(cloneObject(item));
  });
  setTimeout(() => {
    addedItems.forEach((addedItem) => {
      const el = document.querySelector(`#moveable-item-${addedItem.id}`);
      elements.push(el);
    });
    appState.value.selectedTargets = elements;
    selecto.value.setSelectedTargets(elements);
    appState.value.activeItemIndex = null;
  }, 10);
}

function saveLib() {
  window.chrome?.webview?.postMessage({
    action: 10, // SAVE_LIBRARY_DATA
    data: toRaw(library.value),
  });
}

function autoManualToggle(item) {
  if (!locked.value) return;
  item.t3Entry.auto_manual = item.t3Entry.auto_manual ? 0 : 1;
  T3UpdateEntryField("auto_manual", item);
}
function deleteLibItem(item) {
  const itemIndex = library.value.objLib.findIndex(
    (obj) => obj.name === item.name
  );
  if (itemIndex !== -1) {
    library.value.objLib.splice(itemIndex, 1);
  }
  saveLib();
}
function renameLibItem(item, name) {
  const itemIndex = library.value.objLib.findIndex(
    (obj) => obj.name === item.name
  );
  if (itemIndex !== -1) {
    library.value.objLib[itemIndex].label = name;
  }
  saveLib();
}

function deleteLibImage(item) {
  const itemIndex = library.value.images.findIndex(
    (obj) => obj.name === item.name
  );
  if (itemIndex !== -1) {
    const imagePath = cloneDeep(library.value.images[itemIndex].path);
    window.chrome?.webview?.postMessage({
      action: 11, // DELETE_IMAGE
      data: toRaw(imagePath),
    });
    library.value.images.splice(itemIndex, 1);
  }
  saveLib();
}

function changeEntryValue(refItem, newVal, control) {
  const key = control ? "control" : "value";
  const item = appState.value.items.find((i) => i.id === refItem.id);
  item.t3Entry[key] = newVal;
  T3UpdateEntryField(key, item);
}
function convertObjectType(item, type) {
  if (!item) {
    item = appState.value.items[appState.value.activeItemIndex];
  }
  if (!item) return;
  addActionToHistory("Convert object to " + type);
  const toolSettings =
    cloneDeep(tools.find((tool) => tool.name === type)?.settings) || {};
  const defaultSettings = Object.keys(toolSettings).reduce((acc, key) => {
    acc[key] = toolSettings[key].value;
    return acc;
  }, {});
  const newSettings = {};
  for (const key in defaultSettings) {
    if (Object.hasOwnProperty.call(defaultSettings, key)) {
      if (item.settings[key] !== undefined) {
        newSettings[key] = item.settings[key];
      } else {
        newSettings[key] = defaultSettings[key];
      }
    }
  }
  const mainSettings = ["bgColor", "textColor", "title", "t3EntryDisplayField"];
  for (const mSetting of mainSettings) {
    if (newSettings[mSetting] === undefined) {
      newSettings[mSetting] = item.settings[mSetting];
    }
  }
  item.type = type;
  item.settings = newSettings;
}
</script>
<style>
.viewport-wrapper {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: absolute;
  top: 0;
}

.viewport {
  width: 100%;
  height: calc(100vh - 36px);
  overflow: hidden;
  position: relative;
  background-image: repeating-linear-gradient(#ccc 0 1px, transparent 1px 100%),
    repeating-linear-gradient(90deg, #ccc 0 1px, transparent 1px 100%);
  background-size: 71px 71px;
}

.viewport .selected {
  color: #fff;
  background: #333;
}

#moveable-item {
  position: relative;
  transition: transform 0.3s;
  transform-style: preserve-3d;
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
</style>
