<template>
  <svg
    version="1.1"
    viewBox="0 0 18.016948 18.016948"
    xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:svg="http://www.w3.org/2000/svg"
    xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    xmlns:cc="http://creativecommons.org/ns#"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    height="100%"
    width="100%"
    class="object-svg"
  >
    <g transform="translate(-6.9915256,-6.9915256)">
      <circle
        r="8.6263752"
        cy="16"
        cx="16"
        style="
          opacity: 1;
          fill: currentColor;
          fill-opacity: 1;
          fill-rule: nonzero;
          stroke: #000000;
          stroke-width: 0.764198;
          stroke-linecap: butt;
          stroke-linejoin: round;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
      />
      <g
        transform="matrix(0.29971746,0,0,0.29971746,20.655088,20.220855)"
        style="
          font-style: normal;
          font-weight: normal;
          font-size: 51.4601px;
          line-height: 125%;
          font-family: Sans;
          letter-spacing: 0px;
          word-spacing: 0px;
          fill: #000000;
          fill-opacity: 1;
          stroke: none;
          stroke-width: 1px;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-opacity: 1;
        "
      >
        <path
          d="m -29.828843,-32.840076 h 5.075651 v 15.377717 h 18.4432096 v -15.377717 h 5.0756516 V 4.6745172 H -6.3099824 V -13.190771 H -24.753192 V 4.6745172 h -5.075651 z"
        />
      </g>
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "RoomHumidity",
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
