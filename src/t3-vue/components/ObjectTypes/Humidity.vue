<template>
  <svg
    version="1.1"
    viewBox="0 0 10.221108 22.472175"
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
    <defs>
      <linearGradient inkscape:swatch="gradient">
        <stop style="stop-color: #ffff00; stop-opacity: 1" offset="0" />
        <stop style="stop-color: currentColor; stop-opacity: 1" offset="1" />
      </linearGradient>
    </defs>
    <rect
      style="
        fill: #00d1ff;
        fill-opacity: 1;
        fill-rule: nonzero;
        stroke: #000000;
        stroke-width: 1px;
      "
      x="3.660192"
      y="0.5"
      width="2.901"
      height="14.505"
    />
    <path
      style="fill: #659dc5; stroke: #000000; stroke-width: 0.889176px"
      d="m 9.7077419,18.0463 -2.298594,3.981286 H 2.8119599 L 0.51336587,18.0463 2.8119599,14.065014 h 4.597188 z"
    />
    <g transform="translate(-10.962785,-9.3157224)">
      <g>
        <path
          d="m 17.43357,24.668533 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 0.5;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          "
        />
        <path
          d="m 17.43357,27.878474 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 0.5;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          "
        />
      </g>
      <g transform="translate(0,0.107786)">
        <path
          d="m 14.710621,24.560747 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 0.5;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          "
        />
        <path
          d="m 14.710621,27.770688 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 0.5;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          "
        />
      </g>
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
