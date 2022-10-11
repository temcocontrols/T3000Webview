

<template>
  <template v-if="item.type === 'Fan'">
    <fan class="movable-item fan" v-bind="item.props" />
  </template>
  <template v-else-if="item.type === 'Duct'">
    <duct class="movable-item duct" />
  </template>
  <template v-else-if="item.type === 'CoolingCoil'">
    <cooling-coil class="movable-item cooling-coil" v-bind="item.props" />
  </template>
  <template v-else-if="item.type === 'HeatingCoil'">
    <heating-coil class="movable-item heating-coil" v-bind="item.props" />
  </template>
  <template v-else-if="item.type === 'Filter'">
    <Filter class="movable-item filter" v-bind="item.props" />
  </template>
  <template v-else-if="item.type === 'Humidifier'">
    <humidifier class="movable-item humidifier" v-bind="item.props" />
  </template>
  <template v-else-if="item.type === 'Damper'">
    <damper class="movable-item damper" v-bind="item.props" />
  </template>
  <template v-else-if="item.type === 'Text'">
    <Text class="movable-item text" v-bind="item.props" />
  </template>
  <template v-else-if="item.type === 'Temperature'">
    <temperature class="movable-item temperature" v-bind="item.props" />
  </template>
</template>

<script>
import { defineComponent } from 'vue'
import DuctEl from "./Duct.vue"
import FanEl from "./Fan.vue"
import CoolingCoil from './CoolingCoil.vue'
import HeatingCoil from './HeatingCoil.vue'
import FilterEl from './Filter.vue'
import HumidifierEl from './Humidifier.vue'
import Damper from './Damper.vue'
import Text from './Text.vue'
import Temperature from './Temperature.vue'
export default defineComponent({
  name: 'ObjectType',
  components: {
    Duct: DuctEl,
    Fan: FanEl,
    CoolingCoil,
    HeatingCoil,
    Filter: FilterEl,
    Humidifier: HumidifierEl,
    Damper,
    Text,
    Temperature
  },
  props: {
    item: {
      type: Object,
      required: true
    }
  }
})
</script>
