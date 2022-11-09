<template>
  <q-page>
    <div class="flex no-wrap items-start justify-between">
      <div class="tools flex column">
        <q-list class="rounded-borders text-primary">
          <q-item
            v-for="tool in tools"
            :key="tool.name"
            @click="selectTool(tool.name)"
            clickable
            v-ripple
            :active="selectedTool === tool.name"
            active-class="active-tool"
          >
            <q-tooltip anchor="center right" self="center left">
              {{ tool.label }}
            </q-tooltip>
            <q-item-section>
              <q-icon :name="tool.icon" size="sm" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <div class="viewport">
        <q-toolbar class="toolbar text-white shadow-2">
          <q-btn-dropdown
            no-caps
            stretch
            flat
            content-class="menu-dropdown"
            label="File"
          >
            <q-list>
              <q-item
                dense
                clickable
                v-close-popup
                @click="newProject"
                tabindex="0"
              >
                <q-item-section avatar>
                  <q-avatar
                    size="md"
                    icon="assignment"
                    color="primary"
                    text-color="white"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>New Project</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator inset spaced />
              <q-item dense clickable v-close-popup @click="save" tabindex="0">
                <q-item-section avatar>
                  <q-avatar
                    size="md"
                    icon="assignment"
                    color="primary"
                    text-color="white"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Save</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-chip>Ctrl + S</q-chip>
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
          <q-btn no-caps stretch flat label="Edit" />
          <q-btn no-caps stretch flat label="Object" />
        </q-toolbar>
        <vue-selecto
          ref="selecto"
          dragContainer=".viewport"
          v-bind:selectableTargets="targets"
          v-bind:hitRate="100"
          v-bind:selectByClick="true"
          v-bind:selectFromInside="true"
          v-bind:toggleContinueSelect="['shift']"
          v-bind:ratio="0"
          :boundContainer="true"
          @dragStart="onDragStart"
          @selectEnd="onSelectEnd"
          @dragEnd="onSelectoDragEnd"
          :dragCondition="selectoDragCondition"
        >
        </vue-selecto>
        <div ref="viewport">
          <vue-moveable
            ref="movable"
            v-bind:draggable="true"
            v-bind:resizable="true"
            v-bind:rotatable="true"
            v-bind:target="appState.selectedTargets"
            :snappable="true"
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
            @drag="onDrag"
            @dragGroupStart="onDragGroupStart"
            @dragGroup="onDragGroup"
            @resizeStart="onResizeStart"
            @resize="onResize"
            @resizeEnd="onResizeEnd"
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
            <q-menu touch-position context-menu>
              <q-list dense style="min-width: 100px">
                <q-item clickable v-close-popup @click="duplicateObject(item)">
                  <q-item-section>Duplicate</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="rotete90(item)">
                  <q-item-section>Rotate 90°</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="rotete90(item, true)">
                  <q-item-section>Rotate -90°</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable v-close-popup @click="flipH(item)">
                  <q-item-section>Flip horizontal</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="flipV(item)">
                  <q-item-section>Flip vertical</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable v-close-popup @click="bringToFront(item)">
                  <q-item-section>Bring to front</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="sendToBack(item)">
                  <q-item-section>Send to Back</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable v-close-popup @click="removeObject(item)">
                  <q-item-section>Remove</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
            <object-type :item="item" />
          </div>
        </div>
      </div>
      <div
        class="item-config flex flex-nowrap column"
        v-if="appState.activeItemIndex || appState.activeItemIndex === 0"
      >
        <div class="item-config-inner">
          <q-expansion-item
            class="mb-2 border border-solid border-gray-700"
            dark
            default-opened
            label="General"
          >
            <div class="grid gap-4 grid-cols-2 mb-4">
              <q-input
                input-style="width: 60px"
                @update:model-value="refreshSelecto"
                label="X"
                v-model.number="
                  appState.items[appState.activeItemIndex].translate[0]
                "
                dark
                filled
                type="number"
              />
              <q-input
                input-style="width: 60px"
                @update:model-value="refreshSelecto"
                label="Y"
                v-model.number="
                  appState.items[appState.activeItemIndex].translate[1]
                "
                dark
                filled
                type="number"
              />

              <q-input
                input-style="width: 60px"
                @update:model-value="refreshSelecto"
                label="Width"
                v-model.number="appState.items[appState.activeItemIndex].width"
                dark
                filled
                type="number"
              />
              <q-input
                input-style="width: 60px"
                @update:model-value="refreshSelecto"
                label="Height"
                v-model.number="appState.items[appState.activeItemIndex].height"
                dark
                filled
                type="number"
              />
              <q-input
                input-style="width: 60px"
                @update:model-value="refreshSelecto"
                label="Rotate"
                v-model.number="appState.items[appState.activeItemIndex].rotate"
                dark
                filled
                type="number"
              />
              <q-input
                v-if="
                  appState.items[appState.activeItemIndex].props.fontSize !==
                  undefined
                "
                input-style="width: 60px"
                label="Font size"
                v-model.number="
                  appState.items[appState.activeItemIndex].props.fontSize
                "
                dark
                filled
                type="number"
              />
              <q-input
                dark
                filled
                v-model="appState.items[appState.activeItemIndex].props.color"
                label="Color"
                v-if="
                  appState.items[appState.activeItemIndex].props.color !==
                  undefined
                "
              >
                <template v-slot:append>
                  <q-icon name="colorize" class="cursor-pointer">
                    <q-popup-proxy
                      cover
                      transition-show="scale"
                      transition-hide="scale"
                    >
                      <q-color
                        v-model="
                          appState.items[appState.activeItemIndex].props.color
                        "
                      />
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
            <q-checkbox
              v-if="
                !appState.items[appState.activeItemIndex].t3Entry &&
                appState.items[appState.activeItemIndex].props.active !==
                  undefined
              "
              dark
              filled
              v-model="appState.items[appState.activeItemIndex].props.active"
              class="text-white w-full"
              label="Active"
              :disable="
                (appState.items[appState.activeItemIndex].t3Entry &&
                  appState.items[appState.activeItemIndex].t3Entry
                    ?.auto_manual === 0) ||
                appState.items[appState.activeItemIndex].t3Entry
                  ?.digital_analog === 1
              "
            >
              <q-tooltip
                v-if="
                  appState.items[appState.activeItemIndex].t3Entry
                    ?.auto_manual === 0
                "
                anchor="center left"
                self="center end"
              >
                Can't activate it because the linked entry is in auto mode
              </q-tooltip></q-checkbox
            >
            <q-checkbox
              dark
              filled
              v-model="appState.items[appState.activeItemIndex].props.inAlarm"
              class="text-white w-full"
              label="In alarm"
              v-if="
                appState.items[appState.activeItemIndex].props.inAlarm !==
                undefined
              "
            />
          </q-expansion-item>

          <div>
            <q-btn
              dark
              outline
              no-caps
              stretch
              :icon="
                appState.items[appState.activeItemIndex].t3Entry
                  ? 'dataset_linked'
                  : undefined
              "
              class="text-white w-full"
              :label="
                !appState.items[appState.activeItemIndex].t3Entry
                  ? 'Link with an entry'
                  : `Linked with ${
                      appState.items[appState.activeItemIndex].t3Entry
                        .description
                    }`
              "
              @click="linkT3EntryDialogAction"
            />
            <q-expansion-item
              v-if="appState.items[appState.activeItemIndex].t3Entry"
              class="mt-2 border border-solid border-gray-700"
              dark
              default-opened
              label="Entry settings"
            >
              <q-select
                class="mb-1"
                filled
                dark
                v-model="
                  appState.items[appState.activeItemIndex].t3Entry.auto_manual
                "
                :options="[
                  { label: 'Auto', value: 0 },
                  { label: 'Manual', value: 1 },
                ]"
                label="Auto/Manual"
                emit-value
                map-options
                @update:model-value="
                  T3UpdateEntryField(
                    'auto_manual',
                    appState.items[appState.activeItemIndex]
                  )
                "
              />
              <q-select
                class="mb-1"
                v-if="
                  appState.items[appState.activeItemIndex].t3Entry
                    .digital_analog === 0 &&
                  appState.items[appState.activeItemIndex].t3Entry.range
                "
                :disable="
                  appState.items[appState.activeItemIndex].t3Entry
                    ?.auto_manual === 0
                "
                filled
                dark
                v-model="
                  appState.items[appState.activeItemIndex].t3Entry.control
                "
                :options="[
                  {
                    label: getRangeById(
                      appState.items[appState.activeItemIndex].t3Entry.range
                    ).off,
                    value: 0,
                  },
                  {
                    label: getRangeById(
                      appState.items[appState.activeItemIndex].t3Entry.range
                    ).on,
                    value: 1,
                  },
                ]"
                label="Value"
                emit-value
                map-options
                @update:model-value="
                  T3UpdateEntryField(
                    'control',
                    appState.items[appState.activeItemIndex]
                  )
                "
              />
              <!-- Program status -->
              <q-select
                class="mb-1"
                v-if="
                  appState.items[appState.activeItemIndex].t3Entry.type ===
                  'PROGRAM'
                "
                :disable="
                  appState.items[appState.activeItemIndex].t3Entry
                    ?.auto_manual === 0
                "
                filled
                dark
                v-model="
                  appState.items[appState.activeItemIndex].t3Entry.status
                "
                :options="[
                  {
                    label: 'OFF',
                    value: 0,
                  },
                  {
                    label: 'ON',
                    value: 1,
                  },
                ]"
                label="Status"
                emit-value
                map-options
                @update:model-value="
                  T3UpdateEntryField(
                    'status',
                    appState.items[appState.activeItemIndex]
                  )
                "
              />
              <!-- Schedule output -->
              <q-select
                class="mb-1"
                v-else-if="
                  appState.items[appState.activeItemIndex].t3Entry.type ===
                  'SCHEDULE'
                "
                :disable="
                  appState.items[appState.activeItemIndex].t3Entry
                    ?.auto_manual === 0
                "
                filled
                dark
                v-model="
                  appState.items[appState.activeItemIndex].t3Entry.output
                "
                :options="[
                  {
                    label: 'OFF',
                    value: 0,
                  },
                  {
                    label: 'ON',
                    value: 1,
                  },
                ]"
                label="Output"
                emit-value
                map-options
                @update:model-value="
                  T3UpdateEntryField(
                    'output',
                    appState.items[appState.activeItemIndex]
                  )
                "
              />
              <!-- Holiday value -->
              <q-select
                class="mb-1"
                v-else-if="
                  appState.items[appState.activeItemIndex].t3Entry.type ===
                  'HOLIDAY'
                "
                :disable="
                  appState.items[appState.activeItemIndex].t3Entry
                    ?.auto_manual === 0
                "
                filled
                dark
                v-model="appState.items[appState.activeItemIndex].t3Entry.value"
                :options="[
                  {
                    label: 'OFF',
                    value: 0,
                  },
                  {
                    label: 'ON',
                    value: 1,
                  },
                ]"
                label="Value"
                emit-value
                map-options
                @update:model-value="
                  T3UpdateEntryField(
                    'value',
                    appState.items[appState.activeItemIndex]
                  )
                "
              />
              <!-- Analog range value -->
              <q-input
                class="mb-1"
                v-if="
                  appState.items[appState.activeItemIndex].t3Entry
                    .digital_analog === 1
                "
                :disable="
                  appState.items[appState.activeItemIndex].t3Entry
                    ?.auto_manual === 0
                "
                filled
                dark
                type="number"
                v-model.number="
                  appState.items[appState.activeItemIndex].t3Entry.value
                "
                label="Value"
                @update:model-value="
                  T3UpdateEntryField(
                    'value',
                    appState.items[appState.activeItemIndex]
                  )
                "
              />
              <!-- Display field -->
              <q-select
                filled
                dark
                v-model="
                  appState.items[appState.activeItemIndex].t3EntryDisplayField
                "
                :options="[
                  {
                    label: 'Value',
                    value:
                      appState.items[appState.activeItemIndex].t3Entry
                        ?.digital_analog === 1
                        ? 'value'
                        : 'control',
                  },
                  { label: 'Label', value: 'label' },
                  { label: 'Description', value: 'description' },
                ]"
                label="Display field"
                emit-value
                map-options
              />
            </q-expansion-item>
          </div>
        </div>
      </div>
    </div>
  </q-page>
  <!-- Link entry dialog -->
  <q-dialog v-model="linkT3EntryDialog.active">
    <q-card style="min-width: 400px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Link Entry</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section style="max-height: 60vh" class="scroll">
        <q-select
          option-label="description"
          option-value="id"
          filled
          v-model="linkT3EntryDialog.data"
          :options="T3000_Data.currentPanelData"
          label="Select Entry"
        />
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn flat label="Save" color="primary" @click="linkT3EntrySave" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted, toRaw } from "vue";
import { useQuasar } from "quasar";
import { VueMoveable } from "vue3-moveable";
import { VueSelecto } from "vue3-selecto";
import KeyController /* , { getCombi, getKey } */ from "keycon";
import { cloneDeep } from "lodash";
import panzoom from "panzoom";
import ObjectType from "../components/ObjectType.vue";
import { tools, T3_Types, ranges } from "../lib/common";

// import { deviceData } from "../lib/demo-data";

export default defineComponent({
  name: "IndexPage",
  components: {
    VueMoveable,
    VueSelecto,
    ObjectType,
  },
  setup() {
    const keycon = new KeyController();
    const $q = useQuasar();
    const movable = ref(null);
    const selecto = ref(null);
    const viewport = ref(null);
    const targets = ref([]);
    const selectedTool = ref("Pointer");
    const linkT3EntryDialog = ref({ active: false, data: null });
    const T3000_Data = ref({ currentPanelData: [] });

    if (process.env.DEV) {
      T3000_Data.value.currentPanelData = deviceData;
    }

    let panzoomInstance = null;
    const emptyProject = {
      items: [],
      selectedTargets: [],
      elementGuidelines: [],
      itemsCount: 0,
      activeItemIndex: null,
      viewportTransform: { x: 0, y: 0, scale: 1 },
    };
    const appState = ref(cloneDeep(emptyProject));
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
      });
      const lines = document.querySelectorAll(".movable-item");
      Array.from(lines).forEach(function (el) {
        appState.value.elementGuidelines.push(el);
      });

      window.chrome?.webview?.postMessage({
        action: 1,
      });
      window.chrome?.webview?.postMessage({
        action: 0,
      });
    });
    onUnmounted(() => {
      if (!panzoomInstance) return;
      panzoomInstance.dispose();
    });

    window.chrome?.webview?.addEventListener("message", (arg) => {
      console.log("Recieved webview message", arg.data);
      if ("action" in arg.data) {
        if (arg.data.action === "UPDATE_ENTRY_RES") {
        } else if (arg.data.action === "GET_INITIAL_DATA_RES") {
          if (arg.data.data) {
            arg.data.data = JSON.parse(arg.data.data);
          }
          appState.value = arg.data.data;
        } else if (arg.data.action === "GET_CURRENT_PANEL_DATA_RES") {
          T3000_Data.value.currentPanelData = arg.data.data;
          appState.value.items
            .filter((i) => i.t3Entry?.type)
            .forEach((item) => {
              item.t3Entry = arg.data.data.find(
                (ii) =>
                  ii.index === item.t3Entry.index &&
                  ii.type === item.t3Entry.type
              );
              refreshObjectActiveValue(item);
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

    function onClickGroup(e) {
      selecto.value.clickTarget(e.inputEvent, e.inputTarget);
    }
    function onDrag(e) {
      const item = appState.value.items.find(
        (item) => `movable-item-${item.id}` === e.target.id
      );
      item.translate = e.beforeTranslate;
    }
    function onDragGroupStart(e) {
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
    function onDragStart(e) {
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
    function onSelectEnd(e) {
      appState.value.selectedTargets = e.selected;
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

    function onResizeStart(e) {
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
      appState.value.items[itemIndex].translate =
        e.lastEvent.drag.beforeTranslate;
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
      e.events.forEach((ev) => {
        const itemIndex = appState.value.items.findIndex(
          (item) => `movable-item-${item.id}` === ev.target.id
        );
        ev.set(appState.value.items[itemIndex].rotate);
        ev.dragStart &&
          ev.dragStart.set(appState.value.items[itemIndex].translate);
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

    function addObject(item) {
      appState.value.itemsCount++;
      item.id = appState.value.itemsCount;
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
      left: 56,
    };

    function onSelectoDragEnd(e) {
      if (
        selectedTool.value === "Pointer" ||
        e.rect.width < 20 ||
        e.rect.height < 20
      )
        return;
      const scalPercentage = 1 / appState.value.viewportTransform.scale;
      const item = addObject({
        title: null,
        active: false,
        type: selectedTool.value,
        translate: [
          (e.rect.left -
            viewportMargins.left -
            appState.value.viewportTransform.x) *
            scalPercentage,
          (e.rect.top -
            viewportMargins.top -
            appState.value.viewportTransform.y) *
            scalPercentage,
        ],
        width: e.rect.width * scalPercentage,
        height: e.rect.height * scalPercentage,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
        props:
          tools.find((tool) => tool.name === selectedTool.value)?.props || {},
        zindex: 1,
        t3Entry: null,
        t3EntryDisplayField: "label",
      });
      // selectedTool.value = "Pointer"
      setTimeout(() => {
        const target = document.querySelector(`#movable-item-${item.id}`);
        appState.value.selectedTargets = [target];
        appState.value.activeItemIndex = appState.value.items.findIndex(
          (i) => i.id === item.id
        );
      }, 10);
    }

    function selectTool(name) {
      selectedTool.value = name;
    }

    function refreshSelecto() {
      const targetsCache = cloneDeep(appState.value.selectedTargets);
      appState.value.selectedTargets = [];
      setTimeout(() => {
        appState.value.selectedTargets = targetsCache;
      }, 10);
    }

    function rotete90(item, minues = false) {
      if (!minues) {
        item.rotate = item.rotate + 90;
      } else {
        item.rotate = item.rotate - 90;
      }
      refreshSelecto();
    }
    function flipH(item) {
      if (item.scaleX === 1) {
        item.scaleX = -1;
      } else {
        item.scaleX = 1;
      }
      refreshSelecto();
    }
    function flipV(item) {
      if (item.scaleY === 1) {
        item.scaleY = -1;
      } else {
        item.scaleY = 1;
      }
      refreshSelecto();
    }

    function bringToFront(item) {
      item.zindex = item.zindex + 1;
    }
    function sendToBack(item) {
      item.zindex = item.zindex - 1;
    }

    function removeObject(item) {
      const index = appState.value.items.findIndex((i) => i.id === item.id);
      appState.value.activeItemIndex = null;
      appState.value.items.splice(index, 1);

      appState.value.selectedTargets = [];
    }
    function duplicateObject(i) {
      appState.value.activeItemIndex = null;
      const dubItem = cloneDeep(i);
      dubItem.translate[0] = dubItem.translate[0] + 10;
      dubItem.translate[1] = dubItem.translate[1] + 10;
      const item = addObject(dubItem);
      appState.value.selectedTargets = [];
      setTimeout(() => {
        const target = document.querySelector(`#movable-item-${item.id}`);
        appState.value.selectedTargets = [target];
        appState.value.activeItemIndex = appState.value.items.findIndex(
          (i) => i.id === item.id
        );
      }, 10);
    }

    function selectByRightClick(e) {
      selecto.value.clickTarget(e);
    }

    function T3UpdateEntryField(key, obj) {
      if (!obj.t3Entry) return;
      let fieldVal = obj.t3Entry[key];
      if (key === "value" || key === "control") {
        refreshObjectActiveValue(obj);
      }
      window.chrome?.webview?.postMessage({
        action: 3, // UPDATE_ENTRY
        field: key,
        value: fieldVal,
        panelId: 1, // Local panel only for now
        entryIndex: obj.t3Entry.index,
        entryType: T3_Types[obj.t3Entry.type],
      });
    }

    function selectoDragCondition(e) {
      return !e.inputEvent.altKey;
    }

    function linkT3EntrySave() {
      appState.value.items[appState.value.activeItemIndex].t3Entry = cloneDeep(
        linkT3EntryDialog.value.data
      );
      refreshObjectActiveValue(
        appState.value.items[appState.value.activeItemIndex]
      );
      linkT3EntryDialog.value.data = null;
      linkT3EntryDialog.value.active = false;
    }

    function refreshObjectActiveValue(item) {
      if (item.props?.active !== undefined) {
        if (!item.t3Entry) return;
        if (
          item.t3Entry.type === "OUTPUT" &&
          item.t3Entry.hw_switch_status !== 1
        ) {
          item.props.active = !!item.t3Entry.hw_switch_status;
        } else if (item.t3Entry.range) {
          const range = ranges.find((i) => i.id === item.t3Entry.range);
          if (range) {
            item.props.active =
              (item.t3Entry?.digital_analog === 0 &&
                ((item.t3Entry?.control === 1 && !range.directInvers) ||
                  (item.t3Entry?.control === 0 && range.directInvers))) ||
              (item.t3Entry?.digital_analog === 1 && item.t3Entry?.value > 0)
                ? true
                : false;
          }
        } else if (item.t3Entry.type === "PROGRAM") {
          item.props.active = !!item.t3Entry.status;
        } else if (item.t3Entry.type === "SCHEDULE") {
          item.props.active = !!item.t3Entry.output;
        } else if (item.t3Entry.type === "HOLIDAY") {
          item.props.active = !!item.t3Entry.value;
        }
      }
    }

    function save() {
      window.chrome?.webview?.postMessage({
        action: 2,
        data: toRaw(appState.value),
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
            refreshSelecto();
          })
          .onCancel(() => {});
        return;
      }
      appState.value = cloneDeep(emptyProject);
      refreshSelecto();
    }

    keycon.keydown((e) => {
      if (!appState.value.selectedTargets.length) return;
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
      save();
    });

    function linkT3EntryDialogAction() {
      linkT3EntryDialog.value.active = true;
      if (!appState.value.items[appState.value.activeItemIndex]?.t3Entry)
        return;
      linkT3EntryDialog.value.data = cloneDeep(
        appState.value.items[appState.value.activeItemIndex]?.t3Entry
      );
    }

    function getRangeById(id) {
      return ranges.find((i) => i.id === id);
    }

    function deleteSelected() {
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

    return {
      movable,
      selecto,
      appState,
      addObject,
      viewport,
      onClickGroup,
      onDrag,
      onDragGroup,
      onDragStart,
      onDragGroupStart,
      onSelectEnd,
      targets,
      onResize,
      onResizeEnd,
      onRotate,
      onResizeGroupStart,
      onResizeGroup,
      onRotateGroupStart,
      onResizeGroupEnd,
      onRotateGroup,
      onResizeStart,
      onSelectoDragEnd,
      selectTool,
      tools,
      selectedTool,
      rotete90,
      flipH,
      flipV,
      bringToFront,
      sendToBack,
      removeObject,
      selectByRightClick,
      T3UpdateEntryField,
      selectoDragCondition,
      duplicateObject,
      linkT3EntrySave,
      newProject,
      save,
      refreshSelecto,
      linkT3EntryDialog,
      linkT3EntryDialogAction,
      T3000_Data,
      getRangeById,
    };
  },
});
</script>
<style>
.tools,
.item-config {
  background-color: #2a2a2a;
  padding: 10px 0;
  align-self: stretch;
  overflow-y: hidden;
  max-height: 100vh;
}

.tools {
  padding-top: 34px;
  width: 70px;
}
.item-config {
  width: 250px;
  padding: 10px;
  padding-top: 34px;
}
.item-config-inner {
  overflow-y: auto;
  max-height: calc(100vh - 45px);
  scrollbar-width: thin;
}
.item-config-inner::-webkit-scrollbar {
  display: none;
}

.toolbar {
  background-color: #2a2a2a;
}

.q-toolbar {
  min-height: 35px;
}

.box {
  background-color: #075d85;
  color: white;
  padding: 20px;
  width: 100%;
  height: 100%;
}

.viewport {
  width: 100%;
  height: 100vh;
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

.active-tool {
  color: white;
  background: #353c44;
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
