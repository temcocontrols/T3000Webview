<template>
  <svg
    version="1.1"
    height="100%"
    width="100%"
    viewBox="0 0 10.221108 21.334512"
    xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:svg="http://www.w3.org/2000/svg"
    xmlns:osb="http://www.openswatchbook.org/uri/2009/osb"
    class="object-svg"
  >
    <defs>
      <linearGradient id="linearGradient4194" osb:paint="gradient">
        <stop style="stop-color: #ffff00; stop-opacity: 1" offset="0" />
        <stop style="stop-color: currentColor; stop-opacity: 1" offset="1" />
      </linearGradient>
    </defs>
    <path
      style="fill: currentColor; stroke: #000000; stroke-width: 0.889176px"
      d="m 9.7077419,16.908637 -2.298594,3.981286 H 2.8119599 L 0.51336587,16.908637 2.8119599,12.927351 h 4.597188 z"
    />
    <g transform="matrix(0.83920236,0,0,0.83920236,-8.3130944,-6.3365267)">
      <path
        id="path4146"
        d="m 14.917284,30.513877 v -5.217284 h 2.569115"
        style="
          fill: none;
          fill-rule: evenodd;
          stroke: #000000;
          stroke-width: 0.824475px;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-opacity: 1;
        "
      />
      <path
        d="m 14.956808,27.549512 h 2.529591"
        style="
          fill: none;
          fill-rule: evenodd;
          stroke: #000000;
          stroke-width: 0.824475px;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-opacity: 1;
        "
      />
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
      d="M 5.1629049,12.964256 V 0.5 H 0.56071887"
    />
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
      d="m 5.0190869,8.889403 h 2.205215 v 4.122792"
    />
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
