<template>
  <div class="duct flex flex-nowrap w-full h-full">
    <div class="duct-start">
      <svg
        viewBox="0 0 50 100"
        preserveAspectRatio="none"
        width="100%"
        height="100%"
      >
        <polygon points="50 0, 50 100, 0 50" />
      </svg>
    </div>
    <div class="duct-body grow"></div>
    <div class="duct-end">
      <svg
        viewBox="0 0 50 100"
        preserveAspectRatio="none"
        width="100%"
        height="100%"
      >
        <path d="M 0 0 L 0 100 L 50 100 L 0 50 L 50 0 L 0 0 Z" />
      </svg>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "DuctEl",
  props: {
    bgColor: {
      type: String,
      default: "#808080",
    },
  },
});
</script>

<style scoped>
.duct-body {
  background-color: v-bind(bgColor);
}
.duct-start,
.duct-end {
  max-width: 50px;
}
.duct svg {
  fill: v-bind(bgColor);
}
</style>
