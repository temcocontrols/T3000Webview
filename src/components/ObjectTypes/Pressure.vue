<template>
  <svg
    version="1.1"
    viewBox="0 0 28.852817 27.05043"
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
    <path
      style="fill: currentColor; stroke: #000000; stroke-width: 1.29098px"
      d="M 21.101011,20.624556 17.76371,26.404938 H 11.089107 L 7.7518058,20.624556 11.089107,14.844174 h 6.674603 z"
    />
    <g transform="matrix(0.39332133,0,0,0.5366036,8.3312906,37.286552)">
      <g transform="translate(0,0.03745956)">
        <path
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 1.30927;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
          "
          d="m 16.929663,-31.088307 4.3966,-1.150699 v 2.301399 z"
          stroke-miterlimit="4"
        />
        <path
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 1;
            stroke-linecap: butt;
            stroke-linejoin: miter;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
          "
          d="M 27.541431,-31.088307 H 18.912663"
        />
      </g>
      <path
        d="m 15.532379,-39.152447 v 16.2032"
        style="
          fill: none;
          stroke: #000000;
          stroke-width: 1px;
          stroke-linecap: butt;
          stroke-linejoin: miter;
        "
      />
      <g transform="matrix(-1,0,0,1,-1.8983044,-0.27118644)">
        <path
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 1.30927;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
          "
          d="m -15.961713,-30.779661 4.3966,-1.150699 v 2.301399 z"
          stroke-miterlimit="4"
        />
        <path
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 1;
            stroke-linecap: butt;
            stroke-linejoin: miter;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
          "
          d="M -5.3499446,-30.779661 H -13.978713"
        />
      </g>
    </g>
    <g transform="translate(-1.5131572,-0.15657804)">
      <path
        d="M 2.0131572,0.15657804 V 6.9638416 H 14.573291 v 8.3199894"
        style="
          fill: none;
          fill-rule: evenodd;
          stroke: #000000;
          stroke-width: 1;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
      />
      <path
        d="M 29.865974,0.15657812 V 6.9638416 H 17.305841 v 8.3199894"
        style="
          fill: none;
          fill-rule: evenodd;
          stroke: #000000;
          stroke-width: 1;
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
  name: "PressureEl",
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
