<template>
  <q-page>
    <div class="flex no-wrap items-start justify-between">
      <div class="tools flex column">
        <q-list class="rounded-borders text-primary">
          <q-item v-for="tool in tools" :key="tool.name" @click="selectTool(tool.name)" clickable v-ripple
            :active="selectedTool === tool.name" active-class="active-tool">
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
          <q-btn-dropdown no-caps stretch flat content-class="menu-dropdown" label="File">
            <q-list>
              <q-item dense clickable v-close-popup @click="newProject" tabindex="0">
                <q-item-section avatar>
                  <q-avatar size="md" icon="assignment" color="primary" text-color="white" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>New Project</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator inset spaced />
              <q-item dense clickable v-close-popup @click="save" tabindex="0">
                <q-item-section avatar>
                  <q-avatar size="md" icon="assignment" color="primary" text-color="white" />
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
        <vue-selecto ref="selecto" dragContainer=".viewport" v-bind:selectableTargets="targets" v-bind:hitRate="100"
          v-bind:selectByClick="true" v-bind:selectFromInside="true" v-bind:toggleContinueSelect="['shift']"
          v-bind:ratio="0" :boundContainer="true" @dragStart="onDragStart" @selectEnd="onSelectEnd"
          @dragEnd="onSelectoDragEnd" :dragCondition="selectoDragCondition">
        </vue-selecto>
        <div ref="viewport">
          <vue-moveable ref="movable" v-bind:draggable="true" v-bind:resizable="true" v-bind:rotatable="true"
            v-bind:target="appState.selectedTargets" :snappable="true" :snapThreshold="10" :isDisplaySnapDigit="true"
            :snapGap="true" :snapDirections="{
              top: true,
              right: true,
              bottom: true,
              left: true,
            }" :elementSnapDirections="{
              top: true,
              right: true,
              bottom: true,
              left: true,
            }" :snapDigit="0" :elementGuidelines="appState.elementGuidelines" :origin="true" :throttleResize="0"
            :throttleRotate="0" rotationPosition="top" :originDraggable="true" :originRelative="true"
            :defaultGroupRotate="0" defaultGroupOrigin="50% 50%" :padding="{ left: 0, top: 0, right: 0, bottom: 0 }"
            @clickGroup="onClickGroup" @drag="onDrag" @dragGroupStart="onDragGroupStart" @dragGroup="onDragGroup"
            @resizeStart="onResizeStart" @resize="onResize" @resizeEnd="onResizeEnd" @rotate="onRotate"
            @resizeGroupStart="onResizeGroupStart" @resizeGroup="onResizeGroup" @resizeGroupEnd="onResizeGroupEnd"
            @rotateGroupStart="onRotateGroupStart" @rotateGroup="onRotateGroup">
          </vue-moveable>

          <div v-for="item in appState.items" :key="item.id" ref="targets"
            :style="`position: absolute; transform: translate(${item.translate[0]}px, ${item.translate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY}); width: ${item.width}px; height: ${item.height}px; z-index: ${item.zindex};`"
            :id="`movable-item-${item.id}`" @mousedown.right="selectByRightClick">
            <!-- <div v-if="item.props.title">{{item.props.title}}</div> -->
            <object-type :item="item" />
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
          </div>
        </div>
      </div>
      <div class="item-config flex column" v-if="appState.activeItemIndex || appState.activeItemIndex === 0">
        <div class="grid gap-4 grid-cols-2 mb-4">
          <q-input input-style="width: 60px" @update:model-value="objectPropChanged(true)" label="X" v-model.number="
            appState.items[appState.activeItemIndex].translate[0]
          " dark filled type="number" />
          <q-input input-style="width: 60px" @update:model-value="objectPropChanged(true)" label="Y" v-model.number="
            appState.items[appState.activeItemIndex].translate[1]
          " dark filled type="number" />

          <q-input input-style="width: 60px" @update:model-value="objectPropChanged(true)" label="Width"
            v-model.number="appState.items[appState.activeItemIndex].width" dark filled type="number" />
          <q-input input-style="width: 60px" @update:model-value="objectPropChanged(true)" label="Height"
            v-model.number="appState.items[appState.activeItemIndex].height" dark filled type="number" />
          <q-input input-style="width: 60px" @update:model-value="objectPropChanged(true)" label="Rotate"
            v-model.number="appState.items[appState.activeItemIndex].rotate" dark filled type="number" />
          <q-input v-if="
            appState.items[appState.activeItemIndex].props.fontSize !==
            undefined
          " input-style="width: 60px" label="Font size" v-model.number="
            appState.items[appState.activeItemIndex].props.fontSize
          " dark filled type="number" />
          <q-input dark filled v-model="appState.items[appState.activeItemIndex].props.color" label="Color" v-if="
            appState.items[appState.activeItemIndex].props.color !== undefined
          ">
            <template v-slot:append>
              <q-icon name="colorize" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-color v-model="
                    appState.items[appState.activeItemIndex].props.color
                  " />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>
        <q-checkbox dark filled v-model="appState.items[appState.activeItemIndex].props.active" class="text-white"
          label="Active" v-if="
            appState.items[appState.activeItemIndex].props.active !== undefined
          " />
        <q-checkbox dark filled v-model="appState.items[appState.activeItemIndex].props.inAlarm" class="text-white"
          label="In alarm" v-if="
            appState.items[appState.activeItemIndex].props.inAlarm !== undefined
          " />
        <q-input input-style="width: 60px" label="Panel ID"
          v-model.number="appState.items[appState.activeItemIndex].panelId" dark filled class="pt-2"
          @update:model-value="
            getInputFromWebViewHost(appState.items[appState.activeItemIndex])
          " />
        <q-input input-style="width: 60px" label="Input ID"
          v-model.number="appState.items[appState.activeItemIndex].inputId" dark filled class="pt-2"
          @update:model-value="
            getInputFromWebViewHost(appState.items[appState.activeItemIndex])
          " />
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted, toRaw } from "vue";
import { useQuasar } from "quasar";
import { VueMoveable } from "vue3-moveable";
import { VueSelecto } from "vue3-selecto";
import KeyController, { getCombi, getKey } from "keycon";
import { cloneDeep } from "lodash";
import panzoom from "panzoom";
import ObjectType from "../components/ObjectType.vue";

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
    const tools = [
      {
        name: "Pointer",
        text: "Select",
        icon: "img:/cursor.svg",
      },
      {
        name: "Text",
        label: "Text",
        icon: "title",
        props: { content: "Text", color: "black", fontSize: 16 },
      },
      {
        name: "Duct",
        label: "Duct",
        icon: "img:/duct.svg",
      },
      {
        name: "Fan",
        label: "Fan",
        icon: "img:/fan.svg",
        props: { active: false, inAlarm: false },
      },
      {
        name: "CoolingCoil",
        label: "Cooling Coil",
        icon: "img:/cooling-coil.svg",
        props: { active: false, inAlarm: false },
      },
      {
        name: "HeatingCoil",
        label: "Heating Coil",
        icon: "img:/heating-coil.svg",
        props: { active: false, inAlarm: false },
      },
      {
        name: "Filter",
        label: "Filter",
        icon: "img:/filter.svg",
      },
      {
        name: "Humidifier",
        label: "Humidifier",
        icon: "img:/humidifier.svg",
        props: { active: false, inAlarm: false },
      },
      {
        name: "Damper",
        label: "Damper",
        icon: "img:/damper.svg",
        props: { inAlarm: false },
      },
      {
        name: "Temperature",
        label: "Temperature",
        icon: "img:/temperature.svg",
      },
    ];
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
    });
    onUnmounted(() => {
      if (!panzoomInstance) return;
      panzoomInstance.dispose();
    });

    window.chrome?.webview?.addEventListener("message", (arg) => {
      console.log("Recieved webview message", arg.data);
      if ("action" in arg.data) {
        if (arg.data.action === "setInput") {
          const itemIndex = appState.value.items.findIndex(
            (i) =>
              i.inputId === arg.data.inputId &&
              i.panelId === arg.data.panelId
          );
          if (itemIndex !== -1) {
            appState.value.items[itemIndex].title = arg.data.data.desc
            if (appState.value.items[itemIndex]?.props && arg.data.data.digital_analog === 0) {
              if (arg.data.data.control === 1) {
                appState.value.items[itemIndex].props.active = true
              } else {
                appState.value.items[itemIndex].props.active = false;
              }
            }

          }
        } else if (arg.data.action === "setInitialData") {
          if (arg.data.data) { arg.data.data = JSON.parse(arg.data.data) }
          appState.value = arg.data.data;
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
        panelId: null,
        inputId: null,
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

    function objectPropChanged(refresh = false) {
      if (refresh) {
        refreshSelecto();
      }
    }

    function selectoDragCondition(e) {
      return !e.inputEvent.altKey;
    }

    function getInputFromWebViewHost(item) {
      if (item.panelId && item.inputId) {
        window.chrome?.webview?.postMessage({
          action: 0,
          panelId: item.panelId,
          inputId: item.inputId,
        });
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
          .onCancel(() => { });
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
      }
      if (["up", "down", "left", "right"].includes(e.key)) {
        refreshSelecto();
      }
    });

    keycon.keydown(["ctrl", "s"], (e) => {
      e.inputEvent.preventDefault();
      save()
    });

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
      objectPropChanged,
      selectoDragCondition,
      duplicateObject,
      getInputFromWebViewHost,
      newProject,
      save,
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
}

.tools {
  padding-top: 34px;
}

.item-config {
  width: 250px;
  padding: 10px;
  padding-top: 34px;
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
</style>
