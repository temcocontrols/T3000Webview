<template>
  <div class="box-element"></div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "BoxEl",
  props: {
    bgColor: {
      type: String,
      default: "black",
    },
  },
  setup() {
    return {};
  },
});
</script>

<style scoped>
.box-element {
  background-color: v-bind("bgColor");
}
</style>
