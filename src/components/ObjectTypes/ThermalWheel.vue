<template>
  <svg
    viewBox="0 0 26.777448 31.905044"
    version="1.1"
    xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:svg="http://www.w3.org/2000/svg"
    xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    xmlns:cc="http://creativecommons.org/ns#"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    height="100%"
    width="100%"
    class="object-svg"
    :class="{ active: active, 'in-alarm': inAlarm }"
  >
    <g stroke="#000000" fill="currentColor" transform="translate(-2.370089)">
      <rect
        class="thermal-wheel-background"
        height="40"
        width="25.5"
        y="-4"
        x="3"
        fill="inherit"
        stroke-width="1"
      />
      <g class="thermal-wheel" stroke-width="1">
        <line x1="3" x2="28.5" y1="-4" y2="-4" />
        <line x1="3" x2="28.5" y1="0" y2="0" />
        <line x1="3" x2="28.5" y1="4" y2="4" />
        <line x1="3" x2="28.5" y1="8" y2="8" />
        <line x1="3" x2="28.5" y1="12" y2="12" />
        <line x1="3" x2="28.5" y1="16" y2="16" />
        <line x1="3" x2="28.5" y1="20" y2="20" />
        <line x1="3" x2="28.5" y1="24" y2="24" />
        <line x1="3" x2="28.5" y1="28" y2="28" />
        <line x1="3" x2="28.5" y1="32" y2="32" />
        <line x1="3" x2="28.5" y1="36" y2="36" />
      </g>
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: " ThermalWheel",
  props: {
    active: {
      type: Boolean,
      required: false,
      default: false,
    },
    inAlarm: {
      type: Boolean,
      required: false,
      default: false,
    },
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
.in-alarm .thermal-wheel-background {
  animation: thermal_wheel_alarm 1s infinite;
}
@keyframes thermal_wheel_alarm {
  0% {
    fill: red;
  }
  50% {
    fill: currentColor;
  }
  100% {
    fill: red;
  }
}

.active .thermal-wheel {
  animation: thermal-wheel-spin 1.6s linear infinite;
}

.active .thermal-wheel-background {
  fill: #66c492;
}

@keyframes thermal-wheel-spin {
  from {
    transform: translate(0px, 4px);
  }
  to {
    transform: translate(0px, -4px);
  }
}
</style>
