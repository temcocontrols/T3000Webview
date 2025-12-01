<template>
  <svg
    viewBox="0 0 20 29"
    height="100%"
    width="100%"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    class="object-svg"
    :class="{ active: active, 'in-alarm': inAlarm }"
  >
    <g stroke="#000" transform="matrix(1, 0, 0, 1, -6.058399, -1.3729)">
      <rect
        id="rect4367"
        height="27.246"
        width="17.868"
        x="7.066"
        y="2.3772"
        fill="currentColor"
      />
      <g transform="translate(24.9334,29.6232) rotate(180)">
        <rect
          id="rect4367"
          class="cooling-coil"
          height="27.246"
          width="17.875"
          x="0"
          y="0"
          fill="currentColor"
          stroke="none"
        />
      </g>
      <rect
        id="rect4367"
        height="27.246"
        width="17.868"
        x="7.066"
        y="2.3772"
        fill="none"
      />
      <path
        id="path3001"
        d="m7.322 2.3729 17.424 27.254"
        stroke-width="1px"
        fill="none"
      />
      <path
        id="path3003"
        d="m24.929 2.3734-17.642 27.182"
        stroke-width="1px"
        fill="none"
      />
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "CoolingCoil",
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
.in-alarm .cooling-coil {
  animation: cooling-coil-alarm 1s infinite;
}

@keyframes cooling-coil-alarm {
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

.active:not(.in-alarm) .cooling-coil {
  animation: cooling-coil-active 1.5s infinite;
}

@keyframes cooling-coil-active {
  0% {
    fill: #98eeff;
  }

  50% {
    fill: #4bb7d8;
  }

  100% {
    fill: #98eeff;
  }
}

.value-100 .cooling-coil {
  transform: scale(1, 1);
}

.value-90 .cooling-coil {
  transform: scale(1, 0.9);
}

.value-80 .cooling-coil {
  transform: scale(1, 0.8);
}

.value-70 .cooling-coil {
  transform: scale(1, 0.7);
}

.value-60 .cooling-coil {
  transform: scale(1, 0.6);
}

.value-50 .cooling-coil {
  transform: scale(1, 0.5);
}

.value-40 .cooling-coil {
  transform: scale(1, 0.4);
}

.value-30 .cooling-coil {
  transform: scale(1, 0.3);
}

.value-20 .cooling-coil {
  transform: scale(1, 0.2);
}

.value-10 .cooling-coil {
  transform: scale(1, 0.1);
}

.value-0 .cooling-coil {
  transform: scale(1, 0);
}
</style>
