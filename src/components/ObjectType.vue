<template>
  <div class="object-title" v-if="item.t3Entry && item.t3EntryDisplayField !== 'none'">
    {{ dispalyText || "N/A" }} - {{ range.label }}
    <span v-if="item.t3Entry.hw_switch_status !== 1">
      -
      {{
        item.t3Entry.type === "OUTPUT" && item.t3Entry.hw_switch_status !== 1
        ? item.t3Entry.hw_switch_status
          ? "MAN-ON"
          : "MAN-OFF"
        : ""
      }}</span>
    <span class="ml-2 text-lg">
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
  <div v-if="item.type === 'Fan'">
    <fan class="movable-item fan" v-bind="item.props" />
  </div>
  <div v-else-if="item.type === 'Duct'">
    <duct class="movable-item duct" />
  </div>
  <div v-else-if="item.type === 'CoolingCoil'">
    <cooling-coil class="movable-item cooling-coil" v-bind="item.props" />
  </div>
  <div v-else-if="item.type === 'HeatingCoil'">
    <heating-coil class="movable-item heating-coil" v-bind="item.props" />
  </div>
  <div v-else-if="item.type === 'Filter'">
    <filter-el class="movable-item filter" v-bind="item.props" />
  </div>
  <div v-else-if="item.type === 'Humidifier'">
    <humidifier class="movable-item humidifier" v-bind="item.props" />
  </div>
  <div v-else-if="item.type === 'Damper'">
    <damper class="movable-item damper" v-bind="item.props" />
  </div>
  <div v-else-if="item.type === 'Text'">
    <text-el class="movable-item text" v-bind="item.props" />
  </div>
  <div v-else-if="item.type === 'Temperature'">
    <temperature class="movable-item temperature" v-bind="item.props" />
  </div>
  <div v-else-if="item.type === 'Gauge'" class="movable-item gauge-object gauge">
    <gauge-chart class="customizable-gauge mt-4" :unit="range.unit" :min="item.min" :max="item.max"
      :colors="item.processedColors" :value="item.t3Entry?.value / 1000 || 0">

    </gauge-chart>
  </div>
  <div v-else-if="item.type === 'Dial'" class="movable-item gauge-object dial">
    <dial-chart
      :options="{ value: item.t3Entry?.value / 1000 || 0, unit: range.unit, min: item.min, max: item.max, colors: item.processedColors }"></dial-chart>
  </div>
  <div v-else-if="item.type.startsWith('Custom-')">
    <div v-html="item.svg"></div>
  </div>
</template>

<script>
import { defineComponent, computed } from "vue";
import DuctEl from "./Duct.vue";
import FanEl from "./Fan.vue";
import CoolingCoil from "./CoolingCoil.vue";
import HeatingCoil from "./HeatingCoil.vue";
import FilterEl from "./Filter.vue";
import HumidifierEl from "./Humidifier.vue";
import Damper from "./Damper.vue";
import TextEl from "./Text.vue";
import Temperature from "./Temperature.vue";
import GaugeChart from './EchartsGauge.vue'
import AnyChartDial from 'src/components/AnyChartDial.vue';

import { ranges } from "src/lib/common";

export default defineComponent({
  name: "ObjectType",
  components: {
    Duct: DuctEl,
    Fan: FanEl,
    CoolingCoil,
    HeatingCoil,
    FilterEl,
    Humidifier: HumidifierEl,
    Damper,
    TextEl,
    Temperature,
    GaugeChart,
    DialChart: AnyChartDial
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const range = computed(() => {
      if (props.item.t3Entry?.range) {
        const range = !props.item.t3Entry.digital_analog
          ? ranges.find((i) => !i.analog && i.id === props.item.t3Entry.range)
          : ranges.find((i) => i.analog && i.id === props.item.t3Entry.range);
        if (range) return range;
      }

      return { label: "Unused", unit: "" };
    });
    const dispalyText = computed(() => {
      if (
        props.item.t3EntryDisplayField === "value" &&
        props.item.t3Entry.digital_analog === 1
      ) {
        const range = ranges.find((i) => i.analog && i.id === props.item.t3Entry.range)
        return props.item.t3Entry.value / 1000 + " " + range.unit;
      } else if (
        props.item.t3EntryDisplayField === "value" &&
        !props.item.t3Entry.digital_analog
      ) {
        const range = ranges.find((i) => i.id === props.item.t3Entry.range);
        if (props.item.t3Entry.control) {
          return range.on;
        } else {
          return range.off;
        }
      }

      return props.item.t3Entry[props.item.t3EntryDisplayField];
    });

    return {
      range,
      dispalyText,
    };
  },
});
</script>

<style scoped>
.object-title {
  text-align: center;
  min-width: 100%;
  position: absolute;
  top: -25px;
  white-space: nowrap;
}

.gauge-object {
  width: 100%;
  height: 100%;
}
</style>
