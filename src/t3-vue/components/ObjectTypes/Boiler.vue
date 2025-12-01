<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    height="100%"
    width="100%"
    version="1.1"
    class="object-svg"
    :class="{ active: active, 'in-alarm': inAlarm }"
  >
    <path
      style="
        fill: currentColor;
        fill-opacity: 1;
        fill-rule: nonzero;
        stroke: #000000;
        stroke-width: 1;
        stroke-linecap: butt;
        stroke-linejoin: miter;
        stroke-miterlimit: 4;
        stroke-dasharray: none;
        stroke-opacity: 1;
      "
      d="m 2,15 8,-7 0,-7 12,0 0,7 8,7 0,16 -28,0 z"
    ></path>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "BoilerEl",
  props: {
    active: {
      type: Boolean,
      required: false,
      default: false,
    },
    inAlarm: {
      type: Boolean,
      required: false,
      default: false,
    },
    fillColor: {
      type: String,
      default: "#659dc5",
    },
  },
});
</script>

<style scoped>
.object-svg {
  color: v-bind(fillColor);
}
</style>
