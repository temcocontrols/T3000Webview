<!--
  This component is a canvas type component that is used to render the objects on the canvas.

-->
<template>
  <div class="moveable-item-canvas flex justify-center object-container" :class="{
    'flex flex-col flex-nowrap': !['Dial', 'Gauge', 'Value'].includes(
      item.type
    ),
    'overflow-hidden': item.type === 'Text',
    [item.type]: item.type,
    'with-bg': item.settings.bgColor,
    'with-title':
      item.settings.title ||
      (item.t3Entry && item.settings.t3EntryDisplayField !== 'none'),
  }">
    {{ item.width }} x {{ item.height }}
    <canvas ref="canvas" :id="`myCanvas${item.id}`" class="canvas-viewport-wrapper" :width="item.width"
      :height="item.height" resize stats></canvas>
  </div>
  <!-- <div style="width: 100vw">
    {{ item }}
           v-on:click="canvasClicked"

  </div> -->

  <!-- @click="$emit('objectClicked')" -->

  <!-- <div
      class="object-title"
      :class="{ grow: ['Icon', 'Switch'].includes(item.type) }"
      v-if="item.settings.title"
      @click="$emit('objectClicked')"
    >
      {{ item.settings.title }}
    </div>
    <div
      class="object-title"
      :class="{ grow: ['Icon', 'Switch'].includes(item.type) }"
      v-else-if="item.t3Entry && item.settings.t3EntryDisplayField !== 'none'"
    >
      <div class="relative">
        <q-btn
          v-if="
            showArrows &&
            item.type !== 'Switch' &&
            ['value', 'control'].includes(item.settings.t3EntryDisplayField)
          "
          class="up-btn absolute"
          size="sm"
          icon="keyboard_arrow_up"
          color="grey-4"
          text-color="black"
          dense
          :disable="item.t3Entry?.auto_manual === 0"
          @click="changeValue('increase')"
        />
        <div>
          <span @click="$emit('objectClicked')">{{
            dispalyText || item.t3Entry.id
          }}</span>
          <span
            v-if="item.t3Entry.auto_manual !== undefined"
            class="mode-icon ml-2 text-lg"
            @click="$emit('autoManualToggle')"
          >
            <q-icon v-if="!item.t3Entry.auto_manual" name="motion_photos_auto">
              <q-tooltip anchor="top middle" self="center middle">
                In auto mode
              </q-tooltip>
            </q-icon>
            <q-icon v-else name="swipe_up">
              <q-tooltip anchor="top middle" self="center middle">
                In manual mode
              </q-tooltip>
            </q-icon>
          </span>
        </div>
        <q-btn
          v-if="
            showArrows &&
            item.type !== 'Switch' &&
            ['value', 'control'].includes(item.settings.t3EntryDisplayField)
          "
          class="down-btn absolute"
          size="sm"
          icon="keyboard_arrow_down"
          color="grey-4"
          text-color="black"
          dense
          :disable="item.t3Entry?.auto_manual === 0"
          @click="changeValue('decrease')"
        />
      </div>
    </div>
    <div
      class="flex justify-center object-container relative"
      :class="{ grow: !['Icon', 'Switch'].includes(item.type) }"
      @click="$emit('objectClicked')"
    >
      <fan v-if="item.type === 'Fan'" class="fan" v-bind="item.settings" />
      <duct
        v-else-if="item.type === 'Duct'"
        class="duct"
        v-bind="item.settings"
        ref="objectRef"
      />
      <cooling-coil
        v-else-if="item.type === 'CoolingCoil'"
        class="cooling-coil"
        v-bind="item.settings"
      />
      <heating-coil
        v-else-if="item.type === 'HeatingCoil'"
        class="heating-coil"
        v-bind="item.settings"
      />
      <filter-el
        v-else-if="item.type === 'Filter'"
        class="filter"
        v-bind="item.settings"
      />
      <humidifier
        v-else-if="item.type === 'Humidifier'"
        class="humidifier"
        v-bind="item.settings"
      />
      <humidity
        v-else-if="item.type === 'Humidity'"
        class="humidity"
        v-bind="item.settings"
      />
      <Pressure
        v-else-if="item.type === 'Pressure'"
        class="pressure"
        v-bind="item.settings"
      />
      <ThermalWheel
        v-else-if="item.type === 'ThermalWheel'"
        class="thermal-wheel"
        v-bind="item.settings"
      />
      <damper
        v-else-if="item.type === 'Damper'"
        class="damper"
        :item="item"
        v-bind="item.settings"
      />
      <boiler
        v-else-if="item.type === 'Boiler'"
        class="boiler"
        v-bind="item.settings"
      />
      <heatpump
        v-else-if="item.type === 'Heatpump'"
        class="heatpump"
        v-bind="item.settings"
      />
      <pump
        v-else-if="item.type === 'Pump'"
        class="heatpump"
        v-bind="item.settings"
      />
      <ValveThreeWay
        v-else-if="item.type === 'ValveThreeWay'"
        class="valve-threeway"
        v-bind="item.settings"
      />
      <ValveTwoWay
        v-else-if="item.type === 'ValveTwoWay'"
        class="valve-threeway"
        v-bind="item.settings"
      />
      <enthalpy
        v-else-if="item.type === 'Enthalpy'"
        class="enthalpy"
        v-bind="item.settings"
      />
      <flow
        v-else-if="item.type === 'Flow'"
        class="flow"
        v-bind="item.settings"
      />
      <text-el
        v-else-if="item.type === 'Text'"
        class="text"
        v-bind="item.settings"
      />
      <box-el
        v-else-if="item.type === 'Box'"
        class="box"
        v-bind="item.settings"
      />
      <icon-value
        v-else-if="item.type === 'Icon'"
        class="icon-value"
        :item="item"
        :show-arrows="showArrows"
        v-bind="item.settings"
        @change-value="changeValue"
      />
      <icon-basic
        v-else-if="item.type === 'IconBasic'"
        class="icon-basic"
        :item="item"
        v-bind="item.settings"
      />
      <icon-switch
        v-else-if="item.type === 'Switch'"
        class="icon-switch"
        :item="item"
        :show-arrows="showArrows"
        v-bind="item.settings"
        @change-value="changeValue"
      />
      <led-el
        v-else-if="item.type === 'LED'"
        class="led-el"
        :item="item"
        v-bind="item.settings"
      />
      <value-el
        v-else-if="item.type === 'Value'"
        class="value"
        :item="item"
        :show-arrows="showArrows"
        v-bind="item.settings"
        @change-value="changeValue"
      />
      <temperature
        v-else-if="item.type === 'Temperature'"
        class="temperature"
        v-bind="item.settings"
      />
      <gauge-chart
        v-else-if="item.type === 'Gauge'"
        class="gauge-object gauge"
        v-bind="item.settings"
        :unit="range.unit"
        :colors="processedColors"
        :value="item.t3Entry?.value / 1000 || 0"
      />
      <div
        v-else-if="item.type === 'Dial'"
        class="flex flex-col flex-nowrap justify-center"
      >
        <dial-chart
          class="gauge-object dial"
          :options="{
            value: item.t3Entry?.value / 1000 || 0,
            unit: range.unit,
            ...item.settings,
            colors: processedColors,
          }"
        />
        <div class="text-center font-bold pl-8 pb-2">
          {{ item.t3Entry?.value / 1000 || 0 }} {{ range.unit }}
        </div>
      </div>
      <RoomHumidity
        v-else-if="item.type === 'RoomHumidity'"
        class="room-humidity"
        v-bind="item.settings"
      />
      <RoomTemperature
        v-else-if="item.type === 'RoomTemperature'"
        class="room-temperature"
        v-bind="item.settings"
      />
      <Wall
        v-else-if="item.type === 'Wall'"
        class="room-temperature"
        v-bind="item.settings"
      />
      <Weld
        v-else-if="item.type === 'Weld'"
        class="weld"
        v-bind:weldModel="item"
        @update-weld-model="updateWeldModel"
      />
      <img
        class="img-object"
        v-else-if="item.type.startsWith('IMG-')"
        :src="item.image.path"
      />
    </div> -->
  <!-- </div> -->
</template>

<script>
import { defineComponent, computed, onMounted, watch, ref } from "vue";
import { getEntryRange } from "src/lib/common";
import paper from "paper";

// import DuctEl from "./ObjectTypes/Duct.vue";
// import FanEl from "./ObjectTypes/Fan.vue";
// import CoolingCoil from "./ObjectTypes/CoolingCoil.vue";
// import HeatingCoil from "./ObjectTypes/HeatingCoil.vue";
// import FilterEl from "./ObjectTypes/Filter.vue";
// import HumidifierEl from "./ObjectTypes/Humidifier.vue";
// import Damper from "./ObjectTypes/Damper.vue";
// import TextEl from "./ObjectTypes/Text.vue";
// import BoxEl from "./ObjectTypes/Box.vue";
// import IconBasic from "./ObjectTypes/IconBasic.vue";
// import IconValue from "./ObjectTypes/IconValue.vue";
// import IconSwitch from "./ObjectTypes/IconSwitch.vue";
// import ValueEl from "./ObjectTypes/Value.vue";
// import Temperature from "./ObjectTypes/Temperature.vue";
// import GaugeChart from "./ObjectTypes/EchartsGauge.vue";
// import AnyChartDial from "./ObjectTypes/AnyChartDial.vue";
// import LedEl from "./ObjectTypes/Led.vue";
// import Boiler from "./ObjectTypes/Boiler.vue";
// import Enthalpy from "./ObjectTypes/Enthalpy.vue";
// import Flow from "./ObjectTypes/Flow.vue";
// import Heatpump from "./ObjectTypes/Heatpump.vue";
// import Pump from "./ObjectTypes/Pump.vue";
// import ValveThreeWay from "./ObjectTypes/ValveThreeWay.vue";
// import ValveTwoWay from "./ObjectTypes/ValveTwoWay.vue";
// import Humidity from "./ObjectTypes/Humidity.vue";
// import Pressure from "./ObjectTypes/Pressure.vue";
// import ThermalWheel from "./ObjectTypes/ThermalWheel.vue";
// import RoomHumidity from "./ObjectTypes/RoomHumidity.vue";
// import RoomTemperature from "./ObjectTypes/RoomTemperature.vue";
// import Wall from "./ObjectTypes/Wall.vue";
// import Weld from "./ObjectTypes/Weld.vue";

export default defineComponent({
  name: "CanvasType",
  components: {
    // Duct: DuctEl,
    // Fan: FanEl,
    // CoolingCoil,
    // HeatingCoil,
    // FilterEl,
    // Humidifier: HumidifierEl,
    // Damper,
    // TextEl,
    // BoxEl,
    // IconBasic,
    // IconValue,
    // IconSwitch,
    // ValueEl,
    // Temperature,
    // GaugeChart,
    // DialChart: AnyChartDial,
    // LedEl,
    // Boiler,
    // Enthalpy,
    // Flow,
    // Heatpump,
    // Pump,
    // ValveThreeWay,
    // ValveTwoWay,
    // Humidity,
    // Pressure,
    // ThermalWheel,
    // RoomHumidity,
    // RoomTemperature,
    // Wall,
    // Weld,
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
    showArrows: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    "autoManualToggle",
    "objectClicked",
    "changeValue",
    "updateWeldModel",
  ],
  setup(props, { emit }) {
    const range = computed(() => {
      return getEntryRange(props.item?.t3Entry);
    });
    const dispalyText = computed(() => {
      if (!props.item.t3Entry) {
        return "";
      }
      const range = getEntryRange(props.item.t3Entry);
      if (
        props.item.settings.t3EntryDisplayField === "value" ||
        props.item.settings.t3EntryDisplayField === "control"
      ) {
        if (
          props.item.t3Entry.value !== undefined &&
          props.item.t3Entry.range > 100
        ) {
          const rangeValue = range.options?.find(
            (item) => item.value * 1000 === props.item.t3Entry.value
          );
          return rangeValue?.name;
        } else if (
          props.item.t3Entry.value !== undefined &&
          props.item.t3Entry.digital_analog === 1
        ) {
          return props.item.t3Entry.value / 1000 + " " + range.unit;
        } else if (
          props.item.t3Entry.control !== undefined &&
          props.item.t3Entry.digital_analog === 0
        ) {
          if (props.item.t3Entry.control) {
            return range.on;
          } else {
            return range.off;
          }
        }
      }

      return props.item.t3Entry[props.item.settings.t3EntryDisplayField] || "";
    });

    const processedColors = computed(() => {
      const item = props.item;
      if (!["Gauge", "Dial"].includes(item.type)) {
        return null;
      }
      return item.type === "Gauge"
        ? item.settings.colors.map((i) => [i.offset / 100, i.color])
        : item.settings.colors.map((i, index) => {
          return {
            from: index ? item.settings.colors[index - 1].offset : 0,
            to: i.offset,
            color: [i.color],
          };
        });
    });

    function changeValue(type) {
      if (props.item.t3Entry.auto_manual === 0) return;
      let control = false;
      let newVal = props.item.t3Entry.value;
      const range = getEntryRange(props.item?.t3Entry);
      if (
        props.item.t3Entry.value !== undefined &&
        props.item.t3Entry.range > 100
      ) {
        const rangeOptions = range.options?.filter((item) => item.status === 1);
        const rangeIndex = rangeOptions.findIndex(
          (item) => item.value * 1000 === props.item.t3Entry.value
        );

        if (type === "decrease" && rangeIndex < rangeOptions.length - 1) {
          newVal = rangeOptions[rangeIndex + 1].value * 1000;
        } else if (type === "increase" && rangeIndex > 0) {
          newVal = rangeOptions[rangeIndex - 1].value * 1000;
        } else {
          return;
        }
      } else if (
        props.item.t3Entry.value !== undefined &&
        props.item.t3Entry.digital_analog === 1
      ) {
        if (type === "increase") {
          newVal = props.item.t3Entry.value + 1000;
        } else {
          newVal = props.item.t3Entry.value - 1000;
        }
      } else if (
        props.item.t3Entry.control !== undefined &&
        props.item.t3Entry.digital_analog === 0
      ) {
        control = true;
        if (type === "decrease" && props.item.t3Entry.control === 0) {
          newVal = 1;
        } else if (type === "increase" && props.item.t3Entry.control === 1) {
          newVal = 0;
        } else {
          return;
        }
      }
      emit("changeValue", props.item, newVal, control);
    }

    const objectRef = ref(null);

    function refresh() {
      if (!objectRef.value) return;
      if (props.item?.type === "Duct") {
        objectRef.value.refresh();
      }
    }

    const updateWeldModel = (weldModel, itemList) => {
      // console.log(
      //   "ObjectType.vue -> updateWeldModel | recieve from child",
      //   weldModel,
      //   itemList
      // );
      emit("updateWeldModel", weldModel, itemList);
    };

    // const canvasContainer = ref(null);
    const canvas = ref(null);
    // const tool = ref(null);
    paper.settings.insertItems = false;
    // const project = new Paper.Project(canvas.value);

    const drawObject = () => {
      // const canvas = document.getElementById(`myCanvas${props.item.id}`);

      const circle = new paper.Path.Circle({
        center: [80, 50],
        radius: 30,
        fillColor: "red",
      });

      paper.view.draw();
      // project.activeLayer.addChild(circle);
    };

    onMounted(() => {
      paper.setup(canvas.value);

      paper.view.onResize = function (event) {
        // console.log(
        //   "CanvasType.vue -> onMounted | Paper.view.onResize event",
        //   event
        // );
      };

      drawObject();
    });

    // const resizeCanvas = () => {
    //   const ctx = canvas.value.getContext("2d");
    //   const dpr = window.devicePixelRatio || 1;

    //   canvas.value.width = props.canvasWidth;
    //   canvas.value.height = props.canvasHeight;
    //   canvas.value.style.backgroundColor = "#f0f";

    //   ctx.scale(dpr, dpr);
    //   // Resize the red circle to fill the bounds of the view:
    //   circle.fitBounds(Paper.view.bounds, true);

    //   console.log(
    //     "Canvas resized-----------",
    //     props.canvasWidth * dpr,
    //     props.canvasHeight * dpr
    //   );
    // };

    // watch(
    //   () => [props.item.width, props.item.height],
    //   ([newWidth, newHeight], [oldWidth, oldHeight]) => {
    //     if (newWidth !== oldWidth || newHeight !== oldHeight) {
    //       resizeCanvas();
    //     }
    //   }
    // );

    // console.log("CanvasType.vue -> onMounted | props.item", props.item);
    // console.log("CanvasType.vue -> onMounted | props", props);
    // console.log("CanvasType.vue -> onMounted | item", item);
    // const canvas = document.getElementById(`myCanvas${props.item.id}`);
    // canvas.addEventListener("click", (event) => {
    //   console.log("CanvasType.vue -> onMounted | canvas clicked", event);
    //   emit("objectClicked", event);
    // });
    // canvas.addEventListener("dblclick", (event) => {
    //   console.log(
    //     "CanvasType.vue -> onMounted | canvas double clicked",
    //     event
    //   );
    // });
    // canvas.addEventListener("mousemove", (event) => {
    //   console.log("CanvasType.vue -> onMounted | canvas mouse move", event);
    // });
    // canvas.addEventListener("mouseup", (event) => {
    //   console.log("CanvasType.vue -> onMounted | canvas mouse up", event);
    // });
    // canvas.addEventListener("mousedown", (event) => {
    //   console.log("CanvasType.vue -> onMounted | canvas mouse down", event);
    // });
    // canvas.addEventListener("resize", (event) => {
    //   console.log("CanvasType.vue -> onMounted | canvas resize", event);
    // });
    // console.log("canvas", canvas);
    // // Prevent automatic drawing of objects on the canvas if the path has been defined
    // Paper.settings.insertItems = false;
    // const project = new Paper.Project(canvas);
    // const tool = new Paper.Tool();
    // // Paper.setup(canvas);
    // console.log("CanvasType.vue -> onMounted | props", props);
    // console.log(
    //   "CanvasType.vue -> onMounted | paper,project",
    //   Paper,
    //   project
    // );
    // console.log("item", props.item);
    // if (props.item.type === "G_Circle") {
    //   console.log("CanvasType.vue -> onMounted | Weld item", props.item);
    //   // Example of drawing a simple circle
    //   const circle = new Paper.Path.Circle({
    //     point: [0, 0],
    //     radius: 20,
    //     fillColor: "red",
    //     selected: true,
    //   });
    //   project.activeLayer.addChild(circle);
    //   console.log("CanvasType.vue -> onMounted | Paper.view", Paper.view);
    // }
    // if (props.item.type === "G_Rectangle") {
    //   console.log("CanvasType.vue -> onMounted | Weld item", props.item);
    //   // Example of drawing a simple circle
    //   var square = new Paper.Path.Rectangle({
    //     point: [0, 0],
    //     size: [props.item.width - 10, props.item.height - 10],
    //     fillColor: "#f2d3d3",
    //     strokeColor: "yellow",
    //     strokeWidth: 5,
    //     name: "originals-Square-Rectangle",
    //     selected: true,
    //   });
    //   console.log("width,height", props.item.width, props.item.height);
    //   square.onMouseDown = function (event) {
    //     // if (event.stopPropagation) {
    //     //   event.stopPropagation();
    //     // } else {
    //     //   event.cancelBubble = true;
    //     // }
    //     console.log(
    //       "CanvasType.vue -> onMounted | square.onMouseDown",
    //       event
    //     );
    //     square.fillColor = "red";
    //     // square.dragging = true;
    //   };
    //   square.onDoubleClick = function (event) {
    //     // if (event.stopPropagation) {
    //     //   event.stopPropagation();
    //     // } else {
    //     //   event.cancelBubble = true;
    //     // }
    //     console.log(
    //       "CanvasType.vue -> onMounted | square.onDoubleClick",
    //       event
    //     );
    //     // square.fillColor = "yellow";
    //   };
    //   square.onClick = function (event) {
    //     // if (event.stopPropagation) {
    //     //   event.stopPropagation();
    //     // } else {
    //     //   event.cancelBubble = true;
    //     // }
    //     console.log("CanvasType.vue -> onMounted | square.onClick", event);
    //     // square.fillColor = "yellow";
    //   };
    //   Paper.view.onDoubleClick = function (event) {
    //     // if (event.stopPropagation) {
    //     //   event.stopPropagation();
    //     // } else {
    //     //   event.cancelBubble = true;
    //     // }
    //     console.log(
    //       "CanvasType.vue -> onMounted | Paper.view Double clicked",
    //       event
    //     );
    //     // square.fillColor = "yellow";
    //   };
    //   Paper.view.onMouseMove = function (event) {
    //     // if (event.stopPropagation) {
    //     //   event.stopPropagation();
    //     // } else {
    //     //   event.cancelBubble = true;
    //     // }
    //     // if (square.dragging) {
    //     //   square.position = event.point;
    //     // }
    //     // console.log(
    //     //   "CanvasType.vue -> onMounted | Paper.view Mouse Move event",
    //     //   event
    //     // );
    //   };
    //   Paper.view.onMouseUp = function (event) {
    //     // if (event.stopPropagation) {
    //     //   event.stopPropagation();
    //     // } else {
    //     //   event.cancelBubble = true;
    //     // }
    //     // square.dragging = false;
    //     console.log(
    //       "CanvasType.vue -> onMounted | Paper.view Mouse Up event",
    //       event
    //     );
    //   };
    //   Paper.view.onClick = function (event) {
    //     // if (event.stopPropagation) {
    //     //   event.stopPropagation();
    //     // } else {
    //     //   event.cancelBubble = true;
    //     // }
    //     console.log(
    //       "CanvasType.vue -> onMounted | Paper.view Click event",
    //       event
    //     );
    //   };
    //   Paper.view.onResize = function (event) {
    //     console.log(
    //       "CanvasType.vue -> onMounted | Paper.view.onResize event",
    //       event
    //     );
    //   };
    //   Paper.view.on("resize", function (event) {
    //     console.log(
    //       "CanvasType.vue -> onMounted | Paper.view Resize event",
    //       event
    //     );
    //   });
    //   project.view.on("resize", function (event) {
    //     console.log(
    //       "CanvasType.vue -> onMounted | project Resize event",
    //       event
    //     );
    //   });
    //   Paper.view.onFrame = function (event) {
    //     // if (event.stopPropagation) {
    //     //   event.stopPropagation();
    //     // } else {
    //     //   event.cancelBubble = true;
    //     // }
    //     // console.log("CanvasType.vue -> onMounted | Frame event", event);
    //     // console.log(
    //     //   "CanvasType.vue -> onMounted | Frame event",
    //     //   props.item.width,
    //     //   props.item.height
    //     // );
    //     // if (square.dragging) {
    //     //   square.position = event.point;
    //     // }
    //     // updateShapes();
    //     // console.log(
    //     //   "CanvasType.vue -> onMounted | Frame event",
    //     //   project.layers,
    //     //   project.layers[0].children
    //     // );
    //   };
    //   project.activeLayer.addChild(square);
    //   console.log("CanvasType.vue -> onMounted | Paper.view", Paper.view);
    // }
    //Paper.view.draw();
    // // 动态更新图像大小和位置
    // function updateShapes() {
    //   // var bounds = rect.bounds;
    //   //image.position = bounds.center;
    //   console.log("CanvasType.vue -> onMounted | updateShapes", square);
    //   square.fillColor = props.item.settings.bgColor;
    //   // square.scale(1, 1);
    //   // project.view.draw();
    // }
    // project.view.on("resize", function (event) {
    //   console.log(
    //     "CanvasType.vue -> onMounted | project Resize event",
    //     event
    //   );
    //   updateShapes();
    // });
    // Paper.view.onResize = function (event) {
    //   console.log(
    //     "CanvasType.vue -> onMounted | Paper.view.onResize event",
    //     event
    //   );
    //   updateShapes();
    // };
    //   Paper.view.onFrame = function (event) {
    //     // if (event.stopPropagation) {
    //     //   event.stopPropagation();
    //     // } else {
    //     //   event.cancelBubble = true;
    //     // }
    //     // console.log("CanvasType.vue -> onMounted | Frame event", event);
    //     // console.log(
    //     //   "CanvasType.vue -> onMounted | Frame event",
    //     //   props.item.width,
    //     //   props.item.height
    //     // );
    //     // if (square.dragging) {
    //     //   square.position = event.point;
    //     // }
    //     updateShapes();
    //     // console.log(
    //     //   "CanvasType.vue -> onMounted | Frame event",
    //     //   project.layers,
    //     //   project.layers[0].children
    //     // );
    //   };

    return {
      range,
      dispalyText,
      processedColors,
      changeValue,
      refresh,
      objectRef,
      updateWeldModel,
      canvas,
    };
  },
});
</script>

<style scoped>
.canvas-viewport-wrapper {
  /* width: 100vw;
  height: 100vh; */
  /* overflow: hidden;
  position: absolute;
  top: 0; */
  /* position: absolute; */
  background-color: rgb(136, 80, 197);
  width: v-bind("item.width + 'px'");
  height: v-bind("item.height + 'px'");
}

.object-title {
  text-align: center;
  min-width: 100%;
  white-space: nowrap;
  line-height: 2.5em;
  color: v-bind("item.settings.titleColor");
}

.with-bg .object-title {
  background-color: rgb(255 255 255 / 40%);
}

.moveable-item {
  height: 100%;
  border-radius: 5px;
  background-color: v-bind("item.settings.bgColor");
  color: v-bind("item.settings.textColor");
  font-size: v-bind("item.settings.fontSize + 'px'");
}

.moveable-item.Duct {
  background-color: transparent;
}

.object-container {
  width: 100%;
}

.moveable-item.Gauge .object-container,
.moveable-item.Dial .object-container {
  height: 100%;
}

.moveable-item.Gauge.with-title .object-container,
.moveable-item.Dial.with-title .object-container {
  height: calc(100% - 41px);
}

.moveable-item.Value.with-title,
.moveable-item.Icon.with-title,
.moveable-item.Switch.with-title {
  display: flex;
}

.moveable-item.Icon.with-title,
.moveable-item.Switch.with-title {
  display: flex;
  flex-direction: row-reverse;
}

.moveable-item.Value .object-container,
.moveable-item.Icon.with-title .object-container,
.moveable-item.Switch.with-title .object-container {
  height: 100%;
  display: flex;
  align-items: center;
}

.moveable-item.Value .object-container {
  flex-grow: 1;
  justify-content: v-bind("item.settings.justifyContent");
  padding: 10px;
}

.moveable-item.Icon.with-title .object-container,
.moveable-item.Switch.with-title .object-container {
  width: auto;
}

.moveable-item.Value.with-title .object-title,
.moveable-item.Icon.with-title .object-title,
.moveable-item.Switch.with-title .object-title {
  min-width: auto;
  padding: 10px;
  line-height: 1.5em;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.moveable-item.Icon.with-title .object-title,
.moveable-item.Switch.with-title .object-title {
  flex-grow: 1;
  justify-content: v-bind("item.settings.justifyContent");
}

.moveable-item.Value.with-title .object-title .mode-icon,
.moveable-item.Icon.with-title .object-title .mode-icon,
.moveable-item.Switch.with-title .object-title .mode-icon {
  display: none;
}

.moveable-item.Icon.with-bg .object-title,
.moveable-item.Switch.with-bg .object-title {
  background-color: transparent;
}

.moveable-item.link {
  cursor: pointer;
}

.img-object {
  max-width: none;
  width: 100%;
}

.up-btn {
  display: none;
  bottom: 100%;
  z-index: 1;
}

.down-btn {
  display: none;
  top: 100%;
  z-index: 1;
}

.moveable-item.Icon .up-btn,
.moveable-item.Switch .up-btn {
  bottom: calc(100% + 5px);
}

.moveable-item.Icon .down-btn,
.moveable-item.Switch .down-btn {
  top: calc(100% + 3px);
}

.object-title:hover .up-btn,
.object-title:hover .down-btn {
  display: inline-flex;
}

.Duct .object-container {
  max-height: 100%;
}
</style>
