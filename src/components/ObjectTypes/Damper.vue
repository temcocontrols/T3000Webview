<template>
  <svg
    viewBox="0 0 13.431694 28.950886"
    height="100%"
    width="100%"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    class="object-svg"
    :class="{ 'in-alarm': inAlarm }"
  >
    <rect
      id="rect4367"
      class="damper"
      height="27.5"
      width="12"
      stroke="#000000"
      stroke-miterlimit="4"
      x="0.69481522"
      y="0.67645228"
      stroke-dasharray="none"
      stroke-width="1"
      fill="currentColor"
    />
    <g
      stroke="#000000"
      stroke-width="1.5px"
      id="g19"
      transform="translate(-9.3051848,-1.5735477)"
    >
      <g transform="translate(16,7)" id="g5">
        <line
          x1="-5"
          x2="5"
          y1="0"
          y2="0"
          transform="rotate(-35)"
          class="damper-line"
          id="line3"
        />
      </g>
      <g transform="translate(16,13)" id="g9">
        <line
          x1="-5"
          x2="5"
          y1="0"
          y2="0"
          transform="rotate(-35)"
          class="damper-line"
          id="line7"
        />
      </g>
      <g transform="translate(16,19)" id="g13">
        <line
          x1="-5"
          x2="5"
          y1="0"
          y2="0"
          transform="rotate(-35)"
          class="damper-line"
          id="line11"
        />
      </g>
      <g transform="translate(16,25)" id="g17">
        <line
          x1="-5"
          x2="5"
          y1="0"
          y2="0"
          transform="rotate(-35)"
          class="damper-line"
          id="line15"
        />
      </g>
    </g>
    <g
      id="g4877"
      stroke-linejoin="miter"
      transform="matrix(1.2268237,0,0,0.94845469,-13.299764,-1.1862851)"
      stroke="#000000"
      stroke-linecap="butt"
      fill="none"
    >
      <path
        id="path4317"
        stroke-width="1.06273px"
        d="m 16.298,2.2402 v 28.442"
      />
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "DamperEl",
  props: {
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
.in-alarm .damper {
  animation: damper-alarm 1s infinite;
}

@keyframes damper-alarm {
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

.damper-line {
  transform: rotate(35deg);
}

.value-100 .damper-line {
  transform: rotate(0deg);
}

.value-90 .damper-line {
  transform: rotate(8deg);
}

.value-80 .damper-line {
  transform: rotate(16deg);
}

.value-70 .damper-line {
  transform: rotate(24deg);
}

.value-60 .damper-line {
  transform: rotate(32deg);
}

.value-50 .damper-line {
  transform: rotate(40deg);
}

.value-40 .damper-line {
  transform: rotate(48deg);
}

.value-30 .damper-line {
  transform: rotate(56deg);
}

.value-20 .damper-line {
  transform: rotate(64deg);
}

.value-10 .damper-line {
  transform: rotate(72deg);
}

.value-0 .damper-line {
  transform: rotate(80deg);
}
</style>
