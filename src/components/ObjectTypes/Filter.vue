<template>
  <svg
    viewBox="0 0 13 29"
    height="100%"
    width="100%"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    class="object-svg"
  >
    <g
      stroke="#000"
      stroke-width="1"
      transform="matrix(1, 0, 0, 1, -9.37, -1.3252)"
    >
      <rect
        id="rect4367"
        height="27.35"
        width="11.26"
        y="2.3252"
        x="10.37"
        fill="currentColor"
      />
      <path
        id="path3756"
        stroke-linejoin="miter"
        d="m11.892,2.6997,8.2165,4.4334-8.2165,4.4334,8.2165,4.4334-8.2165,4.4334,8.2165,4.4334-8.2165,4.4334"
        stroke-linecap="round"
        stroke-miterlimit="4"
        stroke-dasharray="none"
        stroke-width="1.2694304"
        fill="none"
      />
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "FilterEl",
  props: {
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
