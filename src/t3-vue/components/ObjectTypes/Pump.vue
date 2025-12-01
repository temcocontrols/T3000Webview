<template>
  <svg
    viewBox="0 0 20.921802 20.921802"
    version="1.1"
    xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:svg="http://www.w3.org/2000/svg"
    height="100%"
    width="100%"
    class="object-svg"
    :class="{ active: active, 'in-alarm': inAlarm }"
  >
    <g fill="currentColor" transform="translate(-5.4940996,-5.5390997)">
      <g class="pump">
        <circle
          stroke="#000000"
          cy="16"
          cx="15.955"
          r="9.9609003"
          class="pump-background"
        />
        <g transform="translate(16,16)">
          <path
            d="M -5,8.1369 V -8.1191 L 9.078,0.0091 Z"
            class="rotating-middle"
            stroke="#000000"
            stroke-width="0.96719"
          />
        </g>
      </g>
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: " PumpEl",
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
.in-alarm .pump {
  animation: color_change 1s infinite;
}
@keyframes pump-alarm {
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
@keyframes color_change {
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
.active .pump .rotating-middle {
  fill: black;
  animation: pump-spin 3s linear infinite;
}
.in-alarm .pump .pump-background {
  animation: heating-coil-alarm 1s infinite;
}
@keyframes pump-alarm {
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
.active:not(.in-alarm) .pump .pump-background {
  fill: #27ae60;
}
@keyframes pump-spin {
  100% {
    transform: rotate(360deg);
  }
}
</style>
