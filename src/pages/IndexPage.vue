<template>
  <q-page class="flex no-wrap items-start justify-between">
    <div class="tools flex column">
      <q-list class="rounded-borders text-primary">
        <q-item v-for="tool in tools" :key="tool.name" @click="selectTool(tool.name)" clickable v-ripple
          :active="selectedTool === tool.name" active-class="active-tool">
          <q-item-section>
            <q-icon :name="tool.icon" size="sm" />
          </q-item-section>
        </q-item>
      </q-list>
      <!-- <q-btn v-for="tool in tools" :key="tool.name" @click="selectTool(tool.name)" class="q-mx-sm" flat round
        color="primary" :icon="tool.icon" />
      <q-btn @click="addObject('Fan')" class="q-mx-sm" flat round color="primary" :icon="'img:/fan.svg'" />
      <q-btn @click="startResize" class="q-mx-sm" flat round color="primary" icon="stop" />
      <q-btn @click="addLED" class="q-mx-sm" flat round color="primary" icon="highlight" />
      <q-btn @click="addLCD" class="q-mx-sm" flat round color="primary" icon="aod" />
      <q-btn @click="addArduino" class="q-mx-sm" flat round color="primary" icon="developer_board" />
      <q-btn @click="addMotor" class="q-mx-sm" flat round color="primary" icon="settings" /> -->
    </div>
    <div class="viewport">
      <vue-selecto ref="selecto" dragContainer=".viewport" v-bind:selectableTargets="targets" v-bind:hitRate="100"
        v-bind:selectByClick="true" v-bind:selectFromInside="true" v-bind:toggleContinueSelect="['shift']"
        v-bind:ratio="0" :boundContainer="true" @dragStart="onDragStart" @selectEnd="onSelectEnd"
        @dragEnd="onSelectoDragEnd" :dragCondition="selectoDragCondition">
      </vue-selecto>
      <div ref="viewport">
        <vue-moveable ref="movable" v-bind:draggable="true" v-bind:resizable="true" v-bind:rotatable="true"
          v-bind:target="selectedTargets" :snappable="true" :snapThreshold="10" :isDisplaySnapDigit="true"
          :snapGap="true" :snapDirections="{ top: true, right: true, bottom: true, left: true }" :elementSnapDirections="{
            top: true,
            right: true,
            bottom: true,
            left: true,
          }" :snapDigit="0" :elementGuidelines="elementGuidelines" :origin="true" :throttleResize="0"
          :throttleRotate="0" rotationPosition="top" :originDraggable="true" :originRelative="true"
          :defaultGroupRotate="0" defaultGroupOrigin="50% 50%" :padding="{ left: 0, top: 0, right: 0, bottom: 0 }"
          @clickGroup="onClickGroup" @drag="onDrag" @dragGroupStart="onDragGroupStart" @dragGroup="onDragGroup"
          @resizeStart="onResizeStart" @resize="onResize" @resizeEnd="onResizeEnd" @rotate="onRotate"
          @resizeGroupStart="onResizeGroupStart" @resizeGroup="onResizeGroup" @resizeGroupEnd="onResizeGroupEnd"
          @rotateGroupStart="onRotateGroupStart" @rotateGroup="onRotateGroup">
        </vue-moveable>

        <div v-for="item in items" :key="item.id" ref="targets"
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
    <div class="item-config flex column" v-if="activeItemIndex || activeItemIndex === 0">
      <div class="grid gap-4 grid-cols-2 mb-4">
        <q-input input-style="width: 60px" @update:model-value="objectPropChanged(true)" label="X"
          v-model.number="items[activeItemIndex].translate[0]" dark filled type="number" />
        <q-input input-style="width: 60px" @update:model-value="objectPropChanged(true)" label="Y"
          v-model.number="items[activeItemIndex].translate[1]" dark filled type="number" />

        <q-input input-style="width: 60px" @update:model-value="objectPropChanged(true)" label="Width"
          v-model.number="items[activeItemIndex].width" dark filled type="number" />
        <q-input input-style="width: 60px" @update:model-value="objectPropChanged(true)" label="Height"
          v-model.number="items[activeItemIndex].height" dark filled type="number" />
        <q-input input-style="width: 60px" @update:model-value="objectPropChanged(true)" label="Rotate"
          v-model.number="items[activeItemIndex].rotate" dark filled type="number" />
        <q-input v-if="items[activeItemIndex].props.fontSize !== undefined" input-style="width: 60px" label="Font size"
          v-model.number="items[activeItemIndex].props.fontSize" dark filled type="number" />
        <q-input dark filled v-model="items[activeItemIndex].props.color" label="Color"
          v-if="items[activeItemIndex].props.color !== undefined">
          <template v-slot:append>
            <q-icon name="colorize" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-color v-model="items[activeItemIndex].props.color" />
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
      </div>
      <q-checkbox dark filled v-model="items[activeItemIndex].props.active" class="text-white" label="Active"
        v-if="items[activeItemIndex].props.active !== undefined" />
      <q-checkbox dark filled v-model="items[activeItemIndex].props.inAlarm" class="text-white" label="In alarm"
        v-if="items[activeItemIndex].props.inAlarm !== undefined" />
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted } from "vue";
import { VueMoveable } from "vue3-moveable";
import { VueSelecto } from "vue3-selecto";
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
    const movable = ref(null);
    const selecto = ref(null);
    const viewport = ref(null);
    const items = ref([]);
    const targets = ref([]);
    const selectedTargets = ref([]);
    const elementGuidelines = ref([]);
    const itemsCount = ref(0);
    const selectedTool = ref("Pointer");
    const activeItemIndex = ref(null);
    const tools = [
      {
        name: "Pointer",
        icon: "img:/cursor.svg",
      },
      {
        name: "Text",
        icon: "title",
        props: { content: "Text", color: "black", fontSize: 16 },
      },
      {
        name: "Duct",
        icon: "img:/duct.svg",
      },
      {
        name: "Fan",
        icon: "img:/fan.svg",
        props: { active: false, inAlarm: false },
      },
      {
        name: "CoolingCoil",
        icon: "img:/cooling-coil.svg",
        props: { active: false, inAlarm: false },
      },
      {
        name: "HeatingCoil",
        icon: "img:/heating-coil.svg",
        props: { active: false, inAlarm: false },
      },
      {
        name: "Filter",
        icon: "img:/filter.svg",
      },
      {
        name: "Humidifier",
        icon: "img:/humidifier.svg",
        props: { active: false, inAlarm: false },
      },
      {
        name: "Damper",
        icon: "img:/damper.svg",
        props: { inAlarm: false },
      },
      {
        name: "Temperature",
        icon: "img:/temperature.svg",
      },
    ];
    let panzoomInstance = null;
    const viewportTransform = ref({ x: 0, y: 0, scale: 1 });
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
        viewportTransform.value = e.getTransform();
      });
      const lines = document.querySelectorAll(".movable-item");
      Array.from(lines).forEach(function (el) {
        elementGuidelines.value.push(el);
      });
    });
    onUnmounted(() => {
      if (!panzoomInstance) return;
      panzoomInstance.dispose();
    });

    function onClickGroup(e) {
      selecto.value.clickTarget(e.inputEvent, e.inputTarget);
    }
    function onDrag(e) {
      const item = items.value.find(
        (item) => `movable-item-${item.id}` === e.target.id
      );
      item.translate = e.beforeTranslate;
    }
    function onDragGroupStart(e) {
      e.events.forEach((ev, i) => {
        const itemIndex = items.value.findIndex(
          (item) => `movable-item-${item.id}` === ev.target.id
        );
        ev.set(items.value[itemIndex].translate);
      });
    }
    function onDragGroup(e) {
      e.events.forEach((ev, i) => {
        const itemIndex = items.value.findIndex(
          (item) => `movable-item-${item.id}` === ev.target.id
        );
        items.value[itemIndex].translate = ev.beforeTranslate;
      });
    }
    function onDragStart(e) {
      const target = e.inputEvent.target;
      if (
        movable.value.isMoveableElement(target) ||
        selectedTargets.value.some((t) => t === target || t.contains(target))
      ) {
        e.stop();
      }
    }
    function onSelectEnd(e) {
      selectedTargets.value = e.selected;
      if (selectedTargets.value.length === 1) {
        activeItemIndex.value = items.value.findIndex(
          (item) => `movable-item-${item.id}` === selectedTargets.value[0].id
        );
      } else {
        activeItemIndex.value = null;
      }

      if (e.isDragStart) {
        e.inputEvent.preventDefault();

        setTimeout(() => {
          movable.value.dragStart(e.inputEvent);
        });
      }
    }

    function onResizeStart(e) {
      const itemIndex = items.value.findIndex(
        (item) => `movable-item-${item.id}` === e.target.id
      );
      e.setOrigin(["%", "%"]);
      e.dragStart && e.dragStart.set(items.value[itemIndex].translate);
    }

    function onResize(e) {
      // items.value[itemIndex].width = e.width
      // items.value[itemIndex].height = e.height
      // items.value[itemIndex].translate = e.drag.beforeTranslate;
      const item = items.value.find(
        (item) => `movable-item-${item.id}` === e.target.id
      );
      e.target.style.width = `${e.width}px`;
      e.target.style.height = `${e.height}px`;
      e.target.style.transform = `translate(${e.drag.beforeTranslate[0]}px, ${e.drag.beforeTranslate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY})`;
    }
    function onResizeEnd(e) {
      const itemIndex = items.value.findIndex(
        (item) => `movable-item-${item.id}` === e.lastEvent.target.id
      );
      items.value[itemIndex].width = e.lastEvent.width;
      items.value[itemIndex].height = e.lastEvent.height;
      items.value[itemIndex].translate = e.lastEvent.drag.beforeTranslate;
    }
    function onRotate(e) {
      // e.target.style.transform = e.drag.transform;
      const item = items.value.find(
        (item) => `movable-item-${item.id}` === e.target.id
      );
      item.rotate = e.rotate;
    }

    function onResizeGroupStart(e) {
      e.events.forEach((ev, i) => {
        ev.dragStart && ev.dragStart.set(items.value[i].translate);
      });
    }
    function onResizeGroup(e) {
      e.events.forEach((ev, i) => {
        const item = items.value.find(
          (item) => `movable-item-${item.id}` === ev.target.id
        );
        ev.target.style.width = `${ev.width}px`;
        ev.target.style.height = `${ev.height}px`;
        ev.target.style.transform = `translate(${ev.drag.beforeTranslate[0]}px, ${ev.drag.beforeTranslate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY}) `;
      });
    }
    function onResizeGroupEnd(e) {
      e.events.forEach((ev) => {
        const itemIndex = items.value.findIndex(
          (item) => `movable-item-${item.id}` === ev.lastEvent.target.id
        );
        items.value[itemIndex].width = ev.lastEvent.width;
        items.value[itemIndex].height = ev.lastEvent.height;
        items.value[itemIndex].translate = ev.lastEvent.drag.beforeTranslate;
      });
    }

    function onRotateGroupStart(e) {
      e.events.forEach((ev) => {
        const itemIndex = items.value.findIndex(
          (item) => `movable-item-${item.id}` === ev.target.id
        );
        ev.set(items.value[itemIndex].rotate);
        ev.dragStart && ev.dragStart.set(items.value[itemIndex].translate);
      });
    }
    function onRotateGroup(e) {
      e.events.forEach((ev, i) => {
        const itemIndex = items.value.findIndex(
          (item) => `movable-item-${item.id}` === ev.target.id
        );
        items.value[itemIndex].translate = ev.drag.beforeTranslate;
        items.value[itemIndex].rotate = ev.rotate;
      });
    }

    function addObject(item) {
      itemsCount.value++;
      item.id = itemsCount.value;
      items.value.push(item);
      const lines = document.querySelectorAll(".movable-item");
      elementGuidelines.value = [];
      Array.from(lines).forEach(function (el) {
        elementGuidelines.value.push(el);
      });
      return item;
    }

    /* function startResize() {
      // const requester = movable.value.request("resizable", { offsetWidth: 100, offsetHeight: 100 }, true);
      // const movableClass = movable.value.getManager();
      // const emitter = movableClass._emitter
      // console.log(requester)
      // movable.value.dragStart()
      var targetNode = document.querySelector("div[data-direction='se']");
      console.log(targetNode)
      if (targetNode) {
        //--- Simulate a natural mouse-click sequence.
        // triggerMouseEvent (targetNode, "mouseover");
        triggerMouseEvent(targetNode, "mousedown");
        //triggerMouseEvent (targetNode, "mouseup");
        //triggerMouseEvent (targetNode, "click");
      }
      else
        console.log("*** Target node not found!");
    } */

    /* function triggerMouseEvent(node, eventType) {
      var clickEvent = document.createEvent('MouseEvents');
      clickEvent.initEvent(eventType, true, true);
      node.dispatchEvent(clickEvent);
    } */

    function onSelectoDragEnd(e) {
      if (
        selectedTool.value === "Pointer" ||
        e.rect.width < 20 ||
        e.rect.height < 20
      )
        return;
      const scalPercentage = 1 / viewportTransform.value.scale;
      const item = addObject({
        active: false,
        type: selectedTool.value,
        translate: [
          (e.rect.left - 56 - viewportTransform.value.x) * scalPercentage,
          (e.rect.top - viewportTransform.value.y) * scalPercentage,
        ],
        width: e.rect.width * scalPercentage,
        height: e.rect.height * scalPercentage,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
        props:
          tools.find((tool) => tool.name === selectedTool.value)?.props || {},
        zindex: 1,
      });
      // selectedTool.value = "Pointer"
      setTimeout(() => {
        const target = document.querySelector(`#movable-item-${item.id}`);
        selectedTargets.value = [target];
        activeItemIndex.value = items.value.findIndex((i) => i.id === item.id);
      }, 10);
    }

    function selectTool(name) {
      selectedTool.value = name;
    }

    function refreshSelecto() {
      const targetsCache = cloneDeep(selectedTargets.value);
      selectedTargets.value = [];
      setTimeout(() => {
        selectedTargets.value = targetsCache;
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
      const index = items.value.findIndex((i) => i.id === item.id);
      activeItemIndex.value = null;
      items.value.splice(index, 1);

      selectedTargets.value = [];
    }
    function duplicateObject(i) {
      activeItemIndex.value = null;
      const dubItem = cloneDeep(i);
      dubItem.translate[0] = dubItem.translate[0] + 10;
      dubItem.translate[1] = dubItem.translate[1] + 10;
      const item = addObject(dubItem);
      selectedTargets.value = [];
      setTimeout(() => {
        const target = document.querySelector(`#movable-item-${item.id}`);
        selectedTargets.value = [target];
        activeItemIndex.value = items.value.findIndex((i) => i.id === item.id);
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

    return {
      movable,
      selecto,
      items,
      addObject,
      viewport,
      onClickGroup,
      onDrag,
      onDragGroup,
      onDragStart,
      onDragGroupStart,
      onSelectEnd,
      elementGuidelines,
      targets,
      selectedTargets,
      activeItemIndex,
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

.item-config {
  width: 250px;
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
</style>
