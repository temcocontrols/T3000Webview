<template>
  <svg viewBox="0 0 20.921802 20.921802" version="1.1"
    xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg"
    xmlns:svg="http://www.w3.org/2000/svg" height="100%" width="100%" class="object-svg"
    :class="{ active: active, 'in-alarm': inAlarm }">
    <g fill="currentColor" transform="translate(-5.4940996,-5.5390997)">
      <g class="circle">
        <circle stroke="#000000" cy="16" cx="15.955" r="9.9609003" onclick="alert(11111111)" />
      </g>
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "CircleEl",
  props: {
    bgColor: {
      type: String,
      default: "black",
    },
    fillColor: {
      type: String,
      default: "#659dc5",
    },
  },
  setup() {
    return {};
  },
});
</script>

<style scoped>
/* .box-element {
  background-color: v-bind("bgColor");
} */
.object-svg {
  color: v-bind(fillColor);
}

.in-alarm .circle {
  animation: color_change 1s infinite;
}
</style>
