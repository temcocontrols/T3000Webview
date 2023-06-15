<template>
  <div
    class="moveable-item"
    :class="{
      'flex flex-col flex-nowrap': !['Dial', 'Gauge', 'Value'].includes(
        item.type
      ),
      'overflow-hidden': item.type === 'Text',
      [item.type]: item.type,
      'with-bg': item.settings.bgColor,
      'with-title':
        item.settings.title ||
        (item.t3Entry && item.settings.t3EntryDisplayField !== 'none'),
    }"
  >
    <div
      class="object-title"
      v-if="item.settings.title"
      @click="$emit('objectClicked')"
    >
      {{ item.settings.title }}
    </div>
    <div
      class="object-title"
      v-else-if="item.t3Entry && item.settings.t3EntryDisplayField !== 'none'"
    >
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
    <div
      class="flex justify-center object-container grow"
      @click="$emit('objectClicked')"
    >
      <fan v-if="item.type === 'Fan'" class="fan" v-bind="item.settings" />
      <duct v-else-if="item.type === 'Duct'" class="duct" />
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
      <damper
        v-else-if="item.type === 'Damper'"
        class="damper"
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
        v-bind="item.settings"
      />
      <value-el
        v-else-if="item.type === 'Value'"
        class="value"
        :item="item"
        v-bind="item.settings"
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

      <img
        class="img-object"
        v-else-if="item.type.startsWith('IMG-')"
        :src="item.image.path"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from "vue";
import DuctEl from "./ObjectTypes/Duct.vue";
import FanEl from "./ObjectTypes/Fan.vue";
import CoolingCoil from "./ObjectTypes/CoolingCoil.vue";
import HeatingCoil from "./ObjectTypes/HeatingCoil.vue";
import FilterEl from "./ObjectTypes/Filter.vue";
import HumidifierEl from "./ObjectTypes/Humidifier.vue";
import Damper from "./ObjectTypes/Damper.vue";
import TextEl from "./ObjectTypes/Text.vue";
import BoxEl from "./ObjectTypes/Box.vue";
import IconValue from "./ObjectTypes/IconValue.vue";
import ValueEl from "./ObjectTypes/Value.vue";
import Temperature from "./ObjectTypes/Temperature.vue";
import GaugeChart from "./ObjectTypes/EchartsGauge.vue";
import AnyChartDial from "./ObjectTypes/AnyChartDial.vue";

import { getEntryRange } from "src/lib/common";

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
    BoxEl,
    IconValue,
    ValueEl,
    Temperature,
    GaugeChart,
    DialChart: AnyChartDial,
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
  },
  emits: ["autoManualToggle", "objectClicked"],
  setup(props) {
    const range = computed(() => {
      return getEntryRange(props.item?.t3Entry);
    });
    const dispalyText = computed(() => {
      if (!props.item.t3Entry) {
        return "";
      }
      if (
        props.item.settings.t3EntryDisplayField === "value" &&
        props.item.t3Entry.value !== undefined &&
        props.item.t3Entry.digital_analog === 1
      ) {
        return props.item.t3Entry.value / 1000 + " " + range.value.unit;
      } else if (
        (props.item.settings.t3EntryDisplayField === "value" ||
          props.item.settings.t3EntryDisplayField === "control") &&
        props.item.t3Entry.control !== undefined &&
        props.item.t3Entry.digital_analog === 0
      ) {
        if (props.item.t3Entry.control) {
          return range.value.on;
        } else {
          return range.value.off;
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

    return {
      range,
      dispalyText,
      processedColors,
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
.moveable-item.Icon.with-title {
  display: flex;
}

.moveable-item.Icon.with-title {
  display: flex;
  flex-direction: row-reverse;
}

.moveable-item.Value .object-container,
.moveable-item.Icon.with-title .object-container {
  height: 100%;
  display: flex;
  align-items: center;
}

.moveable-item.Value .object-container {
  flex-grow: 1;
  justify-content: v-bind("item.settings.justifyContent");
  padding: 10px;
}

.moveable-item.Icon.with-title .object-container {
  width: auto;
}

.moveable-item.Value.with-title .object-title,
.moveable-item.Icon.with-title .object-title {
  min-width: auto;
  padding: 10px;
  line-height: 1.5em;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.moveable-item.Icon.with-title .object-title {
  flex-grow: 1;
  justify-content: v-bind("item.settings.justifyContent");
}

.moveable-item.Value.with-title .object-title .mode-icon,
.moveable-item.Icon.with-title .object-title .mode-icon {
  display: none;
}

.moveable-item.Icon.with-bg .object-title {
  background-color: transparent;
}
.moveable-item.link {
  cursor: pointer;
}
.img-object {
  max-width: none;
  width: 100%;
}
</style>
