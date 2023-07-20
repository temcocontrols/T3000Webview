<template>
  <svg
    xmlns:svg="http://www.w3.org/2000/svg"
    xmlns="http://www.w3.org/2000/svg"
    height="100%"
    width="100%"
    version="1.1"
    viewBox="0 0 32 32"
    class="object-svg"
  >
    <defs id="defs9">
      <linearGradient id="linearGradient4194" osb:paint="gradient">
        <stop
          style="stop-color: #ffff00; stop-opacity: 1"
          offset="0"
          id="stop4196"
        ></stop>
        <stop
          style="stop-color: #659dc5; stop-opacity: 1"
          offset="1"
          id="stop4198"
        ></stop>
      </linearGradient>
    </defs>
    <path
      style="fill: #659dc5; stroke: #000000; stroke-width: 0.88917601px"
      inkscape:connector-curvature="0"
      d="m 20.60455,27.4591 -2.298594,3.981286 -4.597188,0 -2.298594,-3.981286 2.298594,-3.981286 4.597188,0 z"
      id="path3010"
    ></path>
    <g
      id="g4150"
      transform="matrix(0.83920236,0,0,0.83920236,2.5837137,4.2139363)"
    >
      <path
        inkscape:connector-curvature="0"
        id="path4146"
        d="m 14.917284,30.513877 0,-5.217284 2.569115,0"
        style="
          fill: none;
          fill-rule: evenodd;
          stroke: #000000;
          stroke-width: 0.82447493px;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-opacity: 1;
        "
      ></path>
      <path
        inkscape:connector-curvature="0"
        id="path4148"
        d="m 14.956808,27.549512 2.529591,0"
        style="
          fill: none;
          fill-rule: evenodd;
          stroke: #000000;
          stroke-width: 0.82447493px;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-opacity: 1;
        "
      ></path>
    </g>
    <path
      style="
        fill: none;
        fill-rule: evenodd;
        stroke: #000000;
        stroke-width: 1px;
        stroke-linecap: butt;
        stroke-linejoin: miter;
        stroke-opacity: 1;
      "
      d="m 16.059713,23.514719 0,-12.464256 -4.602186,0"
      id="path4156"
      inkscape:connector-curvature="0"
    ></path>
    <path
      style="
        fill: none;
        fill-rule: evenodd;
        stroke: #000000;
        stroke-width: 1px;
        stroke-linecap: butt;
        stroke-linejoin: miter;
        stroke-opacity: 1;
      "
      d="m 15.915895,19.439866 2.205215,0 0,4.122792"
      id="path4158"
      inkscape:connector-curvature="0"
    ></path>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "EnthalpyEl",
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
