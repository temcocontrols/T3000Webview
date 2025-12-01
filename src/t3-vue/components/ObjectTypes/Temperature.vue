<template>
  <svg
    height="100%"
    width="100%"
    version="1.1"
    viewBox="0 0 10.423067 22.852614"
    xmlns="http://www.w3.org/2000/svg"
    class="object-svg"
  >
    <g
      id="layer1"
      stroke="#000000"
      stroke-width="1px"
      transform="translate(-10.804626,-9.2243756)"
    >
      <rect
        id="rect3012"
        height="14.505"
        width="2.901"
        y="9.9127998"
        x="14.557"
        fill="#ffff00"
      />
      <path
        id="path3010"
        stroke-width="1.2px"
        transform="matrix(0.74098,0,0,0.74098,7.3047,15.679)"
        fill="currentColor"
        d="m 17.949,15.898 -3.1021,5.373 H 8.6427 L 5.5406,15.898 8.6427,10.525 h 6.2042 z"
      />
    </g>
    <g id="g4141" transform="translate(-1.2033861,-8.1217684)">
      <circle
        r="0.77312505"
        cy="28.129852"
        cx="6.4061227"
        id="path4137"
        style="
          fill: none;
          fill-opacity: 1;
          stroke: #000000;
          stroke-width: 0.5;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
      />
      <path
        id="path4139"
        d="M 6.4061205,27.157211 V 23.65349"
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
      />
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "TemperatureEl",
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
