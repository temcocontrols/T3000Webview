<template>
  <svg
    height="100%"
    width="100%"
    viewBox="0 0 32 24"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    class="object-svg"
    :class="{ active: active, 'in-alarm': inAlarm }"
  >
    <g fill="currentColor" transform="matrix(1, 0, 0, 1, -0.231, -4.151388)">
      <g class="fan">
        <g id="g8">
          <path
            class="fan-background"
            d="m12.297 5.154c-6.117 0-11.066 4.9492-11.066 11.066 0 6.117 4.9492 11.066 11.066 11.066 5.7137 0 10.408-4.3091 11.003-9.8647h7.525v-12.268h-18.148c-0.12601-0.0043-0.25236 0-0.37941 0z"
            fill-rule="evenodd"
            stroke="#000"
            stroke-width="1px"
            fill="inherit"
          />
        </g>
        <g id="g4148" transform="translate(12.464 16.395)">
          <g
            id="g4162"
            stroke="#000"
            stroke-width="1.5"
            fill="none"
            class="rotating-middle"
          >
            <path id="use3009" d="m-1.8112-3.9787 3.6227-4.4971" />
            <path id="use3011" d="m0.87376-4.2835 5.5741-1.5089" />
            <path id="use3013" d="m3.2243-2.9521 5.3965 2.0557" />
            <path id="use3015" d="m4.3433-0.4935 3.1575 4.835" />
            <path id="use3017" d="m3.8043 2.1547-0.28747 5.7676" />
            <path id="use3019" d="m1.8113 3.9787-3.6227 4.4971" />
            <path id="use3021" d="m-0.87324 4.2837-5.5741 1.5089" />
            <path id="use3023" d="m-3.2242 2.9527-5.3965-2.0559" />
            <path id="use3025" d="m-4.3432 0.4935-3.158-4.8353" />
            <path id="use3027" d="m-3.8032-2.1541 0.2875-5.7676" />
          </g>
        </g>
      </g>
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "FanEl",
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
      default: "#659dc5",
    },
  },
});
</script>

<style scoped>
.in-alarm .fan {
  animation: fan-alarm 1s infinite;
}

@keyframes fan-alarm {
  0% {
    fill: red;
  }

  50% {
    fill: v-bind(fillColor);
  }

  100% {
    fill: red;
  }
}

.active .fan .rotating-middle {
  animation: fan-spin 3s linear infinite;
}

.active:not(.in-alarm) .fan .fan-background {
  fill: #66c492;
}

@keyframes fan-spin {
  100% {
    transform: rotate(360deg);
  }
}
.object-svg {
  color: v-bind(fillColor);
}
</style>
