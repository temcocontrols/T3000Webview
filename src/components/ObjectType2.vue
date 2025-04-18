<template>
  <div v-if="item.title" @click="$emit('objectClicked')">
    {{ item.title }}
  </div>
</template>

<script>
import { defineComponent, computed, ref } from "vue";
// import { getEntryRange } from "src/lib/common";
import IdxUtils from "src/lib/T3000/Hvac/Opt/IdxUtils";

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

// import CircleEl from "./Basic/Circle.vue";
// import RectangleEl from "./Basic/Rectangle.vue";
// import HexagonEl from "./Basic/Hexagon.vue";
// import StepEl from "./Basic/Step.vue";

export default defineComponent({
  name: "ObjectType2",
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
    // CircleEl,
    // RectangleEl,
    // HexagonEl,
    // StepEl
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

    console.log('ObjectType2 props', props.item);
    const range = computed(() => {
      return IdxUtils.getEntryRange(props.item?.t3Entry);
    });

    const dispalyText = computed(() => {

      // console.log('==== DisplayText', props.item.settings.t3EntryDisplayField,
      //   props.item.t3Entry.description, props.item.t3Entry.label, props.item.t3Entry.value, props.item.t3Entry);

      if (!props.item.t3Entry) {
        return "";
      }

      const range = IdxUtils.getEntryRange(props.item.t3Entry);
      console.log('= Ot range,t3e', range, props.item.t3Entry);

      if (props.item.settings.t3EntryDisplayField === "description") {
        const description = props.item.t3Entry.description || "";
        const value = props.item.t3Entry.value || "";
        let valueText = "";

        if (props.item.t3Entry.range > 100) {
          const rangeValue = range.options?.find(
            (item) => item.value === props.item.t3Entry.value
          )
          valueText = rangeValue?.name || "";
        }
        else if (props.item.t3Entry.digital_analog === 1) {
          valueText = (value || "") + " " + (range?.unit || "");
        } else if (props.item.t3Entry.digital_analog === 0) {
          if (props.item.t3Entry.control) {
            valueText = range?.on || "";
          } else {
            valueText = range?.off || "";
          }
        }

        return description + " " + valueText;
      }

      if (props.item.settings.t3EntryDisplayField === "label") {
        const description = props.item.t3Entry.label || "";
        const value = props.item.t3Entry.value || "";
        let valueText = "";

        if (props.item.t3Entry.range > 100) {
          const rangeValue = range.options?.find(
            (item) => item.value === props.item.t3Entry.value
          )
          valueText = rangeValue?.name || "";
        }
        else if (props.item.t3Entry.digital_analog === 1) {
          valueText = (value || "") + " " + (range?.unit || "");
        } else if (props.item.t3Entry.digital_analog === 0) {
          if (props.item.t3Entry.control) {
            valueText = range?.on || "";
          } else {
            valueText = range?.off || "";
          }
        }

        return description + " " + valueText;
      }

      if (props.item.settings.t3EntryDisplayField === "value" || props.item.settings.t3EntryDisplayField === "control") {
        if (props.item.t3Entry.value !== undefined && props.item.t3Entry.range > 100) {
          const rangeValue = range.options?.find(
            // (item) => item.value * 1000 === props.item.t3Entry.value
            (item) => item.value === props.item.t3Entry.value
          );
          return rangeValue?.name;
        } else if (props.item.t3Entry.value !== undefined && props.item.t3Entry.digital_analog === 1) {
          // return props.item.t3Entry.value / 1000 + " " + range.unit;
          return props.item.t3Entry.value + " " + range.unit;
        } else if (props.item.t3Entry.control !== undefined && props.item.t3Entry.digital_analog === 0) {
          if (props.item.t3Entry.control) {
            return range.on;
          } else {
            return range.off;
          }
        }
      }

      return props.item.t3Entry[props.item.settings.t3EntryDisplayField] || "";
    })

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
    })

    function changeValue(type) {
      if (props.item.t3Entry.auto_manual === 0) return;
      let control = false;
      let newVal = props.item.t3Entry.value;
      const range = IdxUtils.getEntryRange(props.item?.t3Entry);
      if (
        props.item.t3Entry.value !== undefined &&
        props.item.t3Entry.range > 100
      ) {
        const rangeOptions = range.options?.filter((item) => item.status === 1);
        const rangeIndex = rangeOptions.findIndex(
          // (item) => item.value * 1000 === props.item.t3Entry.value
          (item) => item.value === props.item.t3Entry.value
        );

        if (type === "decrease" && rangeIndex < rangeOptions.length - 1) {
          //newVal = rangeOptions[rangeIndex + 1].value * 1000;
          newVal = rangeOptions[rangeIndex + 1].value;
        } else if (type === "increase" && rangeIndex > 0) {
          //newVal = rangeOptions[rangeIndex - 1].value * 1000;
          newVal = rangeOptions[rangeIndex - 1].value;
        } else {
          return;
        }
      } else if (
        props.item.t3Entry.value !== undefined &&
        props.item.t3Entry.digital_analog === 1
      ) {
        if (type === "increase") {
          // newVal = props.item.t3Entry.value + 1000;
          newVal = props.item.t3Entry.value + 1;
        } else {
          // newVal = props.item.t3Entry.value - 1000;
          newVal = props.item.t3Entry.value - 1;
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
      emit("updateWeldModel", weldModel, itemList);
    }

    return {
      range,
      dispalyText,
      processedColors,
      changeValue,
      refresh,
      objectRef,
      updateWeldModel,
    };
  },
});
</script>

<style scoped>
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
