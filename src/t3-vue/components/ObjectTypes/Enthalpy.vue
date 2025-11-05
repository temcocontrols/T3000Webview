<template>
  <svg
    height="100%"
    width="100%"
    version="1.1"
    viewBox="0 0 10.221108 22.472175"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:svg="http://www.w3.org/2000/svg"
    class="object-svg"
  >
    <defs>
      <linearGradient id="linearGradient4194">
        <stop
          style="stop-color: #ffff00; stop-opacity: 1"
          offset="0"
          id="stop4196"
        />
        <stop
          id="stop4148"
          offset="0.3598454"
          style="stop-color: #ffff00; stop-opacity: 1"
        />
        <stop
          id="stop4144"
          offset="0.59441435"
          style="stop-color: #00ffff; stop-opacity: 1"
        />
        <stop
          style="stop-color: #00ffff; stop-opacity: 1"
          offset="1"
          id="stop4198"
        />
      </linearGradient>
      <linearGradient
        xlink:href="#linearGradient4194"
        id="linearGradient4219"
        x1="15.955305"
        y1="9.504283"
        x2="16.127491"
        y2="24.826317"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(-10.896808,-9.4127998)"
      />
    </defs>
    <rect
      style="
        fill: url(#linearGradient4219);
        fill-opacity: 1;
        fill-rule: nonzero;
        stroke: #000000;
        stroke-width: 1px;
      "
      x="3.660192"
      y="0.5"
      width="2.901"
      height="14.505"
      id="rect3012"
    />
    <path
      :style="`fill: ${fillColor}; stroke: #000000; stroke-width: 0.889176px`"
      d="m 9.7077419,18.0463 -2.298594,3.981286 H 2.8119599 L 0.51336587,18.0463 2.8119599,14.065014 h 4.597188 z"
    />
    <g transform="translate(-10.733726,-9.4127998)">
      <g transform="translate(8.1630559,0.95878887)">
        <circle
          style="
            fill: none;
            fill-opacity: 1;
            stroke: #000000;
            stroke-width: 0.5;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          "
          id="path4137"
          cx="6.4061227"
          cy="28.129852"
          r="0.77312505"
        />
        <path
          style="
            fill: none;
            fill-rule: evenodd;
            stroke: #000000;
            stroke-width: 0.5;
            stroke-linecap: butt;
            stroke-linejoin: miter;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          "
          d="M 6.4061205,27.157211 V 23.65349"
        />
      </g>
      <path
        style="
          fill: none;
          stroke: #000000;
          stroke-width: 0.5;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
        d="m 17.270488,24.668533 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
      />
      <path
        style="
          fill: none;
          stroke: #000000;
          stroke-width: 0.5;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
        d="m 17.270488,27.878474 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
      />
    </g>
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
