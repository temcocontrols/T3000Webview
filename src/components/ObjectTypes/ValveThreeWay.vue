<template>
  <svg
    xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:cc="http://creativecommons.org/ns#"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    viewBox="0 0 23.197666 18.43317"
    version="1.1"
    height="100%"
    width="100%"
    class="object-svg"
    :class="{ 'in-alarm': inAlarm }"
  >
    <g transform="matrix(1,0,0,-1,-4.3773334,22.894063)">
      <g
        stroke-linejoin="round"
        stroke="#000000"
        class="twv"
        fill="currentColor"
      >
        <g stroke-linecap="round">
          <path d="M 16,16 4.925,22.3941 V 9.6061 Z" />
          <path d="m 16,16 11.075,6.3941 V 9.6061 Z" />
          <path d="M 16,16 9.606,4.925 h 12.788 z" />
        </g>
        <g class="blocker-wrapper">
          <g class="blocker" fill="#000000">
            <path
              stroke-width="0.80716"
              d="m 0,-9.6108 a 8.8788,8.8788 0 0 0 -6.0273,2.375 l 1.6172,2.8008 A 5.7576,5.7576 0 0 1 0,-6.4897 5.7576,5.7576 0 0 1 4.4062,-4.4292 L 6.0293,-7.2397 A 8.8788,8.8788 0 0 0 0,-9.6108 Z"
            />
          </g>
        </g>
      </g>
      <path
        d="M 6.7797,10.576 V 21.084"
        stroke="#000000"
        stroke-width="1px"
        fill="none"
      />
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "ValveThreeWay",
  props: {
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
.in-alarm .twv {
  animation: twv-alarm 1s infinite;
}
@keyframes twv-alarm {
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
.twv .blocker-wrapper {
  transform: translate(16px, 16px);
}
.value-100 .twv .blocker {
  transform: rotate(90deg);
}
.value-90 .twv .blocker {
  transform: rotate(81deg);
}
.value-80 .twv .blocker {
  transform: rotate(72deg);
}
.value-70 .twv .blocker {
  transform: rotate(63deg);
}
.value-60 .twv .blocker {
  transform: rotate(54deg);
}
.value-50 .twv .blocker {
  transform: rotate(45deg);
}
.value-40 .twv .blocker {
  transform: rotate(36deg);
}
.value-30 .twv .blocker {
  transform: rotate(27deg);
}
.value-20 .twv .blocker {
  transform: rotate(18deg);
}
.value-10 .twv .blocker {
  transform: rotate(9deg);
}
.value-0 .twv .blocker {
  transform: rotate(0deg);
}
</style>
