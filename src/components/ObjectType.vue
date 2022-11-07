<template>
  <div class="object-title" v-if="item.t3Entry">
    {{ item.t3Entry[item.t3EntryDisplayField] || "N/A" }}
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
    <Filter class="movable-item filter" v-bind="item.props" />
  </div>
  <div v-else-if="item.type === 'Humidifier'">
    <humidifier class="movable-item humidifier" v-bind="item.props" />
  </div>
  <div v-else-if="item.type === 'Damper'">
    <damper class="movable-item damper" v-bind="item.props" />
  </div>
  <div v-else-if="item.type === 'Text'">
    <Text class="movable-item text" v-bind="item.props" />
  </div>
  <div v-else-if="item.type === 'Temperature'">
    <temperature class="movable-item temperature" v-bind="item.props" />
  </div>
</template>

<script>
import { defineComponent } from "vue";
import DuctEl from "./Duct.vue";
import FanEl from "./Fan.vue";
import CoolingCoil from "./CoolingCoil.vue";
import HeatingCoil from "./HeatingCoil.vue";
import FilterEl from "./Filter.vue";
import HumidifierEl from "./Humidifier.vue";
import Damper from "./Damper.vue";
import Text from "./Text.vue";
import Temperature from "./Temperature.vue";
export default defineComponent({
  name: "ObjectType",
  components: {
    Duct: DuctEl,
    Fan: FanEl,
    CoolingCoil,
    HeatingCoil,
    Filter: FilterEl,
    Humidifier: HumidifierEl,
    Damper,
    Text,
    Temperature,
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
  },
});
</script>

<style scoped>
.object-title {
  text-align: center;
  width: 100%;
  position: absolute;
  top: -25px;
}
</style>
