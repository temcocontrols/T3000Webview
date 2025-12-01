<template>
  <svg
    xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:cc="http://creativecommons.org/ns#"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    viewBox="0 0 32 32"
    height="100%"
    width="100%"
    version="1.1"
    class="object-svg"
    :class="{ active: active, 'in-alarm': inAlarm }"
  >
    <g
      class="heat-pump"
      stroke-linejoin="round"
      stroke="#000"
      transform="translate(39 -2.3842e-7)"
      fill="currentColor"
    >
      <rect
        class="inner"
        height="27.718"
        width="27.718"
        y="2.141"
        x="-36.859"
        stroke-width="1.0868"
      ></rect>
      <g
        transform="matrix(1.0276 0 0 1.0276 -39.441 -.44130)"
        stroke-linecap="round"
        stroke-miterlimit="1"
        stroke-width="1.3509"
      >
        <path
          d="m16.234 16.944 8.6837-6.894-8.6837-6.894v3.447h-13.152v6.894h13.152z"
          fill="#ce2824"
        ></path>
        <path
          d="m15.766 28.844-8.6837-6.894 8.6837-6.894v3.447h13.152v6.894h-13.152z"
          fill="#3238db"
        ></path>
      </g>
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: " HeatpumpEl",
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
.object-svg {
  color: v-bind(fillColor);
}
.in-alarm .heat-pump .inner {
  animation: heat-pump-alarm 1s infinite;
}
@keyframes heat-pump-alarm {
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

@keyframes heat-pump-active {
  0% {
    fill: #27ae60;
    opacity: 1;
  }
  50% {
    fill: currentColor;
    opacity: 0.2;
  }
  100% {
    fill: #27ae60;
    opacity: 1;
  }
}

.active:not(.in-alarm) .heat-pump .inner {
  animation: heat-pump-active 1s infinite;
}
</style>
