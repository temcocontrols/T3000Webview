<template>
  <svg
    viewBox="0 0 18 25"
    height="100%"
    width="100%"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:bx="https://boxy-svg.com"
    class="object-svg"
    :class="{ inactive: !active, active: active, 'in-alarm': inAlarm }"
  >
    <g
      class="duct-humidifier"
      transform="matrix(1, 0, 0, 1, -3.324199, -7.877)"
    >
      <g id="g11" transform="translate(0 5.1505)">
        <g
          id="g13"
          stroke="#000"
          stroke-width=".5"
          class="water-drops"
          fill="#00f0ff"
        >
          <path
            id="path4150"
            d="m14.291 6.7851c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z"
          />
          <g id="g4236" transform="translate(0 .17167)">
            <path
              id="path4150-7"
              d="m18.179 5.3612c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z"
            />
            <path
              id="path4150-7-1"
              d="m18.234 7.8656c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z"
            />
          </g>
        </g>
        <g id="g19" transform="translate(0,8)">
          <g
            id="g21"
            stroke="#000"
            stroke-width=".5"
            class="water-drops water-drops-2"
            fill="#00f0ff"
          >
            <path
              id="path23"
              d="m14.291 6.7851c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z"
            />
            <g id="g25" transform="translate(0 .17167)">
              <path
                id="path27"
                d="m18.179 5.3612c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z"
              />
              <path
                id="path29"
                d="m18.234 7.8656c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z"
              />
            </g>
          </g>
        </g>
      </g>
      <path
        id="rect4136-6"
        class="humidifier-body"
        d="m4.3242 8.877v22.586h4.0059v-9.883h4.3789v-2.617h-4.3789v-5.721h4.3789v-2.617h-4.3789v-1.748h-4.0059z"
        stroke="#000"
        fill="currentColor"
      />
    </g>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "HumidifierEl",
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
.in-alarm .duct-humidifier .humidifier-body {
  animation: duct_humidifier_color_change 1s infinite;
}

@keyframes duct_humidifier_color_change {
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

.active .duct-humidifier .water-drops {
  transform: translate(-10px);
  animation: duct-humidifier-drop-move 1s linear infinite;
}

.inactive .duct-humidifier .water-drops {
  opacity: 0;
}

.active .duct-humidifier .water-drops-2 {
  animation-delay: 0.3s;
}

@keyframes duct-humidifier-drop-move {
  100% {
    transform: translate(10px);
    opacity: 0.1;
  }
}
</style>
