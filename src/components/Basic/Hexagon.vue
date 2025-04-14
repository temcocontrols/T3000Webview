<template>
  <svg viewBox="0 0 32 32" version="1.1" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
    xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" height="100%" width="100%"
    class="object-svg" :class="{ active: active, 'in-alarm': inAlarm }">
    <g fill="currentColor" transform="translate(-1,-1)">
      <g class="hexagon">
        <path d="M 6.4 5.4 L 25.6 5.4 L 30.4 15 L 25.6 24.6 L 6.4 24.6 L 1.6 15 Z" :fill="fillColor" stroke="#000000" />
      </g>
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "HexagonEl",
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

.in-alarm .hexagon {
  animation: color_change 1s infinite;
}
</style>
