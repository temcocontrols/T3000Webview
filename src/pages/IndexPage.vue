<template>
  <q-page>
    <div>
      <ToolsSidebar
        v-if="!locked"
        :selected-tool="selectedTool"
        :custom-tools="customTools"
        @select-tool="selectTool"
        @add-custom-tool="uploadObjectDialog.active = true"
      />
      <div class="viewport-wrapper">
        <top-toolbar
          @menu-action="handleMenuAction"
          :selected-count="appState.selectedTargets.length"
          :disable-undo="locked || undoHistory.length < 1"
          :disable-redo="locked || redoHistory.length < 1"
          :zoom="zoom"
        />
        <div
          class="flex fixed top-10 left-16 z-50"
          :class="{ '!left-4': locked }"
        >
          <q-btn
            v-if="grpNav.length > 1"
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
        <div class="viewport">
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
              ref="movable"
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

            <div
              v-for="item in appState.items"
              :key="item.id"
              ref="targets"
              :style="`position: absolute; transform: translate(${item.translate[0]}px, ${item.translate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY}); width: ${item.width}px; height: ${item.height}px; z-index: ${item.zindex};`"
              :id="`movable-item-${item.id}`"
              @mousedown.right="selectByRightClick"
              class="movable-item-wrapper"
            >
              <q-menu v-if="!locked" touch-position context-menu>
                <q-list>
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
                :item="item"
                :key="item.id + item.type"
                :class="{
                  link: locked && ['Icon', 'Value'].includes(item.type),
                }"
                @click="objectClicked(item)"
              />
            </div>
          </div>
        </div>
      </div>
      <ObjectConfig
        :object="appState.items[appState.activeItemIndex]"
        v-if="
          !locked &&
          (appState.activeItemIndex || appState.activeItemIndex === 0)
        "
        @refresh-selecto="refreshSelecto"
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

  <!-- Upload custom object dialog -->
  <q-dialog v-model="uploadObjectDialog.active">
    <q-card style="min-width: 450px">
      <q-card-section>
        <div class="text-h6">Upload custom SVG</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <file-upload
          :types="['image/svg+xml']"
          @uploaded="handleFileUploaded"
          @file-added="customObjectFileAdded"
          @file-removed="uploadObjectDialog.uploadBtnDisabled = true"
        />
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Cancel" @click="uploadObjectDialog.active = false" />
        <q-btn
          :disabled="uploadObjectDialog.uploadBtnDisabled"
          :loading="uploadObjectDialog.uploadBtnLoading"
          flat
          label="Save"
          @click="saveCustomObject()"
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
import { tools, T3_Types, ranges } from "../lib/common";

// Remove when deploy
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
const movable = ref(null);
const selecto = ref(null);
const viewport = ref(null);
const targets = ref([]);
const selectedTool = ref({ name: "Pointer", type: "default", svg: null });
const linkT3EntryDialog = ref({ active: false, data: null });
const T3000_Data = ref({ panelsData: [], panelsList: [], loadingPanel: null });
const uploadObjectDialog = ref({
  active: false,
  uploadBtnDisabled: true,
  uploadBtnLoading: false,
  svg: null,
});

const importJsonDialog = ref({
  addedCount: 0,
  active: false,
  uploadBtnLoading: false,
  svg: null,
});
const customTools = ref([]);
const savedNotify = ref(false);

const selectPanelOptions = ref(T3000_Data.value.panelsData);
let getPanelsInterval = null;

const loadingPanelsProgress = computed(() => {
  if (T3000_Data.value.loadingPanel === null) return 100;
  return parseInt(
    (T3000_Data.value.loadingPanel + 1 / T3000_Data.value.panelsList.length) *
      100
  );
});

// Remove when deploy
if (process.env.DEV) {
  demoDeviceData().then((data) => {
    T3000_Data.value.panelsData = data;
  });
  selectPanelOptions.value = T3000_Data.value.panelsData;
}

let panzoomInstance = null;
const emptyProject = {
  version: process.env.VERSION,
  items: [],
  selectedTargets: [],
  elementGuidelines: [],
  itemsCount: 0,
  groupCount: 0,
  customObjectsCount: 0,
  activeItemIndex: null,
  viewportTransform: { x: 0, y: 0, scale: 1 },
};
const appState = ref(cloneDeep(emptyProject));
const undoHistory = ref([]);
const redoHistory = ref([]);
const locked = ref(false);
const grpNav = ref([]);
let lastAction = null;
onMounted(() => {
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

  refreshMovable();
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
    }, 5000);
  }
});
onUnmounted(() => {
  if (panzoomInstance?.dispose) return;
  panzoomInstance.dispose();
});

window.chrome?.webview?.addEventListener("message", (arg) => {
  console.log("Recieved webview message", arg.data);
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
      setTimeout(() => {
        refreshMovable();
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
        refreshMovable();
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
      }
      T3000_Data.value.panelsData = T3000_Data.value.panelsData.filter(
        (item) => item.pid !== arg.data.panel_id
      );
      T3000_Data.value.panelsData = T3000_Data.value.panelsData.concat(
        arg.data.data
      );
      T3000_Data.value.panelsData.sort((a, b) => a.pid - b.pid);
      selectPanelOptions.value = T3000_Data.value.panelsData;
      refreshLinkedEntries(arg.data.data);
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
    }
  }
});

function refreshMovable() {
  const lines = document.querySelectorAll(".movable-item");
  Array.from(lines).forEach(function (el) {
    appState.value.elementGuidelines.push(el);
  });
}

function addActionToHistory(title) {
  console.log(title);
  setTimeout(() => {
    save();
  }, 200);
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
    (item) => `movable-item-${item.id}` === e.target.id
  );
  // item.translate = e.beforeTranslate;
  e.target.style.transform = e.transform;
}

function onDragEnd(e) {
  if (!e.lastEvent) {
    undoHistory.value.shift();
  } else {
    const item = appState.value.items.find(
      (item) => `movable-item-${item.id}` === e.target.id
    );
    item.translate = e.lastEvent.beforeTranslate;
  }
}

function onDragGroupStart(e) {
  addActionToHistory("Move Group");
  e.events.forEach((ev, i) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `movable-item-${item.id}` === ev.target.id
    );
    ev.set(appState.value.items[itemIndex].translate);
  });
}
function onDragGroup(e) {
  e.events.forEach((ev, i) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `movable-item-${item.id}` === ev.target.id
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
    movable.value.isMoveableElement(target) ||
    appState.value.selectedTargets.some(
      (t) => t === target || t.contains(target)
    )
  ) {
    e.stop();
  }
}
function onSelectoSelectEnd(e) {
  appState.value.selectedTargets = e.selected;

  const selectedItems = appState.value.items.filter((i) =>
    e.selected.some((ii) => ii.id === `movable-item-${i.id}`)
  );
  const selectedGroups = [
    ...new Set(
      selectedItems.filter((iii) => iii.group).map((iiii) => iiii.group)
    ),
  ];
  selectedGroups.forEach((item) => {
    selectGroup(item);
  });
  if (appState.value.selectedTargets.length === 1) {
    appState.value.activeItemIndex = appState.value.items.findIndex(
      (item) =>
        `movable-item-${item.id}` === appState.value.selectedTargets[0].id
    );
  } else {
    appState.value.activeItemIndex = null;
  }

  if (e.isDragStart) {
    e.inputEvent.preventDefault();

    setTimeout(() => {
      movable.value.dragStart(e.inputEvent);
    });
  }
}

function selectGroup(id) {
  const targets = [];
  appState.value.items
    .filter(
      (i) =>
        i.group === id &&
        !appState.value.selectedTargets.some(
          (ii) => ii.id === `movable-item-${i.id}`
        )
    )
    .forEach((iii) => {
      const target = document.querySelector(`#movable-item-${iii.id}`);
      targets.push(target);
    });

  appState.value.selectedTargets =
    appState.value.selectedTargets.concat(targets);
}

function onResizeStart(e) {
  addActionToHistory("Resize object");
  const itemIndex = appState.value.items.findIndex(
    (item) => `movable-item-${item.id}` === e.target.id
  );
  e.setOrigin(["%", "%"]);
  e.dragStart && e.dragStart.set(appState.value.items[itemIndex].translate);
}

function onResize(e) {
  // appState.value.items[itemIndex].width = e.width
  // appState.value.items[itemIndex].height = e.height
  // appState.value.items[itemIndex].translate = e.drag.beforeTranslate;
  const item = appState.value.items.find(
    (item) => `movable-item-${item.id}` === e.target.id
  );
  e.target.style.width = `${e.width}px`;
  e.target.style.height = `${e.height}px`;
  e.target.style.transform = `translate(${e.drag.beforeTranslate[0]}px, ${e.drag.beforeTranslate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY})`;
}
function onResizeEnd(e) {
  const itemIndex = appState.value.items.findIndex(
    (item) => `movable-item-${item.id}` === e.lastEvent.target.id
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
    (item) => `movable-item-${item.id}` === e.target.id
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
      (item) => `movable-item-${item.id}` === ev.target.id
    );
    ev.target.style.width = `${ev.width}px`;
    ev.target.style.height = `${ev.height}px`;
    ev.target.style.transform = `translate(${ev.drag.beforeTranslate[0]}px, ${ev.drag.beforeTranslate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY}) `;
  });
}
function onResizeGroupEnd(e) {
  e.events.forEach((ev) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `movable-item-${item.id}` === ev.lastEvent.target.id
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
      (item) => `movable-item-${item.id}` === ev.target.id
    );
    ev.set(appState.value.items[itemIndex].rotate);
    ev.dragStart && ev.dragStart.set(appState.value.items[itemIndex].translate);
  });
}
function onRotateGroup(e) {
  e.events.forEach((ev, i) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `movable-item-${item.id}` === ev.target.id
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
  const lines = document.querySelectorAll(".movable-item");
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

function onSelectoDragEnd(e) {
  if (
    selectedTool.value.name === "Pointer" ||
    e.rect.width < 20 ||
    e.rect.height < 20
  )
    return;
  const scalPercentage = 1 / appState.value.viewportTransform.scale;
  const item = addObject({
    title: null,
    active: false,
    type: selectedTool.value.name,
    svg: selectedTool.value.svg,
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
    settings:
      cloneDeep(
        tools.find((tool) => tool.name === selectedTool.value.name)?.settings
      ) || {},
    zindex: 1,
    t3Entry: null,
  });
  if (["Value", "Icon"].includes(selectedTool.value.name)) {
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
    const target = document.querySelector(`#movable-item-${item.id}`);
    appState.value.selectedTargets = [target];
  }, 100);
}

function selectTool({ name, type, svg }) {
  selectedTool.value.name = name;
  selectedTool.value.type = type;
  selectedTool.value.svg = svg;
}

function refreshSelecto() {
  const targetsCache = cloneDeep(appState.value.selectedTargets);
  appState.value.selectedTargets = [];
  setTimeout(() => {
    appState.value.selectedTargets = targetsCache;
  }, 10);
}

function rotate90(item, minues = false) {
  if (!item) return;
  addActionToHistory("Rotate object");
  if (!minues) {
    item.rotate = item.rotate + 90;
  } else {
    item.rotate = item.rotate - 90;
  }
  refreshSelecto();
}
function flipH(item) {
  addActionToHistory("Flip object H");
  if (item.scaleX === 1) {
    item.scaleX = -1;
  } else {
    item.scaleX = 1;
  }
  refreshSelecto();
}
function flipV(item) {
  addActionToHistory("Flip object V");
  if (item.scaleY === 1) {
    item.scaleY = -1;
  } else {
    item.scaleY = 1;
  }
  refreshSelecto();
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
  const target = document.querySelector(`#movable-item-${item.id}`);
  appState.value.selectedTargets = [target];
  appState.value.activeItemIndex = appState.value.items.findIndex(
    (ii) => ii.id === item.id
  );
}

function selectByRightClick(e) {
  selecto.value.clickTarget(e);
}

function T3UpdateEntryField({ key, obj }) {
  if (!obj.t3Entry) return;
  let fieldVal = obj.t3Entry[key];
  if (key === "value" || key === "control") {
    refreshObjectActiveValue(obj);
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
  refreshObjectActiveValue(
    appState.value.items[appState.value.activeItemIndex]
  );
  linkT3EntryDialog.value.data = null;
  linkT3EntryDialog.value.active = false;
}

function refreshObjectActiveValue(item) {
  // addActionToHistory("Update linked entry value");
  if (item.settings?.active !== undefined) {
    if (!item.t3Entry) return;
    if (item.t3Entry.type === "OUTPUT" && item.t3Entry.hw_switch_status !== 1) {
      item.settings.active = !!item.t3Entry.hw_switch_status;
    } else if (item.t3Entry.range) {
      const range = ranges.find((i) => i.id === item.t3Entry.range);
      if (range) {
        item.settings.active =
          (item.t3Entry?.digital_analog === 0 &&
            ((item.t3Entry?.control === 1 && !range.directInvers) ||
              (item.t3Entry?.control === 0 && range.directInvers))) ||
          (item.t3Entry?.digital_analog === 1 && item.t3Entry?.value > 0)
            ? true
            : false;
      }
    } else if (item.t3Entry.type === "PROGRAM") {
      item.settings.active = !!item.t3Entry.status;
    } else if (item.t3Entry.type === "SCHEDULE") {
      item.settings.active = !!item.t3Entry.output;
    } else if (item.t3Entry.type === "HOLIDAY") {
      item.settings.active = !!item.t3Entry.value;
    }
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
}

function newProject() {
  if (appState.value.items?.length > 0) {
    $q.dialog({
      dark: true,
      title: "Do you want to clear the drawing?",
      message: "This will also erase your undo history",
      cancel: true,
      persistent: true,
    })
      .onOk(() => {
        appState.value = cloneDeep(emptyProject);
        undoHistory.value = [];
        redoHistory.value = [];
        refreshSelecto();
      })
      .onCancel(() => {});
    return;
  }
  appState.value = cloneDeep(emptyProject);
  undoHistory.value = [];
  redoHistory.value = [];
  refreshSelecto();
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
    movable.value.request("draggable", { deltaX: 0, deltaY: -5 }, true);
  } else if (e.key === "down") {
    movable.value.request("draggable", { deltaX: 0, deltaY: 5 }, true);
  } else if (e.key === "left") {
    movable.value.request("draggable", { deltaX: -5, deltaY: 0 }, true);
  } else if (e.key === "right") {
    movable.value.request("draggable", { deltaX: 5, deltaY: 0 }, true);
  } else if (e.key === "delete") {
    deleteSelected();
  }
  if (["up", "down", "left", "right"].includes(e.key)) {
    refreshSelecto();
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
        (item) => `movable-item-${item.id}` === el.id
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
  refreshSelecto();
}

function redoAction() {
  if (redoHistory.value.length < 1) return;
  undoHistory.value.unshift({
    title: lastAction,
    state: cloneDeep(appState.value),
  });
  appState.value = cloneDeep(redoHistory.value[0].state);
  redoHistory.value.shift();
  refreshSelecto();
}

function handleFileUploaded(data) {
  console.log("handleFileUploaded", data);
}

async function customObjectFileAdded(file) {
  uploadObjectDialog.value.uploadBtnDisabled = false;
  const blob = await file.data.text();
  uploadObjectDialog.value.svg = blob;
}

function saveCustomObject() {
  appState.value.customObjectsCount++;
  uploadObjectDialog.value.active = false;
  uploadObjectDialog.value.uploadBtnDisabled = true;
  customTools.value.push({
    name: "Custom-" + appState.value.customObjectsCount,
    label: "Custom Object",
    svg: cloneDeep(uploadObjectDialog.value.svg),
  });
  uploadObjectDialog.value.svg = null;
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
  importJsonDialog.value.json = blob;
  executeImportFromJson();
}

function executeImportFromJson() {
  const importedState = JSON.parse(importJsonDialog.value.json);
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
        importJsonDialog.value.json = null;
        setTimeout(() => {
          refreshMovable();
        }, 100);
        refreshSelecto();
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
  importJsonDialog.value.json = null;
  setTimeout(() => {
    refreshMovable();
  }, 100);
  refreshSelecto();
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
  if (appState.value.selectedTargets.length > 0) {
    const elements = [];
    const dupGroups = {};
    appState.value.selectedTargets.forEach((el) => {
      const item = appState.value.items.find(
        (i) => `movable-item-${i.id}` === el.id
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
            `#movable-item-${dupItem.id}`
          );
          elements.push(dupElement);
        }, 10);
      }
    });
    setTimeout(() => {
      appState.value.selectedTargets = elements;
      appState.value.activeItemIndex = null;
    }, 20);
  }
}

function groupSelected() {
  if (appState.value.selectedTargets.length < 2) return;
  addActionToHistory("Group the selected objects");
  if (appState.value.selectedTargets.length > 0) {
    appState.value.groupCount++;
    appState.value.selectedTargets.forEach((el) => {
      const item = appState.value.items.find(
        (i) => `movable-item-${i.id}` === el.id
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
        (i) => `movable-item-${i.id}` === el.id
      );
      if (item) {
        item.group = undefined;
      }
    });
  }
}

function zoomAction(action = "in") {
  if (action === "out") {
    zoom.value -= 10;
  } else {
    zoom.value += 10;
  }
}

function handleMenuAction(action) {
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
        refreshObjectActiveValue(item);
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
    selectTool({ name: "Pointer", type: "default", svg: null });
  }
}

function objectClicked(item) {
  if (!locked.value) return;
  if (item.type === "Icon" || item.type === "Value") {
    if (item.t3Entry?.type === "GRP") {
      window.chrome?.webview?.postMessage({
        action: 7, // LOAD_GRAPHIC_ENTRY
        panelId: item.t3Entry.pid,
        entryIndex: item.t3Entry.index,
      });
    }
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

#movable-item {
  position: relative;
  transition: transform 0.3s;
  transform-style: preserve-3d;
}

.menu-dropdown {
  max-width: 300px !important;
}

.movable-item-wrapper {
  position: relative;
}
</style>
