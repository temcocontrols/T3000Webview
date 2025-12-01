<template>
  <svg
    version="1.1"
    viewBox="0 0 18.016949 18.016949"
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
    <g transform="matrix(0.76419842,0,0,0.76419842,-3.2187002,-3.2187002)">
      <circle
        r="11.288136"
        cy="16"
        cx="16"
        style="
          opacity: 1;
          fill: currentColor;
          fill-opacity: 1;
          fill-rule: nonzero;
          stroke: #000000;
          stroke-width: 1;
          stroke-linecap: butt;
          stroke-linejoin: round;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
      />
      <g
        transform="translate(32.100664,13.086915)"
        style="
          font-style: normal;
          font-weight: normal;
          font-size: 20.2897px;
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
          d="m -22.356997,-4.4825641 h 12.5126658 v 1.6842067 H -15.095093 V 10.308734 h -2.011141 V -2.7983574 h -5.250763 z"
        />
      </g>
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "RoomTemperature",
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
