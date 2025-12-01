<template>
  <svg
    v-if="icon"
    xmlns="http://www.w3.org/2000/svg"
    height="100%"
    viewBox="0 0 24 24"
    width="100%"
    :class="{ active: active }"
    class="icon-svg"
  >
    <use class="icon" :xlink:href="`icons.svg#${icon}`"></use>
  </svg>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "IconValue",
  props: {
    item: {
      type: Object,
    },
    active: {
      type: Boolean,
      default: false,
    },
    offColor: {
      type: String,
      default: "#940303",
    },
    onColor: {
      type: String,
      default: "#940303",
    },
    icon: {
      type: String,
      default: "image",
    },
    textAlign: {
      type: String,
      default: "left",
    },
  },
  setup() {
    return {};
  },
});
</script>

<style scoped>
.icon-svg {
  padding: 5px;
}
.icon-svg .icon {
  fill: v-bind(offColor);
}

.active.icon-svg .icon {
  fill: v-bind(onColor);
}
</style>
