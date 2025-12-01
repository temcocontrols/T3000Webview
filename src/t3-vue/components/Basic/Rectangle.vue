<template>
  <svg viewBox="0 0 30 20" version="1.1"
    xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg"
    xmlns:svg="http://www.w3.org/2000/svg" height="100%" width="100%" class="object-svg"
    :class="{ active: active, 'in-alarm': inAlarm }">
    <g fill="currentColor" transform="translate(-5.4940996,-5.5390997)">
      <g class="rectangle">
        <rect x="7" y="7" width="27" height="15" stroke="#000000"  />
      </g>
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "RectangleEl",
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
.object-svg {
  color: v-bind(fillColor);
}

.in-alarm .rectangle {
  animation: color_change 1s infinite;
}
</style>
