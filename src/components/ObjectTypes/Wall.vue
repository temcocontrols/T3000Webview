<template>
  <div class="wall-element"></div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "WallEl",
  props: {
    bgColor: {
      type: String,
      default: "#666666",
    },
  },
  setup() {
    return {};
  },
});
</script>

<style scoped>
.wall-element {
  background-color: v-bind("bgColor");
  /* border: 1px solid #000; */
}
</style>
