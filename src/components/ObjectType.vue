

<template>
  <template v-if="item.type === 'Fan'">
    <fan class="movable-item fan" v-bind="item.props" />
  </template>
  <template v-else-if="item.type === 'LED'">
    <wokwi-led class="movable-item led" :color="item.props.color" label="" lightcolor=""></wokwi-led>
  </template>
  <template v-else-if="item.type === 'LCD'">
    <wokwi-lcd1602 class="movable-item lcd" cursorx="0" cursory="0" text="Hello, World!" :color="item.props.color">
    </wokwi-lcd1602>
  </template>
  <template v-else-if="item.type === 'Arduino'">
    <wokwi-arduino-uno class="movable-item arduino"></wokwi-arduino-uno>
  </template>
  <template v-else-if="item.type === 'Motor'">
    <wokwi-stepper-motor class="movable-item stepper-motor"></wokwi-stepper-motor>
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
