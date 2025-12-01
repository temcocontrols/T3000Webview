<template>
  <svg
    viewBox="0 0 19.526541 28.758413"
    height="100%"
    width="100%"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    class="object-svg"
    :class="{ active: active, 'in-alarm': inAlarm }"
  >
    <defs id="defs3">
      <rect id="heating-coil-rect" height="27.246" width="17.868" x="0" y="0" />
    </defs>
    <g stroke="#000000" id="g15" transform="translate(-6.129206,-1.5327875)">
      <use
        xlink:href="#heating-coil-rect"
        fill="currentColor"
        stroke="none"
        x="7.066"
        y="2.3771999"
        id="use6"
      />
      <g transform="rotate(180,12.4667,14.8116)" id="g10">
        <use
          xlink:href="#heating-coil-rect"
          class="heating-coil"
          x="0"
          y="0"
          fill="currentColor"
          stroke="none"
          id="use8"
        />
      </g>
      <use
        xlink:href="#heating-coil-rect"
        stroke-width="1"
        fill="none"
        x="7.066"
        y="2.3771999"
        id="use12"
      />
      <path
        id="path3003"
        stroke-linejoin="miter"
        d="M 24.929,2.3734 7.2868,29.555"
        stroke="#000000"
        stroke-linecap="butt"
        stroke-width="1px"
        fill="none"
      />
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "HeatingCoil",
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
.in-alarm .heating-coil {
  animation: heating-coil-alarm 1s infinite;
}

@keyframes heating-coil-alarm {
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

.active:not(.in-alarm) .heating-coil {
  animation: heating-coil-active 1.5s infinite;
}

@keyframes heating-coil-active {
  0% {
    fill: #fff600;
  }

  50% {
    fill: #ffae00;
  }

  100% {
    fill: #fff600;
  }
}

.value-100 .heating-coil {
  transform: scale(1, 1);
}

.value-90 .heating-coil {
  transform: scale(1, 0.9);
}

.value-80 .heating-coil {
  transform: scale(1, 0.8);
}

.value-70 .heating-coil {
  transform: scale(1, 0.7);
}

.value-60 .heating-coil {
  transform: scale(1, 0.6);
}

.value-50 .heating-coil {
  transform: scale(1, 0.5);
}

.value-40 .heating-coil {
  transform: scale(1, 0.4);
}

.value-30 .heating-coil {
  transform: scale(1, 0.3);
}

.value-20 .heating-coil {
  transform: scale(1, 0.2);
}

.value-10 .heating-coil {
  transform: scale(1, 0.1);
}

.value-0 .heating-coil {
  transform: scale(1, 0);
}
</style>
