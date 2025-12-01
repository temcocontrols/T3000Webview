<template>
  <svg
    viewBox="0 0 22.956221 13.906571"
    version="1.1"
    xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:svg="http://www.w3.org/2000/svg"
    height="100%"
    width="100%"
    class="object-svg"
  >
    <g
      stroke-linejoin="round"
      fill-rule="nonzero"
      transform="translate(-3.8922957,-7.3951286)"
      stroke="#000000"
      stroke-linecap="round"
      stroke-dasharray="none"
      stroke-miterlimit="4"
      stroke-width="1"
      fill="currentColor"
    >
      <path
        d="M 10.068,7.9344 -1.007,14.3285 V 1.5405 Z"
        transform="translate(5.3992957,6.473236)"
      />
      <path
        d="M 10.068,7.9344 -1.007,14.3285 V 1.5405 Z"
        transform="matrix(-1,0,0,1,25.341517,6.354592)"
      />
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "ValveTwoWay",
  props: {
    fillColor: {
      type: String,
      default: "currentColor",
    },
  },
});
</script>

<style scoped>
.object-svg {
  color: v-bind(fillColor);
}
</style>
