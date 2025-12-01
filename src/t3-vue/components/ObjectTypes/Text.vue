<template>
  <div
    class="text-el"
    :style="`font-size: ${fontSize}px; color: ${textColor}; text-align: ${textAlign} ; white-space: pre-wrap;`"
  >
    {{ text }}
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "TextEl",
  props: {
    text: {
      type: String,
      default: "Text element",
    },
    fontSize: {
      type: Number,
      default: 16,
    },
    textColor: {
      type: String,
      default: "black",
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
div {
  width: 100%;
  height: 100%;
}
</style>
